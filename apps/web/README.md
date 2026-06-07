<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# apps/web — Front React PWA + Capacitor

React + Vite + TypeScript. **PWA** installable (Workbox) avec file d'attente offline pour
l'émargement ([ADR 0005](../../docs/adr/0005-offline-first-emargement.md)). Packaging natif
iOS/Android via **Capacitor** depuis cette base de code unique.

Espaces par rôle : **apprenant** (signature code/QR/manuscrite, questionnaires, attestations),
**formateur** (projection, lancement créneau, contrôle, co-signature), **admin OF** (catalogue,
sessions, documentaire, restitution).

Accessibilité **RGAA/WCAG AA** vérifiée en CI ([ADR 0004](../../docs/adr/0004-accessibilite-rgaa-gate-ci.md)).
UI via `@humanix/ui`, i18n via `@humanix/i18n`.

> Squelette — implémentation à partir de l'étape 5/6 du [PLAN](../../PLAN.md).
