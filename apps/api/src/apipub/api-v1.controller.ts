// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

/**
 * API publique v1 (LECTURE seule). Authentifiée par clé d'API (ApiKeyMiddleware) ; le tenant
 * est déjà résolu dans le contexte ALS → toutes les requêtes restent sous RLS.
 */
@Controller('api/v1')
export class ApiV1Controller {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  @Get('formations')
  formations() {
    return this.tenantPrisma.withTenant((tx) =>
      tx.formation.findMany({
        where: { actif: true },
        orderBy: { intitule: 'asc' },
        select: { id: true, intitule: true, dureeHeures: true, tarifCents: true, indicateursQualiopi: true },
      }),
    );
  }

  @Get('sessions')
  sessions() {
    return this.tenantPrisma.withTenant(async (tx) => {
      const sessions = await tx.session.findMany({
        orderBy: { dateDebut: 'desc' },
        include: { formation: { select: { intitule: true } }, _count: { select: { inscriptions: true, creneaux: true } } },
      });
      return sessions.map((s) => ({
        id: s.id,
        formation: s.formation.intitule,
        intitule: s.intitule,
        statut: s.statut,
        dateDebut: s.dateDebut,
        dateFin: s.dateFin,
        lieu: s.lieu,
        inscrits: s._count.inscriptions,
        creneaux: s._count.creneaux,
      }));
    });
  }

  @Get('sessions/:id')
  session(@Param('id') id: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const s = await tx.session.findFirst({
        where: { id },
        include: {
          formation: { select: { intitule: true } },
          creneaux: { orderBy: [{ date: 'asc' }, { periode: 'asc' }], select: { id: true, date: true, periode: true, heureDebut: true, heureFin: true } },
        },
      });
      if (!s) throw new NotFoundException('Session introuvable.');
      return {
        id: s.id,
        formation: s.formation.intitule,
        statut: s.statut,
        dateDebut: s.dateDebut,
        dateFin: s.dateFin,
        creneaux: s.creneaux,
      };
    });
  }
}
