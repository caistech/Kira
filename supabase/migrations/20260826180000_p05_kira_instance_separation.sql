-- ============================================================================
-- P0.5 STEP 4: KIRA INSTANCE SEPARATION
-- ============================================================================
-- Scope: Separate Kira Instance from Organisation identity, establish
-- Kira Instance as subordinate to Organisation, preserve instance history.
--
-- EXCLUDED from this migration (deferred to Step 5+):
--   - Decision / Action / Outcome / Learning (Step 5)
--   - Retirement of legacy authority (Step 6)
--
-- Governing principles:
--   - Kira Instance is separate from Organisation
--   - Kira Instance replacement does not destroy Organisation
--   - Kira Instance knowledge belongs to Organisation
--   - Multiple Kira Instances per Organisation possible
--   - Instance history is preserved
-- ============================================================================

-- STEP 4.1: Create kira_instances table (canonical)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kira_instances (
    instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL DEFAULT 'Kira',
    journey_type TEXT NOT NULL DEFAULT 'professional',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    configuration JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE kira_instances IS 'Kira Instance, subordinate to Organisation. Separate from Organisation identity. P0.5 Step 4.';

CREATE INDEX IF NOT EXISTS idx_kira_instances_organisation_id ON kira_instances(organisation_id);
CREATE INDEX IF NOT EXISTS idx_kira_instances_status ON kira_instances(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kira_instances_active ON kira_instances(organisation_id, journey_type) WHERE status = 'active';

-- STEP 4.2: Create kira_instance_history table (audit trail)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kira_instance_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES kira_instances(instance_id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'activated', 'deactivated', 'reconfigured', 'archived')),
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID REFERENCES persons(person_id),
    reason TEXT,
    metadata JSONB
);

COMMENT ON TABLE kira_instance_history IS 'Immutable audit trail of Kira Instance lifecycle events. P0.5 Step 4.';

CREATE INDEX IF NOT EXISTS idx_kira_instance_history_instance_id ON kira_instance_history(instance_id);

-- STEP 4.3: Backfill from legacy kira_agents
-- ---------------------------------------------------------------------------

-- Migrate existing kira_agents to kira_instances
INSERT INTO kira_instances (instance_id, organisation_id, instance_name, journey_type, status, created_at)
SELECT
    ka.id,
    ka.organisation_id,
    COALESCE(ka.agent_name, ka.name, 'Kira'),
    ka.journey_type,
    CASE WHEN ka.status = 'active' THEN 'active' ELSE 'inactive' END,
    ka.created_at
FROM kira_agents ka
WHERE ka.organisation_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- STEP 4.4: Create helper functions
-- ---------------------------------------------------------------------------

-- Function to get active Kira Instance for an organisation and journey type
CREATE OR REPLACE FUNCTION get_kira_instance(
    p_organisation_id UUID,
    p_journey_type TEXT DEFAULT 'professional'
)
RETURNS TABLE (
    instance_id UUID,
    instance_name TEXT,
    journey_type TEXT,
    status TEXT,
    configuration JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ki.instance_id,
        ki.instance_name,
        ki.journey_type,
        ki.status,
        ki.configuration
    FROM kira_instances ki
    WHERE ki.organisation_id = p_organisation_id
    AND ki.journey_type = p_journey_type
    AND ki.status = 'active'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_kira_instance(UUID, TEXT) IS 'Get active Kira Instance for organisation and journey type. P0.5 Step 4.';

-- Function to get all Kira Instances for an organisation
CREATE OR REPLACE FUNCTION get_organisation_kira_instances(p_organisation_id UUID)
RETURNS TABLE (
    instance_id UUID,
    instance_name TEXT,
    journey_type TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ki.instance_id,
        ki.instance_name,
        ki.journey_type,
        ki.status,
        ki.created_at
    FROM kira_instances ki
    WHERE ki.organisation_id = p_organisation_id
    ORDER BY ki.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_organisation_kira_instances(UUID) IS 'Get all Kira Instances for an organisation. P0.5 Step 4.';

-- STEP 4.5: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'kira_instances',
    gen_random_uuid(),
    'bridge',
    'confirmed',
    'backfill',
    'Kira Instance model created and backfilled from kira_agents',
    NOW()
FROM users u;

-- STEP 4.6: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: kira_instances table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kira_instances');

-- Verification 2: kira_instance_history table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kira_instance_history');

-- Verification 3: Kira Instances backfilled from legacy
-- Expected: count matches kira_agents with organisation_id
-- SELECT COUNT(*) FROM kira_instances;
-- SELECT COUNT(*) FROM kira_agents WHERE organisation_id IS NOT NULL;

-- Verification 4: Kira Instance is separate from Organisation
-- Expected: no FK from organisations to kira_instances
-- (Verify by checking table structure)

-- Verification 5: Helper functions exist
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_kira_instance');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_kira_instances');
