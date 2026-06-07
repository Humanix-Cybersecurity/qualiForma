// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { DemandeStatut } from '@prisma/client';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { AuditService } from '../audit/audit.service';

export interface DemandeInput {
  sessionId?: string;
  formationId?: string;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string;
  message?: string;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Catalogue PUBLIC : formations actives + sessions à venir (champs non sensibles). */
  async catalogue() {
    return this.tenantPrisma.withTenant(async (tx) => {
      const now = new Date();
      const tenant = await tx.tenant.findFirst({ select: { name: true } });
      const formations = await tx.formation.findMany({
        where: { actif: true },
        orderBy: { intitule: 'asc' },
        select: {
          id: true,
          intitule: true,
          objectifs: true,
          prerequis: true,
          dureeHeures: true,
          tarifCents: true,
          modalitesAccesHandicap: true,
          sessions: {
            where: { statut: 'planifiee', dateDebut: { gte: now } },
            orderBy: { dateDebut: 'asc' },
            select: { id: true, intitule: true, dateDebut: true, dateFin: true, lieu: true },
          },
        },
      });
      return {
        organisme: tenant?.name ?? 'Organisme de formation',
        formations: formations.map((f) => ({
          id: f.id,
          intitule: f.intitule,
          objectifs: f.objectifs,
          prerequis: f.prerequis,
          dureeHeures: Number(f.dureeHeures),
          tarifCents: f.tarifCents,
          modalitesAccesHandicap: f.modalitesAccesHandicap,
          sessions: f.sessions,
        })),
      };
    });
  }

  /** Dépôt PUBLIC d'une demande d'inscription (préinscription). */
  async createDemande(input: DemandeInput) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      // Vérifie l'appartenance des références au tenant (anti-injection d'ID étranger).
      if (input.sessionId) {
        const s = await tx.session.findFirst({ where: { id: input.sessionId }, select: { id: true } });
        if (!s) throw new BadRequestException('Session inconnue.');
      }
      const demande = await tx.demandeInscription.create({
        data: {
          tenantId,
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
          ...(input.formationId ? { formationId: input.formationId } : {}),
          nom: input.nom,
          ...(input.prenom ? { prenom: input.prenom } : {}),
          email: input.email.toLowerCase().trim(),
          ...(input.telephone ? { telephone: input.telephone } : {}),
          ...(input.message ? { message: input.message } : {}),
        },
        select: { id: true },
      });
      return { id: demande.id, recue: true };
    });
  }

  // --- Côté admin ---

  async listDemandes() {
    return this.tenantPrisma.withTenant(async (tx) => {
      const demandes = await tx.demandeInscription.findMany({ orderBy: { createdAt: 'desc' } });
      return demandes;
    });
  }

  async setDemandeStatut(id: string, statut: DemandeStatut) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const d = await tx.demandeInscription.findFirst({ where: { id }, select: { id: true } });
      if (!d) throw new NotFoundException('Demande introuvable.');
      return tx.demandeInscription.update({ where: { id }, data: { statut }, select: { id: true, statut: true } });
    });
  }

  /**
   * Convertit une demande : crée (ou réutilise) le compte apprenant, l'inscrit à la session
   * le cas échéant, et marque la demande convertie. Renvoie le mot de passe temporaire si créé.
   */
  async convertirDemande(id: string, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const demande = await tx.demandeInscription.findFirst({ where: { id } });
      if (!demande) throw new NotFoundException('Demande introuvable.');
      if (demande.statut === 'convertie') throw new BadRequestException('Demande déjà convertie.');

      let user = await tx.user.findFirst({ where: { email: demande.email }, select: { id: true } });
      let temporaryPassword: string | undefined;
      if (!user) {
        temporaryPassword = randomBytes(18).toString('base64url');
        const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });
        user = await tx.user.create({
          data: { tenantId, email: demande.email, passwordHash, role: 'apprenant', prenom: demande.prenom ?? null, nom: demande.nom },
          select: { id: true },
        });
      }
      if (demande.sessionId) {
        await tx.inscription.upsert({
          where: { sessionId_apprenantId: { sessionId: demande.sessionId, apprenantId: user.id } },
          create: { tenantId, sessionId: demande.sessionId, apprenantId: user.id, statut: 'confirmee' },
          update: { statut: 'confirmee' },
          select: { id: true },
        });
      }
      await tx.demandeInscription.update({ where: { id }, data: { statut: 'convertie' } });
      await this.audit.record(tx, {
        action: 'demande.convertir',
        entity: 'demande_inscription',
        entityId: id,
        actorUserId: actor.sub,
        payload: { userId: user.id, sessionId: demande.sessionId },
      });
      return { demandeId: id, userId: user.id, ...(temporaryPassword ? { temporaryPassword } : {}) };
    });
  }
}
