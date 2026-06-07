// SPDX-License-Identifier: AGPL-3.0-or-later
// Gabarits documentaires Qualiopi à variables : convention, convocation, programme,
// règlement intérieur. Rendus déterministes (PdfBuilder), versionnés (TEMPLATE_VERSION).
import { PdfBuilder } from './layout';
import { frDate, eurosFromCents } from './format';
import type { Organisme } from './types';

export interface ConventionData {
  organisme: Organisme;
  numero: string;
  entreprise?: string;
  formationIntitule: string;
  objectifs?: string;
  dateDebut: string;
  dateFin: string;
  dureeHeures: number;
  montantCents?: number;
  apprenants: string[];
  generatedAt: string;
}

/** Convention de formation professionnelle (art. L.6353-1 s.). */
export async function renderConvention(data: ConventionData): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create();
  pdf.title('Convention de formation professionnelle');
  pdf.text(`N° ${data.numero}`, { size: 10 });
  pdf.spacer();
  pdf.text(`Entre l'organisme ${data.organisme.nom}${data.organisme.nda ? ` (NDA ${data.organisme.nda})` : ''}`, { size: 11 });
  if (data.entreprise) pdf.text(`et l'entreprise ${data.entreprise},`, { size: 11 });
  pdf.spacer();
  pdf.keyVal('Action de formation', data.formationIntitule);
  if (data.objectifs) pdf.keyVal('Objectifs', data.objectifs);
  pdf.keyVal('Période', `du ${frDate(data.dateDebut)} au ${frDate(data.dateFin)}`);
  pdf.keyVal('Durée', `${data.dureeHeures} heures`);
  if (data.montantCents !== undefined) pdf.keyVal('Montant', eurosFromCents(data.montantCents));
  pdf.hr();
  pdf.heading('Bénéficiaires');
  for (const a of data.apprenants) pdf.text(`• ${a}`, { indent: 10 });
  pdf.hr();
  pdf.text('Signatures (organisme / entreprise) :', { size: 10 });
  pdf.spacer(24);
  pdf.text(`Établie le ${frDate(data.generatedAt)}.`, { size: 8 });
  return pdf.finalize();
}

export interface ConvocationData {
  organisme: Organisme;
  apprenantNom: string;
  formationIntitule: string;
  dateDebut: string;
  dateFin: string;
  lieu?: string;
  horaires?: string;
  generatedAt: string;
}

/** Convocation d'un apprenant à une session. */
export async function renderConvocation(data: ConvocationData): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create();
  pdf.title('Convocation');
  pdf.text(data.organisme.nom, { bold: true, size: 11 });
  pdf.spacer();
  pdf.text(`${data.apprenantNom},`, { size: 11 });
  pdf.spacer(4);
  pdf.text(`Vous êtes convoqué·e à la formation « ${data.formationIntitule} ».`, { size: 11 });
  pdf.spacer(4);
  pdf.keyVal('Dates', `du ${frDate(data.dateDebut)} au ${frDate(data.dateFin)}`);
  if (data.horaires) pdf.keyVal('Horaires', data.horaires);
  if (data.lieu) pdf.keyVal('Lieu', data.lieu);
  pdf.spacer(6);
  pdf.text('Merci de vous présenter muni·e d\'une pièce d\'identité.', { size: 10 });
  pdf.spacer(6);
  pdf.text(`Fait le ${frDate(data.generatedAt)}.`, { size: 8 });
  return pdf.finalize();
}

export interface ProgrammeData {
  organisme: Organisme;
  formationIntitule: string;
  objectifs?: string;
  prerequis?: string;
  dureeHeures: number;
  modalitesAccesHandicap?: string;
  generatedAt: string;
}

/** Programme de formation (mentions Qualiopi : objectifs, prérequis, durée, accessibilité). */
export async function renderProgramme(data: ProgrammeData): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create();
  pdf.title('Programme de formation');
  pdf.text(data.organisme.nom, { bold: true, size: 11 });
  pdf.spacer();
  pdf.heading(data.formationIntitule);
  pdf.keyVal('Durée', `${data.dureeHeures} heures`);
  if (data.objectifs) {
    pdf.heading('Objectifs');
    pdf.text(data.objectifs);
  }
  if (data.prerequis) {
    pdf.heading('Prérequis');
    pdf.text(data.prerequis);
  }
  pdf.heading('Accessibilité');
  pdf.text(data.modalitesAccesHandicap ?? 'Locaux accessibles ; adaptations sur demande au référent handicap.');
  pdf.hr();
  pdf.text(`Édité le ${frDate(data.generatedAt)}.`, { size: 8 });
  return pdf.finalize();
}

export interface ReglementData {
  organisme: Organisme;
  generatedAt: string;
}

/** Règlement intérieur (art. L.6352-3 s.) — gabarit type. */
export async function renderReglementInterieur(data: ReglementData): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create();
  pdf.title('Règlement intérieur');
  pdf.text(data.organisme.nom, { bold: true, size: 11 });
  pdf.spacer();
  const sections: [string, string][] = [
    ['Objet', 'Le présent règlement s\'applique à tous les stagiaires pendant la formation.'],
    ['Hygiène et sécurité', 'Chaque stagiaire respecte les consignes de sécurité et le règlement des locaux.'],
    ['Discipline', 'Assiduité, ponctualité et respect mutuel sont exigés ; les émargements font foi de présence.'],
    ['Sanctions', 'Tout manquement peut faire l\'objet d\'un avertissement ou d\'une exclusion, après procédure contradictoire.'],
    ['Représentation des stagiaires', 'Pour les formations de plus de 500 heures, des délégués sont élus.'],
    ['Réclamations', 'Toute réclamation est traitée selon la procédure d\'amélioration continue de l\'organisme.'],
  ];
  for (const [titre, corps] of sections) {
    pdf.heading(titre);
    pdf.text(corps);
  }
  pdf.hr();
  pdf.text(`Adopté le ${frDate(data.generatedAt)}.`, { size: 8 });
  return pdf.finalize();
}
