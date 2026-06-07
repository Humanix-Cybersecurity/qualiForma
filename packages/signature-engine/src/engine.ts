// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomBytes } from 'node:crypto';
import { computeAuditHash } from './audit-chain';
import { hashPayload } from './hash';
import type { SignatureProvider, TimestampAuthority } from './ports';
import { SesSignatureProvider, ServerTimestampAuthority } from './providers';
import type {
  EmargementSignatureInput,
  Faisceau,
  ProofRecord,
  SignaturePayload,
  VerificationReport,
} from './types';

export interface SignatureEngineDeps {
  /** Horloge serveur (injectable pour des tests déterministes). */
  clock?: () => Date;
  /** Génère le jeton de vérification (URL-safe). */
  tokenFactory?: () => string;
  signatureProvider?: SignatureProvider;
  timestampAuthority?: TimestampAuthority;
}

export interface SignOptions {
  /** auditHash du maillon précédent du tenant (null pour le premier émargement). */
  prevAuditHash: string | null;
}

/**
 * Moteur d'émargement & signature. Produit, pour un émargement sur un créneau (demi-journée),
 * une preuve complète : empreinte du contenu, faisceau de preuves, maillon d'audit chaîné,
 * horodatage faisant foi et jeton de vérification. Ne touche ni la base ni le réseau.
 */
export class SignatureEngine {
  private readonly clock: () => Date;
  private readonly tokenFactory: () => string;
  private readonly provider: SignatureProvider;
  private readonly tsa: TimestampAuthority;

  constructor(deps: SignatureEngineDeps = {}) {
    this.clock = deps.clock ?? (() => new Date());
    this.tokenFactory = deps.tokenFactory ?? (() => randomBytes(32).toString('base64url'));
    this.provider = deps.signatureProvider ?? new SesSignatureProvider();
    this.tsa = deps.timestampAuthority ?? new ServerTimestampAuthority();
  }

  /** Reconstitue le contenu canonique signé à partir de l'entrée + horodatage serveur. */
  buildPayload(input: EmargementSignatureInput, timestampServeur: string): SignaturePayload {
    return {
      emargementId: input.emargementId,
      creneau: input.creneau,
      signataire: input.signataire,
      methode: input.methode,
      timestampServeur,
    };
  }

  async sign(input: EmargementSignatureInput, options: SignOptions): Promise<ProofRecord> {
    const timestampServeur = this.clock().toISOString();
    const payload = this.buildPayload(input, timestampServeur);
    const payloadSha256 = hashPayload(payload);

    // Horodatage (serveur par défaut ; RFC 3161 si fournisseur qualifié branché).
    const stamp = await this.tsa.stamp(payloadSha256);
    // Attestation de signature (SES par défaut ; SEA via QTSP).
    const attestation = await this.provider.sign(payloadSha256);

    const auditPrevHash = options.prevAuditHash;
    const auditHash = computeAuditHash(payloadSha256, auditPrevHash);

    const faisceau: Faisceau = {
      signataireType: input.signataire.type,
      methode: input.methode,
      timestampServeur,
      signatureLevel: attestation.level,
      horodatageType: stamp.type,
      ...(input.evidence.timestampClient !== undefined && { timestampClient: input.evidence.timestampClient }),
      ...(input.evidence.ip !== undefined && { ip: input.evidence.ip }),
      ...(input.evidence.userAgent !== undefined && { userAgent: input.evidence.userAgent }),
      ...(input.evidence.device !== undefined && { device: input.evidence.device }),
      ...(input.evidence.geoloc !== undefined && { geoloc: input.evidence.geoloc }),
    };

    return {
      emargementId: input.emargementId,
      payloadSha256,
      faisceau,
      signatureLevel: attestation.level,
      horodatageType: stamp.type,
      ...(stamp.token !== undefined && { horodatageToken: stamp.token }),
      auditPrevHash,
      auditHash,
      verificationToken: this.tokenFactory(),
      timestampServeur,
    };
  }

  /** Recalcule l'empreinte du contenu pour détecter une altération des données signées. */
  verifyPayload(payload: SignaturePayload, proof: ProofRecord): boolean {
    return hashPayload(payload) === proof.payloadSha256;
  }

  /** Recalcule le maillon d'audit pour détecter une altération de la chaîne. */
  verifyAuditLink(proof: ProofRecord): boolean {
    return computeAuditHash(proof.payloadSha256, proof.auditPrevHash) === proof.auditHash;
  }

  /**
   * Vérifie une preuve. Si le contenu d'origine (`payload`) est fourni, vérifie aussi que
   * l'empreinte du contenu concorde (intégrité du contenu signé).
   */
  verify(proof: ProofRecord, payload?: SignaturePayload): VerificationReport {
    const auditHashValide = this.verifyAuditLink(proof);
    const raisons: string[] = [];
    if (!auditHashValide) raisons.push('Maillon d\'audit non concordant (chaîne altérée).');

    let payloadHashValide: boolean | undefined;
    if (payload) {
      payloadHashValide = this.verifyPayload(payload, proof);
      if (!payloadHashValide) raisons.push('Empreinte du contenu non concordante (contenu altéré).');
    }

    return {
      ok: auditHashValide && payloadHashValide !== false,
      checks: {
        auditHashValide,
        ...(payloadHashValide !== undefined && { payloadHashValide }),
      },
      raisons,
    };
  }
}
