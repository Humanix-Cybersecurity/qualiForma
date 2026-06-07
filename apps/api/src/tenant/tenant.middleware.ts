// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, NotFoundException, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { runWithTenant } from './tenant-context';
import { TenantResolverService } from './tenant-resolver.service';

/**
 * Résout le tenant pour CHAQUE requête et attache le contexte (AsyncLocalStorage) à toute
 * la suite du traitement. Sans tenant résolu → 404 (on ne révèle pas l'existence d'un tenant).
 *
 * Stratégie de résolution :
 *   1. en-tête `x-tenant-slug` (utile en dev / clients natifs Capacitor) ;
 *   2. sinon, sous-domaine de l'hôte (`acme.humanix.app` → `acme`).
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly resolver: TenantResolverService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const slug = this.extractSlug(req);
    if (!slug) {
      throw new NotFoundException('Tenant non identifié.');
    }

    const tenant = await this.resolver.resolveBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Tenant non identifié.');
    }

    runWithTenant({ tenantId: tenant.id, tenantSlug: tenant.slug }, () => next());
  }

  private extractSlug(req: Request): string | null {
    const header = req.headers['x-tenant-slug'];
    if (typeof header === 'string' && header.trim()) {
      return header.trim().toLowerCase();
    }

    const host = (req.headers.host ?? '').split(':')[0] ?? '';
    const labels = host.split('.');
    // Sous-domaine seulement si host multi-niveaux et pas une IP/localhost nu.
    if (labels.length >= 3) {
      const sub = labels[0]?.toLowerCase();
      if (sub && sub !== 'www') return sub;
    }
    return null;
  }
}
