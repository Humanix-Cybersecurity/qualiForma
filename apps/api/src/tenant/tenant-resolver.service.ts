// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ResolvedTenant {
  id: string;
  slug: string;
  status: string;
}

/**
 * Résout un tenant par slug AVANT que `app.tenant_id` soit connu (bootstrap de requête).
 * S'appuie sur la fonction SQL `resolve_tenant` (SECURITY DEFINER) : seul accès légitime à la
 * table `tenant` hors contexte tenant. Ne renvoie que les tenants actifs.
 */
@Injectable()
export class TenantResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveBySlug(slug: string): Promise<ResolvedTenant | null> {
    const rows = await this.prisma.$queryRaw<ResolvedTenant[]>`
      SELECT id, slug, status FROM resolve_tenant(${slug})
    `;
    return rows[0] ?? null;
  }
}
