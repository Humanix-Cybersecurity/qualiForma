// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { renderCertificat } from './certificat';
import { renderDecompte } from './decompte';
import { renderFeuilleEmargement } from './emargement';

const PDF_MAGIC = '%PDF';

describe('gabarits PDF', () => {
  it('feuille d\'émargement : PDF valide avec QR de vérification', async () => {
    const bytes = await renderFeuilleEmargement({
      organisme: { nom: 'OF Démo', nda: '11AB' },
      formationIntitule: 'Cybersécurité',
      numeroConvention: 'CONV-2026-0001',
      sessionDateDebut: '2026-06-15',
      sessionDateFin: '2026-06-16',
      sessionLieu: 'Paris',
      creneaux: [
        {
          date: '2026-06-15',
          periode: 'matin',
          heureDebut: '09:00',
          heureFin: '12:30',
          signatures: [
            { nom: 'Sofia Nguyen', role: 'apprenant', statut: 'signe', timestampServeur: '2026-06-15T09:05:00.000Z', verificationUrl: 'https://demo.humanix.app/verification/abc' },
            { nom: 'Karim Benali', role: 'formateur', statut: 'signe', timestampServeur: '2026-06-15T09:06:00.000Z', verificationUrl: 'https://demo.humanix.app/verification/def' },
          ],
        },
      ],
      generatedAt: '2026-06-15T10:00:00.000Z',
    });
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe(PDF_MAGIC);
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('certificat : PDF valide', async () => {
    const bytes = await renderCertificat({
      organisme: { nom: 'OF Démo' },
      apprenantNom: 'Sofia Nguyen',
      formationIntitule: 'Cybersécurité',
      dateDebut: '2026-06-15',
      dateFin: '2026-06-16',
      heuresRealisees: 14,
      numero: 'CERT-2026-0001',
      signatureLevel: 'SES',
      verificationUrl: 'https://demo.humanix.app/verification/xyz',
      generatedAt: '2026-06-16T17:30:00.000Z',
    });
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe(PDF_MAGIC);
  });

  it('décompte : PDF valide', async () => {
    const bytes = await renderDecompte({
      organisme: { nom: 'OF Démo' },
      formationIntitule: 'Cybersécurité',
      entreprise: 'ACME',
      periodeDebut: '2026-06-15',
      periodeFin: '2026-06-16',
      lignes: [
        { apprenantNom: 'Sofia Nguyen', heures: 14 },
        { apprenantNom: 'Hugo Martin', heures: 10.5 },
      ],
      totalHeures: 24.5,
      montantCents: 240000,
      generatedAt: '2026-06-17T09:00:00.000Z',
    });
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe(PDF_MAGIC);
  });
});
