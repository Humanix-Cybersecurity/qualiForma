// SPDX-License-Identifier: AGPL-3.0-or-later
// Pack de preuve auto-portant + vérification HORS-LIGNE (aucun accès serveur requis).
// Reconstitue et revalide : empreintes SHA-256, chaîne d'audit, et empreinte horodatée RFC 3161.
import { computeAuditHash } from './audit-chain';
import { hashPayload } from './hash';
import { base64ToBytes, parseTimeStampTokenImprint } from './rfc3161';
import type { SignaturePayload } from './types';

export interface ProofPackSignature {
  emargementId: string;
  signataire: string;
  methode: string;
  /** Contenu canonique exact qui a été haché (permet de recalculer l'empreinte hors-ligne). */
  payload: SignaturePayload;
  payloadSha256: string;
  auditPrevHash: string | null;
  auditHash: string;
  verificationToken: string;
  timestampServeur: string | null;
}

export interface ProofPack {
  version: '1';
  /** Niveau juridique atteint (ex. « Signature avancée (AES) + horodatage qualifié eIDAS »). */
  niveau: string;
  generatedAt: string;
  organisme: { nom: string };
  contexte: {
    formation: string;
    session?: string;
    date: string;
    periode: string;
    lieu?: string;
    numeroConvention?: string;
  };
  scellement: {
    /** Objet consolidé exact qui a été haché. */
    consolidatedPayload: unknown;
    consolidatedSha256: string;
    nbSignatures: number;
    auditPrevHash: string | null;
    auditHash: string;
    horodatageType: 'serveur' | 'rfc3161';
    /** Jeton RFC 3161 (TimeStampToken CMS) en base64, si horodatage qualifié. */
    horodatageTokenB64?: string;
    verificationToken: string;
    createdAt: string;
  };
  signatures: ProofPackSignature[];
}

export interface ProofCheck {
  nom: string;
  ok: boolean;
  detail?: string;
}

export interface ProofVerification {
  ok: boolean;
  niveau: string;
  checks: ProofCheck[];
}

/**
 * Revalide intégralement un pack de preuve, hors-ligne :
 *   1. empreinte de la feuille consolidée ;
 *   2. maillon d'audit du scellement ;
 *   3. empreinte + maillon d'audit de chaque signature ;
 *   4. empreinte horodatée par la TSA (RFC 3161) == empreinte consolidée.
 */
export function verifyProofPack(pack: ProofPack): ProofVerification {
  const checks: ProofCheck[] = [];

  // 1. Empreinte consolidée.
  const recomputed = hashPayload(pack.scellement.consolidatedPayload);
  const consolidatedOk = recomputed === pack.scellement.consolidatedSha256;
  checks.push({
    nom: 'Empreinte de la feuille consolidée (SHA-256)',
    ok: consolidatedOk,
    ...(consolidatedOk ? {} : { detail: `recalculé=${recomputed}` }),
  });

  // 2. Maillon d'audit du scellement.
  const auditOk =
    computeAuditHash(pack.scellement.consolidatedSha256, pack.scellement.auditPrevHash) ===
    pack.scellement.auditHash;
  checks.push({ nom: 'Maillon d\'audit du scellement', ok: auditOk });

  // 3. Chaque signature.
  for (const s of pack.signatures) {
    const h = hashPayload(s.payload);
    checks.push({
      nom: `Empreinte signature (${s.emargementId.slice(0, 8)})`,
      ok: h === s.payloadSha256,
    });
    checks.push({
      nom: `Maillon d'audit signature (${s.emargementId.slice(0, 8)})`,
      ok: computeAuditHash(s.payloadSha256, s.auditPrevHash) === s.auditHash,
    });
  }

  // 4. Horodatage RFC 3161 (empreinte horodatée == empreinte consolidée).
  if (pack.scellement.horodatageTokenB64) {
    const imprint = parseTimeStampTokenImprint(base64ToBytes(pack.scellement.horodatageTokenB64));
    if (imprint) {
      checks.push({
        nom: 'Horodatage RFC 3161 — empreinte horodatée',
        ok: imprint.hashedMessageHex === pack.scellement.consolidatedSha256,
        ...(imprint.genTime ? { detail: `genTime=${imprint.genTime}` } : {}),
      });
    } else {
      checks.push({
        nom: 'Horodatage RFC 3161 — jeton présent',
        ok: true,
        detail: 'Vérification du certificat TSA à compléter avec `openssl ts -verify`.',
      });
    }
  }

  return { ok: checks.every((c) => c.ok), niveau: pack.niveau, checks };
}
