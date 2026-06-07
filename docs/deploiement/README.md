<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Déploiement

Deux cibles documentées (à compléter) :

- **Self-host** (un OF auto-héberge) : `docker-compose` complet (API, PostgreSQL, Redis, MinIO,
  ClamAV), hébergement UE/France, sauvegardes, mise à jour.
- **SaaS** (exploitation Humanix) : multi-tenant, onboarding, plans/quotas, data residency,
  pooling DB (PgBouncer mode transaction — cf. [ADR 0002](../adr/0002-isolation-multi-tenant-rls.md)).

Stack dev : voir [`infra/docker/docker-compose.dev.yml`](../../infra/docker/docker-compose.dev.yml) ;
stack complète : [`docker-compose.yaml`](../../docker-compose.yaml) (`docker compose up --build`).

## Souveraineté en production (ADR 0008)

| Composant | Choix souverain | Config |
| --- | --- | --- |
| Hébergement | **Scaleway** (FR) ; cible **SecNumCloud** pour clients sensibles | — |
| Base | PostgreSQL FR + **PgBouncer** (mode transaction) | `DATABASE_URL` (rôle `app`) |
| Stockage objet | **MinIO / Garage** (AGPLv3) en **WORM / object-lock** | `S3_OBJECT_LOCK=true`, `S3_RETENTION_YEARS=10` |
| Horodatage | **TSA qualifiée FR** (Universign / Datasure) | `TSA_MODE=qualified`, `TSA_URL`, `TSA_ALLOWED_HOSTS` |
| E-mail | **Brevo** (FR) | `MAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `MAIL_FROM` |
| SMS | **Octopush** (FR ; OVH SMS en alternative) | `SMS_PROVIDER=octopush`, `OCTOPUSH_API_LOGIN/KEY` |

Garde-fous au démarrage (production) :
- `TSA_MODE` doit valoir `qualified` (sinon **l'API refuse de démarrer**).
- WORM : le bucket de preuves doit être **créé avec object-lock** (non activable a posteriori) ;
  la promotion d'un document y pose une rétention **COMPLIANCE** (`S3_RETENTION_YEARS`).
- Tout prestataire **US ou hors EU Trusted List est interdit** (TSA, e-mail, SMS, stockage).

## Cibles
- **Self-host** (un OF auto-héberge) : `docker compose` complet, hébergement UE/FR, sauvegardes
  PostgreSQL + objets WORM, mise à jour par image.
- **SaaS** (Humanix) : multi-tenant, onboarding, plans/quotas, data residency FR.

> Rappel AGPL §13 : tout déploiement réseau (y compris modifié) doit offrir le code source aux
> utilisateur·ice·s du service. Voir [ADR 0007](../adr/0007-licence-agplv3-et-modele-saas.md).
