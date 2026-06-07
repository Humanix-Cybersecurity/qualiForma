// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable } from '@nestjs/common';
import type { IndicateurStatutValeur } from '@prisma/client';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService, type TenantClient } from '../prisma/tenant-prisma.service';
import { AuditService } from '../audit/audit.service';
import { RNQ_CRITERES, RNQ_INDICATEURS } from './rnq';

@Injectable()
export class QualiopiService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Calcule des indices d'auto-évaluation indicatifs à partir des données du tenant. */
  private async autoFlags(tx: TenantClient) {
    const [formationsAvecObjectifs, satisfaction, positionnement, acquis, sessions, formateurs, documents, handicap, reclamations, actions, certificats] =
      await Promise.all([
        tx.formation.count({ where: { NOT: { objectifs: null } } }),
        tx.questionnaireSoumission.count({ where: { questionnaire: { type: { in: ['satisfaction_chaud', 'satisfaction_froid'] } } } }),
        tx.questionnaireSoumission.count({ where: { questionnaire: { type: 'positionnement_amont' } } }),
        tx.questionnaireSoumission.count({ where: { questionnaire: { type: 'evaluation_acquis' } } }),
        tx.session.count(),
        tx.user.count({ where: { role: 'formateur' } }),
        tx.document.count({ where: { scanStatus: 'clean' } }),
        tx.user.count({ where: { role: 'referent_handicap' } }),
        tx.reclamation.count(),
        tx.actionAmeliorationContinue.count(),
        tx.certificatRealisation.count({ where: { statut: 'emis' } }),
      ]);
    return {
      programme: formationsAvecObjectifs > 0,
      satisfaction: satisfaction > 0,
      positionnement: positionnement > 0,
      acquis: acquis > 0 || certificats > 0,
      objectifs: formationsAvecObjectifs > 0,
      sessions: sessions > 0,
      formateurs: formateurs > 0,
      documents: documents > 0,
      handicap: handicap > 0,
      reclamations: reclamations > 0,
      actions: actions > 0,
    } as Record<string, boolean>;
  }

  /** Tableau de bord conformité : 32 indicateurs + auto-éval + statut manuel + score. */
  async dashboard() {
    return this.tenantPrisma.withTenant(async (tx) => {
      const statuts = await tx.indicateurStatut.findMany();
      const byNum = new Map(statuts.map((s) => [s.numero, s]));
      const flags = await this.autoFlags(tx);

      const indicateurs = RNQ_INDICATEURS.map((ind) => {
        const stored = byNum.get(ind.numero);
        const auto = ind.autoKey ? flags[ind.autoKey] ?? null : null;
        return {
          numero: ind.numero,
          critere: ind.critere,
          critereLibelle: RNQ_CRITERES[ind.critere],
          libelle: ind.libelle,
          alternance: ind.alternance ?? false,
          autoConforme: auto,
          statut: stored?.statut ?? (ind.alternance ? 'non_applicable' : 'a_completer'),
          notes: stored?.notes ?? null,
          documentId: stored?.documentId ?? null,
        };
      });

      const applicables = indicateurs.filter((i) => i.statut !== 'non_applicable');
      const conformes = applicables.filter((i) => i.statut === 'conforme').length;
      const score = applicables.length > 0 ? Math.round((conformes / applicables.length) * 100) : 0;

      return {
        criteres: RNQ_CRITERES,
        indicateurs,
        score,
        conformes,
        applicables: applicables.length,
        total: indicateurs.length,
      };
    });
  }

  /** Met à jour le statut/notes/preuve d'un indicateur (upsert). */
  async setStatut(
    numero: number,
    input: { statut?: IndicateurStatutValeur; notes?: string | null; documentId?: string | null },
    actor: AccessClaims,
  ) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const data = {
        ...(input.statut ? { statut: input.statut } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.documentId !== undefined ? { documentId: input.documentId } : {}),
      };
      const row = await tx.indicateurStatut.upsert({
        where: { tenantId_numero: { tenantId, numero } },
        create: { tenantId, numero, statut: input.statut ?? 'a_completer', notes: input.notes ?? null, documentId: input.documentId ?? null },
        update: data,
        select: { numero: true, statut: true, notes: true, documentId: true },
      });
      await this.audit.record(tx, {
        action: 'qualiopi.statut',
        entity: 'indicateur_statut',
        entityId: String(numero),
        actorUserId: actor.sub,
        payload: { numero, statut: row.statut },
      });
      return row;
    });
  }
}
