// SPDX-License-Identifier: AGPL-3.0-or-later
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { AccessClaims } from '@humanix/domain';
import { AuditService } from '../audit/audit.service';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

export interface UpdateProfileInput {
  prenom?: string | null;
  nom?: string | null;
  handicapAdaptations?: string | null;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly audit: AuditService,
  ) {}

  async me(user: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const u = await tx.user.findFirst({
        where: { id: user.sub },
        select: {
          id: true,
          email: true,
          prenom: true,
          nom: true,
          role: true,
          mfaEnabled: true,
          handicapAdaptations: true,
          createdAt: true,
        },
      });
      if (!u) throw new NotFoundException('Profil introuvable.');
      return u;
    });
  }

  async update(user: AccessClaims, input: UpdateProfileInput) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.sub },
        data: {
          ...(input.prenom !== undefined ? { prenom: input.prenom } : {}),
          ...(input.nom !== undefined ? { nom: input.nom } : {}),
          ...(input.handicapAdaptations !== undefined
            ? { handicapAdaptations: input.handicapAdaptations }
            : {}),
        },
        select: { id: true, email: true, prenom: true, nom: true, role: true, handicapAdaptations: true },
      });
      await this.audit.record(tx, { action: 'profile.update', entity: 'app_user', entityId: user.sub, actorUserId: user.sub });
      return updated;
    });
  }

  async changePassword(user: AccessClaims, currentPassword: string, newPassword: string) {
    await this.tenantPrisma.withTenant(async (tx) => {
      const u = await tx.user.findFirst({ where: { id: user.sub } });
      if (!u) throw new NotFoundException('Profil introuvable.');
      const ok = await argon2.verify(u.passwordHash, currentPassword).catch(() => false);
      if (!ok) throw new UnauthorizedException('Mot de passe actuel incorrect.');
      if (newPassword.length < 12) {
        throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 12 caractères.');
      }
      const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
      await tx.user.update({ where: { id: user.sub }, data: { passwordHash } });
      // Révoque les autres sessions actives par sécurité.
      await tx.refreshToken.updateMany({ where: { userId: user.sub, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record(tx, { action: 'profile.password_change', actorUserId: user.sub });
    });
    return { changed: true };
  }
}
