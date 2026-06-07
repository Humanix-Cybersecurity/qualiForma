// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, UnauthorizedException, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { runWithTenant } from '../tenant/tenant-context';
import { TenantResolverService } from '../tenant/tenant-resolver.service';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { hashApiKey } from './api-key.service';

/**
 * Authentification des routes `/api/v1/*` par clé d'API.
 * La clé `hmx_<slug>_<secret>` porte le slug → on résout le tenant, on ouvre le contexte
 * (RLS), puis on valide la clé par son hash SOUS RLS. Aucun client privilégié, aucune table
 * globale : l'isolation reste intacte.
 */
@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(
    private readonly resolver: TenantResolverService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const key = this.extractKey(req);
    if (!key || !key.startsWith('hmx_')) throw new UnauthorizedException('Clé d’API manquante ou invalide.');

    const slug = key.split('_')[1];
    if (!slug) throw new UnauthorizedException('Clé d’API malformée.');
    const tenant = await this.resolver.resolveBySlug(slug);
    if (!tenant) throw new UnauthorizedException('Clé d’API invalide.');

    await runWithTenant({ tenantId: tenant.id, tenantSlug: tenant.slug }, async () => {
      const row = await this.tenantPrisma.withTenant((tx) =>
        tx.apiKey.findFirst({ where: { keyHash: hashApiKey(key), revokedAt: null }, select: { id: true } }),
      );
      if (!row) throw new UnauthorizedException('Clé d’API invalide ou révoquée.');
      // Trace d'usage (best-effort, hors chemin critique).
      void this.tenantPrisma
        .withTenant((tx) => tx.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }))
        .catch(() => undefined);
      // next() dispatché DANS le contexte ALS : le handler en aval conserve le tenant (RLS).
      next();
    });
  }

  private extractKey(req: Request): string | null {
    const h = req.headers['x-api-key'];
    if (typeof h === 'string' && h.trim()) return h.trim();
    const auth = req.headers.authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7).trim();
    return null;
  }
}
