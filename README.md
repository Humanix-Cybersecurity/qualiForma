<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Humanix — Plateforme de suivi de formation conforme Qualiopi

Plateforme SaaS multi-tenant de gestion et de suivi de formations professionnelles,
conçue pour la conformité **Qualiopi (RNQ)**, **eIDAS (SES/SEA)**, **RGAA 4.1 / WCAG 2.1 AA**
et **RGPD**.

> ⚖️ **Cadre légal** : ce dépôt encode des bonnes pratiques de conformité, **pas une garantie
> juridique**. Le choix SES/SEA, l'horodatage qualifié et la conformité finale doivent être
> validés avec l'organisme certificateur et un·e juriste formation avant exploitation.

## ⚠️ Statut

**Phase 1 — Bootstrap (squelette + ADR).** Le code applicatif n'est pas encore implémenté.
Voir [`docs/adr/`](docs/adr/) pour les décisions d'architecture et
[`PLAN.md`](PLAN.md) pour l'ordre d'exécution.

## Licence

Distribué sous **GNU AGPL-3.0-or-later** (voir [`LICENSE`](LICENSE) et [`NOTICE`](NOTICE)).
L'AGPL impose la **mise à disposition du code source modifié aux utilisateur·ice·s du service
réseau** : tout déploiement SaaS de ce logiciel (y compris modifié) doit offrir aux
utilisateur·ice·s l'accès au code source correspondant.

## Architecture (résumé)

| Couche | Choix | ADR |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo, TypeScript strict | [0001](docs/adr/0001-stack-et-monorepo.md) |
| Backend | NestJS + PostgreSQL 16 + Prisma | [0001](docs/adr/0001-stack-et-monorepo.md) |
| Multi-tenant | PostgreSQL Row-Level Security (`tenant_id`) | [0002](docs/adr/0002-isolation-multi-tenant-rls.md) |
| Signature/émargement | SES + faisceau de preuves, interface QTSP/SEA | [0003](docs/adr/0003-moteur-signature-ses-eidas.md) |
| Accessibilité | RGAA 4.1 / WCAG 2.1 AA, gate CI | [0004](docs/adr/0004-accessibilite-rgaa-gate-ci.md) |
| Offline émargement | PWA + file d'attente, horodatage serveur faisant foi | [0005](docs/adr/0005-offline-first-emargement.md) |
| Stockage / sécurité uploads | MinIO (S3) + ClamAV + chiffrement | [0006](docs/adr/0006-stockage-objet-et-scan-uploads.md) |
| Licence & SaaS | AGPLv3, cœur séparé des modules d'exploitation | [0007](docs/adr/0007-licence-agplv3-et-modele-saas.md) |

## Structure du dépôt

```
apps/
  api/      NestJS — API, RBAC, RLS, jobs
  web/      React + Vite PWA + Capacitor (apprenant / formateur / admin OF)
  admin/    Back-office super-admin SaaS (onboarding, plans, quotas)
packages/
  domain/            Types & entités partagés (source de vérité métier)
  ui/                Design system accessible (React Aria/Radix + Tailwind)
  i18n/              Catalogues react-i18next + ICU
  pdf-templates/     Gabarits PDF versionnés (émargement, certificat, décompte)
  signature-engine/  Cœur : faisceau de preuves, audit chaîné, vérification
  config/            ESLint / TS / tooling partagés
docs/
  adr/          Architecture Decision Records
  conformite/   Mapping Qualiopi, RGPD, accessibilité, sécurité
  deploiement/  Self-host (docker-compose) & SaaS
infra/docker/   Dockerfiles & compose
```

## Démarrage (à venir — phase 2)

```bash
## Lancer l'application (Docker)

Stack complète (API + front + PostgreSQL + MinIO + ClamAV), avec migration / RLS / seed
automatiques :

```bash
docker compose up --build
# → Front : http://localhost:8080   ·   API : http://localhost:3000
```

Comptes de démo (mot de passe `Demo!Passw0rd`, en-tête tenant `demo`) : `admin@demo.test`,
`formateur@demo.test`, `apprenant1@demo.test`… · super-admin : `superadmin@humanix.test`
(tenant `humanix`).

## Développement local (sans conteneur applicatif)

```bash
pnpm install
docker compose -f infra/docker/docker-compose.dev.yml up -d   # PostgreSQL, MinIO, ClamAV
pnpm --filter @humanix/api db:setup                           # migrations + RLS + seed
pnpm --filter @humanix/api dev      # API
pnpm --filter @humanix/web dev      # front (http://localhost:5173)
```
