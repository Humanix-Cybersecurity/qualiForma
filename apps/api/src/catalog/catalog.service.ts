// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable } from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

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
