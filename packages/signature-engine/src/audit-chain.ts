// SPDX-License-Identifier: AGPL-3.0-or-later
import { sha256Hex } from './hash';

/** Marqueur du premier maillon (pas de hash précédent). */
export const GENESIS = 'GENESIS';

/**
 * Maillon d'audit : hash(n) = SHA-256(payloadHash(n) ‖ hash(n-1)).
 * Le `‖` est matérialisé par un séparateur non ambigu. Le premier maillon utilise GENESIS.
 */
export function computeAuditHash(payloadSha256: string, prevHash: string | null): string {
  return sha256Hex(`${payloadSha256}|${prevHash ?? GENESIS}`);
}

export interface ChainEntry {
  payloadSha256: string;
  auditPrevHash: string | null;
  auditHash: string;
}

export interface ChainVerification {
  ok: boolean;
  /** Index (0-based) du premier maillon invalide, ou -1 si la chaîne est intègre. */
  brokenAt: number;
  raison?: string;
}

/**
 * Vérifie une chaîne d'audit ORDONNÉE (du plus ancien au plus récent) :
 *   1. chaque auditHash se recalcule à partir de (payloadSha256, auditPrevHash) ;
 *   2. chaque auditPrevHash référence l'auditHash du maillon précédent (continuité).
 */
export function verifyChain(entries: ChainEntry[]): ChainVerification {
  let prev: string | null = null;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (e.auditPrevHash !== prev) {
      return { ok: false, brokenAt: i, raison: 'Discontinuité du chaînage (prevHash inattendu).' };
    }
    if (computeAuditHash(e.payloadSha256, e.auditPrevHash) !== e.auditHash) {
      return { ok: false, brokenAt: i, raison: 'auditHash recalculé non concordant (altération).' };
    }
    prev = e.auditHash;
  }
  return { ok: true, brokenAt: -1 };
}
