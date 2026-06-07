// SPDX-License-Identifier: AGPL-3.0-or-later
// Données d'entrée des gabarits PDF. Versionnés : voir TEMPLATE_VERSION.

export const TEMPLATE_VERSION = 'v1';

export interface Organisme {
  nom: string;
  /** Numéro de déclaration d'activité (NDA), si disponible. */
  nda?: string;
}

export interface SignatureLigne {
  nom: string;
  role: 'apprenant' | 'formateur';
  statut: 'signe' | 'en_attente' | 'refuse' | 'absent';
  /** Horodatage serveur faisant foi (ISO) si signé. */
  timestampServeur?: string;
  /** URL de vérification d'authenticité (encodée aussi en QR). */
  verificationUrl?: string;
}

export interface CreneauBloc {
  date: string; // YYYY-MM-DD
  periode: 'matin' | 'apres_midi';
  heureDebut: string;
  heureFin: string;
  lieu?: string;
  signatures: SignatureLigne[];
}

export interface FeuilleEmargementData {
  organisme: Organisme;
  formationIntitule: string;
  numeroConvention?: string;
  sessionDateDebut: string;
  sessionDateFin: string;
  sessionLieu?: string;
  creneaux: CreneauBloc[];
  generatedAt: string; // ISO
}

export interface CertificatData {
  organisme: Organisme;
  apprenantNom: string;
  formationIntitule: string;
  objectifs?: string;
  dateDebut: string;
  dateFin: string;
  heuresRealisees: number;
  numero: string;
  /** SES ou SEA (niveau de signature de l'organisme). */
  signatureLevel: 'SES' | 'SEA';
  verificationUrl?: string;
  generatedAt: string;
}

export interface DecompteLigneData {
  apprenantNom: string;
  heures: number;
}

export interface DecompteData {
  organisme: Organisme;
  formationIntitule: string;
  entreprise?: string;
  numeroConvention?: string;
  periodeDebut: string;
  periodeFin: string;
  lignes: DecompteLigneData[];
  totalHeures: number;
  montantCents?: number;
  generatedAt: string;
}
