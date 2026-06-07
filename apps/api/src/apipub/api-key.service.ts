// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash, randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { AuditService } from '../audit/audit.service';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Génère une clé d'API `hmx_<slug>_<secret>`. Le secret n'est montré qu'à la création. */
  async create(nom: string, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId, tenantSlug } = requireTenantContext();
      const secret = randomBytes(24).toString('base64url');
      const key = `hmx_${tenantSlug}_${secret}`;
      const prefix = `${key.slice(0, 16)}…`;
      const row = await tx.apiKey.create({
        data: { tenantId, nom, prefix, keyHash: hashApiKey(key) },
        select: { id: true, nom: true, prefix: true, createdAt: true },
      });
      await this.audit.record(tx, { action: 'apikey.create', entity: 'api_key', entityId: row.id, actorUserId: actor.sub });
      return { ...row, key }; // `key` à transmettre une seule fois
    });
  }

  async list() {
    return this.tenantPrisma.withTenant((tx) =>
      tx.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, nom: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
      }),
    );
  }

  async revoke(id: string, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const row = await tx.apiKey.findFirst({ where: { id }, select: { id: true } });
      if (!row) throw new NotFoundException('Clé introuvable.');
      await tx.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
      await this.audit.record(tx, { action: 'apikey.revoke', entity: 'api_key', entityId: id, actorUserId: actor.sub });
      return { id, revoked: true };
    });
  }
}
