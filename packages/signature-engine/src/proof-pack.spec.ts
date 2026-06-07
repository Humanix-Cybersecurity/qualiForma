// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { computeAuditHash } from './audit-chain';
import { hashPayload } from './hash';
import { verifyProofPack, type ProofPack } from './proof-pack';
import type { SignaturePayload } from './types';

function buildValidPack(): ProofPack {
  const payload: SignaturePayload = {
    emargementId: 'e1',
    creneau: { creneauId: 'c1', sessionId: 's1', date: '2026-06-15', periode: 'matin', heureDebut: '09:00', heureFin: '12:30' },
    signataire: { userId: 'u1', type: 'apprenant' },
    methode: 'qr',
    timestampServeur: '2026-06-15T09:05:00.000Z',
  };
  const payloadSha256 = hashPayload(payload);
  const sigAudit = computeAuditHash(payloadSha256, null);

  const consolidatedPayload = { creneauId: 'c1', sessions: 1, signatures: [payloadSha256] };
  const consolidatedSha256 = hashPayload(consolidatedPayload);
  const consolidatedAudit = computeAuditHash(consolidatedSha256, null);

  return {
    version: '1',
    niveau: 'Signature avancée (AES) + horodatage qualifié eIDAS',
    generatedAt: '2026-06-15T10:00:00.000Z',
    organisme: { nom: 'OF Démo' },
    contexte: { formation: 'Cybersécurité', date: '2026-06-15', periode: 'matin' },
    scellement: {
      consolidatedPayload,
      consolidatedSha256,
      nbSignatures: 1,
      auditPrevHash: null,
      auditHash: consolidatedAudit,
      horodatageType: 'serveur',
      verificationToken: 'tok',
      createdAt: '2026-06-15T10:00:00.000Z',
    },
    signatures: [
      {
        emargementId: 'e1',
        signataire: 'apprenant',
        methode: 'qr',
        payload,
        payloadSha256,
        auditPrevHash: null,
        auditHash: sigAudit,
        verificationToken: 'v1',
        timestampServeur: '2026-06-15T09:05:00.000Z',
      },
    ],
  };
}

describe('verifyProofPack', () => {
  it('valide un pack intègre', () => {
    const res = verifyProofPack(buildValidPack());
    expect(res.ok).toBe(true);
    expect(res.checks.every((c) => c.ok)).toBe(true);
  });

  it('détecte une feuille consolidée altérée', () => {
    const pack = buildValidPack();
    pack.scellement.consolidatedPayload = { creneauId: 'c1', sessions: 1, signatures: ['ALTERE'] };
    const res = verifyProofPack(pack);
    expect(res.ok).toBe(false);
    expect(res.checks.find((c) => c.nom.includes('feuille consolidée'))!.ok).toBe(false);
  });

  it('détecte une signature altérée', () => {
    const pack = buildValidPack();
    pack.signatures[0]!.payload.signataire.userId = 'autre';
    const res = verifyProofPack(pack);
    expect(res.ok).toBe(false);
  });

  it('détecte un maillon d\'audit du scellement altéré', () => {
    const pack = buildValidPack();
    pack.scellement.auditHash = 'deadbeef';
    expect(verifyProofPack(pack).ok).toBe(false);
  });
});
