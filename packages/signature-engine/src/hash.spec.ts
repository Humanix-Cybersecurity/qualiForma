// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { canonicalJson, hashPayload, sha256Hex } from './hash';

describe('hash', () => {
  it('sérialise de façon canonique indépendamment de l\'ordre des clés', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it('omet les propriétés undefined', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it('produit la même empreinte pour un contenu équivalent', () => {
    const h1 = hashPayload({ x: 1, y: { z: 2 } });
    const h2 = hashPayload({ y: { z: 2 }, x: 1 });
    expect(h1).toBe(h2);
  });

  it('change d\'empreinte dès que le contenu change', () => {
    expect(hashPayload({ x: 1 })).not.toBe(hashPayload({ x: 2 }));
  });

  it('sha256Hex est un hex de 64 caractères', () => {
    expect(sha256Hex('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});
