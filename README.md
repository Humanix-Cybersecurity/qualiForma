<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# QualiForma — plateforme souveraine de gestion d'organisme de formation

Plateforme SaaS **multi-tenant**, **open source (AGPLv3)** et **auto-hébergeable** pour gérer
un organisme de formation de bout en bout : acquisition, vente, réalisation, **émargement à
valeur probante**, conformité **Qualiopi**, pilotage et facturation. Pensée **souveraine**
(hébergement FR/UE, aucune dépendance SaaS US) et conforme **eIDAS**, **RGAA 4.1 / WCAG 2.1 AA**,
**RGPD**.

> ⚖️ **Cadre légal** : ce dépôt encode des bonnes pratiques de conformité, **pas une garantie
> juridique**. Le niveau de signature (AES + horodatage qualifié), la facturation électronique
> et la conformité finale doivent être validés avec votre organisme certificateur, votre PSCo
> d'horodatage et un·e juriste avant exploitation.

---

## ✨ Le différenciateur : un émargement réellement probant et souverain

Là où la plupart des outils s'arrêtent à une signature « simple », QualiForma produit une
**preuve opposable** :

- **Signature avancée (AES)** au sens eIDAS : émargement authentifié multi-modal
  (code, **QR dynamique** anti-fraude, signature manuscrite, lien personnel à usage unique),
  co-signature formateur obligatoire.
- **Scellement consolidé** d'une demi-journée + **horodatage QUALIFIÉ eIDAS** (RFC 3161,
  PSCo français de la liste de confiance ANSSI/UE — Datasure/Universign), TSA **pluggable**
  (`qualified | internal | mock`, refus de démarrer en prod hors mode qualifié).
- **Pack de preuve vérifiable hors-ligne** (chaîne d'audit SHA-256, jeton d'horodatage) via
  l'outil [`@humanix/proof-verifier`](packages/proof-verifier).
- **Immuabilité** garantie au niveau SGBD (triggers) + stockage **WORM** (object-lock).

Voir [docs/conformite/valeur-probante.md](docs/conformite/valeur-probante.md) et
[docs/conformite/niveau-signature-juridique.md](docs/conformite/niveau-signature-juridique.md).

---

## 🧩 Fonctionnalités

**Catalogue & sessions** — formations (CRUD + programme/RI/convocation/convention PDF),
sessions, créneaux demi-journée (validation horaires), inscriptions, désinscription,
gestion des comptes apprenant/formateur.

**Émargement & preuve** — multi-modal, hors-ligne (PWA + file IndexedDB, sync idempotente),
géolocalisation consentie, scellement + pack de preuve, feuille d'émargement consolidée.

**Conformité Qualiopi** — **tableau de bord des 32 indicateurs RNQ** (auto-évaluation + statut
+ preuves), alertes de complétude avant clôture de session, mapping indicateurs.

**Gestion commerciale** — **devis** → conversion en **facture** → encaissements, **BPF**
(Bilan Pédagogique et Financier) ventilé par financeur, **export comptable** CSV, **conventions**.

**Facturation électronique** — **Factur-X** (profil MINIMUM, XML embarqué dans le PDF) +
endpoint XML, prêt pour dépôt PDP/Chorus Pro *(socle ; cf. roadmap)*.

**Acquisition** — **catalogue public** sans authentification (`/catalogue/:slug`) +
**préinscription en ligne**, conversion en compte + inscription.

**Pilotage** — tableau de bord KPI temps réel (sessions, heures, CA, satisfaction,
réclamations, sessions à clôturer). **Planning / agenda** avec détection de conflits
formateur/salle.

**E-learning (LMS)** — modules de cours (leçons texte / vidéo intégrée / PDF), **suivi de
progression** apprenant.

**Qualité & RGPD** — questionnaires (positionnement, satisfaction, acquis) + restitution/CSV,
réclamations + actions correctives, **RGPD self-service** (export, anonymisation), **MFA TOTP**.

**Intégrations** — **API publique v1** (lecture, clés d'API `hmx_<slug>_<secret>` résolues
sous RLS), **webhooks** signés HMAC-SHA256 (`scellement.created`).

**Exploitation** — observabilité Prometheus (`/metrics`), quotas par tenant, jobs planifiés
(relances, purge RGPD), notifications e-mail/SMS via opérateurs **FR** (Brevo / Octopush),
back-office super-admin (tenants, plans, quotas).

---

## 🏗️ Architecture & stack

| Couche | Choix | ADR |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo, TypeScript strict | [0001](docs/adr/0001-stack-et-monorepo.md) |
| Backend | NestJS 10 + PostgreSQL 16 + Prisma 5 | [0001](docs/adr/0001-stack-et-monorepo.md) |
| Multi-tenant | PostgreSQL **Row-Level Security** (`tenant_id`, rôle non-bypass) | [0002](docs/adr/0002-isolation-multi-tenant-rls.md) |
| Signature/émargement | AES + horodatage qualifié RFC 3161, port QTSP/SEA | [0003](docs/adr/0003-moteur-signature-ses-eidas.md) |
| Accessibilité | RGAA 4.1 / WCAG 2.1 AA, **gate CI** (axe, Lighthouse, pa11y) | [0004](docs/adr/0004-accessibilite-rgaa-gate-ci.md) |
| Offline émargement | PWA + file d'attente, horodatage serveur faisant foi | [0005](docs/adr/0005-offline-first-emargement.md) |
| Uploads | MinIO/Garage (S3) + ClamAV + WORM/object-lock | [0006](docs/adr/0006-stockage-objet-et-scan-uploads.md) |
| Licence & SaaS | AGPLv3, cœur séparé des modules d'exploitation | [0007](docs/adr/0007-licence-agplv3-et-modele-saas.md) |
| Souveraineté | services de confiance FR/UE uniquement, pas de SaaS US | [0008](docs/adr/0008-souverainete-services-de-confiance.md) |

