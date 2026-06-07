// SPDX-License-Identifier: AGPL-3.0-or-later
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { QuotasService } from '../quotas/quotas.service';

export interface CreateFormationInput {
  intitule: string;
  objectifs?: string;
  prerequis?: string;
  dureeHeures: number;
  tarifCents?: number;
  modalitesAccesHandicap?: string;
  indicateursQualiopi?: string[];
}
export interface CreateSessionInput {
  formationId: string;
  intitule?: string;
  dateDebut: string;
  dateFin: string;
  lieu?: string;
  formateurId?: string;
}
export interface CreneauInput {
  date: string;
  periode: 'matin' | 'apres_midi';
  heureDebut: string;
  heureFin: string;
  lieu?: string;
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly quotas: QuotasService,
  ) {}

  // --- Écriture (admin OF) ---

  createFormation(input: CreateFormationInput) {
    return this.tenantPrisma.withTenant((tx) => {
      const { tenantId } = requireTenantContext();
      return tx.formation.create({
        data: {
          tenantId,
          intitule: input.intitule,
          objectifs: input.objectifs ?? null,
          prerequis: input.prerequis ?? null,
          dureeHeures: String(input.dureeHeures),
          tarifCents: input.tarifCents ?? null,
          modalitesAccesHandicap: input.modalitesAccesHandicap ?? null,
          indicateursQualiopi: input.indicateursQualiopi ?? [],
        },
        select: { id: true, intitule: true },
      });
    });
  }

  updateFormation(id: string, input: Partial<CreateFormationInput>) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const f = await tx.formation.findFirst({ where: { id } });
      if (!f) throw new NotFoundException('Formation introuvable.');
      return tx.formation.update({
        where: { id },
        data: {
          ...(input.intitule !== undefined ? { intitule: input.intitule } : {}),
          ...(input.objectifs !== undefined ? { objectifs: input.objectifs } : {}),
          ...(input.prerequis !== undefined ? { prerequis: input.prerequis } : {}),
          ...(input.dureeHeures !== undefined ? { dureeHeures: String(input.dureeHeures) } : {}),
          ...(input.tarifCents !== undefined ? { tarifCents: input.tarifCents } : {}),
          ...(input.modalitesAccesHandicap !== undefined ? { modalitesAccesHandicap: input.modalitesAccesHandicap } : {}),
          ...(input.indicateursQualiopi !== undefined ? { indicateursQualiopi: input.indicateursQualiopi } : {}),
        },
        select: { id: true, intitule: true },
      });
    });
  }

  createSession(input: CreateSessionInput) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const formation = await tx.formation.findFirst({ where: { id: input.formationId } });
      if (!formation) throw new NotFoundException('Formation introuvable.');
      await this.quotas.assertCanCreateSession(tx, tenantId);
      return tx.session.create({
        data: {
          tenantId,
          formationId: input.formationId,
          intitule: input.intitule ?? null,
          dateDebut: new Date(input.dateDebut),
          dateFin: new Date(input.dateFin),
          lieu: input.lieu ?? null,
          formateurId: input.formateurId ?? null,
        },
        select: { id: true },
      });
    });
  }

  /** Ajoute des créneaux (demi-journées) à une session. */
  addCreneaux(sessionId: string, creneaux: CreneauInput[]) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const session = await tx.session.findFirst({ where: { id: sessionId } });
      if (!session) throw new NotFoundException('Session introuvable.');
      let ordre = await tx.creneau.count({ where: { sessionId } });
      const created = [];
      for (const c of creneaux) {
        created.push(
          await tx.creneau.create({
            data: {
              tenantId,
              sessionId,
              date: new Date(c.date),
              periode: c.periode,
              heureDebut: c.heureDebut,
              heureFin: c.heureFin,
              lieu: c.lieu ?? session.lieu,
              formateurId: session.formateurId,
              ordre: ordre++,
            },
            select: { id: true, date: true, periode: true },
          }),
        );
      }
      return created;
    });
  }

  /** Inscrit un apprenant (par e-mail) à une session. */
  enroll(sessionId: string, apprenantEmail: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const session = await tx.session.findFirst({ where: { id: sessionId } });
      if (!session) throw new NotFoundException('Session introuvable.');
      const apprenant = await tx.user.findFirst({
        where: { email: apprenantEmail.toLowerCase(), role: 'apprenant' },
      });
      if (!apprenant) throw new BadRequestException('Apprenant introuvable (e-mail).');
      return tx.inscription.upsert({
        where: { sessionId_apprenantId: { sessionId, apprenantId: apprenant.id } },
        create: { tenantId, sessionId, apprenantId: apprenant.id, statut: 'confirmee' },
        update: { statut: 'confirmee' },
        select: { id: true },
      });
    });
  }

  listFormations() {
    return this.tenantPrisma.withTenant((tx) =>
      tx.formation.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          intitule: true,
          dureeHeures: true,
          tarifCents: true,
          actif: true,
          indicateursQualiopi: true,
          _count: { select: { sessions: true } },
        },
      }),
    );
  }

  async listSessions() {
    return this.tenantPrisma.withTenant(async (tx) => {
      const sessions = await tx.session.findMany({
        orderBy: { dateDebut: 'desc' },
        include: {
          formation: { select: { intitule: true } },
          _count: { select: { creneaux: true, inscriptions: true } },
        },
      });
      return sessions.map((s) => ({
        id: s.id,
        intitule: s.intitule,
        formation: s.formation.intitule,
        dateDebut: s.dateDebut,
        dateFin: s.dateFin,
        statut: s.statut,
        lieu: s.lieu,
        creneaux: s._count.creneaux,
        inscrits: s._count.inscriptions,
      }));
    });
  }

  /** Inscriptions de l'apprenant courant (pour ses attestations / suivi). */
  async myInscriptions(user: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const inscriptions = await tx.inscription.findMany({
        where: { apprenantId: user.sub },
        orderBy: { dateInscription: 'desc' },
        include: {
          session: { include: { formation: { select: { intitule: true } } } },
          certificat: { select: { id: true, statut: true, numero: true } },
        },
      });
      return inscriptions.map((i) => ({
        id: i.id,
        statut: i.statut,
        formation: i.session.formation.intitule,
        session: i.session.intitule,
        dateDebut: i.session.dateDebut,
        dateFin: i.session.dateFin,
        certificat: i.certificat,
      }));
    });
  }
}
