// SPDX-License-Identifier: AGPL-3.0-or-later
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ConventionStatut } from '@prisma/client';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { AuditService } from '../audit/audit.service';

export interface CreateConventionInput {
  sessionId: string;
  /** Entreprise cliente existante… */
  entrepriseId?: string;
  /** …ou création à la volée (raison sociale requise). */
  entreprise?: { raisonSociale: string; siret?: string; adresse?: string; contactEmail?: string; contactNom?: string };
  montantCents?: number;
}

@Injectable()
export class ConventionsService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Crée une convention (statut brouillon) pour une session, rattachée à une entreprise cliente. */
  async create(input: CreateConventionInput, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      // Verrou par tenant pour sérialiser la génération du numéro.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;

      const session = await tx.session.findFirst({ where: { id: input.sessionId }, select: { id: true } });
      if (!session) throw new NotFoundException('Session introuvable.');

      let entrepriseId = input.entrepriseId ?? null;
      if (!entrepriseId && input.entreprise) {
        const ent = await tx.entrepriseCliente.create({
          data: {
            tenantId,
            raisonSociale: input.entreprise.raisonSociale,
            siret: input.entreprise.siret ?? null,
            adresse: input.entreprise.adresse ?? null,
            contactEmail: input.entreprise.contactEmail ?? null,
            contactNom: input.entreprise.contactNom ?? null,
          },
          select: { id: true },
        });
        entrepriseId = ent.id;
      }
      if (!entrepriseId) {
        throw new BadRequestException('Une entreprise (existante ou nouvelle) est requise.');
      }

      const annee = new Date().getUTCFullYear();
      const count = await tx.convention.count();
      const numero = `CONV-${annee}-${String(count + 1).padStart(4, '0')}`;

      const convention = await tx.convention.create({
        data: {
          tenantId,
          numero,
          sessionId: input.sessionId,
          entrepriseId,
          statut: 'brouillon',
          ...(input.montantCents != null ? { montantCents: input.montantCents } : {}),
        },
        select: { id: true, numero: true, statut: true },
      });

      await this.audit.record(tx, {
        action: 'convention.create',
        entity: 'convention',
        entityId: convention.id,
        actorUserId: actor.sub,
        payload: { numero },
      });
      return convention;
    });
  }

  /** Liste les conventions du tenant (entreprise + session + statut). */
  async list() {
    return this.tenantPrisma.withTenant(async (tx) => {
      const conventions = await tx.convention.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          entreprise: { select: { raisonSociale: true } },
          session: { include: { formation: { select: { intitule: true } } } },
        },
      });
      return conventions.map((c) => ({
        id: c.id,
        numero: c.numero,
        statut: c.statut,
        montantCents: c.montantCents,
        entreprise: c.entreprise?.raisonSociale ?? null,
        formation: c.session?.formation.intitule ?? null,
        sessionId: c.sessionId,
      }));
    });
  }

  /** Fait évoluer le statut d'une convention (brouillon → envoyee → signee/annulee). */
  async setStatut(id: string, statut: ConventionStatut, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const convention = await tx.convention.findFirst({ where: { id }, select: { id: true } });
      if (!convention) throw new NotFoundException('Convention introuvable.');
      const updated = await tx.convention.update({ where: { id }, data: { statut }, select: { id: true, statut: true } });
      await this.audit.record(tx, {
        action: 'convention.statut',
        entity: 'convention',
        entityId: id,
        actorUserId: actor.sub,
        payload: { statut },
      });
      return updated;
    });
  }

  /** Liste les entreprises clientes (pour les sélecteurs). */
  listEntreprises() {
    return this.tenantPrisma.withTenant((tx) =>
      tx.entrepriseCliente.findMany({
        orderBy: { raisonSociale: 'asc' },
        select: { id: true, raisonSociale: true, siret: true },
      }),
    );
  }
}
