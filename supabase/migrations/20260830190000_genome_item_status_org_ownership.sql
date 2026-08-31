-- ============================================================================
-- P2.4-2A: genome_item_status organisational ownership — rebind idempotency
-- ============================================================================
-- owns the per-item verdict. It is the checklist scorer's only durable output and
-- the evidence that an area has been assessed. Genome is organisation-owned
-- (INV-020): organisations are the tenant, user_id is provenance of who assessed.
--
-- organisation_id was added as NOT NULL by Phase 1B (20260828001718) — the table
-- was verified EMPTY at that point, so the NOT NULL column landed without a
-- backfill and without rebinding the idempotency key:
--
--   - legacy idempotency: UNIQUE (user_id, item_key)      -> "one verdict per person"
--   - canonical idempotency: UNIQUE (organisation_id, item_key) -> "one verdict per org"
--
-- The application code (app/my-genome/[area]/actions.ts) now upserts with
-- onConflict 'organisation_id,item_key'. That MERGE can only run when a unique
-- constraint on exactly that key exists — otherwise Supabase throws
-- 'there is no unique or exclusion constraint matching the ON CONFLICT
-- specification'. This migration rebinds the key to the organisation anchor,
-- the same disposition as kira_tasks (20260830180000).
--
-- DISPOSITION
--   A. ADD the org-anchored read index (the area page queries by org then area).
--   B. REBIND idempotency: drop the person-scoped unique, add the org-scoped one.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A. ADD the org-anchored read index.
--    The area page (app/my-genome/[area]/page.tsx) reads by organisation_id then
--    area. The legacy person-scoped index (user_id, area) is replaced with the
--    org-anchored equivalent. A person-scoped index stays for provenance-filtered
--    admin reads.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS genome_item_status_user_area_idx;
CREATE INDEX IF NOT EXISTS genome_item_status_org_area_idx
    ON genome_item_status (organisation_id, area);
CREATE INDEX IF NOT EXISTS genome_item_status_user_id_idx
    ON genome_item_status (user_id);

-- ---------------------------------------------------------------------------
-- B. REBIND idempotency to the organisation anchor.
--    The legacy UNIQUE (user_id, item_key) enforces "one verdict per person" —
--    the semantic this migration dismantles. The canonical key is one verdict per
--    organisation: two owners in the same org must not get contradicting verdicts
--    keyed on different users, and the within-org upsert must hit a single row.
-- ---------------------------------------------------------------------------
ALTER TABLE genome_item_status DROP CONSTRAINT IF EXISTS genome_item_status_user_id_item_key_key;
ALTER TABLE genome_item_status DROP CONSTRAINT IF EXISTS genome_item_status_org_item_uniq;
ALTER TABLE genome_item_status
    ADD CONSTRAINT genome_item_status_org_item_uniq UNIQUE (organisation_id, item_key);

-- ---------------------------------------------------------------------------
-- Column comment: the legacy "who owns this verdict" reading is removed and
-- replaced with the canonical provenance role.
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN genome_item_status.user_id IS
    E'Provenance — who assessed the item (person id). Ownership is genome_item_status.organisation_id; this column is not the tenant.';

COMMIT;
