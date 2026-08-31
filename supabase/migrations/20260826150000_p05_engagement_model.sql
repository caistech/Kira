-- ============================================================================
-- P0.5 STEP 2B: ENGAGEMENT MODEL
-- ============================================================================
-- Scope: Create engagement model, establish temporal engagement boundaries,
-- link consultants to engagements, preserve engagement history.
--
-- EXCLUDED from this migration (deferred to Step 2C+):
--   - Consultant / Engagement access semantics (Step 2C)
--   - API rebinding (Step 2D)
--   - Knowledge / Decision / Action / Outcome / Learning (Step 5)
--
-- Governing principles:
--   - Engagement is a first-class bounded body of work
--   - Engagement has its own lifecycle
--   - Engagement may involve multiple consultants and organisational participants
--   - Engagement is independent of Subscription lifecycle
--   - Engagement history is preserved
-- ============================================================================

-- STEP 2B.1: Create engagements table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS engagements (
    engagement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    engagement_type TEXT NOT NULL DEFAULT 'advisory' CHECK (engagement_type IN ('advisory', 'implementation', 'audit', 'fractional', 'training', 'other')),
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE engagements IS 'Bounded body of work with its own lifecycle. Independent of Subscription. P0.5 Step 2B.';

CREATE INDEX IF NOT EXISTS idx_engagements_organisation_id ON engagements(organisation_id);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
CREATE INDEX IF NOT EXISTS idx_engagements_valid_from ON engagements(valid_from);

-- STEP 2B.2: Create engagement_participants table (junction)
-- ---------------------------------------------------------------------------

-- Links consultants and organisational members to engagements.

CREATE TABLE IF NOT EXISTS engagement_participants (
    participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID NOT NULL REFERENCES engagements(engagement_id) ON DELETE CASCADE,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('consultant', 'member', 'external')),
    participant_id_ref UUID NOT NULL, -- References consultant_profiles(consultant_id) or persons(person_id)
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('lead', 'participant', 'reviewer', 'approver', 'observer')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE engagement_participants IS 'Junction table linking participants to engagements. P0.5 Step 2B.';

CREATE INDEX IF NOT EXISTS idx_engagement_participants_engagement_id ON engagement_participants(engagement_id);
CREATE INDEX IF NOT EXISTS idx_engagement_participants_participant_id_ref ON engagement_participants(participant_id_ref);

-- STEP 2B.3: Create engagement_history table (audit trail)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS engagement_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID NOT NULL REFERENCES engagements(engagement_id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'started', 'paused', 'resumed', 'completed', 'cancelled', 'participant_added', 'participant_removed')),
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID REFERENCES persons(person_id),
    reason TEXT,
    metadata JSONB
);

COMMENT ON TABLE engagement_history IS 'Immutable audit trail of engagement lifecycle events. P0.5 Step 2B.';

CREATE INDEX IF NOT EXISTS idx_engagement_history_engagement_id ON engagement_history(engagement_id);

-- STEP 2B.4: Create helper functions
-- ---------------------------------------------------------------------------

-- Function to check if an engagement is currently active
CREATE OR REPLACE FUNCTION is_engagement_active(p_engagement_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM engagements
        WHERE engagement_id = p_engagement_id
        AND status IN ('active', 'paused')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_engagement_active(UUID) IS 'Check if engagement is currently active or paused. P0.5 Step 2B.';

-- Function to get all active engagements for an organisation
CREATE OR REPLACE FUNCTION get_organisation_engagements(p_organisation_id UUID)
RETURNS TABLE (
    engagement_id UUID,
    title TEXT,
    engagement_type TEXT,
    status TEXT,
    priority TEXT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.engagement_id,
        e.title,
        e.engagement_type,
        e.status,
        e.priority,
        e.valid_from,
        e.valid_to
    FROM engagements e
    WHERE e.organisation_id = p_organisation_id
    AND e.status IN ('active', 'paused')
    ORDER BY e.valid_from DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_organisation_engagements(UUID) IS 'Get all active engagements for an organisation. P0.5 Step 2B.';

-- Function to get participants of an engagement
CREATE OR REPLACE FUNCTION get_engagement_participants(p_engagement_id UUID)
RETURNS TABLE (
    participant_id UUID,
    participant_type TEXT,
    participant_name TEXT,
    role TEXT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ep.participant_id,
        ep.participant_type,
        CASE
            WHEN ep.participant_type = 'consultant' THEN
                COALESCE(cp.organisation_name, p.first_name || ' ' || p.last_name)
            WHEN ep.participant_type = 'member' THEN
                p.first_name || ' ' || p.last_name
            ELSE 'External'
        END as participant_name,
        ep.role,
        ep.valid_from,
        ep.valid_to
    FROM engagement_participants ep
    LEFT JOIN consultant_profiles cp ON cp.consultant_id = ep.participant_id_ref AND ep.participant_type = 'consultant'
    LEFT JOIN persons p ON p.person_id = ep.participant_id_ref AND ep.participant_type = 'member'
    WHERE ep.engagement_id = p_engagement_id
    AND ep.status = 'active'
    ORDER BY ep.valid_from DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_engagement_participants(UUID) IS 'Get all active participants of an engagement. P0.5 Step 2B.';

-- STEP 2B.5: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'engagements',
    gen_random_uuid(),
    'bridge',
    'confirmed',
    'new_structure',
    'Engagement model created. No legacy data to backfill.',
    NOW()
FROM users u;

-- STEP 2B.6: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: engagements table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagements');

-- Verification 2: engagement_participants table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_participants');

-- Verification 3: engagement_history table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_history');

-- Verification 4: No engagements exist yet (no legacy data)
-- Expected: 0 rows
-- SELECT COUNT(*) FROM engagements;

-- Verification 5: Helper functions exist
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_engagement_active');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_engagements');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_engagement_participants');

-- Verification 6: Engagement is independent of Subscription
-- Expected: No FK from engagements to subscriptions
-- (Verify by checking table structure)
