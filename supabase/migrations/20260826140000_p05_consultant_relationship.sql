-- ============================================================================
-- P0.5 STEP 2A: CONSULTANT RELATIONSHIP MODEL
-- ============================================================================
-- Scope: Create consultant relationships, establish temporal consultant
-- associations, preserve consultant history.
--
-- EXCLUDED from this migration (deferred to Step 2B+):
--   - Engagement model (Step 2B)
--   - Consultant ↔ Engagement access semantics (Step 2C)
--   - API rebinding (Step 2D)
--
-- Governing principles:
--   - Consultant is a first-class concept
--   - Consultant relationship is temporal
--   - Consultant changes must not affect organisational identity or memory
--   - Consultant ≠ Introducer (introducers remain separate)
--   - History is preserved (consultant finishing = historical state, not deletion)
-- ============================================================================

-- STEP 2A.1: Create consultant_profiles table
-- ---------------------------------------------------------------------------

-- A consultant profile represents a consulting entity (person or organisation)
-- that may have relationships with multiple Organisations over time.

CREATE TABLE IF NOT EXISTS consultant_profiles (
    consultant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES persons(person_id) ON DELETE SET NULL,
    organisation_name TEXT,
    abn TEXT,
    specialisation TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (person_id IS NOT NULL OR organisation_name IS NOT NULL)
);

COMMENT ON TABLE consultant_profiles IS 'Consulting entity (person or organisation). Independent of any specific Organisation. P0.5 Step 2A.';

CREATE INDEX IF NOT EXISTS idx_consultant_profiles_person_id ON consultant_profiles(person_id);
CREATE INDEX IF NOT EXISTS idx_consultant_profiles_status ON consultant_profiles(status);

-- STEP 2A.2: Create consultant_relationships table
-- ---------------------------------------------------------------------------

-- Temporal relationship between a consultant and an organisation.
-- This is the canonical consultant association, distinct from membership.

CREATE TABLE IF NOT EXISTS consultant_relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES consultant_profiles(consultant_id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL DEFAULT 'advisor' CHECK (relationship_type IN ('advisor', 'implementer', 'strategist', 'auditor', 'fractional_cso', 'other')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE consultant_relationships IS 'Temporal consultant ↔ organisation relationship. Consultant changes do not affect organisational identity. P0.5 Step 2A.';

CREATE INDEX IF NOT EXISTS idx_consultant_relationships_consultant_id ON consultant_relationships(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_relationships_organisation_id ON consultant_relationships(organisation_id);
CREATE INDEX IF NOT EXISTS idx_consultant_relationships_status ON consultant_relationships(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultant_relationships_active ON consultant_relationships(consultant_id, organisation_id) WHERE status = 'active';

-- STEP 2A.3: Create consultant_history table (audit trail)
-- ---------------------------------------------------------------------------

-- Immutable audit trail of consultant relationship changes.
-- Preserves history even when relationships are ended.

CREATE TABLE IF NOT EXISTS consultant_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id UUID NOT NULL REFERENCES consultant_relationships(relationship_id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES consultant_profiles(consultant_id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'activated', 'suspended', 'reactivated', 'ended')),
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID REFERENCES persons(person_id),
    reason TEXT,
    metadata JSONB
);

COMMENT ON TABLE consultant_history IS 'Immutable audit trail of consultant relationship changes. P0.5 Step 2A.';

CREATE INDEX IF NOT EXISTS idx_consultant_history_relationship_id ON consultant_history(relationship_id);
CREATE INDEX IF NOT EXISTS idx_consultant_history_organisation_id ON consultant_history(organisation_id);

-- STEP 2A.4: Backfill consultant relationships from existing data
-- ---------------------------------------------------------------------------

-- Note: There is no existing consultant data in the legacy schema.
-- The legacy schema only has 'introducers' (referral attribution), which
-- are a separate concept. No backfill is needed.
--
-- If future data migration identifies consultant relationships from external
-- sources, they should be backfilled here.

-- STEP 2A.5: Create helper functions
-- ---------------------------------------------------------------------------

-- Function to check if a consultant has an active relationship with an organisation
CREATE OR REPLACE FUNCTION check_consultant_relationship(
    p_consultant_id UUID,
    p_organisation_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM consultant_relationships
        WHERE consultant_id = p_consultant_id
        AND organisation_id = p_organisation_id
        AND status = 'active'
        AND (valid_to IS NULL OR valid_to > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_consultant_relationship(UUID, UUID) IS 'Check if consultant has active relationship with organisation. P0.5 Step 2A.';

-- Function to get all active consultants for an organisation
CREATE OR REPLACE FUNCTION get_organisation_consultants(p_organisation_id UUID)
RETURNS TABLE (
    consultant_id UUID,
    consultant_name TEXT,
    relationship_type TEXT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.consultant_id,
        COALESCE(cp.organisation_name, p.first_name || ' ' || p.last_name) as consultant_name,
        cr.relationship_type,
        cr.valid_from,
        cr.valid_to
    FROM consultant_relationships cr
    JOIN consultant_profiles cp ON cp.consultant_id = cr.consultant_id
    LEFT JOIN persons p ON p.person_id = cp.person_id
    WHERE cr.organisation_id = p_organisation_id
    AND cr.status = 'active'
    AND (cr.valid_to IS NULL OR cr.valid_to > NOW())
    ORDER BY cr.valid_from DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_organisation_consultants(UUID) IS 'Get all active consultants for an organisation. P0.5 Step 2A.';

-- Function to end a consultant relationship (create historical state)
CREATE OR REPLACE FUNCTION end_consultant_relationship(
    p_relationship_id UUID,
    p_performed_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_relationship RECORD;
BEGIN
    -- Get the relationship
    SELECT * INTO v_relationship
    FROM consultant_relationships
    WHERE relationship_id = p_relationship_id
    AND status = 'active';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Update relationship to inactive
    UPDATE consultant_relationships
    SET status = 'inactive',
        valid_to = NOW(),
        updated_at = NOW()
    WHERE relationship_id = p_relationship_id;

    -- Record in history
    INSERT INTO consultant_history (relationship_id, consultant_id, organisation_id, action, performed_by, reason)
    VALUES (p_relationship_id, v_relationship.consultant_id, v_relationship.organisation_id, 'ended', p_performed_by, p_reason);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION end_consultant_relationship(UUID, UUID, TEXT) IS 'End a consultant relationship (create historical state). P0.5 Step 2A.';

-- STEP 2A.6: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'consultant_relationships',
    gen_random_uuid(),
    'bridge',
    'confirmed',
    'new_structure',
    'Consultant relationship model created. No legacy data to backfill.',
    NOW()
FROM users u;

-- STEP 2A.7: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: consultant_profiles table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultant_profiles');

-- Verification 2: consultant_relationships table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultant_relationships');

-- Verification 3: consultant_history table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultant_history');

-- Verification 4: No consultant relationships exist yet (no legacy data)
-- Expected: 0 rows
-- SELECT COUNT(*) FROM consultant_relationships;

-- Verification 5: Helper functions exist
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_consultant_relationship');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_consultants');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'end_consultant_relationship');

-- Verification 6: consultant_history is append-only
-- Expected: UPDATE/DELETE should fail or be restricted
-- (Verify via RLS or application logic)
