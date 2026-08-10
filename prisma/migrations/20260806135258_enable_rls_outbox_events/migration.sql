-- RLS for the new outbox_events table (docs/phase-3-database-design.md §3).
-- Written as an explicit, standalone block per-table, not a rerun of the generic
-- loop from 20260806123000_enable_row_level_security — that migration already
-- applied and is immutable; this is the pattern every future tenant_id-bearing
-- table should follow: its own migration, its own explicit RLS block.
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON outbox_events
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
