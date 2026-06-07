// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  renderConvention,
  renderConvocation,
  renderProgramme,
  renderReglementInterieur,
} from './qualiopi';

const org = { nom: 'OF Démo', nda: '11AB' };
const magic = (b: Uint8Array) => Buffer.from(b.slice(0, 4)).toString();

describe('gabarits Qualiopi', () => {
  it('convention', async () => {
    const b = await renderConvention({
      organisme: org, numero: 'CONV-1', entreprise: 'ACME', formationIntitule: 'Cyber',
      dateDebut: '2026-06-15', dateFin: '2026-06-16', dureeHeures: 14, montantCents: 120000,
      apprenants: ['Sofia Nguyen', 'Hugo Martin'], generatedAt: '2026-06-01T00:00:00Z',
    });
    expect(magic(b)).toBe('%PDF');
  });
  it('convocation', async () => {
    const b = await renderConvocation({
      organisme: org, apprenantNom: 'Sofia Nguyen', formationIntitule: 'Cyber',
      dateDebut: '2026-06-15', dateFin: '2026-06-16', lieu: 'Paris', generatedAt: '2026-06-01T00:00:00Z',
    });
    expect(magic(b)).toBe('%PDF');
  });
  it('programme', async () => {
    const b = await renderProgramme({
      organisme: org, formationIntitule: 'Cyber', dureeHeures: 14, generatedAt: '2026-06-01T00:00:00Z',
    });
    expect(magic(b)).toBe('%PDF');
  });
  it('règlement intérieur', async () => {
    const b = await renderReglementInterieur({ organisme: org, generatedAt: '2026-06-01T00:00:00Z' });
    expect(magic(b)).toBe('%PDF');
  });
});
