<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# @humanix/domain — Types & entités partagés

Source de vérité métier (types, enums, schémas Zod) partagée entre `api` et `web` pour garantir un
contrat unique. Entités clés : `Tenant`, `User`/`Role`, `Formation`, `Session`, **`Creneau`**
(demi-journée), `Inscription`, `Convention`, **`Emargement`**, **`PreuveSignature`**, `Document`,
`Questionnaire`, `CertificatRealisation`, `DecompteFacturation`, `AuditLog`, `Reclamation`.

Rôles : `super_admin`, `admin_of`, `formateur`, `apprenant`, `referent_handicap`.

> Squelette — modélisation à l'étape 3 du [PLAN](../../PLAN.md).
