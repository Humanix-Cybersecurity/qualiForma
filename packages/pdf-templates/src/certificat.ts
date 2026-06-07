// SPDX-License-Identifier: AGPL-3.0-or-later
import { PdfBuilder } from './layout';
import { frDate, frDateTime } from './format';
import type { CertificatData } from './types';

/** Certificat de réalisation (gabarit type DGEFP). */
export async function renderCertificat(data: CertificatData): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create();

  pdf.title('Certificat de réalisation');
  pdf.text(data.organisme.nom, { bold: true, size: 11 });
  if (data.organisme.nda) pdf.text(`Déclaration d'activité : ${data.organisme.nda}`, { size: 9 });
  pdf.spacer(12);

  pdf.text(
    `Je soussigné·e, représentant·e de l'organisme ${data.organisme.nom}, atteste que :`,
    { size: 11 },
  );
  pdf.spacer(6);
  pdf.text(data.apprenantNom, { bold: true, size: 13 });
  pdf.spacer(6);
  pdf.text(`a suivi l'action de formation : « ${data.formationIntitule} ».`, { size: 11 });
  if (data.objectifs) {
    pdf.spacer(4);
    pdf.keyVal('Objectifs', data.objectifs);
  }
  pdf.spacer(6);
  pdf.keyVal('Période', `du ${frDate(data.dateDebut)} au ${frDate(data.dateFin)}`);
  pdf.keyVal('Durée réellement réalisée', `${data.heuresRealisees} heures`);
  pdf.keyVal('N° de certificat', data.numero);
  pdf.keyVal('Niveau de signature', data.signatureLevel);
  pdf.hr();

  pdf.text(`Fait le ${frDateTime(data.generatedAt)}.`, { size: 10 });
  if (data.verificationUrl) {
    pdf.spacer(6);
    pdf.text(`Vérification d'authenticité : ${data.verificationUrl}`, { size: 8 });
    await pdf.qrRight(data.verificationUrl, 56);
  }

  return pdf.finalize();
}
