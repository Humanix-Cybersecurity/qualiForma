<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# ADR 0004 — Accessibilité RGAA 4.1 / WCAG 2.1 AA avec gate CI bloquant

- **Statut** : Proposé
- **Date** : 2026-06-07

## Contexte

Le public final inclut des **personnes en situation de handicap** : l'accessibilité est une
**exigence opposable**, pas un bonus. Sans contrôle automatisé bloquant, l'a11y régresse
silencieusement.

## Décision

- Cible **RGAA 4.1 / WCAG 2.1 niveau AA**.
- **Primitives accessibles uniquement** (React Aria / Radix) — interdiction des widgets
  interactifs maison non accessibles (revue de code).
- **Gate CI bloquant** : le build **échoue** si l'a11y régresse.
  - `axe-core` : **0 violation critique/sérieuse**.
  - `pa11y` sur les parcours clés (connexion, signature apprenant, questionnaire, exports).
  - **Lighthouse a11y ≥ 95**.
- **Déclaration d'accessibilité** générée et publiée (page dédiée, obligatoire légalement).
- Exigences vérifiées : navigation clavier complète, **focus visible**, contrastes AA,
  alternatives textuelles, sous-titres/transcriptions médias, redimensionnement **200 %** sans
  perte, messages d'erreur de formulaire explicites (ARIA).
- Préférences utilisateur : taille de police, contraste élevé, **réduction des animations**
  (`prefers-reduced-motion`).
- L'émargement (signature manuscrite tactile incluse) doit offrir une **alternative accessible**
  (code/QR navigables au clavier + lecteur d'écran).

## Alternatives écartées

- **Audit a11y manuel ponctuel seul** : ne prévient pas les régressions au fil des PR. Conservé en
  complément (audit humain périodique), pas comme garde-fou principal.
- **Composants maison stylés** : coût d'accessibilité élevé et fragile. Écarté au profit des
  primitives headless éprouvées.

## Conséquences

- (+) L'a11y devient une invariante vérifiée à chaque PR.
- (+) Déclaration d'accessibilité traçable.
- (−) Coût CI (navigateur headless) ; parcours à maintenir quand l'UI évolue.
- (−) La signature manuscrite tactile exige une alternative équivalente — contrainte de conception.
