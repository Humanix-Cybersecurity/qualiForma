// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

/** Convertit "HH:MM" en minutes (0 si invalide). */
function minutes(hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

@Injectable()
export class StatsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /** KPIs de pilotage d'un organisme de formation (tableau de bord admin). */
  async dashboard() {
    return this.tenantPrisma.withTenant(async (tx) => {
      const now = new Date();

      const [
        formationsActives,
        sessionsParStatut,
        inscriptionsActives,
        apprenants,
        conventionsParStatut,
        reclamationsOuvertes,
        creneaux,
        prochainesSessions,
      ] = await Promise.all([
        tx.formation.count({ where: { actif: true } }),
        tx.session.groupBy({ by: ['statut'], _count: { _all: true } }),
        tx.inscription.count({ where: { statut: { in: ['prevue', 'confirmee', 'presente'] } } }),
        tx.user.count({ where: { role: 'apprenant' } }),
        tx.convention.groupBy({ by: ['statut'], _count: { _all: true }, _sum: { montantCents: true } }),
        tx.reclamation.count({ where: { statut: { in: ['ouverte', 'en_traitement'] } } }),
        tx.creneau.findMany({ select: { heureDebut: true, heureFin: true } }),
        tx.session.findMany({
          where: { statut: { in: ['planifiee', 'en_cours'] }, dateDebut: { gte: now } },
          orderBy: { dateDebut: 'asc' },
          take: 5,
          include: { formation: { select: { intitule: true } }, _count: { select: { inscriptions: true } } },
        }),
      ]);

      // Sessions terminées dans les faits (date dépassée) mais pas encore clôturées.
      const aCloturer = await tx.session.findMany({
        where: { statut: { in: ['planifiee', 'en_cours'] }, dateFin: { lt: now } },
        orderBy: { dateFin: 'asc' },
        take: 10,
        include: { formation: { select: { intitule: true } } },
      });

      // Heures de formation programmées (somme des durées de créneaux).
      const heuresProgrammees =
        Math.round((creneaux.reduce((acc, c) => acc + Math.max(0, minutes(c.heureFin) - minutes(c.heureDebut)), 0) / 60) * 10) / 10;

      const statutMap = (rows: { statut: string; _count: { _all: number } }[]) =>
        Object.fromEntries(rows.map((r) => [r.statut, r._count._all]));

      const sessions = statutMap(sessionsParStatut);
      const sessionsTotal = Object.values(sessions).reduce((a, b) => a + b, 0);

      const conventions = Object.fromEntries(
        conventionsParStatut.map((r) => [r.statut, { nb: r._count._all, montantCents: r._sum.montantCents ?? 0 }]),
      );
      const caSigneCents = conventionsParStatut
        .filter((r) => r.statut === 'signee')
        .reduce((acc, r) => acc + (r._sum.montantCents ?? 0), 0);

      return {
        formationsActives,
        sessionsTotal,
        sessions,
        sessionsActives: (sessions['planifiee'] ?? 0) + (sessions['en_cours'] ?? 0),
        inscriptionsActives,
        apprenants,
        heuresProgrammees,
        conventions,
        caSigneCents,
        reclamationsOuvertes,
        aCloturer: aCloturer.map((s) => ({
          id: s.id,
          intitule: s.intitule ?? s.formation.intitule,
          dateFin: s.dateFin,
        })),
        prochainesSessions: prochainesSessions.map((s) => ({
          id: s.id,
          intitule: s.intitule ?? s.formation.intitule,
          dateDebut: s.dateDebut,
          inscrits: s._count.inscriptions,
        })),
      };
    });
  }
}
