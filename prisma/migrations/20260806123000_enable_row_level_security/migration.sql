-- Row-Level Security for the Bridge multi-tenancy model.
-- Design reference: docs/phase-3-database-design.md §3.
--
-- Two application-facing roles:
--   udos_app             — used by the API at runtime for all tenant-scoped requests.
--                          Subject to RLS: every query is implicitly filtered to
--                          current_setting('app.tenant_id').
--   udos_platform_admin  — used only by the Super Admin module's data-access layer
--                          (Phase 8). BYPASSRLS — an explicit, narrow, audited capability,
--                          never used by tenant-facing request handlers.
--
-- Dev-only passwords below (this migration runs against local/CI databases only).
-- Production credentials are provisioned via the secrets manager, never committed
-- (Phase 11 — Cloud Deployment).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'udos_app') THEN
    CREATE ROLE udos_app LOGIN PASSWORD 'dev_only_udos_app';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'udos_platform_admin') THEN
    CREATE ROLE udos_platform_admin LOGIN PASSWORD 'dev_only_udos_platform_admin' BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO udos_app, udos_platform_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO udos_app, udos_platform_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO udos_app, udos_platform_admin;

-- Every table this migration creates in the future should extend these defaults too —
-- this only covers tables that exist in schema `public` at the time each DEFAULT
-- PRIVILEGES statement is registered, going forward from now.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO udos_app, udos_platform_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO udos_app, udos_platform_admin;

-- Apply tenant-isolation RLS uniformly to every table that has a tenant_id column.
-- This generic pass covers all Wave 0-1 tenant tables in one migration; every *future*
-- migration that introduces a new tenant_id column must add its own explicit
-- ENABLE/FORCE/CREATE POLICY block in the same migration (the CI migration-lint check
-- in docs/phase-3-database-design.md §3 enforces this) rather than relying on this
-- block running again.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.column_name = 'tenant_id'
      AND c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', r.table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', r.table_name);
    -- tenant_id columns are Prisma String (Postgres text), not native uuid, so the
    -- session variable is compared as text — no ::uuid cast on either side.
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I ' ||
      'USING (tenant_id = current_setting(''app.tenant_id'', true)) ' ||
      'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true));',
      r.table_name
    );
  END LOOP;
END
$$;
