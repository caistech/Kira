-- ============================================================================
-- P0.5 STEP 1C: RLS AUTHORITY TRANSFER
-- ============================================================================
-- Scope: Transfer RLS authority from legacy user_id-based policies to
-- canonical organisation_id-based policies. Every protected organisational
-- row is authorized through canonical organisation membership/context.
--
-- EXCLUDED from this migration (deferred to Step 1D):
--   - API route rebinding (Step 1D)
--   - Legacy authority retirement (Step 9)
--
-- Governing principles:
--   - Organisation is the tenant boundary
--   - Membership is the authority source
--   - person_id identifies a human but does not itself grant access
--   - Ownership is a role/temporal relationship, not implicit authorization
--   - Legacy users.id-based authority is removed
--   - Cross-organisation access is denied
--   - Historical membership does not confer current access
--   - Service-role operations remain explicitly distinguished
-- ============================================================================

-- STEP 1C.1: Create helper function for membership-based access check
-- ---------------------------------------------------------------------------

-- This function checks if the current auth user has access to a given
-- organisation via active membership. It is the canonical authority source
-- for all RLS policies.

CREATE OR REPLACE FUNCTION auth_user_has_organisation_access(p_organisation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_auth_user_id TEXT;
    v_person_id UUID;
    v_has_access BOOLEAN;
BEGIN
    -- Get auth_user_id from JWT claims
    v_auth_user_id := current_setting('request.jwt.claims', true)::json->>'sub';

    IF v_auth_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get person_id from auth_credentials
    SELECT person_id INTO v_person_id
    FROM auth_credentials
    WHERE auth_user_id = v_auth_user_id
    AND status = 'active'
    LIMIT 1;

    -- Fallback: try direct mapping (users.id = auth_user_id during bridge)
    IF v_person_id IS NULL THEN
        SELECT id INTO v_person_id
        FROM users
        WHERE auth_user_id::text = v_auth_user_id
        AND status = 'active'
        LIMIT 1;
    END IF;

    IF v_person_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check membership: active membership in the organisation
    SELECT EXISTS (
        SELECT 1 FROM organisation_memberships
        WHERE person_id = v_person_id
        AND organisation_id = p_organisation_id
        AND status = 'active'
        -- Exclude historical memberships: valid_to must be NULL or in the future
        AND (valid_to IS NULL OR valid_to > NOW())
    ) INTO v_has_access;

    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auth_user_has_organisation_access(UUID) IS 'Check if current auth user has active membership in organisation. Canonical authority for RLS. P0.5 Step 1C.';

-- STEP 1C.2: Create helper function to get current user's organisation_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION auth_user_organisation_id()
RETURNS UUID AS $$
BEGIN
    RETURN resolve_organisation_id_from_auth();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auth_user_organisation_id() IS 'Get organisation_id for current auth user via membership. P0.5 Step 1C.';

-- STEP 1C.3: Drop legacy RLS policies on knowledge tables
-- ---------------------------------------------------------------------------

-- Drop legacy user_id-based policies on genome tables (were USING (true) - wide open)
-- These are being replaced with organisation_id-based policies.

-- genome_entities: drop any existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'genome_entities'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON genome_entities';
    END LOOP;
END $$;

-- genome_facts: drop any existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'genome_facts'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON genome_facts';
    END LOOP;
END $$;

-- genome_relationships: drop any existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'genome_relationships'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON genome_relationships';
    END LOOP;
END $$;

-- genome_events: drop any existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'genome_events'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON genome_events';
    END LOOP;
END $$;

-- kira_memory: drop legacy user_id-based policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'kira_memory'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON kira_memory';
    END LOOP;
END $$;

-- kira_knowledge: drop legacy user_id-based policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'kira_knowledge'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON kira_knowledge';
    END LOOP;
END $$;

-- conversations: drop legacy user_id-based policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'conversations'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON conversations';
    END LOOP;
END $$;

-- conversation_messages: drop any existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'conversation_messages'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON conversation_messages';
    END LOOP;
END $$;

-- kira_agents: drop legacy user_id-based policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'kira_agents'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON kira_agents';
    END LOOP;
END $$;

-- STEP 1C.4: Create canonical organisation_id-based RLS policies
-- ---------------------------------------------------------------------------

-- genome_entities: organisation membership access
CREATE POLICY "org_membership_access" ON genome_entities
    FOR ALL USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- genome_facts: organisation membership access
CREATE POLICY "org_membership_access" ON genome_facts
    FOR ALL USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- genome_relationships: organisation membership access
CREATE POLICY "org_membership_access" ON genome_relationships
    FOR ALL USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- genome_events: organisation membership access
CREATE POLICY "org_membership_access" ON genome_events
    FOR ALL USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- kira_memory: organisation membership access
CREATE POLICY "org_membership_access" ON kira_memory
    FOR ALL USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- kira_knowledge: organisation membership access
CREATE POLICY "org_membership_access" ON kira_knowledge
    FOR ALL USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- conversations: organisation membership access
CREATE POLICY "org_membership_access" ON conversations
    FOR ALL USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- conversation_messages: access via parent conversation's organisation
CREATE POLICY "org_membership_access" ON conversation_messages
    FOR ALL USING (
        auth_user_has_organisation_access(
            (SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id)
        )
    );

-- kira_agents: organisation membership access
CREATE POLICY "org_membership_access" ON kira_agents
    FOR ALL USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- STEP 1C.5: Enable RLS on all knowledge tables (if not already enabled)
-- ---------------------------------------------------------------------------

ALTER TABLE genome_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE genome_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE genome_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE genome_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kira_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE kira_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kira_agents ENABLE ROW LEVEL SECURITY;

-- STEP 1C.6: Add RLS policy for canonical identity tables
-- ---------------------------------------------------------------------------

-- organisations: members can view their organisations
-- (Already created in Step 1A, but let's ensure it exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organisations' AND policyname = 'org_members_view'
    ) THEN
        CREATE POLICY "org_members_view" ON organisations
            FOR SELECT USING (
                auth_user_has_organisation_access(organisation_id)
            );
    END IF;
END $$;

-- persons: members can view persons in their organisation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'persons' AND policyname = 'org_members_view_persons'
    ) THEN
        CREATE POLICY "org_members_view_persons" ON persons
            FOR SELECT USING (
                person_id IN (
                    SELECT om.person_id FROM organisation_memberships om
                    WHERE auth_user_has_organisation_access(om.organisation_id)
                    AND om.status = 'active'
                )
            );
    END IF;
