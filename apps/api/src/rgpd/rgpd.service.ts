// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';
import { AuditService } from '../audit/audit.service';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class RgpdService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Droit d'accès / portabilité : export structuré des données de l'utilisateur courant. */
  async exportMyData(user: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const profil = await tx.user.findFirst({
        where: { id: user.sub },
        select: { id: true, email: true, prenom: true, nom: true, role: true, createdAt: true },
      });
      const inscriptions = await tx.inscription.findMany({
        where: { apprenantId: user.sub },
        select: { id: true, sessionId: true, statut: true, dateInscription: true },
      });
      const emargements = await tx.emargement.findMany({
        where: { userId: user.sub },
        select: { creneauId: true, statut: true, methode: true, timestampServeur: true },
      });
      const soumissions = await tx.questionnaireSoumission.findMany({
        where: { inscription: { apprenantId: user.sub } },
        select: { id: true, questionnaireId: true, submittedAt: true },
      });
      return { exportedAt: new Date().toISOString(), profil, inscriptions, emargements, soumissions };
    });
  }

  /**
   * Droit à l'effacement avec LEGAL HOLD : les données probatoires (émargements, preuves,
   * audit) sont conservées (≥ 4 ans, ADR 0003/§13). On PSEUDONYMISE donc l'utilisateur plutôt
   * que de le supprimer : l'identité est effacée, les preuves restent intègres et vérifiables.
   */
  async anonymizeUser(userId: string, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const target = await tx.user.findFirst({ where: { id: userId } });
      if (!target) throw new NotFoundException('Utilisateur introuvable.');

      const tag = randomBytes(6).toString('hex');
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `anonyme-${tag}@supprime.local`,
          prenom: null,
          nom: null,
          isActive: false,
          mfaEnabled: false,
          mfaSecretEnc: null,
          handicapAdaptations: null,
          // Mot de passe rendu inutilisable (valeur non vérifiable par argon2).
          passwordHash: `disabled:${randomBytes(16).toString('hex')}`,
        },
      });
      // Révoque les sessions actives.
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.audit.record(tx, {
        action: 'rgpd.anonymisation',
        entity: 'app_user',
        entityId: userId,
        actorUserId: actor.sub,
        payload: { legalHold: true, raison: 'droit_effacement' },
      });

      return {
        anonymise: true,
        userId,
        legalHold: 'Émargements, preuves de signature et journal d\'audit conservés (≥ 4 ans).',
      };
    });
  }
}
