// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../config/env';

/**
 * Client Prisma PRIVILÉGIÉ réservé à l'exploitation SaaS (super-admin). Connecté avec un rôle
 * propriétaire qui dépasse la RLS, afin d'opérer sur tous les tenants (onboarding, supervision).
 *
 * ⚠️ Frontière de licence (ADR 0007) & sécurité : ce client n'est injecté QUE dans le module
 * super-admin, dont les routes sont protégées par @Auth('super_admin'). Le cœur AGPL n'en dépend
 * pas. Toute action est auditée. Ne JAMAIS exposer ce client aux modules métier (cf. ADR 0002).
 */
@Injectable()
export class SuperAdminPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = loadEnv().DATABASE_ADMIN_URL;
    super(url ? { datasources: { db: { url } } } : {});
  }

  async onModuleInit(): Promise<void> {
    if (!loadEnv().DATABASE_ADMIN_URL) {
      // Sans connexion privilégiée, l'espace super-admin est désactivé (cœur auto-hébergé).
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect().catch(() => undefined);
  }

  get enabled(): boolean {
    return Boolean(loadEnv().DATABASE_ADMIN_URL);
  }
}
