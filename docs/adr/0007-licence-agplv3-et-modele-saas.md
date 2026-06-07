<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# ADR 0007 — Licence AGPLv3 et séparation cœur / exploitation SaaS

- **Statut** : Proposé
- **Date** : 2026-06-07

## Contexte

Le code est distribué en **AGPLv3** et exploité en **SaaS multi-tenant** par Humanix. L'AGPL §13
impose la mise à disposition du code source (y compris modifié) aux **utilisateur·ice·s du service
réseau**. Un OF doit pouvoir **auto-héberger**, Humanix doit pouvoir **exploiter en hébergé**.

## Décision

- Licence **GNU AGPL-3.0-or-later** : `LICENSE` (texte intégral), `NOTICE`, en-têtes **SPDX**
  (`SPDX-License-Identifier: AGPL-3.0-or-later`) dans chaque fichier source, `CONTRIBUTING.md`,
  mention claire de la clause réseau dans le `README`.
- **Cœur AGPL** (tout le produit fonctionnel : émargement, signature, conformité, exports) =
  ce monorepo, librement auto-hébergeable.
- **Modules d'exploitation SaaS** (facturation Humanix, métrologie commerciale, intégrations
  propriétaires éventuelles) : maintenus **séparés** et branchés par interfaces, afin que la
  distribution du cœur reste pleinement AGPL et auto-suffisante. Le produit doit **fonctionner
  sans** ces modules (un OF auto-hébergé n'en a pas besoin).
- Toute contribution est acceptée sous AGPLv3 (DCO dans `CONTRIBUTING.md`).
- Documentation de déploiement **self-host** (docker-compose) **et** **SaaS** fournie.

## Alternatives écartées

- **Licence permissive (MIT/Apache)** : ne protège pas contre l'appropriation SaaS fermée.
  Contraire à l'intention.
- **Open-core avec cœur amputé** : dégraderait l'auto-hébergement (l'OF n'aurait pas un produit
  complet). Rejeté — le cœur AGPL doit être complet et utilisable seul.
- **CLA cession de droits** : friction communautaire ; **DCO** suffit.

## Conséquences

- (+) Souveraineté et liberté d'auto-hébergement garanties ; protection contre le SaaS fermé.
- (+) Frontière claire cœur/exploitation.
- (−) L'AGPL peut freiner certains intégrateurs commerciaux — assumé.
- (−) Discipline requise : en-têtes SPDX vérifiés en CI ; ne pas faire fuiter de logique cœur dans
  les modules SaaS propriétaires (revue).
