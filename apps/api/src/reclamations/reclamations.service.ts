// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

export interface CreateReclamationInput {
  objet: string;
  description: string;
  sessionId?: string;
}
type ReclamationStatut = 'ouverte' | 'en_traitement' | 'resolue' | 'cloturee';

@Injectable()
export class ReclamationsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /** Dépôt d'une réclamation (tout utilisateur authentifié du tenant). */
  create(user: AccessClaims, input: CreateReclamationInput) {
    return this.tenantPrisma.withTenant((tx) => {
      const { tenantId } = requireTenantContext();
      return tx.reclamation.create({
        data: {
          tenantId,
          objet: input.objet,
          description: input.description,
          sessionId: input.sessionId ?? null,
          auteurUserId: user.sub,
        },
        select: { id: true, statut: true },
      });
    });
  }

  /** Liste (admin) avec actions d'amélioration associées. */
  list() {
    return this.tenantPrisma.withTenant((tx) =>
      tx.reclamation.findMany({
        orderBy: { createdAt: 'desc' },
        include: { actions: { orderBy: { createdAt: 'asc' } } },
      }),
    );
  }

  async setStatut(id: string, statut: ReclamationStatut) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const r = await tx.reclamation.findFirst({ where: { id } });
      if (!r) throw new NotFoundException('Réclamation introuvable.');
      return tx.reclamation.update({
        where: { id },
        data: {
          statut,
          ...(statut === 'resolue' || statut === 'cloturee' ? { resolvedAt: new Date() } : {}),
        },
        select: { id: true, statut: true },
      });
    });
  }

  /** Ajoute une action d'amélioration continue rattachée à une réclamation. */
  addAction(user: AccessClaims, reclamationId: string, description: string, dueDate?: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const r = await tx.reclamation.findFirst({ where: { id: reclamationId } });
      if (!r) throw new NotFoundException('Réclamation introuvable.');
      return tx.actionAmeliorationContinue.create({
        data: {
          tenantId,
          reclamationId,
          description,
          responsableUserId: user.sub,
          ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        },
        select: { id: true },
      });
    });
  }
}
