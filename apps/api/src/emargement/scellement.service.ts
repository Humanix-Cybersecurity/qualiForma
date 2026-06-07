// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomBytes } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { computeAuditHash, hashPayload } from '@humanix/signature-engine';
import type { AccessClaims } from '@humanix/domain';
import { AuditService } from '../audit/audit.service';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { TsaService } from '../signature/tsa.service';

/**
 * Scellement CONSOLIDÉ d'un créneau (séquence/demi-journée).
 *
 * Optimisation coût (art. L.6362-6) : UN SEUL horodatage qualifié couvre l'empreinte de la
 * feuille d'émargement consolidée (toutes les signatures du créneau), au lieu d'un jeton par
 * signature. Niveau juridique visé : signature AVANCÉE (AES) + horodatage QUALIFIÉ eIDAS.
 * L'enregistrement est immuable (trigger SGBD).
 */
@Injectable()
export class ScellementService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly tsa: TsaService,
    private readonly audit: AuditService,
  ) {}

  async sceller(creneauId: string, user: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.tid}))`;

      const creneau = await tx.creneau.findFirst({
        where: { id: creneauId },
        include: { session: true },
      });
      if (!creneau) throw new NotFoundException('Créneau introuvable.');
      const estFormateur = user.sub === creneau.formateurId || user.sub === creneau.session.formateurId;
      if (user.role !== 'admin_of' && !estFormateur) {
        throw new ForbiddenException('Scellement réservé au formateur du créneau ou à l\'administrateur.');
      }

      // Feuille consolidée : toutes les signatures effectives, ordonnées de façon déterministe.
      const emargements = await tx.emargement.findMany({
        where: { creneauId, statut: 'signe' },
        include: { preuve: { select: { payloadSha256: true, auditHash: true } } },
        orderBy: { userId: 'asc' },
      });

      const consolidated = {
        creneauId: creneau.id,
        sessionId: creneau.sessionId,
        date: creneau.date.toISOString().slice(0, 10),
        periode: creneau.periode,
        heureDebut: creneau.heureDebut,
        heureFin: creneau.heureFin,
        ...(creneau.lieu ? { lieu: creneau.lieu } : {}),
        signatures: emargements.map((e) => ({
          userId: e.userId,
          signataire: e.signataire,
          methode: e.methode,
          payloadSha256: e.preuve?.payloadSha256 ?? null,
          auditHash: e.preuve?.auditHash ?? null,
          timestampServeur: e.timestampServeur?.toISOString() ?? null,
        })),
      };
      const consolidatedSha256 = hashPayload(consolidated);

      // UN SEUL horodatage (qualifié en prod) pour toute la feuille.
      const stamp = await this.tsa.authority().stamp(consolidatedSha256);

      const dernier = await tx.scellementCreneau.findFirst({ orderBy: { createdAt: 'desc' } });
      const auditPrevHash = dernier?.auditHash ?? null;
      const auditHash = computeAuditHash(consolidatedSha256, auditPrevHash);

      const niveau =
        'Signature avancée (AES) + horodatage ' +
        (stamp.type === 'rfc3161' && this.tsa.qualified
          ? 'qualifié eIDAS (RFC 3161)'
          : 'interne (hors production)');

      const scellement = await tx.scellementCreneau.create({
        data: {
          tenantId: user.tid,
          creneauId,
          consolidatedSha256,
          consolidatedPayload: consolidated as object,
          nbSignatures: emargements.length,
          niveau,
          horodatageType: stamp.type,
          ...(stamp.token ? { horodatageToken: stamp.token } : {}),
          auditPrevHash,
          auditHash,
          verificationToken: randomBytes(24).toString('base64url'),
        },
      });

      await this.audit.record(tx, {
        action: 'creneau.scellement',
        entity: 'scellement_creneau',
        entityId: scellement.id,
        actorUserId: user.sub,
        payload: { consolidatedSha256, nbSignatures: emargements.length },
      });

      return {
        id: scellement.id,
        nbSignatures: scellement.nbSignatures,
        consolidatedSha256,
        niveau,
        horodatageType: scellement.horodatageType,
        horodatageQualifie: stamp.type === 'rfc3161' && this.tsa.qualified,
        verificationToken: scellement.verificationToken,
        createdAt: scellement.createdAt,
      };
    });
  }
}
