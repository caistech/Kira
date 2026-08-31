-- ============================================================================
-- P0.5 STEP 1B: MEMBERSHIP / TENANT CONTEXT
-- ============================================================================
-- Scope: Create organisation_memberships, establish Person → Organisation
-- relationship, backfill from legacy data, add auth resolver function.
--
-- EXCLUDED from this migration (deferred to Step 1C/1D):
--   - RLS authority transfer (Step 1C)
--   - API route rebinding (Step 1D)
--   - Legacy authority retirement (Step 9)
--
-- Governing principle: Person identity is distinct from organisational roles.
-- The organisation is the enduring subject. Membership is the relationship
-- between Person and Organisation, not a surrogate for users.id.
-- ============================================================================

-- STEP 1B.1: Create organisation_memberships table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organisation_memberships (
    membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'consultant', 'employee', 'advisor', 'member')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organisation_id, person_id, role)
);

COMMENT ON TABLE organisation_memberships IS 'Temporal Person ↔ Organisation relationship with roles. The canonical access context. P0.5 Step 1B.';

-- Index for membership lookups
CREATE INDEX IF NOT EXISTS idx_organisation_memberships_person_id ON organisation_memberships(person_id);
CREATE INDEX IF NOT EXISTS idx_organisation_memberships_organisation_id ON organisation_memberships(organisation_id);
CREATE INDEX IF NOT EXISTS idx_organisation_memberships_status ON organisation_memberships(status);

-- STEP 1B.2: Create ownership_periods table (temporal ownership)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ownership_periods (
    ownership_period_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'current' CHECK (status IN ('current', 'historical')),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ownership_periods IS 'Temporal ownership record. Only one current ownership per Organisation. P0.5 Step 1B.';

-- Index for ownership lookups
CREATE INDEX IF NOT EXISTS idx_ownership_periods_organisation_id ON ownership_periods(organisation_id);
CREATE INDEX IF NOT EXISTS idx_ownership_periods_person_id ON ownership_periods(person_id);
CREATE INDEX IF NOT EXISTS idx_ownership_periods_status ON ownership_periods(status);

-- STEP 1B.3: Backfill organisation_memberships from legacy data
-- ---------------------------------------------------------------------------

-- Strategy: Derive membership from existing data sources:
--   1. users with business_identity → owner role
--   2. users without business_identity → member role (personal account)

-- Owner role: users with business_identity
INSERT INTO organisation_memberships (organisation_id, person_id, role, status, valid_from, created_at)
SELECT
    u.id,
    u.id,
    'owner',
    CASE WHEN u.status = 'active' THEN 'active' ELSE 'inactive' END,
    u.created_at,
    NOW()
FROM users u
JOIN business_identity bi ON bi.user_id = u.id
ON CONFLICT (organisation_id, person_id, role) DO NOTHING;

-- Admin role: (Skipped: admin_users table does not exist)
/*
INSERT INTO organisation_memberships (organisation_id, person_id, role, status, valid_from, created_at)
SELECT
    u.id,
    u.id,
    'admin',
    CASE WHEN au.status = 'active' THEN 'active' ELSE 'inactive' END,
    COALESCE(au.granted_at, NOW()),
    NOW()
FROM admin_users au
JOIN users u ON u.id = au.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM organisation_memberships om
    WHERE om.organisation_id = u.id AND om.person_id = u.id AND om.role = 'owner'
)
ON CONFLICT (organisation_id, person_id, role) DO NOTHING;
*/

-- Member role: users without business_identity
-- (personal accounts)
INSERT INTO organisation_memberships (organisation_id, person_id, role, status, valid_from, created_at)
SELECT
    u.id,
    u.id,
    'member',
    CASE WHEN u.status = 'active' THEN 'active' ELSE 'inactive' END,
    u.created_at,
    NOW()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM business_identity bi WHERE bi.user_id = u.id
)
ON CONFLICT (organisation_id, person_id, role) DO NOTHING;

-- STEP 1B.4: Backfill ownership_periods from legacy data
-- ---------------------------------------------------------------------------

-- Current ownership: users with business_identity where business_identity exists
INSERT INTO ownership_periods (organisation_id, person_id, status, valid_from, created_at)
SELECT
    u.id,
    u.id,
    'current',
    u.created_at,
    NOW()
FROM users u
JOIN business_identity bi ON bi.user_id = u.id
ON CONFLICT DO NOTHING;

-- NOTE: Historical ownership is NOT reconstructable from legacy data.
-- Only current ownership periods are created. Historical ownership
-- will be recorded going forward via ownership transfer events.

-- STEP 1B.5: Create auth resolver function
-- ---------------------------------------------------------------------------

-- This function resolves organisation_id from the current auth context.
-- It uses organisation_memberships as the authoritative source, NOT users.id.
--
-- During Bridge phase (Step 1B), this function is available but NOT yet
-- consumed by RLS policies or API routes. Authority transfer happens in 1C/1D.

