// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Référentiel National Qualité (RNQ) — 7 critères, 32 indicateurs.
 * Libellés SYNTHÉTIQUES (aide au pilotage) ; se référer au RNQ officiel pour le texte exact
 * et les attendus/preuves par catégorie d'action. Les indicateurs spécifiques à l'alternance
 * (apprentissage) sont marqués `alternance` et proposés « non applicable » par défaut.
 */
export interface RnqIndicateur {
  numero: number;
  critere: number;
  libelle: string;
  /** Spécifique CFA/alternance (souvent non applicable aux OF classiques). */
  alternance?: boolean;
  /** Clé d'auto-évaluation indicative (calculée depuis les données). */
  autoKey?: string;
}

export const RNQ_CRITERES: Record<number, string> = {
  1: 'Information des publics',
  2: 'Identification des objectifs et adaptation des prestations',
  3: 'Adaptation aux publics bénéficiaires (accueil, suivi, évaluation)',
  4: 'Adéquation des moyens pédagogiques, techniques et d’encadrement',
  5: 'Qualification et développement des connaissances des personnels',
  6: 'Inscription dans son environnement professionnel',
  7: 'Recueil et prise en compte des appréciations et réclamations',
};

export const RNQ_INDICATEURS: RnqIndicateur[] = [
  // Critère 1
  { numero: 1, critere: 1, libelle: 'Information accessible et exhaustive sur les prestations (prérequis, objectifs, durée, tarifs, modalités, délais, accessibilité).', autoKey: 'programme' },
  { numero: 2, critere: 1, libelle: 'Diffusion d’indicateurs de résultats adaptés (satisfaction, réussite…).', autoKey: 'satisfaction' },
  { numero: 3, critere: 1, libelle: 'Pour les actions certifiantes : taux d’obtention, valeur de la certification.' },
  // Critère 2
  { numero: 4, critere: 2, libelle: 'Analyse du besoin du bénéficiaire en lien avec l’entreprise / le financeur.', autoKey: 'positionnement' },
  { numero: 5, critere: 2, libelle: 'Objectifs de la prestation définis, opérationnels et évaluables.', autoKey: 'objectifs' },
  { numero: 6, critere: 2, libelle: 'Contenus et modalités adaptés aux objectifs et aux publics.' },
  { numero: 7, critere: 2, libelle: 'Pour les actions certifiantes : adéquation au référentiel de certification.' },
  { numero: 8, critere: 2, libelle: 'Positionnement et évaluation des acquis à l’entrée.', autoKey: 'positionnement' },
  // Critère 3
  { numero: 9, critere: 3, libelle: 'Information sur les conditions de déroulement (accueil, horaires, lieux, contacts).', autoKey: 'sessions' },
  { numero: 10, critere: 3, libelle: 'Adaptation de la prestation (rythme, modalités, méthodes) aux publics.' },
  { numero: 11, critere: 3, libelle: 'Évaluation de l’atteinte des objectifs par les bénéficiaires.', autoKey: 'acquis' },
  { numero: 12, critere: 3, libelle: 'Prise en compte des appréciations et des difficultés rencontrées.', autoKey: 'satisfaction' },
  { numero: 13, critere: 3, libelle: 'Coordination des acteurs (alternance) — entreprise / centre.', alternance: true },
  { numero: 14, critere: 3, libelle: 'Exercice de la fonction tutorale / maître d’apprentissage (alternance).', alternance: true },
  { numero: 15, critere: 3, libelle: 'Information de l’alternant sur ses droits et devoirs (alternance).', alternance: true },
  { numero: 16, critere: 3, libelle: 'Sous-traitance / portage salarial : exigences qualité répercutées.' },
  // Critère 4
  { numero: 17, critere: 4, libelle: 'Moyens humains et techniques adaptés et coordination des intervenants.', autoKey: 'formateurs' },
  { numero: 18, critere: 4, libelle: 'Ressources pédagogiques mises à disposition et actualisées.', autoKey: 'documents' },
  { numero: 19, critere: 4, libelle: 'Personnels dédiés : ressources et accompagnement des bénéficiaires.' },
  { numero: 20, critere: 4, libelle: 'Mobilisation des acteurs pour l’accueil du public en situation de handicap.', autoKey: 'handicap' },
  // Critère 5
  { numero: 21, critere: 5, libelle: 'Détermination et entretien des compétences des intervenants.' },
  { numero: 22, critere: 5, libelle: 'Plan de développement des compétences des personnels.' },
  // Critère 6
  { numero: 23, critere: 6, libelle: 'Veille légale et réglementaire sur le champ de la formation.' },
  { numero: 24, critere: 6, libelle: 'Veille sur les évolutions des compétences, métiers et emplois.' },
  { numero: 25, critere: 6, libelle: 'Veille sur les innovations pédagogiques et technologiques.' },
  { numero: 26, critere: 6, libelle: 'Mobilisation d’expertises (handicap) et réseau de partenaires.', autoKey: 'handicap' },
  { numero: 27, critere: 6, libelle: 'Recueil et prise en compte de l’appréciation des parties prenantes (financeurs…).' },
  { numero: 28, critere: 6, libelle: 'Mise en œuvre de modalités d’accueil/accompagnement spécifiques au handicap.', autoKey: 'handicap' },
  { numero: 29, critere: 6, libelle: 'Information sur les acteurs de l’insertion / poursuite (le cas échéant).' },
  // Critère 7
  { numero: 30, critere: 7, libelle: 'Recueil des appréciations des bénéficiaires, entreprises et financeurs.', autoKey: 'satisfaction' },
  { numero: 31, critere: 7, libelle: 'Traitement des réclamations, difficultés et aléas ; amélioration continue.', autoKey: 'reclamations' },
  { numero: 32, critere: 7, libelle: 'Mise en œuvre de mesures d’amélioration à partir des retours.', autoKey: 'actions' },
];
