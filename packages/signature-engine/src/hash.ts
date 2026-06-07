// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash } from 'node:crypto';

/**
 * Sérialisation canonique : clés triées récursivement, `undefined` omis. Garantit une
 * empreinte reproductible quel que soit l'ordre d'insertion des propriétés.
 */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        if (obj[key] !== undefined) {
          acc[key] = canonicalize(obj[key]);
        }
        return acc;
      }, {});
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Empreinte SHA-256 du contenu canonique signé. */
export function hashPayload(payload: unknown): string {
  return sha256Hex(canonicalJson(payload));
}
