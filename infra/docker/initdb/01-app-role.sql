-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Exécuté une seule fois à l'initialisation du conteneur PostgreSQL (dev).
-- Crée le rôle applicatif `app` : NON superuser, NON BYPASSRLS → soumis à la RLS (ADR 0002).
-- Le rôle propriétaire/migration est l'utilisateur principal du conteneur (humanix_admin).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    CREATE ROLE app LOGIN PASSWORD 'app' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE humanix TO app;
-- Les GRANT fins sur les tables sont posés par prisma/sql/rls-policies.sql après migration.
