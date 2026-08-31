-- ============================================================================
-- P2.4-2C: client_profiles organisational ownership — rebind singleton
-- ============================================================================
-- client_profiles holds the deep-discovery structured profile the operational Kira
-- is briefed from. Per DATA_STANDARD it is the STRUCTURED store (exact/durable
-- facts). Ownership is the Organisation (INV-020); a discovery profile is built
-- about the business and must survive personnel change.
--
-- organisation_id was added as NOT NULL by Phase 1B (20260828001718) on a
-- verified-EMPTY table. The legacy singleton ("one profile per user", enforced by
-- `user_id UUID NOT NULL UNIQUE`) was never rebound:
--
--   - legacy singleton: one profile per person
--   - canonical singleton: one profile per organisation
--
-- DISPOSITION
--   A. ADD the org-anchored read index.
--   B. REBIND the singleton to the organisation anchor, preserving the legacy
--      user-scoped unique as an organization-internal secondary uniqueness
--      so the org cannot accrete duplicate discovery profiles.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A. ADD the org-anchored read index.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS client_profiles_org_idx
    ON client_profiles (organisation_id);

-- ---------------------------------------------------------------------------
-- B. REBIND the singleton to the organisation anchor.
--    'client_profiles_user_id_key' came from the column UNIQUE (user_id). Drop
--    it, then enforce one profile per organisation. A UNIQUE (organisation_id)
--    is the canonical singleton.
-- ---------------------------------------------------------------------------
ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_user_id_key;
DROP INDEX IF EXISTS client_profiles_org_uniq;
CREATE UNIQUE INDEX client_profiles_org_uniq
    ON client_profiles (organisation_id);

-- ---------------------------------------------------------------------------
-- Column comment: provenance role.
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN client_profiles.user_id IS
    E'Provenance — the person the discovery was conducted for (person id). Ownership is client_profiles.organisation_id; this column is not the tenant.';

COMMIT;
