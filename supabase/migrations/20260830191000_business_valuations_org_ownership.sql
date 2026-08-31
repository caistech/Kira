-- ============================================================================
-- P2.4-2B: business_valuations organisational ownership — rebind idempotency
-- ============================================================================
-- business_valuations holds the owner's valuation snapshot. Per the P2.3 Gate 1
-- decision (D33, approved), the valuation is Organisation-owned; the Person is the
-- commercial actor / provenance but does not own the enduring record.
--
-- organisation_id was added as NOT NULL by Phase 1B (20260828001718) on a
-- verified-EMPTY table, so no backfill was needed and the legacy idempotency key
-- was never rebound:
--
--   - legacy idempotency: UNIQUE (user_id)      -> "one valuation per person"
--   - canonical idempotency: UNIQUE (organisation_id) -> "one valuation per org"
--
-- The valuation model recomputes/rescores every area on the organisation anchor
-- (recompute-readiness reads business_valuations by organisation). Rebinding the
-- singleton unique index prevents two owners in one org from holding divergent
-- "latest" valuation rows that the model treats as one number.
--
-- DISPOSITION
--   A. ADD the org-anchored read index.
--   B. REBIND the singleton unique index to the organisation anchor.
--   C. Column comment: provenance role.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A. ADD the org-anchored read index.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS business_valuations_org_idx
    ON business_valuations (organisation_id);

-- ---------------------------------------------------------------------------
-- B. REBIND the singleton valuation to the organisation anchor.
--    Fully idempotent: handles the constraint existing (from Phase 1B or a
--    prior partial push), the index existing alone (orphaned from a partial
--    push), or neither existing.
-- ---------------------------------------------------------------------------
-- B1. Drop the legacy person-scoped unique constraint (if it still exists).
ALTER TABLE business_valuations DROP CONSTRAINT IF EXISTS business_valuations_user_uniq;

-- B2. Drop the org-scoped constraint if it already exists. This also removes
--     its backing index of the same name.
DO $$ BEGIN
    ALTER TABLE business_valuations DROP CONSTRAINT IF EXISTS business_valuations_org_uniq;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- B3. Drop any orphaned index (no backing constraint) with that name.
DROP INDEX IF EXISTS business_valuations_org_uniq;

-- B4. Create the unique constraint. This also creates its backing index.
ALTER TABLE business_valuations
    ADD CONSTRAINT business_valuations_org_uniq UNIQUE (organisation_id);

-- ---------------------------------------------------------------------------
-- C. Column comment: provenance role.
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN business_valuations.user_id IS
    E'Provenance — who initiated/owns the valuation (person id). Ownership is business_valuations.organisation_id; this column is not the tenant.';

COMMIT;
