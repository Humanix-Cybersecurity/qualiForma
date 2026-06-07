<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# ADR 0001 — Stack technique & monorepo

- **Statut** : Proposé
- **Date** : 2026-06-07
- **Décideurs** : Architecture Humanix

## Contexte

Produit de production multi-plateforme (web responsive + PWA installable + natif iOS/Android)
depuis une base de code unique, multilingue, réglementé, destiné à la distribution AGPLv3 et à
l'exploitation SaaS multi-tenant. Besoin d'un partage fort de types métier entre backend et
frontend, et d'une CI mutualisée.

## Décision

- **Monorepo** : pnpm workspaces + Turborepo. **TypeScript strict** partout (`tsconfig.base.json`).
- **Backend** : NestJS (Node/TS), PostgreSQL 16, **Prisma** (ORM + migrations).
- **Frontend** : React + Vite + TypeScript ; **PWA** via `vite-plugin-pwa` (Workbox) ;
  packaging natif iOS/Android via **Capacitor** (une base de code, conforme à l'exigence
  « base de code unique »).
- **UI/a11y** : primitives headless accessibles (**React Aria** privilégié, Radix en repli) +
  Tailwind. Aucun composant interactif maison non accessible. Voir [ADR 0004](0004-accessibilite-rgaa-gate-ci.md).
- **i18n** : `react-i18next` + format **ICU**. Aucune chaîne en dur (lint dédié).
- **Jobs** : BullMQ (Redis) — génération PDF, scans ClamAV, notifications, horodatage.
- **Observabilité** : logs structurés `pino`, traces OpenTelemetry, healthchecks.
- **Conteneurisation** : Docker + docker-compose (dev), manifests prêts pour orchestration.

Le partage métier passe par `packages/domain` (source de vérité des types/entités/enum/Zod),
importé par l'API **et** le front pour éviter toute divergence de contrat.

## Alternatives écartées

- **Next.js full-stack** : couple front et back, complexifie le packaging Capacitor natif et la
  séparation cœur AGPL / exploitation SaaS. Écarté.
- **Nx** au lieu de Turborepo : plus riche mais plus lourd ; Turbo suffit pour le graphe de tâches
  visé. Réévaluable si la matrice de build grossit.
- **TypeORM / Drizzle** au lieu de Prisma : Prisma offre migrations déclaratives + typage fort ;
  la RLS (ADR 0002) impose des policies SQL gérées hors Prisma, contrainte assumée et documentée.

## Conséquences

- (+) Contrats partagés, CI unique, DX homogène.
- (+) Une base de code → web + PWA + natif.
- (−) Prisma ne gère pas nativement les policies RLS : migrations SQL manuelles à maintenir
  (voir ADR 0002).
- (−) Capacitor impose des contraintes sur certaines API web (à valider sur l'émargement offline).
