// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { verifyChain, type ChainEntry } from './audit-chain';
import { SignatureEngine } from './engine';
import type { SignatureAttestation, SignatureProvider } from './ports';
import { QualifiedTimestampAuthority } from './providers';
import type { EmargementSignatureInput } from './types';

function inputFor(emargementId: string, overrides: Partial<EmargementSignatureInput> = {}): EmargementSignatureInput {
  return {
    tenantId: 't1',
    emargementId,
    creneau: {
      creneauId: 'cr1',
      sessionId: 's1',
      date: '2026-06-15',
      periode: 'matin',
      heureDebut: '09:00',
      heureFin: '12:30',
      lieu: 'Paris',
      intituleFormation: 'Cybersécurité',
      numeroConvention: 'CONV-2026-0001',
    },
    signataire: { userId: 'u1', type: 'apprenant', displayName: 'Sofia Nguyen' },
    methode: 'qr',
    evidence: { ip: '203.0.113.5', userAgent: 'jest', timestampClient: '2026-06-15T09:04:30.000Z' },
    ...overrides,
  };
}

// Moteur déterministe (horloge + token figés) pour des assertions stables.
function deterministicEngine() {
  let n = 0;
  return new SignatureEngine({
    clock: () => new Date('2026-06-15T09:05:00.000Z'),
    tokenFactory: () => `tok-${++n}`,
  });
}

describe('SignatureEngine.sign', () => {
  it('produit une preuve complète avec horodatage serveur faisant foi', async () => {
    const engine = deterministicEngine();
    const proof = await engine.sign(inputFor('e1'), { prevAuditHash: null });

    expect(proof.payloadSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(proof.auditHash).toMatch(/^[0-9a-f]{64}$/);
    expect(proof.auditPrevHash).toBeNull();
    expect(proof.signatureLevel).toBe('SES');
    expect(proof.horodatageType).toBe('serveur');
    expect(proof.verificationToken).toBe('tok-1');
    // Horodatage serveur faisant foi ; client conservé comme indicatif (ADR 0005).
    expect(proof.timestampServeur).toBe('2026-06-15T09:05:00.000Z');
    expect(proof.faisceau.timestampClient).toBe('2026-06-15T09:04:30.000Z');
    expect(proof.faisceau.timestampServeur).not.toBe(proof.faisceau.timestampClient);
    expect(proof.faisceau.ip).toBe('203.0.113.5');
  });

  it('vérifie une preuve intègre, détecte un contenu altéré', async () => {
    const engine = deterministicEngine();
    const input = inputFor('e1');
    const proof = await engine.sign(input, { prevAuditHash: null });
    const payload = engine.buildPayload(input, proof.timestampServeur);

    expect(engine.verify(proof, payload).ok).toBe(true);

    const payloadFalsifie = { ...payload, signataire: { ...payload.signataire, userId: 'autre' } };
    const report = engine.verify(proof, payloadFalsifie);
    expect(report.ok).toBe(false);
    expect(report.checks.payloadHashValide).toBe(false);
  });

  it('détecte un maillon d\'audit altéré', async () => {
    const engine = deterministicEngine();
    const proof = await engine.sign(inputFor('e1'), { prevAuditHash: null });
    const falsifie = { ...proof, auditHash: 'deadbeef' };
    const report = engine.verify(falsifie);
    expect(report.ok).toBe(false);
    expect(report.checks.auditHashValide).toBe(false);
  });

  it('chaîne plusieurs émargements de façon vérifiable', async () => {
    const engine = deterministicEngine();
    const p1 = await engine.sign(inputFor('e1'), { prevAuditHash: null });
    const p2 = await engine.sign(inputFor('e2'), { prevAuditHash: p1.auditHash });
    const p3 = await engine.sign(inputFor('e3'), { prevAuditHash: p2.auditHash });

    const chain: ChainEntry[] = [p1, p2, p3].map((p) => ({
      payloadSha256: p.payloadSha256,
      auditPrevHash: p.auditPrevHash,
      auditHash: p.auditHash,
    }));
    expect(verifyChain(chain).ok).toBe(true);
  });

  it('branche un fournisseur SEA (QTSP) sans modifier le moteur', async () => {
    const seaProvider: SignatureProvider = {
      level: 'SEA',
      async sign(): Promise<SignatureAttestation> {
        return { level: 'SEA', detail: { qtsp: 'demo-qtsp' } };
      },
      async verify() {
        return true;
      },
    };
    const engine = new SignatureEngine({ signatureProvider: seaProvider });
    const proof = await engine.sign(inputFor('e1'), { prevAuditHash: null });
    expect(proof.signatureLevel).toBe('SEA');
    expect(proof.faisceau.signatureLevel).toBe('SEA');
  });

  it('branche un horodatage qualifié RFC 3161 et capture le jeton', async () => {
    const tsa = new QualifiedTimestampAuthority(async (digest) => `TST:${digest.slice(0, 8)}`);
    const engine = new SignatureEngine({ timestampAuthority: tsa });
    const proof = await engine.sign(inputFor('e1'), { prevAuditHash: null });
    expect(proof.horodatageType).toBe('rfc3161');
    expect(proof.horodatageToken).toMatch(/^TST:/);
    expect(proof.faisceau.horodatageType).toBe('rfc3161');
  });
});