END $$;

-- organisation_memberships: members can view memberships in their organisation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organisation_memberships' AND policyname = 'org_members_view_memberships'
    ) THEN
        CREATE POLICY "org_members_view_memberships" ON organisation_memberships
            FOR SELECT USING (
                auth_user_has_organisation_access(organisation_id)
            );
    END IF;
END $$;

-- STEP 1C.7: Migration ledger entry for authority transfer
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'rls_authority',
    gen_random_uuid(),
    'bridge',
    'confirmed',
    'authority_transfer',
    'RLS authority transferred from user_id to organisation_id via membership',
    NOW()
FROM users u;

-- STEP 1C.8: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: All knowledge tables have org_membership_access policy
-- Expected: 9 rows (one per table)
-- SELECT tablename, policyname FROM pg_policies
-- WHERE policyname = 'org_membership_access'
-- AND tablename IN ('genome_entities', 'genome_facts', 'genome_relationships', 'genome_events', 'kira_memory', 'kira_knowledge', 'conversations', 'conversation_messages', 'kira_agents');

-- Verification 2: No legacy user_id-based policies remain on knowledge tables
-- Expected: 0 rows
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('genome_entities', 'genome_facts', 'genome_relationships', 'genome_events', 'kira_memory', 'kira_knowledge', 'conversations', 'conversation_messages', 'kira_agents')
-- AND policyname != 'org_membership_access';

-- Verification 3: auth_user_has_organisation_access function exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auth_user_has_organisation_access');

-- Verification 4: Cross-organisation access is denied
-- This requires a test with two different organisations and memberships
-- (See verification test suite)

-- Verification 5: Historical membership does not confer current access
-- This requires a test with expired membership
-- (See verification test suite)

-- Verification 6: Service-role bypasses RLS
-- This requires testing with service_role key
-- (See verification test suite)
