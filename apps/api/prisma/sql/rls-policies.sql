-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Policies Row-Level Security (ADR 0002). À appliquer APRÈS `prisma migrate deploy`,
-- avec le rôle PROPRIÉTAIRE des tables. Idempotent et re-jouable après chaque migration.
--
-- Stratégie DYNAMIQUE : toute table publique possédant une colonne `tenant_id` est
-- automatiquement cloisonnée (ENABLE + FORCE RLS, policy `tenant_isolation`, GRANT DML à `app`).
-- Les nouvelles tables métier sont ainsi couvertes sans modifier ce fichier.
--
-- Cas particuliers gérés explicitement :
--   * `tenant`           → isolation par `id` (pas de colonne tenant_id) ;
--   * `audit_log`,
--     `preuve_signature` → APPEND-ONLY (INSERT + SELECT, pas d'UPDATE/DELETE) ;
--   * `plan`             → GLOBAL (SaaS) : pas de RLS, lecture seule pour `app`.

-- Helper : tenant courant (NULL si non positionné → aucune ligne visible = fail-closed).
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid $$;

-- Résolution du tenant au login (avant que app.tenant_id soit connu). SECURITY DEFINER.
CREATE OR REPLACE FUNCTION resolve_tenant(p_slug text)
  RETURNS TABLE (id uuid, slug text, status text)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT t.id, t.slug, t.status::text
  FROM tenant t
  WHERE t.slug = p_slug AND t.status = 'active'
$$;

GRANT USAGE ON SCHEMA public TO app;
GRANT EXECUTE ON FUNCTION resolve_tenant(text) TO app;
GRANT EXECUTE ON FUNCTION current_tenant_id() TO app;

-- ---------------------------------------------------------------------------
-- Application dynamique sur toutes les tables cloisonnées (colonne tenant_id).
DO $$
DECLARE
  r record;
  p record;
  append_only text[] := ARRAY['audit_log', 'preuve_signature'];
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', r.table_name);
    -- Nettoyage : supprime toute policy préexistante (re-jouable, pas de doublon).
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = r.table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.policyname, r.table_name);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (tenant_id = current_tenant_id()) '
      || 'WITH CHECK (tenant_id = current_tenant_id())',
      r.table_name);

    IF r.table_name = ANY (append_only) THEN
      EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM app', r.table_name);
      EXECUTE format('GRANT SELECT, INSERT ON %I TO app', r.table_name);
    ELSE
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO app', r.table_name);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- tenant : isolation par `id` (un tenant ne voit que sa propre ligne).
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenant;
CREATE POLICY tenant_isolation ON tenant
  USING (id = current_tenant_id())
  WITH CHECK (id = current_tenant_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant TO app;

-- plan : table SaaS globale, lecture seule pour `app` (pas de RLS).
GRANT SELECT ON plan TO app;

-- Privilèges par défaut pour les futures tables (étapes suivantes).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
