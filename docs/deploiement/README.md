<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Déploiement

Deux cibles documentées (à compléter) :

- **Self-host** (un OF auto-héberge) : `docker-compose` complet (API, PostgreSQL, Redis, MinIO,
  ClamAV), hébergement UE/France, sauvegardes, mise à jour.
- **SaaS** (exploitation Humanix) : multi-tenant, onboarding, plans/quotas, data residency,
  pooling DB (PgBouncer mode transaction — cf. [ADR 0002](../adr/0002-isolation-multi-tenant-rls.md)).

Stack dev : voir [`infra/docker/docker-compose.dev.yml`](../../infra/docker/docker-compose.dev.yml).

> Rappel AGPL §13 : tout déploiement réseau (y compris modifié) doit offrir le code source aux
> utilisateur·ice·s du service. Voir [ADR 0007](../adr/0007-licence-agplv3-et-modele-saas.md).
