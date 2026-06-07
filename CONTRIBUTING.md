<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Contribuer

Merci de contribuer à Humanix — Plateforme de suivi de formation.

## Licence des contributions

Le projet est sous **GNU AGPL-3.0-or-later**. Toute contribution est acceptée sous cette licence.

## Developer Certificate of Origin (DCO)

Chaque commit doit être signé `Signed-off-by` (`git commit -s`), attestant du
[DCO 1.1](https://developercertificate.org/). Pas de CLA.

## En-têtes SPDX

Tout nouveau fichier source porte en première ligne :

```
// SPDX-License-Identifier: AGPL-3.0-or-later
```

(adapter le commentaire au langage : `<!-- -->`, `#`, `/* */`). La CI vérifie leur présence.

## Qualité (exigée avant merge)

- `pnpm lint` et `pnpm typecheck` verts (TypeScript strict).
- `pnpm test` vert ; couverture maintenue.
- `pnpm test:a11y` vert (axe 0 critique, Lighthouse a11y ≥ 95) pour toute UI.
- `pnpm test:isolation` vert pour toute requête touchant des données tenant.
- Aucune chaîne d'interface en dur (i18n).
- Pas de secret en clair ; secret scanning en CI.

## Workflow

1. Branche depuis `main`.
2. Commits atomiques, signés (`-s`).
3. PR avec description, tests, et impact conformité (Qualiopi/RGPD/a11y/sécurité) si pertinent.
4. Revue obligatoire ; la CI doit être verte.
