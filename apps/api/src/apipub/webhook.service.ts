// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHmac, randomBytes } from 'node:crypto';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';
import { getTenantContext, requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(input: { url: string; events: string[] }, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const secret = randomBytes(24).toString('base64url');
      const row = await tx.webhookEndpoint.create({
        data: { tenantId, url: input.url, secret, events: input.events, actif: true },
        select: { id: true, url: true, events: true, actif: true },
      });
      void actor;
      return { ...row, secret }; // secret montré une fois (pour vérifier les signatures)
    });
  }

  async list() {
    return this.tenantPrisma.withTenant((tx) =>
      tx.webhookEndpoint.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, url: true, events: true, actif: true, createdAt: true } }),
    );
  }

  async remove(id: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const row = await tx.webhookEndpoint.findFirst({ where: { id }, select: { id: true } });
      if (!row) throw new NotFoundException('Webhook introuvable.');
      await tx.webhookEndpoint.delete({ where: { id } });
      return { id, deleted: true };
    });
  }

  /**
   * Émet un événement vers les endpoints abonnés du tenant courant (best-effort, non bloquant).
   * Signature HMAC-SHA256 du corps dans l'en-tête `X-Humanix-Signature`.
   */
  emit(event: string, payload: Record<string, unknown>): void {
    if (!getTenantContext()) return;
    void this.tenantPrisma
      .withTenant(async (tx) => {
        const endpoints = await tx.webhookEndpoint.findMany({ where: { actif: true } });
        const cibles = endpoints.filter((e) => e.events.includes(event));
        const body = JSON.stringify({ event, sentAt: new Date().toISOString(), data: payload });
        await Promise.all(
          cibles.map(async (e) => {
            try {
              const signature = createHmac('sha256', e.secret).update(body).digest('hex');
              await fetch(e.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Humanix-Event': event, 'X-Humanix-Signature': `sha256=${signature}` },
                body,
              });
            } catch (err) {
              this.logger.warn(`Webhook ${e.url} échoué : ${String(err)}`);
            }
          }),
        );
      })
      .catch(() => undefined);
  }
}
