// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomInt, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SignatureEngine,
  evaluateCreneauCompletude,
  type EmargementSignatureInput,
  type SignataireType,
  type SignatureStatut,
  type SignaturePayload,
} from '@humanix/signature-engine';
import type { AccessClaims } from '@humanix/domain';
import { TenantPrismaService, type TenantClient } from '../prisma/tenant-prisma.service';
import { requireTenantContext } from '../tenant/tenant-context';

export interface SignInput {
  methode: 'code' | 'qr' | 'manuscrite';
  code?: string;
  geoloc?: { lat: number; lng: number; accuracy?: number };
  timestampClient?: string;
}

@Injectable()
export class EmargementService {
  private readonly engine = new SignatureEngine();

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /** Le formateur (ou l'admin) ouvre la fenêtre de signature et obtient le code à afficher. */
  async ouvrirSignature(creneauId: string, user: AccessClaims): Promise<{ code: string }> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const creneau = await this.loadCreneauForFormateur(tx, creneauId, user);
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await tx.creneau.update({
        where: { id: creneau.id },
        data: { signatureOuverte: true, signatureOuverteAt: new Date(), signatureCode: code },
      });
      return { code };
    });
  }

  async fermerSignature(creneauId: string, user: AccessClaims): Promise<void> {
    await this.tenantPrisma.withTenant(async (tx) => {
      const creneau = await this.loadCreneauForFormateur(tx, creneauId, user);
      await tx.creneau.update({
        where: { id: creneau.id },
        data: { signatureOuverte: false, signatureCode: null },
      });
    });
  }

  /**
   * Signe le créneau pour l'utilisateur courant. Produit une preuve complète (faisceau +
   * maillon d'audit chaîné). Idempotent : re-signer renvoie l'émargement existant.
   */
  async signer(
    creneauId: string,
    user: AccessClaims,
    input: SignInput,
    meta: { ip?: string; userAgent?: string },
  ) {
    return this.tenantPrisma.withTenant(async (tx) => {
      // Sérialise les écritures de la chaîne d'audit par tenant (chaînage linéaire fiable).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.tid}))`;

      const creneau = await tx.creneau.findFirst({
        where: { id: creneauId },
        include: { session: true },
      });
      if (!creneau) throw new NotFoundException('Créneau introuvable.');
      if (!creneau.signatureOuverte) {
        throw new ConflictException('La fenêtre de signature de ce créneau est fermée.');
      }

      const signataire = this.resolveSignataireType(user);
      await this.assertSignataireAutorise(tx, creneau, user, signataire);

      // Méthodes code/qr : le code affiché par le formateur doit correspondre.
      if (input.methode !== 'manuscrite') {
        if (!input.code || input.code !== creneau.signatureCode) {
          throw new BadRequestException('Code de signature invalide.');
        }
      }

      // Idempotence : si déjà signé, renvoie l'émargement existant sans nouvelle preuve.
      const existant = await tx.emargement.findFirst({
        where: { creneauId, userId: user.sub },
        include: { preuve: true },
      });
      if (existant?.statut === 'signe' && existant.preuve) {
        return this.toEmargementResponse(existant, existant.preuve.verificationToken);
      }

      // Tête de chaîne d'audit du tenant.
      const dernier = await tx.preuveSignature.findFirst({ orderBy: { createdAt: 'desc' } });
      const prevAuditHash = dernier?.auditHash ?? null;

      const emargementId = existant?.id ?? randomUUID();
      const signInput: EmargementSignatureInput = {
        tenantId: user.tid,
        emargementId,
        creneau: {
          creneauId: creneau.id,
          sessionId: creneau.sessionId,
          date: creneau.date.toISOString().slice(0, 10),
          periode: creneau.periode,
          heureDebut: creneau.heureDebut,
          heureFin: creneau.heureFin,
          ...(creneau.lieu ? { lieu: creneau.lieu } : {}),
        },
        signataire: { userId: user.sub, type: signataire },
        methode: input.methode,
        evidence: {
          ...(meta.ip ? { ip: meta.ip } : {}),
          ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
          ...(input.geoloc ? { geoloc: input.geoloc } : {}),
          ...(input.timestampClient ? { timestampClient: input.timestampClient } : {}),
        },
      };

      const proof = await this.engine.sign(signInput, { prevAuditHash });

      const emargement = await tx.emargement.upsert({
        where: { creneauId_userId: { creneauId, userId: user.sub } },
        create: {
          id: emargementId,
          tenantId: user.tid,
          creneauId,
          userId: user.sub,
          signataire,
          methode: input.methode,
          statut: 'signe',
          timestampServeur: new Date(proof.timestampServeur),
          ...(input.timestampClient ? { timestampClient: new Date(input.timestampClient) } : {}),
          ...(meta.ip ? { ip: meta.ip } : {}),
          ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
          ...(input.geoloc ? { geoloc: input.geoloc } : {}),
          hashPayload: proof.payloadSha256,
        },
        update: {
          signataire,
          methode: input.methode,
          statut: 'signe',
          timestampServeur: new Date(proof.timestampServeur),
          hashPayload: proof.payloadSha256,
        },
      });

      await tx.preuveSignature.create({
        data: {
          tenantId: user.tid,
          emargementId: emargement.id,
          payloadSha256: proof.payloadSha256,
          faisceau: proof.faisceau as object,
          signatureLevel: proof.signatureLevel,
          horodatageType: proof.horodatageType,
          ...(proof.horodatageToken ? { horodatageToken: proof.horodatageToken } : {}),
          auditPrevHash: proof.auditPrevHash,
          auditHash: proof.auditHash,
          verificationToken: proof.verificationToken,
        },
      });

      return this.toEmargementResponse(emargement, proof.verificationToken);
    });
  }

  /** Créneaux de l'utilisateur courant (apprenant : ses sessions ; formateur : qu'il anime). */
  async mesCreneaux(user: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      let where: object;
      if (user.role === 'formateur') {
        where = {
          OR: [{ formateurId: user.sub }, { session: { formateurId: user.sub } }],
        };
      } else {
        const inscriptions = await tx.inscription.findMany({
          where: { apprenantId: user.sub, statut: { not: 'annulee' } },
          select: { sessionId: true },
        });
        where = { sessionId: { in: inscriptions.map((i) => i.sessionId) } };
      }

      const creneaux = await tx.creneau.findMany({
        where,
        orderBy: [{ date: 'asc' }, { ordre: 'asc' }],
        include: {
          session: { include: { formation: { select: { intitule: true } } } },
          emargements: { where: { userId: user.sub }, select: { statut: true } },
        },
      });

      return creneaux.map((c) => ({
        id: c.id,
        sessionId: c.sessionId,
        date: c.date.toISOString().slice(0, 10),
        periode: c.periode,
        heureDebut: c.heureDebut,
        heureFin: c.heureFin,
        lieu: c.lieu,
        formationIntitule: c.session.formation.intitule,
        signatureOuverte: c.signatureOuverte,
        monStatut: c.emargements[0]?.statut ?? 'en_attente',
      }));
    });
  }

  /** État d'émargement d'un créneau pour le contrôle formateur (complétude + manquants). */
  async etatCreneau(creneauId: string, user: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const creneau = await this.loadCreneauForFormateur(tx, creneauId, user);
      const inscriptions = await tx.inscription.findMany({
        where: { sessionId: creneau.sessionId, statut: { not: 'annulee' } },
        include: { apprenant: { select: { id: true, prenom: true, nom: true, email: true } } },
      });
      const emargements = await tx.emargement.findMany({ where: { creneauId } });
      const parUser = new Map(emargements.map((e) => [e.userId, e]));

      const apprenants = inscriptions.map((ins) => {
        const e = parUser.get(ins.apprenantId);
        return {
          userId: ins.apprenantId,
          nom: [ins.apprenant.prenom, ins.apprenant.nom].filter(Boolean).join(' ') || ins.apprenant.email,
          statut: (e?.statut ?? 'en_attente') as SignatureStatut,
          methode: e?.methode ?? null,
          timestampServeur: e?.timestampServeur ?? null,
        };
      });

      const formateurEmargement = emargements.find((e) => e.signataire === 'formateur');
      const signatures: { type: SignataireType; statut: SignatureStatut }[] = [
        ...apprenants.map((a) => ({ type: 'apprenant' as const, statut: a.statut })),
        { type: 'formateur' as const, statut: (formateurEmargement?.statut ?? 'en_attente') as SignatureStatut },
      ];
      const completude = evaluateCreneauCompletude(signatures, apprenants.length);

      return {
        creneauId,
        signatureOuverte: creneau.signatureOuverte,
        formateur: { statut: (formateurEmargement?.statut ?? 'en_attente') as SignatureStatut },
        apprenants,
        completude,
      };
    });
  }

  /** Vérifie l'authenticité d'un émargement via son jeton (lien/QR du PDF). */
  async verifier(token: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const preuve = await tx.preuveSignature.findFirst({
        where: { verificationToken: token },
        include: { emargement: { include: { creneau: true } } },
      });
      if (!preuve) throw new NotFoundException('Preuve introuvable.');

      const e = preuve.emargement;
      const c = e.creneau;
      const payload: SignaturePayload = {
        emargementId: e.id,
        creneau: {
          creneauId: c.id,
          sessionId: c.sessionId,
          date: c.date.toISOString().slice(0, 10),
          periode: c.periode,
          heureDebut: c.heureDebut,
          heureFin: c.heureFin,
          ...(c.lieu ? { lieu: c.lieu } : {}),
        },
        signataire: { userId: e.userId, type: e.signataire as SignataireType },
        methode: e.methode,
        timestampServeur: (e.timestampServeur ?? new Date(0)).toISOString(),
      };

      const proofRecord = {
        emargementId: e.id,
        payloadSha256: preuve.payloadSha256,
        faisceau: preuve.faisceau as never,
        signatureLevel: preuve.signatureLevel,
        horodatageType: preuve.horodatageType,
        ...(preuve.horodatageToken ? { horodatageToken: preuve.horodatageToken } : {}),
        auditPrevHash: preuve.auditPrevHash,
        auditHash: preuve.auditHash,
        verificationToken: preuve.verificationToken,
        timestampServeur: (e.timestampServeur ?? new Date(0)).toISOString(),
      };

      const report = this.engine.verify(proofRecord, payload);
      return {
        token,
        emargementId: e.id,
        signataire: { userId: e.userId, type: e.signataire },
        creneau: { date: payload.creneau.date, periode: payload.creneau.periode },
        timestampServeur: e.timestampServeur,
        signatureLevel: preuve.signatureLevel,
        horodatageType: preuve.horodatageType,
        authentique: report.ok,
        verification: report,
      };
    });
  }

  // --- internes ---

  private resolveSignataireType(user: AccessClaims): SignataireType {
    if (user.role === 'formateur') return 'formateur';
    if (user.role === 'apprenant') return 'apprenant';
    throw new ForbiddenException('Seuls le formateur et l\'apprenant peuvent émarger.');
  }

  private async assertSignataireAutorise(
    tx: TenantClient,
    creneau: { id: string; sessionId: string; formateurId: string | null; session: { formateurId: string | null } },
    user: AccessClaims,
    type: SignataireType,
  ): Promise<void> {
    if (type === 'formateur') {
      if (user.sub !== creneau.formateurId && user.sub !== creneau.session.formateurId) {
        throw new ForbiddenException('Vous n\'animez pas ce créneau.');
      }
      return;
    }
    const inscrit = await tx.inscription.findFirst({
      where: { sessionId: creneau.sessionId, apprenantId: user.sub, statut: { not: 'annulee' } },
    });
    if (!inscrit) throw new ForbiddenException('Vous n\'êtes pas inscrit·e à cette session.');
  }

  private async loadCreneauForFormateur(tx: TenantClient, creneauId: string, user: AccessClaims) {
    const creneau = await tx.creneau.findFirst({
      where: { id: creneauId },
      include: { session: true },
    });
    if (!creneau) throw new NotFoundException('Créneau introuvable.');
    const estFormateur = user.sub === creneau.formateurId || user.sub === creneau.session.formateurId;
    if (user.role !== 'admin_of' && !estFormateur) {
      throw new ForbiddenException('Action réservée au formateur du créneau ou à l\'administrateur.');
    }
    return creneau;
  }

  private toEmargementResponse(
    e: { id: string; signataire: string; methode: string; statut: string; timestampServeur: Date | null },
    verificationToken: string,
  ) {
    return {
      id: e.id,
      signataire: e.signataire,
      methode: e.methode,
      statut: e.statut,
      timestampServeur: e.timestampServeur,
      verificationToken,
    };
  }
}
