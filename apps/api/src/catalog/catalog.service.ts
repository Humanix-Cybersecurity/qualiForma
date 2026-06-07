// SPDX-License-Identifier: AGPL-3.0-or-later
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { QuotasService } from '../quotas/quotas.service';
import { AuditService } from '../audit/audit.service';

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
    private readonly audit: AuditService,
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

  /**
   * Rapport de complétude Qualiopi d'une session : détecte les pièces de preuve manquantes
   * AVANT la clôture (indicateur 11/13 — preuve de réalisation). Bloquant = `pret: false`.
   *
   * Règle de clôture : chaque apprenant inscrit (hors abandon/annulation) doit avoir un
   * émargement RÉSOLU (signé, absent ou refus explicite), le formateur doit avoir co-signé,
   * et le créneau doit être SCELLÉ avec un horodatage qualifié.
   */
  async sessionCompletude(sessionId: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const session = await tx.session.findFirst({
        where: { id: sessionId },
        include: {
          formation: { select: { intitule: true } },
          creneaux: { orderBy: [{ date: 'asc' }, { periode: 'asc' }] },
        },
      });
      if (!session) throw new NotFoundException('Session introuvable.');

      const attendus = await tx.inscription.count({
        where: { sessionId, statut: { in: ['prevue', 'confirmee', 'presente'] } },
      });

      const alertes: string[] = [];
      const avertissements: string[] = [];
      if (attendus === 0) alertes.push('Aucun apprenant inscrit à la session.');
      if (session.creneaux.length === 0) alertes.push('Aucun créneau (demi-journée) planifié.');

      const creneaux = [];
      for (const c of session.creneaux) {
        const label = `${c.date.toISOString().slice(0, 10)} (${c.periode})`;
        const emargements = await tx.emargement.findMany({
          where: { creneauId: c.id },
          select: { signataire: true, statut: true },
        });
        const apprenantsResolus = emargements.filter(
          (e) => e.signataire === 'apprenant' && ['signe', 'absent', 'refuse'].includes(e.statut),
        ).length;
        const formateurSigne = emargements.some(
          (e) => e.signataire === 'formateur' && e.statut === 'signe',
        );
        const nonResolus = Math.max(0, attendus - apprenantsResolus);
        const scelle = await tx.scellementCreneau.findFirst({
          where: { creneauId: c.id },
          select: { horodatageType: true, niveau: true, createdAt: true },
        });

        if (nonResolus > 0) {
          alertes.push(`Créneau ${label} : ${nonResolus} émargement(s) non résolu(s).`);
        }
        if (!formateurSigne) {
          alertes.push(`Créneau ${label} : co-signature formateur manquante.`);
        }
        if (!scelle) {
          alertes.push(`Créneau ${label} : non scellé (horodatage de preuve manquant).`);
        } else if (scelle.horodatageType !== 'rfc3161') {
          avertissements.push(
            `Créneau ${label} : scellé avec un horodatage non qualifié (${scelle.horodatageType}).`,
          );
        }

        creneaux.push({
          id: c.id,
          date: c.date,
          periode: c.periode,
          apprenantsResolus,
          attendus,
          formateurSigne,
          scelle: Boolean(scelle),
          horodatageQualifie: scelle?.horodatageType === 'rfc3161',
        });
      }

      return {
        sessionId: session.id,
        intitule: session.intitule ?? session.formation.intitule,
        statut: session.statut,
        attendus,
        creneaux,
        alertes,
        avertissements,
        pret: alertes.length === 0,
      };
    });
  }

  /**
   * Clôture une session (statut → terminee). Refuse si des preuves manquent (`pret: false`),
   * sauf si `force` (réservé admin) — l'écart est alors tracé dans l'audit.
   */
  async cloturerSession(sessionId: string, user: AccessClaims, force = false) {
    const rapport = await this.sessionCompletude(sessionId);
    if (!rapport.pret && !force) {
      throw new BadRequestException({
        message: 'Clôture impossible : pièces de preuve manquantes.',
        alertes: rapport.alertes,
      });
    }
    return this.tenantPrisma.withTenant(async (tx) => {
      await tx.session.update({ where: { id: sessionId }, data: { statut: 'terminee' } });
      await this.audit.record(tx, {
        action: 'session.cloture',
        entity: 'session',
        entityId: sessionId,
        actorUserId: user.sub,
        payload: { force, alertes: rapport.alertes, avertissements: rapport.avertissements },
      });
      return { sessionId, statut: 'terminee' as const, force, alertes: rapport.alertes };
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