Front : **React 18 + Vite + PWA (Workbox) + Capacitor** (iOS/Android), React-Aria + Tailwind,
react-i18next (FR/EN), police **Inter auto-hébergée** (souveraine).

## 📁 Structure du dépôt

```
apps/
  api/      NestJS — API, RBAC, RLS, jobs, ~33 modules métier
  web/      React + Vite PWA + Capacitor (apprenant / formateur / admin OF / super-admin)
  admin/    Back-office super-admin (scaffold)
packages/
  domain/            Types & entités partagés (source de vérité métier)
  ui/                Design system accessible (React Aria + Tailwind)
  i18n/              Catalogues react-i18next FR/EN
  pdf-templates/     Gabarits PDF versionnés (émargement, certificat, convention, facture, Factur-X…)
  signature-engine/  Cœur probant : faisceau de preuves, audit chaîné, RFC 3161, vérification
  proof-verifier/    CLI de vérification de pack de preuve hors-ligne
  config/            ESLint / TS / tooling partagés
docs/
  adr/          Architecture Decision Records (0001–0008)
  conformite/   Qualiopi, valeur probante, niveau de signature eIDAS, RGPD (registre + DPA), sécurité
  legal/        Modèles mentions légales & CGU
  deploiement/  Self-host, production (PgBouncer/migrations), multiplateforme, facturation électronique
infra/docker/   Dockerfiles & compose
```

## 🚀 Lancer l'application (Docker)

Stack complète (API + front + PostgreSQL + MinIO + ClamAV), avec migrations / RLS / seed
automatiques :

```bash
docker compose up --build
# → Front : http://localhost:8080   ·   API : http://localhost:3000
```

**Comptes de démo** (mot de passe `Demo!Passw0rd`) :

| Rôle | E-mail | Tenant (en-tête `x-tenant-slug`) |
| --- | --- | --- |
| Admin OF | `admin@demo.test` | `demo` |
| Formateur | `formateur@demo.test` | `demo` |
| Apprenant | `sofia.nguyen@demo.test` … | `demo` |
| Super-admin SaaS | `superadmin@humanix.test` | `humanix` |

Catalogue public de démo : `http://localhost:8080/catalogue/demo`.

## 🧑‍💻 Développement local (sans conteneur applicatif)

```bash
pnpm install
docker compose -f infra/docker/docker-compose.dev.yml up -d   # PostgreSQL, MinIO, ClamAV
pnpm --filter @humanix/api db:setup                           # migrations + RLS + seed
pnpm --filter @humanix/api dev      # API  (http://localhost:3000)
pnpm --filter @humanix/web dev      # front (http://localhost:5173)
```

Qualité : `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm lint:spdx`. CI : lint/typecheck/
tests, **isolation RLS inter-tenant** (gate bloquant), accessibilité (gate bloquant), sécurité
(audit deps, gitleaks, SBOM CycloneDX, **Semgrep**, **Trivy**, **CodeQL**).

## 🇫🇷 Souveraineté & conformité

- **Hébergement FR** (Scaleway ; cible SecNumCloud documentée), stockage **WORM** (MinIO/Garage).
- **Horodatage qualifié** par PSCo **français** (liste de confiance UE) — jamais de service US.
- **E-mail/SMS** via opérateurs FR (Brevo / OVH / Octopush). Pas de Twilio/SendGrid.
- Toutes les dépendances sont **OSI, compatibles AGPLv3** (tables de licences dans les docs de
  déploiement). Aucun composant propriétaire, SSPL/BSL ou SaaS US obligatoire.
- Niveau juridique visé : **signature AVANCÉE (AES) + horodatage QUALIFIÉ** (pas la QES) — cité
  explicitement dans le pack de preuve.

## 🗺️ Roadmap — état

Tronc fonctionnel **au niveau des leaders du marché** (Digiforma, Dendreo, Kaliio, Teachizy…),
plus le différenciateur souverain. Livré : pilotage, gestion commerciale + BPF, devis→facture,
catalogue public, Qualiopi 32 indicateurs, planning, LMS (1ʳᵉ tranche), API + webhooks,
socle Factur-X.

**Points d'extension documentés** (dépendent d'accès/habilitations externes) :
dépôt **PDP/Chorus Pro** (Factur-X), connecteurs financeurs **EDOF/Kairos/OPCO**, paiement en
ligne PSP **UE**. Voir
[docs/deploiement/facturation-electronique-financeurs.md](docs/deploiement/facturation-electronique-financeurs.md).

## 📄 Licence

Distribué sous **GNU AGPL-3.0-or-later** (voir [`LICENSE`](LICENSE) et [`NOTICE`](NOTICE)).
L'AGPL impose la **mise à disposition du code source modifié aux utilisateur·ice·s du service
réseau** : tout déploiement SaaS de ce logiciel (y compris modifié) doit offrir l'accès au code
source correspondant.
