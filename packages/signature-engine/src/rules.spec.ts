// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { computeHeuresPresence, evaluateCreneauCompletude, type SignatureState } from './rules';

describe('computeHeuresPresence', () => {
  it('présence complète sur le créneau', () => {
    expect(computeHeuresPresence('09:00', '12:30')).toBe(3.5);
  });

  it('retard : démarre à l\'heure d\'arrivée réelle', () => {
    expect(computeHeuresPresence('09:00', '12:30', '09:30')).toBe(3);
  });

  it('départ anticipé : borne à l\'heure de départ réelle', () => {
    expect(computeHeuresPresence('09:00', '12:30', undefined, '11:00')).toBe(2);
  });

  it('retard ET départ anticipé', () => {
    expect(computeHeuresPresence('09:00', '12:30', '09:30', '11:30')).toBe(2);
  });

  it('présence nulle si arrivée après la fin', () => {
    expect(computeHeuresPresence('09:00', '12:30', '13:00')).toBe(0);
  });

  it('rejette un horaire mal formé', () => {
    expect(() => computeHeuresPresence('9h', '12:30')).toThrow(/Horaire invalide/);
  });
});

describe('evaluateCreneauCompletude', () => {
  const formateurSigne: SignatureState = { type: 'formateur', statut: 'signe' };

  it('incomplet sans co-signature formateur même si tous les apprenants ont signé', () => {
    const sigs: SignatureState[] = [
      { type: 'apprenant', statut: 'signe' },
      { type: 'apprenant', statut: 'signe' },
    ];
    const res = evaluateCreneauCompletude(sigs, 2);
    expect(res.formateurSigne).toBe(false);
    expect(res.complet).toBe(false);
    expect(res.manquants[0]).toMatch(/formateur/i);
  });

  it('complet quand formateur + tous les apprenants ont signé', () => {
    const sigs: SignatureState[] = [
      formateurSigne,
      { type: 'apprenant', statut: 'signe' },
      { type: 'apprenant', statut: 'signe' },
    ];
    expect(evaluateCreneauCompletude(sigs, 2).complet).toBe(true);
  });

  it('signale les apprenants manquants', () => {
    const sigs: SignatureState[] = [formateurSigne, { type: 'apprenant', statut: 'signe' }];
    const res = evaluateCreneauCompletude(sigs, 3);
    expect(res.apprenantsSignes).toBe(1);
    expect(res.complet).toBe(false);
    expect(res.manquants.some((m) => /2 apprenant/.test(m))).toBe(true);
  });
});
