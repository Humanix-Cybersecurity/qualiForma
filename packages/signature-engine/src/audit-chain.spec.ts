// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { computeAuditHash, GENESIS, verifyChain, type ChainEntry } from './audit-chain';

describe('audit-chain', () => {
  it('le premier maillon chaîne sur GENESIS', () => {
    const h = computeAuditHash('payload1', null);
    expect(h).toBe(computeAuditHash('payload1', GENESIS));
  });

  it('valide une chaîne intègre', () => {
    const e1: ChainEntry = { payloadSha256: 'p1', auditPrevHash: null, auditHash: computeAuditHash('p1', null) };
    const e2: ChainEntry = { payloadSha256: 'p2', auditPrevHash: e1.auditHash, auditHash: computeAuditHash('p2', e1.auditHash) };
    const e3: ChainEntry = { payloadSha256: 'p3', auditPrevHash: e2.auditHash, auditHash: computeAuditHash('p3', e2.auditHash) };
    expect(verifyChain([e1, e2, e3])).toEqual({ ok: true, brokenAt: -1 });
  });

  it('détecte l\'altération d\'un payload (auditHash recalculé ne concorde plus)', () => {
    const e1: ChainEntry = { payloadSha256: 'p1', auditPrevHash: null, auditHash: computeAuditHash('p1', null) };
    const falsifie: ChainEntry = { ...e1, payloadSha256: 'p1-modifie' };
    const res = verifyChain([falsifie]);
    expect(res.ok).toBe(false);
    expect(res.brokenAt).toBe(0);
  });

  it('détecte une discontinuité de chaînage', () => {
    const e1: ChainEntry = { payloadSha256: 'p1', auditPrevHash: null, auditHash: computeAuditHash('p1', null) };
    const e2: ChainEntry = { payloadSha256: 'p2', auditPrevHash: 'mauvais-prev', auditHash: computeAuditHash('p2', 'mauvais-prev') };
    const res = verifyChain([e1, e2]);
    expect(res.ok).toBe(false);
    expect(res.brokenAt).toBe(1);
  });
});
