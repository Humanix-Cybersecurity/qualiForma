// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Client Prisma de base, connecté avec le rôle applicatif `app` (NON BYPASSRLS).
 * Hors transaction tenant, `app.tenant_id` n'est pas positionné → la RLS renvoie 0 ligne
 * sur les tables cloisonnées (fail-closed). Le seul accès légitime sans contexte est la
 * fonction SECURITY DEFINER `resolve_tenant` (voir TenantResolver).
 *
 * Toute lecture/écriture métier doit passer par TenantPrismaService.withTenant().
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