CREATE OR REPLACE FUNCTION resolve_organisation_id_from_auth()
RETURNS UUID AS $$
DECLARE
    v_auth_user_id TEXT;
    v_person_id UUID;
    v_organisation_id UUID;
BEGIN
    -- Get auth_user_id from JWT claims
    v_auth_user_id := current_setting('request.jwt.claims', true)::json->>'sub';

    IF v_auth_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get person_id from auth_credentials
    SELECT person_id INTO v_person_id
    FROM auth_credentials
    WHERE auth_user_id = v_auth_user_id
    AND status = 'active'
    LIMIT 1;

    IF v_person_id IS NULL THEN
        -- Fallback: try direct mapping (users.id = auth_user_id during bridge)
        SELECT id INTO v_person_id
        FROM users
        WHERE auth_user_id::text = v_auth_user_id
        AND status = 'active'
        LIMIT 1;
    END IF;

    IF v_person_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get primary organisation from membership
    -- Priority: owner > admin > consultant > employee > advisor > member
    SELECT organisation_id INTO v_organisation_id
    FROM organisation_memberships
    WHERE person_id = v_person_id
    AND status = 'active'
    ORDER BY
        CASE role
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'consultant' THEN 3
            WHEN 'employee' THEN 4
            WHEN 'advisor' THEN 5
            WHEN 'member' THEN 6
        END,
        valid_from DESC
    LIMIT 1;

    RETURN v_organisation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION resolve_organisation_id_from_auth() IS 'Resolve organisation_id from auth context using membership. NOT yet used by RLS/API (authority transfer in 1C/1D). P0.5 Step 1B.';

-- STEP 1B.6: Create function to check membership
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_organisation_membership(
    p_person_id UUID,
    p_organisation_id UUID,
    p_required_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organisation_memberships
        WHERE person_id = p_person_id
        AND organisation_id = p_organisation_id
        AND status = 'active'
        AND (p_required_role IS NULL OR role = p_required_role)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_organisation_membership(UUID, UUID, TEXT) IS 'Check if a Person has an active membership in an Organisation. P0.5 Step 1B.';

-- STEP 1B.7: Add migration ledger entries for membership backfill
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'organisation_memberships',
    om.membership_id,
    'bridge',
    'confirmed',
    'derived',
    'Membership derived from ' || CASE
        WHEN EXISTS (SELECT 1 FROM business_identity bi WHERE bi.user_id = u.id) THEN 'business_identity (owner)'
        ELSE 'users (member)'
    END,
    NOW()
FROM users u
JOIN organisation_memberships om ON om.organisation_id = u.id AND om.person_id = u.id;

-- STEP 1B.8: Verification queries (for manual or automated verification)
-- ---------------------------------------------------------------------------

-- Verification 1: Every canonical Person has at least one membership
-- Expected: 0 rows
-- SELECT p.person_id, p.email FROM persons p WHERE NOT EXISTS (
--     SELECT 1 FROM organisation_memberships om WHERE om.person_id = p.person_id
-- );

-- Verification 2: Every membership references valid Organisation and Person
-- Expected: 0 rows
-- SELECT om.membership_id FROM organisation_memberships om
-- WHERE om.organisation_id NOT IN (SELECT organisation_id FROM organisations)
-- OR om.person_id NOT NULL AND om.person_id NOT IN (SELECT person_id FROM persons);

-- Verification 3: No duplicate active memberships per role per Person per Organisation
-- Expected: 0 rows
-- SELECT organisation_id, person_id, role, COUNT(*) as cnt
-- FROM organisation_memberships WHERE status = 'active'
-- GROUP BY organisation_id, person_id, role HAVING COUNT(*) > 1;

-- Verification 4: Owner membership exists for every user with business_identity
-- Expected: 0 rows
-- SELECT u.id FROM users u
-- JOIN business_identity bi ON bi.user_id = u.id
-- WHERE NOT EXISTS (
--     SELECT 1 FROM organisation_memberships om
--     WHERE om.organisation_id = u.id AND om.person_id = u.id AND om.role = 'owner'
-- );

-- Verification 5: Tenant context can be resolved without users.id
-- Expected: 1 row per auth user
-- SELECT resolve_organisation_id_from_auth();

-- Verification 6: Legacy user_id column still exists on all knowledge tables
-- Expected: all tables have user_id column
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE column_name = 'user_id'
-- AND table_name IN ('genome_entities', 'genome_facts', 'kira_memory', 'conversations');

-- Verification 7: organisation_id column exists on all knowledge tables
-- Expected: all tables have organisation_id column
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE column_name = 'organisation_id'
-- AND table_name IN ('genome_entities', 'genome_facts', 'kira_memory', 'conversations');
