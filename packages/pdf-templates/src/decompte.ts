// SPDX-License-Identifier: AGPL-3.0-or-later
import { PdfBuilder } from './layout';
import { eurosFromCents, frDate, frDateTime } from './format';
import type { DecompteData } from './types';

/** Décompte de réalisation / facturation (heures réelles par apprenant). */
export async function renderDecompte(data: DecompteData): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create();

  pdf.title('Décompte de réalisation');
  pdf.text(data.organisme.nom, { bold: true, size: 11 });
  pdf.spacer();

  pdf.keyVal('Formation', data.formationIntitule);
  if (data.entreprise) pdf.keyVal('Entreprise cliente', data.entreprise);
  if (data.numeroConvention) pdf.keyVal('N° de convention', data.numeroConvention);
  pdf.keyVal('Période', `du ${frDate(data.periodeDebut)} au ${frDate(data.periodeFin)}`);
  pdf.hr();

  pdf.heading('Heures réelles par apprenant');
  for (const l of data.lignes) {
    pdf.text(`• ${l.apprenantNom} : ${l.heures} h`, { indent: 10 });
  }
  pdf.hr();
  pdf.text(`Total : ${data.totalHeures} heures`, { bold: true, size: 11 });
  if (data.montantCents !== undefined) {
    pdf.text(`Montant : ${eurosFromCents(data.montantCents)}`, { bold: true, size: 11 });
  }
  pdf.spacer(6);
  pdf.text(`Document généré le ${frDateTime(data.generatedAt)}.`, { size: 8 });

  return pdf.finalize();
}
