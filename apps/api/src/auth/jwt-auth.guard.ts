// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { accessClaimsSchema } from '@humanix/domain';
import { loadEnv } from '../config/env';
import { getTenantContext } from '../tenant/tenant-context';

/**
 * Authentifie via JWT d'accès (Bearer). Défense en profondeur multi-tenant : le `tid` du
 * token DOIT correspondre au tenant résolu pour la requête (un token du tenant A ne peut pas
 * agir sur le tenant B), en complément de la RLS PostgreSQL (ADR 0002).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly secret = loadEnv().JWT_ACCESS_SECRET;

  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = this.extractBearer(req);
    if (!token) {
      throw new UnauthorizedException('Jeton manquant.');
    }

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.secret });
    } catch {
      throw new UnauthorizedException('Jeton invalide ou expiré.');
    }

    const claims = accessClaimsSchema.safeParse(payload);
    if (!claims.success) {
      throw new UnauthorizedException('Jeton malformé.');
    }

    const ctx = getTenantContext();
    if (!ctx || ctx.tenantId !== claims.data.tid) {
      throw new UnauthorizedException('Jeton hors périmètre du tenant.');
    }

    req.user = claims.data;
    return true;
  }

  private extractBearer(req: Request): string | null {
    const auth = req.headers.authorization;
    if (!auth) return null;
    const [scheme, value] = auth.split(' ');
    return scheme === 'Bearer' && value ? value : null;
  }
}
