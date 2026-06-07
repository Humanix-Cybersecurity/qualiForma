<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Accessibilité — RGAA 4.1 / WCAG 2.1 AA

Voir [ADR 0004](../adr/0004-accessibilite-rgaa-gate-ci.md). L'accessibilité est une **exigence
opposable**, vérifiée en intégration continue (le build échoue en cas de régression).

## Gate CI (bloquant)
- **axe-core** (jest-axe + Testing Library) : 0 violation sur les écrans et le design system.
- **Lighthouse** accessibilité **≥ 95** (`apps/web/lighthouserc.json`).
- **pa11y-ci** (WCAG2AA) sur les écrans servis (`apps/web/.pa11yci`).

## Mesures de conception
- Primitives accessibles (React Aria) — pas de widget interactif maison.
- Navigation clavier complète, **focus visible**, contrastes AA, libellés/erreurs reliés (ARIA).
- Préférence **`prefers-reduced-motion`**, fond/contraste explicites, lien d'évitement (skip link).
- i18n FR/EN (aucune chaîne en dur), dates/nombres localisés, RTL prévu.

## Déclaration d'accessibilité
Publiée à la route **`/accessibilite`** du front (obligatoire). État : *partiellement conforme*,
démarche d'amélioration continue. Contact de signalement indiqué sur la page.
