// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable } from '@nestjs/common';
import { computeAuditHash, hashPayload } from '@humanix/signature-engine';
import type { TenantClient } from '../prisma/tenant-prisma.service';
import { requireTenantContext } from '../tenant/tenant-context';

export interface AuditEntry {
  action: string;
  actorUserId?: string;
  entity?: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  payload?: unknown;
}

/**
 * Journal d'audit append-only HASH-CHAÎNÉ pour les actions sensibles (§12, ADR 0003).
 * hash(n) = SHA-256(payloadHash(n) ‖ hash(n-1)), par tenant. À appeler DANS la transaction
 * tenant de l'action (le verrou consultatif par tenant linéarise la chaîne).
 */
@Injectable()
export class AuditService {
  async record(tx: TenantClient, entry: AuditEntry): Promise<void> {
    const { tenantId } = requireTenantContext();
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;

    const last = await tx.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    });
    const prevHash = last?.hash ?? null;
    const payloadHash = hashPayload(entry.payload ?? {});
    const hash = computeAuditHash(payloadHash, prevHash);

    await tx.auditLog.create({
      data: {
        tenantId,
        action: entry.action,
        actorUserId: entry.actorUserId ?? null,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        payloadHash,
        prevHash,
        hash,
      },
    });
  }
}
