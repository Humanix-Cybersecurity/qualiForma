<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Plan de bootstrap — ordre d'exécution

Étape **1 en cours** (squelette + ADR). Les étapes 2+ démarrent **après validation**.

| # | Étape | Livrables | Statut |
| --- | --- | --- | --- |
| 1 | Monorepo + tooling + CI squelette + **ADR** | arborescence, configs, 7 ADR, licence | ✅ fait |
| 2 | Couche tenant + RLS + auth/RBAC/MFA + tests d'isolation | middleware tenant, policies RLS, JWT+TOTP | ✅ fait |
| 3 | Modèle de données + migrations + seed | schéma Prisma (26 tables), RLS dynamique, seed démo | ✅ fait |
| 4 | Documentaire (upload + ClamAV + chiffrement + ZIP sécurisé) | pipeline upload fail-closed (MinIO+ClamAV, EICAR testé) | ✅ fait |
| 5 | **Moteur d'émargement & signature** (priorité produit) | `signature-engine` (24 tests), audit chaîné, vérification — PDF à l'étape 8 | ✅ fait |
| 6 | Sessions/créneaux/planning + mode formateur | émargement API (ouverture/signature/contrôle/co-signature/vérification) — validé e2e | ✅ fait |
| 7 | Questionnaires & évaluations + restitution | diffusion, soumission validée, restitution agrégée + complétude — validé e2e | ✅ fait |
| 8 | Exports | feuille émargement PDF (QR), certificat, décompte PDF/CSV/XLSX — validé e2e | ✅ fait |
| 9 | Front (apps/web) + Accessibilité + i18n + gate CI a11y | PWA React/Vite + Capacitor, design system accessible, i18n FR/EN, login↔API validé navigateur ; gate a11y axe-core (4/4) + Lighthouse/pa11y en CI + déclaration d'accessibilité | ✅ fait |
| 10 | Super-admin SaaS + plans/quotas | onboarding/supervision/plans/quotas via client privilégié séparé — validé e2e | ✅ fait |
| 11 | Durcissement sécurité + RGPD + doc finale | audit général hash-chaîné, CSP verrouillée, RGPD (export/anonymisation+legal hold), SBOM/gitleaks/SPDX en CI, docs conformité | ✅ fait |

## Definition of Done (critères d'acceptation)

- [x] Aucune requête sans contexte tenant ; test d'isolation inter-tenant vert (8/8).
- [x] Émargement indexé sur la demi-journée, co-signature formateur imposée.
- [x] Faisceau de preuves complet, vérifiable (lien/QR), audit hash-chaîné.
- [x] Feuille d'émargement PDF avec toutes les mentions obligatoires + lien de vérification.
- [x] Interface `SignatureProvider` prête pour QTSP/SEA.
- [x] Décompte facturation exportable (PDF/CSV/XLSX).
- [x] CI a11y verte (axe 0 critique/sérieux, Lighthouse a11y ≥ 95) + déclaration publiée.
- [x] Uploads scannés (ClamAV) + chiffrés ; dézippage sécurisé (EICAR testé).
- [x] MFA + RBAC + audit + en-têtes de sécurité (CSP verrouillée) actifs.
- [x] AGPLv3 en place (LICENSE, SPDX vérifié en CI, NOTICE).
- [x] App installable (PWA) + base Capacitor iOS/Android (build prod OK).
- [ ] Déploiement self-host (docker-compose) ET SaaS documentés — *compose dev OK ; doc prod à compléter*.
- [x] Mapping Qualiopi → fonctionnalités documenté ([docs/conformite/qualiopi-mapping.md](docs/conformite/qualiopi-mapping.md)).
