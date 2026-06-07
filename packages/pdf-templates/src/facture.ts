// SPDX-License-Identifier: AGPL-3.0-or-later
import { PdfBuilder } from './layout';
import { eurosFromCents, frDate, frDateTime } from './format';
import type { Organisme } from './types';
import { buildFacturXXml } from './facturx';

export interface FactureLigneData {
  designation: string;
  quantite: number;
  prixUnitaireCents: number;
  tvaTauxBp: number;
  montantHtCents: number;
}

export interface FactureData {
  organisme: Organisme;
  numero: string;
  dateEmission: string;
  dateEcheance?: string;
  client?: string;
  financeur?: string;
  formationIntitule?: string;
  lignes: FactureLigneData[];
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  montantPayeCents: number;
  notes?: string;
  generatedAt: string;
}

/** Facture (gestion commerciale). */
export async function renderFacture(data: FactureData): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create();

  pdf.title(`Facture ${data.numero}`);
  pdf.text(data.organisme.nom, { bold: true, size: 11 });
  if (data.organisme.nda) pdf.text(`NDA : ${data.organisme.nda}`, { size: 9 });
  pdf.spacer();

  pdf.keyVal('Date d’émission', frDate(data.dateEmission));
  if (data.dateEcheance) pdf.keyVal('Échéance', frDate(data.dateEcheance));
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
  pdf.text(`Déjà payé : ${eurosFromCents(data.montantPayeCents)}`, { size: 10 });
  pdf.text(`Reste à payer : ${eurosFromCents(data.totalTtcCents - data.montantPayeCents)}`, { bold: true, size: 11 });

  if (data.totalTvaCents === 0) {
    pdf.spacer(6);
    pdf.text('TVA non applicable, art. 261-4-4°a du CGI (le cas échéant).', { size: 8 });
  }
  if (data.notes) {
    pdf.spacer();
    pdf.text(data.notes, { size: 9 });
  }
  pdf.spacer(6);
  pdf.text(`Document généré le ${frDateTime(data.generatedAt)}.`, { size: 8 });

  // Facture hybride : on embarque le XML Factur-X (profil MINIMUM) en pièce jointe.
  const xml = buildFacturXXml(data);
  pdf.attachFile(new TextEncoder().encode(xml), 'factur-x.xml', 'application/xml', 'Factur-X (MINIMUM)');

  return pdf.finalize();
}
