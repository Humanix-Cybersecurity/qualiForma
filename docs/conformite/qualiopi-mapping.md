<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Mapping Qualiopi (RNQ) → fonctionnalités

Correspondance entre les indicateurs du Référentiel National Qualité et les fonctionnalités
de la plateforme. Référence : RNQ (7 critères, 32 indicateurs). Cette table est un **support
de preuve**, pas une attestation de conformité (à valider avec l'organisme certificateur).

| Indicateur RNQ (résumé) | Fonctionnalité | Où |
| --- | --- | --- |
| **1** — Information publique sur les prestations | Catalogue `Formation` (objectifs, prérequis, durée, tarif) | `formation` |
| **2** — Indicateurs de résultats | Restitution agrégée, taux de complétude/satisfaction | `questionnaires/*`, `Restitution` |
| **4** — Analyse du besoin | Questionnaire `positionnement_amont` / `recueil_besoin` | `QuestionnaireType` |
| **5** — Objectifs et adéquation | Objectifs de `Formation`, évaluation des acquis | `evaluation_acquis` |
| **6** — Contenus et modalités | Session → `Creneau` (demi-journées), modalités présentiel/visio | `session`, `creneau` |
| **8** — Positionnement à l'entrée | Questionnaire amont + restitution | `questionnaires` |
| **9** — Conditions de déroulement (émargement) | **Émargement par demi-journée + co-signature + faisceau de preuves** | `signature-engine`, `emargement`, `preuve_signature` |
| **10/11** — Adaptation, évaluation des acquis | Évaluation des acquis, suivi par inscription | `questionnaire`, `inscription` |
| **17** — Moyens humains (formateurs) | Mode formateur, emploi du temps via créneaux | `emargement`, `creneau.formateurId` |
| **23/24/25** — Veille / accessibilité handicap | **Modalités d'accès handicap**, référent, adaptations apprenant | `formation.modalitesAccesHandicap`, rôle `referent_handicap`, `user.handicapAdaptations` |
| **26** — Mobilisation des acteurs (handicap) | Désignation référent handicap | rôle `referent_handicap` |
| **30** — Recueil des appréciations | Satisfaction à chaud / à froid | `satisfaction_chaud`, `satisfaction_froid` |
| **31** — Traitement des réclamations | Réclamations + journal | `Reclamation` |
| **32** — Amélioration continue | Actions d'amélioration continue | `ActionAmeliorationContinue` |

## Preuves opposables générées

- **Feuille d'émargement PDF** (mentions obligatoires + lien/QR de vérification) — `exports`.
- **Certificat de réalisation** (heures réelles) — `CertificatRealisation`, `exports`.
- **Décompte de réalisation** (PDF/CSV/XLSX) — `exports`.
- **Dossier d'audit** : `audit_log` hash-chaîné + `preuve_signature` (faisceau, horodatage).
- **Conservation ≥ 4 ans** des preuves avec *legal hold* (cf. [rgpd.md](rgpd.md)).
