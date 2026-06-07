// SPDX-License-Identifier: AGPL-3.0-or-later
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { TenantClient } from '../prisma/tenant-prisma.service';

/**
 * Application des quotas par tenant. La limite effective = Quota du tenant (surcharge)
 * sinon le plan de l'abonnement actif ; `null` = illimité.
 *
 * Les requêtes s'exécutent dans la transaction tenant fournie (RLS appliqué) : aucun
 * franchissement d'isolation. Compter puis créer dans la même transaction sérialisée
 * (les écritures sensibles prennent déjà un advisory lock par tenant côté appelant).
 */
@Injectable()
export class QuotasService {
  /** Limite effective pour une clé de quota, ou null si illimité. */
  async resolveLimit(
    tx: TenantClient,
    tenantId: string,
    key: 'maxUsers' | 'maxActiveSessions',
  ): Promise<number | null> {
    const quota = await tx.quota.findUnique({ where: { tenantId } });
    if (quota && quota[key] != null) return quota[key];
    const sub = await tx.subscription.findFirst({
      where: { tenantId, status: 'active' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    return sub?.plan[key] ?? null;
  }

  /** Refuse la création d'une session si le quota de sessions actives est atteint. */
  async assertCanCreateSession(tx: TenantClient, tenantId: string): Promise<void> {
    const max = await this.resolveLimit(tx, tenantId, 'maxActiveSessions');
    if (max == null) return;
    const actives = await tx.session.count({ where: { statut: { in: ['planifiee', 'en_cours'] } } });
    if (actives >= max) {
      throw new ForbiddenException(
        `Quota atteint : ${max} session(s) active(s) maximum pour votre offre.`,
      );
    }
  }

  /** Refuse l'ajout d'un utilisateur si le quota d'utilisateurs est atteint. */
  async assertCanAddUser(tx: TenantClient, tenantId: string): Promise<void> {
    const max = await this.resolveLimit(tx, tenantId, 'maxUsers');
    if (max == null) return;
    const count = await tx.user.count();
    if (count >= max) {
      throw new ForbiddenException(`Quota atteint : ${max} utilisateur(s) maximum pour votre offre.`);
    }
  }
}
