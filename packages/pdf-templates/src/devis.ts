// SPDX-License-Identifier: AGPL-3.0-or-later
import { PdfBuilder } from './layout';
import { eurosFromCents, frDate, frDateTime } from './format';
import type { Organisme } from './types';
import type { FactureLigneData } from './facture';

export interface DevisData {
  organisme: Organisme;
  numero: string;
  dateDevis: string;
  validiteJours: number;
  client?: string;
  financeur?: string;
  formationIntitule?: string;
  lignes: FactureLigneData[];
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  notes?: string;
  generatedAt: string;
}

/** Devis (proposition commerciale). */
export async function renderDevis(data: DevisData): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create();

  pdf.title(`Devis ${data.numero}`);
  pdf.text(data.organisme.nom, { bold: true, size: 11 });
  if (data.organisme.nda) pdf.text(`NDA : ${data.organisme.nda}`, { size: 9 });
  pdf.spacer();

  pdf.keyVal('Date du devis', frDate(data.dateDevis));
  pdf.keyVal('Validité', `${data.validiteJours} jours`);
  if (data.client) pdf.keyVal('Client', data.client);
  if (data.financeur) pdf.keyVal('Financeur', data.financeur);
  if (data.formationIntitule) pdf.keyVal('Formation', data.formationIntitule);
  pdf.hr();

  pdf.heading('Détail');
  for (const l of data.lignes) {
    const tva = (l.tvaTauxBp / 100).toFixed(l.tvaTauxBp % 100 === 0 ? 0 : 2);
    pdf.text(
      `• ${l.designation} — ${l.quantite} × ${eurosFromCents(l.prixUnitaireCents)} (TVA ${tva}%) = ${eurosFromCents(l.montantHtCents)} HT`,
      { indent: 10, size: 10 },
    );
  }
  pdf.hr();

  pdf.text(`Total HT : ${eurosFromCents(data.totalHtCents)}`, { size: 10 });
  pdf.text(`TVA : ${eurosFromCents(data.totalTvaCents)}`, { size: 10 });
  pdf.text(`Total TTC : ${eurosFromCents(data.totalTtcCents)}`, { bold: true, size: 12 });

  pdf.spacer(6);
  pdf.text('Bon pour accord (date, signature) :', { size: 10 });
  pdf.spacer(10);
  pdf.text(`Document généré le ${frDateTime(data.generatedAt)}.`, { size: 8 });

  return pdf.finalize();
}
