// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash, randomUUID } from 'node:crypto';
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import type { AccessClaims, LoginInput, RefreshInput, TokenPair } from '@humanix/domain';
import { loadEnv } from '../config/env';
import { CryptoService } from '../common/crypto.service';
import { TenantPrismaService, type TenantClient } from '../prisma/tenant-prisma.service';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
// Hash argon2 « leurre » pour égaliser le temps de réponse quand l'utilisateur n'existe pas
// (anti-énumération). Valeur d'un mot de passe aléatoire jamais utilisé.
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZS1zYWx0LXZhbHVl$3hHhM0n1u3o0Qe1m9c2bX8r0Q3pQ0Qe1m9c2bX8r0Q';

@Injectable()
export class AuthService {
  private readonly env = loadEnv();

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly jwt: JwtService,
    private readonly crypto: CryptoService,
  ) {}

  async login(
    input: LoginInput,
    meta: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const user = await tx.user.findFirst({ where: { email: input.email } });

      if (!user) {
        // Vérification leurre pour égaliser le temps de réponse (anti-énumération).
        await argon2.verify(DUMMY_HASH, input.password).catch(() => false);
        throw new UnauthorizedException('Identifiants invalides.');
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new ForbiddenException('Compte temporairement verrouillé.');
      }
      if (!user.isActive) {
        throw new ForbiddenException('Compte désactivé.');
      }

      const passwordOk = await argon2.verify(user.passwordHash, input.password);
      if (!passwordOk) {
        await this.registerFailure(tx, user.id, user.failedLoginCount);
        throw new UnauthorizedException('Identifiants invalides.');
      }

      // MFA : si activée, un code TOTP valide est requis.
      if (user.mfaEnabled) {
        if (!input.totp) {
          throw new UnauthorizedException('Code MFA requis.');
        }
        if (!user.mfaSecretEnc || !this.verifyTotp(user.mfaSecretEnc, input.totp)) {
          await this.registerFailure(tx, user.id, user.failedLoginCount);
          throw new UnauthorizedException('Code MFA invalide.');
        }
      }

      // Succès : reset compteur brute-force.
      await tx.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });

      return this.issueTokens(
        tx,
        { sub: user.id, tid: user.tenantId, role: user.role, mfa: user.mfaEnabled },
        meta,
      );
    });
  }

  async refresh(input: RefreshInput, meta: { ip?: string; userAgent?: string }): Promise<TokenPair> {
    let payload: { sub: string; tid: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(input.refreshToken, {
        secret: this.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré.');
    }

    return this.tenantPrisma.withTenant(async (tx) => {
      const tokenHash = hashToken(input.refreshToken);
      const stored = await tx.refreshToken.findUnique({ where: { tokenHash } });

      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Session expirée.');
      }

      const user = await tx.user.findFirst({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Session invalide.');
      }

      // Rotation : révoque l'ancien jeton avant d'en émettre un nouveau.
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      return this.issueTokens(
        tx,
        { sub: user.id, tid: user.tenantId, role: user.role, mfa: user.mfaEnabled },
        meta,
      );
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tenantPrisma.withTenant(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  /** Démarre l'enrôlement MFA : renvoie le secret (affiché une fois) et l'URI otpauth. */
  async startMfaEnrollment(user: AccessClaims): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = authenticator.generateSecret();
    return this.tenantPrisma.withTenant(async (tx) => {
      const row = await tx.user.findFirst({ where: { id: user.sub } });
      if (!row) {
        throw new UnauthorizedException('Utilisateur introuvable.');
      }
      // Stocke le secret chiffré mais laisse mfaEnabled=false jusqu'à confirmation d'un code.
      await tx.user.update({
        where: { id: user.sub },
        data: { mfaSecretEnc: this.crypto.encrypt(secret), mfaEnabled: false },
      });
      const otpauthUrl = authenticator.keyuri(row.email, this.env.MFA_ISSUER, secret);
      return { secret, otpauthUrl };
    });
  }

  /** Confirme et active la MFA en vérifiant un premier code TOTP. */
  async confirmMfaEnrollment(user: AccessClaims, code: string): Promise<void> {
    await this.tenantPrisma.withTenant(async (tx) => {
      const row = await tx.user.findFirst({ where: { id: user.sub } });
      if (!row?.mfaSecretEnc) {
        throw new UnauthorizedException('Aucun enrôlement MFA en cours.');
      }
      if (!this.verifyTotp(row.mfaSecretEnc, code)) {
        throw new UnauthorizedException('Code MFA invalide.');
      }
      await tx.user.update({ where: { id: user.sub }, data: { mfaEnabled: true } });
    });
  }

  // --- internes ---

  private verifyTotp(secretEnc: string, token: string): boolean {
    const secret = this.crypto.decrypt(secretEnc);
    return authenticator.verify({ token, secret });
  }

  private async registerFailure(tx: TenantClient, userId: string, current: number): Promise<void> {
    const next = current + 1;
    const lock = next >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
    await tx.user.update({
      where: { id: userId },
      data: { failedLoginCount: next, lockedUntil: lock },
    });
  }

  private async issueTokens(
    tx: TenantClient,
    claims: AccessClaims,
    meta: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(claims, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: this.env.JWT_ACCESS_TTL,
    });

    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: claims.sub, tid: claims.tid, jti },
      { secret: this.env.JWT_REFRESH_SECRET, expiresIn: this.env.JWT_REFRESH_TTL },
    );

    await tx.refreshToken.create({
      data: {
        tenantId: claims.tid,
        userId: claims.sub,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.env.JWT_REFRESH_TTL * 1000),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return { accessToken, refreshToken, expiresIn: this.env.JWT_ACCESS_TTL };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
