// SPDX-License-Identifier: AGPL-3.0-or-later
// Types du moteur de signature. Indépendants de Prisma/HTTP (package isolé, ADR 0003).
// Les valeurs littérales sont alignées sur les enums du schéma de données.

export type SignataireType = 'apprenant' | 'formateur';
export type EmargementMethode = 'code' | 'qr' | 'manuscrite';
export type SignatureLevel = 'SES' | 'SEA';
export type HorodatageType = 'serveur' | 'rfc3161';

/** Identité minimale du signataire portée dans la preuve. */
export interface Signataire {
  userId: string;
  type: SignataireType;
  /** Nom affiché sur la feuille d'émargement (ex. « Sofia Nguyen »). */
  displayName?: string;
}

/** Données du créneau (demi-journée) intégrées au contenu signé. */
export interface CreneauRef {
  creneauId: string;
  sessionId: string;
  date: string; // YYYY-MM-DD
  periode: 'matin' | 'apres_midi';
  heureDebut: string; // HH:MM
  heureFin: string; // HH:MM
  lieu?: string;
  intituleFormation?: string;
  numeroConvention?: string;
}

/** Éléments contextuels capturés (faisceau de preuves, §8). */
export interface EvidenceContext {
  ip?: string;
  userAgent?: string;
  device?: string;
  geoloc?: { lat: number; lng: number; accuracy?: number } | null;
  /** Horodatage local (offline) — INDICATIF, jamais faisant foi (ADR 0005). */
  timestampClient?: string;
}

/** Entrée d'émargement à signer. */
export interface EmargementSignatureInput {
  tenantId: string;
  emargementId: string;
  creneau: CreneauRef;
  signataire: Signataire;
  methode: EmargementMethode;
  evidence: EvidenceContext;
}

/**
 * Contenu canonique effectivement signé/haché. Sérialisé de façon déterministe (clés triées)
 * pour produire une empreinte SHA-256 reproductible et vérifiable.
 */
export interface SignaturePayload {
  emargementId: string;
  creneau: CreneauRef;
  signataire: Signataire;
  methode: EmargementMethode;
  /** Horodatage SERVEUR faisant foi (ISO 8601). */
  timestampServeur: string;
}

/** Faisceau de preuves complet, stocké tel quel (JSON) dans PreuveSignature.faisceau. */
export interface Faisceau {
  signataireType: SignataireType;
  methode: EmargementMethode;
  timestampServeur: string;
  timestampClient?: string;
  ip?: string;
  userAgent?: string;
  device?: string;
  geoloc?: { lat: number; lng: number; accuracy?: number } | null;
  signatureLevel: SignatureLevel;
  horodatageType: HorodatageType;
}

/** Preuve de signature produite par le moteur (correspond à l'entité PreuveSignature). */
export interface ProofRecord {
  emargementId: string;
  payloadSha256: string;
  faisceau: Faisceau;
  signatureLevel: SignatureLevel;
  horodatageType: HorodatageType;
  horodatageToken?: string;
  /** Chaînage d'audit : hash(n) = SHA-256(payloadHash(n) ‖ hash(n-1)). */
  auditPrevHash: string | null;
  auditHash: string;
  /** Jeton du lien de vérification d'authenticité (URL + QR sur le PDF). */
  verificationToken: string;
  timestampServeur: string;
}

/** Rapport de vérification d'intégrité. */
export interface VerificationReport {
  ok: boolean;
  checks: {
    /** L'empreinte du contenu correspond (contenu signé non altéré). */
    payloadHashValide?: boolean;
    /** Le maillon d'audit recalculé correspond (chaîne non altérée). */
    auditHashValide: boolean;
  };
  raisons: string[];
}
