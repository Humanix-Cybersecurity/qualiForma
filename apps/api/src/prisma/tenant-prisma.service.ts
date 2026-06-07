// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { requireTenantContext } from '../tenant/tenant-context';

/** Client Prisma transactionnel exposé aux callbacks tenant-scoped. */
export type TenantClient = Prisma.TransactionClient;

/**
 * Exécute toute opération métier dans une transaction où `app.tenant_id` est positionné
 * via `SET LOCAL` (set_config(..., is_local = true)). La variable est :
 *   - limitée à la transaction → jamais de fuite via le pool de connexions ;
 *   - posée AVANT toute requête → la RLS (ADR 0002) filtre systématiquement par tenant.
 * Compatible PgBouncer en mode transaction.
 */
@Injectable()
export class TenantPrismaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Variante explicite (jobs, seed, tests) : le tenant est passé en argument. */
  async withTenantId<T>(
    tenantId: string,
    fn: (tx: TenantClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // set_config(name, value, is_local=true) : portée transaction. Paramétré → pas d'injection.
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }

  /** Variante usuelle : le tenant provient du contexte de requête (fail-closed si absent). */
  async withTenant<T>(fn: (tx: TenantClient) => Promise<T>): Promise<T> {
    const { tenantId } = requireTenantContext();
    return this.withTenantId(tenantId, fn);
  }
}
