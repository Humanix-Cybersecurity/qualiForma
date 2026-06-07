<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Architecture Decision Records

Format : [MADR](https://adr.github.io/madr/) léger. Statuts : `Proposé` → `Accepté` → `Remplacé`.

| # | Décision | Statut |
| --- | --- | --- |
| [0001](0001-stack-et-monorepo.md) | Stack & monorepo (pnpm/Turbo, NestJS, React/Vite, Capacitor) | Proposé |
| [0002](0002-isolation-multi-tenant-rls.md) | Isolation multi-tenant par PostgreSQL Row-Level Security | Proposé |
| [0003](0003-moteur-signature-ses-eidas.md) | Moteur de signature SES + faisceau de preuves, extension SEA/QTSP | Proposé |
| [0004](0004-accessibilite-rgaa-gate-ci.md) | Accessibilité RGAA 4.1 / WCAG 2.1 AA avec gate CI bloquant | Proposé |
| [0005](0005-offline-first-emargement.md) | Émargement offline-first, horodatage serveur faisant foi | Proposé |
| [0006](0006-stockage-objet-et-scan-uploads.md) | Stockage objet MinIO + scan ClamAV + chiffrement | Proposé |
| [0007](0007-licence-agplv3-et-modele-saas.md) | Licence AGPLv3 et séparation cœur / exploitation SaaS | Proposé |

> Tous les ADR sont **Proposés** tant que l'étape 1 du bootstrap n'est pas validée.
