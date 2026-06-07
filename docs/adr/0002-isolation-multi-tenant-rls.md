<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# ADR 0002 — Isolation multi-tenant par PostgreSQL Row-Level Security

- **Statut** : Proposé
- **Date** : 2026-06-07

## Contexte

Contrainte non négociable : **aucune fuite inter-tenant possible**. Le risque dominant en SaaS
multi-tenant à schéma partagé est l'oubli d'un filtre `tenant_id` dans une requête (jointure,
agrégat, sous-requête). On ne veut pas que la sécurité repose sur la discipline applicative.

## Décision

**Schéma partagé** + colonne `tenant_id` (UUID) sur **toutes** les tables métier +
**Row-Level Security PostgreSQL** comme dernière ligne de défense.

- Chaque table porte `tenant_id NOT NULL` et une policy RLS :
  `USING (tenant_id = current_setting('app.tenant_id')::uuid)` (SELECT/UPDATE/DELETE)
  et `WITH CHECK (...)` (INSERT/UPDATE).
- L'application se connecte avec un **rôle non superuser, sans `BYPASSRLS`** : la RLS s'applique
  *même* si un filtre applicatif est oublié.
- Un **middleware tenant** (NestJS) résout le tenant (sous-domaine ou en-tête signé), puis, par
  requête/transaction, exécute `SET LOCAL app.tenant_id = '<uuid>'`. `SET LOCAL` garantit que la
  variable est limitée à la transaction (pas de fuite via le pool de connexions).
- Le `super_admin` SaaS n'opère **pas** via bypass RLS : un rôle/contexte dédié et audité, jamais
  le rôle applicatif courant.
- **Tests d'isolation automatisés obligatoires** (`pnpm test:isolation`) : tentatives d'accès
  croisé inter-tenant, vérification qu'aucune ligne d'un autre tenant n'est jamais retournée, y
  compris sur jointures et agrégats. Gate CI bloquant.

## Alternatives écartées

- **Schema-per-tenant** : isolation plus forte « physiquement » mais migrations × N schémas,
  complexité opérationnelle et coût de scaling élevés. Documenté comme **plan de bascule** pour
  les tenants à très forte exigence de souveraineté (option contractuelle), non retenu par défaut.
- **Database-per-tenant** : isolation maximale, coût/exploitation prohibitifs au volume visé.
- **Filtrage applicatif seul** : rejeté — un seul oubli = fuite. La RLS est non négociable.

## Conséquences

- (+) Défense en profondeur : la base refuse l'accès croisé même en cas de bug applicatif.
- (+) Une seule migration pour tous les tenants.
- (−) Policies RLS écrites en SQL hors Prisma → migrations SQL versionnées à maintenir et tester.
- (−) Toute connexion brute doit passer par le wrapper qui pose `app.tenant_id`, sinon 0 ligne :
  contrainte qui force le bon usage (fail-closed).
- (−) Risque sur le pooling (PgBouncer en mode transaction) : `SET LOCAL` compatible mode
  transaction uniquement — à documenter dans le déploiement.
