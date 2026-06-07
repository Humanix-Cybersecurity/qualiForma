// SPDX-License-Identifier: AGPL-3.0-or-later
import { PdfBuilder } from './layout';
import { frDate, frDateTime, PERIODE_LABEL } from './format';
import type { FeuilleEmargementData } from './types';

const STATUT_LABEL: Record<string, string> = {
  signe: 'Signé',
  en_attente: 'En attente',
  refuse: 'Refusé',
  absent: 'Absent',
};

/**
 * Feuille d'émargement conforme : mentions obligatoires (intitulé, n° convention, dates,
 * horaires, lieu, identités, signatures) + lien/QR de vérification d'authenticité.
 */
export async function renderFeuilleEmargement(data: FeuilleEmargementData): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create();

  pdf.title('Feuille d\'émargement');
  pdf.text(data.organisme.nom, { bold: true, size: 11 });
  if (data.organisme.nda) pdf.text(`Déclaration d'activité : ${data.organisme.nda}`, { size: 9 });
  pdf.spacer();

  pdf.keyVal('Formation', data.formationIntitule);
  if (data.numeroConvention) pdf.keyVal('N° de convention', data.numeroConvention);
  pdf.keyVal('Période', `du ${frDate(data.sessionDateDebut)} au ${frDate(data.sessionDateFin)}`);
  if (data.sessionLieu) pdf.keyVal('Lieu', data.sessionLieu);
  pdf.hr();

  for (const c of data.creneaux) {
    pdf.heading(`${frDate(c.date)} — ${PERIODE_LABEL[c.periode]} (${c.heureDebut}–${c.heureFin})${c.lieu ? ` — ${c.lieu}` : ''}`);
    if (c.signatures.length === 0) {
      pdf.text('Aucun signataire.', { indent: 10 });
    }
    for (const s of c.signatures) {
      const role = s.role === 'formateur' ? 'Formateur' : 'Apprenant';
      const when = s.statut === 'signe' && s.timestampServeur ? ` le ${frDateTime(s.timestampServeur)}` : '';
      pdf.text(`• ${s.nom} (${role}) — ${STATUT_LABEL[s.statut] ?? s.statut}${when}`, { indent: 10 });
      if (s.verificationUrl) {
        pdf.text(`  Vérification : ${s.verificationUrl}`, { indent: 14, size: 8 });
        await pdf.qrRight(s.verificationUrl, 42);
      }
      pdf.spacer(4);
    }
    pdf.spacer(6);
  }

  pdf.hr();
  pdf.text(
    'Horodatage serveur faisant foi. Chaque signature est vérifiable via son lien (et QR) ' +
      'd\'authenticité ci-dessus.',
    { size: 8 },
  );
  pdf.text(`Document généré le ${frDateTime(data.generatedAt)}.`, { size: 8 });

  return pdf.finalize();
}
