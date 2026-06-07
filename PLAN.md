<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Plan de bootstrap — ordre d'exécution

Étape **1 en cours** (squelette + ADR). Les étapes 2+ démarrent **après validation**.

| # | Étape | Livrables | Statut |
| --- | --- | --- | --- |
| 1 | Monorepo + tooling + CI squelette + **ADR** | arborescence, configs, 7 ADR, licence | ✅ fait |
| 2 | Couche tenant + RLS + auth/RBAC/MFA + tests d'isolation | middleware tenant, policies RLS, JWT+TOTP | ✅ fait |
| 3 | Modèle de données + migrations + seed | schéma Prisma (26 tables), RLS dynamique, seed démo | ✅ fait |
| 4 | Documentaire (upload + ClamAV + chiffrement + ZIP sécurisé) | pipeline upload fail-closed | ⬜ |
| 5 | **Moteur d'émargement & signature** (priorité produit) | `signature-engine`, audit chaîné, PDF, vérification | ⬜ |
| 6 | Sessions/créneaux/planning + mode formateur | projection, lancement, contrôle, co-signature | ⬜ |
| 7 | Questionnaires & évaluations + restitution | amont/aval/satisfaction, exports agrégés | ⬜ |
| 8 | Exports | émargement PDF, certificat, décompte (PDF/CSV/XLSX) | ⬜ |
| 9 | Accessibilité + i18n + gate CI a11y | axe/pa11y/Lighthouse, déclaration a11y | ⬜ |
| 10 | Super-admin SaaS + plans/quotas | onboarding tenants, facturation SaaS | ⬜ |
| 11 | Durcissement sécurité + RGPD + doc finale | SAST/SBOM/headers, registre RGPD, mapping Qualiopi | ⬜ |

## Definition of Done (rappel des critères d'acceptation)

- [ ] Aucune requête sans contexte tenant ; test d'isolation inter-tenant vert.
- [ ] Émargement indexé sur la demi-journée, co-signature formateur imposée.
- [ ] Faisceau de preuves complet, vérifiable (lien/QR), audit hash-chaîné.
- [ ] Feuille d'émargement PDF avec toutes les mentions obligatoires + lien de vérification.
- [ ] Interface `SignatureProvider` prête pour QTSP/SEA.
- [ ] Décompte facturation exportable (PDF/CSV/XLSX).
- [ ] CI a11y verte (axe 0 critique, Lighthouse a11y ≥ 95) + déclaration publiée.
- [ ] Uploads scannés (ClamAV) + chiffrés ; dézippage sécurisé.
- [ ] MFA + RBAC + audit + en-têtes de sécurité actifs.
- [ ] AGPLv3 en place (LICENSE, SPDX, NOTICE).
- [ ] App installable (PWA) + buildable natif (Capacitor iOS/Android).
- [ ] Déploiement self-host (docker-compose) ET SaaS documentés.
- [ ] Mapping Qualiopi → fonctionnalités documenté.
