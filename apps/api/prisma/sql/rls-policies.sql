-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Policies Row-Level Security (ADR 0002). À appliquer APRÈS `prisma migrate deploy`,
-- avec le rôle PROPRIÉTAIRE des tables (migration), pas le rôle applicatif `app`.
--
-- Modèle :
--   * rôle `app` = NOSUPERUSER, NOBYPASSRLS → soumis à la RLS (cf. initdb/01-app-role.sql).
--   * `FORCE ROW LEVEL SECURITY` → la RLS s'applique MÊME au propriétaire de la table
--     (défense en profondeur : aucune requête applicative n'échappe au cloisonnement).
--   * `app.tenant_id` est posé par transaction via `SET LOCAL` (jamais en clair, jamais
--     persistant entre deux requêtes du pool).

-- Helper : tenant courant (NULL si non positionné → aucune ligne visible = fail-closed).
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid $$;

-- Résolution du tenant au login (avant que app.tenant_id soit connu).
-- SECURITY DEFINER : s'exécute avec les droits du propriétaire (contourne la RLS du
-- SEUL select ci-dessous), pour permettre la résolution par slug sans BYPASSRLS applicatif.
CREATE OR REPLACE FUNCTION resolve_tenant(p_slug text)
  RETURNS TABLE (id uuid, slug text, status text)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT t.id, t.slug, t.status::text
  FROM tenant t
  WHERE t.slug = p_slug AND t.status = 'active'
$$;

-- ---------------------------------------------------------------------------
-- tenant : un tenant ne voit que sa propre ligne.
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenant;
CREATE POLICY tenant_isolation ON tenant
  USING (id = current_tenant_id())
  WITH CHECK (id = current_tenant_id());

-- app_user
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_user_isolation ON app_user;
CREATE POLICY app_user_isolation ON app_user
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- refresh_token
ALTER TABLE refresh_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_token FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS refresh_token_isolation ON refresh_token;
CREATE POLICY refresh_token_isolation ON refresh_token
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- audit_log : append-only (INSERT + SELECT uniquement, cf. GRANT plus bas).
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_isolation ON audit_log;
CREATE POLICY audit_log_isolation ON audit_log
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ---------------------------------------------------------------------------
-- Droits du rôle applicatif `app` (DML uniquement ; pas de DDL, pas de bypass).
GRANT USAGE ON SCHEMA public TO app;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant, app_user, refresh_token TO app;
-- audit_log : immuable → pas d'UPDATE/DELETE.
GRANT SELECT, INSERT ON audit_log TO app;
GRANT EXECUTE ON FUNCTION resolve_tenant(text) TO app;
GRANT EXECUTE ON FUNCTION current_tenant_id() TO app;

-- Les futures tables héritent des droits par défaut pour `app` (à étendre à l'étape 3).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
