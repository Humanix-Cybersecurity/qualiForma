# Exploitation en production

Complète `README.md` (hébergement FR souverain : Scaleway, cible SecNumCloud) pour les
aspects base de données, migrations et observabilité. Aucun service US, toutes briques OSI.

## 1. Migrations & RLS — pas via l'entrypoint en prod

`infra/docker/api-entrypoint.sh` enchaîne `migrate deploy` + RLS + **seed** : pratique en
dev, **à proscrire en production** (le seed insère des données de démo, et lancer les
migrations depuis chaque réplica crée des courses au rollout).

Stratégie prod :

1. **Job one-shot de migration** exécuté *avant* le déploiement des réplicas applicatifs
   (ex. job Kubernetes `migrate`, ou étape de pipeline), sur la **connexion propriétaire**
   (`DATABASE_ADMIN_URL`, hors PgBouncer — voir §2) :
   ```sh
   pnpm --filter @humanix/api exec prisma migrate deploy
   node apps/api/scripts/apply-rls.mjs          # (ré)applique les policies RLS à toutes les tables tenant
   ```
2. **Pas de seed** en prod (`db:seed` réservé aux environnements de démo).
3. Les réplicas applicatifs démarrent ensuite avec un entrypoint réduit à `node dist/main.js`
   (variable `RUN_MIGRATIONS=false` à honorer dans l'entrypoint, ou image prod dédiée).
4. **Rollback** : migrations expand/contract (ajout de colonnes nullable d'abord, backfill,
   puis contrainte) pour rester compatible avec l'ancienne version pendant le rollout.

> Les migrations et `apply-rls.mjs` exécutent du DDL et des `ALTER ... FORCE ROW LEVEL
> SECURITY` : elles nécessitent une connexion **session** (pas le pooler transaction).

## 2. PgBouncer (pooling de connexions)

PostgreSQL supporte mal des milliers de connexions directes ; PgBouncer (ISC, souverain)
en mode **transaction** mutualise les connexions serveur.

Compatibilité avec notre modèle multi-tenant RLS :

- L'isolation repose sur `SET LOCAL app.tenant_id = …` exécuté **dans chaque transaction**
  (`TenantPrismaService.withTenant`). `SET LOCAL` est **transaction-scoped** → parfaitement
  compatible avec le pooling transaction (la valeur ne fuit pas entre clients). ✅
- Prisma + PgBouncer transaction : ajouter `?pgbouncer=true` à l'URL applicative pour
  désactiver les prepared statements nommés incompatibles avec ce mode.
- **Deux URLs distinctes** :
  - `DATABASE_URL` → via PgBouncer (rôle `app`, NOSUPERUSER/NOBYPASSRLS) pour le trafic applicatif.
  - `DATABASE_ADMIN_URL` → connexion **directe** (rôle propriétaire) pour migrations, RLS et
    jobs privilégiés (purge RGPD cross-tenant). Ne jamais router l'admin via le pooler transaction.

Extrait `pgbouncer.ini` :
```ini
[databases]
humanix = host=postgres port=5432 dbname=humanix
[pgbouncer]
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 25
server_tls_sslmode = require
```

## 3. Observabilité (souveraine)

- L'API expose `/metrics` au format Prometheus (`prom-client`, Apache-2.0) — exclu du
  middleware tenant. Protéger l'accès par `METRICS_TOKEN` **et/ou** restreindre au réseau
  privé de scraping (l'endpoint n'a pas besoin d'être exposé publiquement).
- Stack recommandée, 100 % auto-hébergeable FR : **Prometheus** (Apache-2.0) + **Grafana**
  (AGPLv3) + **Alertmanager**. Aucun SaaS US (pas de Datadog/New Relic).
- Métriques métier : `emargements_signes_total{methode}`, `scellements_total{niveau,horodatage}`,
  `http_request_duration_seconds`, plus les métriques runtime Node par défaut.

Exemple de règles d'alerte Prometheus :
```yaml
groups:
  - name: humanix
    rules:
      - alert: ApiErreurs5xx
        expr: sum(rate(http_request_duration_seconds_count{status=~"5.."}[5m])) > 0.5
        for: 10m
        labels: { severity: critical }
        annotations: { summary: "Taux d'erreurs 5xx élevé sur l'API" }
      - alert: ScellementHorodatageNonQualifie
        # Souveraineté : aucun scellement ne doit utiliser un horodatage interne/mock en prod.
        expr: increase(scellements_total{horodatage!="rfc3161"}[1h]) > 0
        for: 0m
        labels: { severity: critical }
        annotations: { summary: "Scellement sans horodatage qualifié détecté" }
      - alert: ApiLatenceP95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1
        for: 15m
        labels: { severity: warning }
        annotations: { summary: "Latence p95 > 1s" }
```

## 4. Quotas par tenant

`QuotasService` applique les limites effectives (Quota du tenant > plan de l'abonnement,
`null` = illimité) au sein de la transaction tenant :

- `maxActiveSessions` : refus à la création de session si le nombre de sessions
  `planifiee`/`en_cours` atteint la limite.
- `maxUsers` : assertion disponible (`assertCanAddUser`) à brancher sur tout futur point
  de création d'utilisateur (invitation). L'onboarding initial du tenant en est exempt.

## 5. Facturation SaaS (point d'extension)

Le modèle de données (Plan / Subscription / Quota) est en place. L'encaissement est laissé
comme **point d'extension souverain** : à brancher sur un PSP **européen** (ex. Mollie,
Stripe entité UE avec DPA, ou prélèvement SEPA via un établissement FR) — **jamais** un
acteur imposant un transfert hors UE sans garanties. Aucune dépendance de paiement n'est
embarquée par défaut pour préserver la neutralité et la souveraineté du socle.

## Licences ajoutées (Jalon G)

| Composant     | Licence    | Rôle                                    |
| ------------- | ---------- | --------------------------------------- |
| `prom-client` | Apache-2.0 | Exposition métriques Prometheus         |
| PgBouncer     | ISC        | Pooling de connexions (infra)           |
| Prometheus    | Apache-2.0 | Collecte métriques (infra, hors dépôt)  |
| Grafana       | AGPLv3     | Tableaux de bord (infra, hors dépôt)    |
| Trivy         | Apache-2.0 | Scan vulnérabilités/conteneur (CI)      |
| Semgrep CLI   | LGPL-2.1   | SAST (CI)                               |
| CodeQL        | (GitHub, usage CI public gratuit) | SAST (CI) |

Toutes les dépendances *embarquées* sont OSI et compatibles AGPLv3.
