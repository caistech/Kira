-- ============================================================================
-- P0.5 STEP 6: RETIREMENT OF LEGACY AUTHORITY
-- ============================================================================
-- Scope: Remove remaining legacy users.id authority paths. Make canonical
-- organisations.id + membership the sole organisational authority.
--
-- Governing principles:
--   - users.id may exist as historical/provenance data
--   - users.id must NOT be capable of determining which Organisation a record belongs to
--   - Canonical membership is the sole tenant authority
--   - Legacy authority is removed, not just hidden
-- ============================================================================

-- STEP 6.1: Drop legacy sync triggers (Bridge phase triggers)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_genome_entities_sync_organisation_id ON genome_entities;
DROP FUNCTION IF EXISTS sync_organisation_id_genome_entities();

DROP TRIGGER IF EXISTS trg_genome_facts_sync_organisation_id ON genome_facts;
DROP FUNCTION IF EXISTS sync_organisation_id_genome_facts();

DROP TRIGGER IF EXISTS trg_kira_memory_sync_organisation_id ON kira_memory;
DROP FUNCTION IF EXISTS sync_organisation_id_kira_memory();

DROP TRIGGER IF EXISTS trg_conversations_sync_organisation_id ON conversations;
DROP FUNCTION IF EXISTS sync_organisation_id_conversations();

DROP FUNCTION IF EXISTS get_organisation_id_from_user(UUID);

-- STEP 6.2: Drop legacy RLS policies on knowledge tables (if any remain)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE tablename IN (
        'genome_entities', 'genome_facts', 'genome_relationships', 'genome_events',
        'kira_memory', 'kira_knowledge', 'conversations', 'conversation_messages', 'kira_agents'
    )
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || pol.tablename;
    END LOOP;
END $$;

-- STEP 6.3: Re-create canonical RLS policies (org_membership_access)
-- ---------------------------------------------------------------------------

-- genome_entities
CREATE POLICY "org_membership_access" ON genome_entities
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- genome_facts
CREATE POLICY "org_membership_access" ON genome_facts
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- genome_relationships
CREATE POLICY "org_membership_access" ON genome_relationships
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- genome_events
CREATE POLICY "org_membership_access" ON genome_events
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- kira_memory
CREATE POLICY "org_membership_access" ON kira_memory
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- kira_knowledge
CREATE POLICY "org_membership_access" ON kira_knowledge
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- conversations
CREATE POLICY "org_membership_access" ON conversations
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- conversation_messages
CREATE POLICY "org_membership_access" ON conversation_messages
    FOR ALL USING (
        auth_user_has_organisation_access(
            (SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id)
        )
    );

-- kira_agents
CREATE POLICY "org_membership_access" ON kira_agents
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- STEP 6.4: Remove user_id columns from knowledge tables
-- ---------------------------------------------------------------------------
-- Note: user_id columns are retained for provenance/historical purposes
-- but are no longer authoritative for organisational access.
-- The columns remain but are explicitly NOT the tenant key.

-- STEP 6.5: Update auth helper to remove legacy organisational fallback
-- ---------------------------------------------------------------------------
-- This is done in lib/auth.ts (TypeScript), not in SQL migration.
-- See the TypeScript changes in the verification gate.

-- STEP 6.6: Verify no remaining legacy authority paths
-- ---------------------------------------------------------------------------
-- Create a verification function that can be called to confirm retirement

CREATE OR REPLACE FUNCTION verify_legacy_authority_retired()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'No sync triggers on knowledge tables' as check_name,
        CASE WHEN NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname LIKE 'trg_%sync_organisation_id%'
        ) THEN 'PASS' ELSE 'FAIL' END,
        'Sync triggers should not exist' as details;

    RETURN QUERY
    SELECT
        'No legacy RLS policies on knowledge tables' as check_name,
        CASE WHEN NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename IN ('genome_entities', 'genome_facts', 'genome_relationships', 'genome_events', 'kira_memory', 'kira_knowledge', 'conversations', 'conversation_messages', 'kira_agents')
            AND policyname != 'org_membership_access'
        ) THEN 'PASS' ELSE 'FAIL' END,
        'Only org_membership_access policies should exist' as details;

    RETURN QUERY
    SELECT
        'All knowledge tables have organisation_id column' as check_name,
        CASE WHEN 9 = (
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name IN ('genome_entities', 'genome_facts', 'genome_relationships', 'genome_events', 'kira_memory', 'kira_knowledge', 'conversations', 'conversation_messages', 'kira_agents')
            AND column_name = 'organisation_id'
        ) THEN 'PASS' ELSE 'FAIL' END,
        'All 9 knowledge tables must have organisation_id' as details;

    RETURN QUERY
    SELECT
        'auth_user_has_organisation_access function exists' as check_name,
        CASE WHEN EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'auth_user_has_organisation_access'
        ) THEN 'PASS' ELSE 'FAIL' END,
        'Canonical authority function must exist' as details;

    RETURN QUERY
    SELECT
        'Canonical identity tables exist' as check_name,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisations')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persons')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_credentials')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisation_memberships')
        THEN 'PASS' ELSE 'FAIL' END,
        'Canonical identity model must exist' as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_legacy_authority_retired() IS 'Verify all legacy authority paths are retired. Returns PASS/FAIL for each check. P0.5 Step 6.';

-- STEP 6.7: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'legacy_authority_retirement',
    gen_random_uuid(),
    'bridge',
    'confirmed',
    'authority_retired',
    'Legacy users.id authority paths retired. Canonical membership is sole tenant authority.',
    NOW()
FROM users u;

-- STEP 6.8: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: Run the verification function
-- SELECT * FROM verify_legacy_authority_retired();

-- Verification 2: No sync triggers exist
-- Expected: 0 rows
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%sync_organisation_id%';

-- Verification 3: Only org_membership_access policies on knowledge tables
-- Expected: 9 rows (one per table)
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('genome_entities', 'genome_facts', 'genome_relationships', 'genome_events', 'kira_memory', 'kira_knowledge', 'conversations', 'conversation_messages', 'kira_agents')
-- AND policyname = 'org_membership_access';

-- Verification 4: No legacy RLS policies remain
-- Expected: 0 rows
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('genome_entities', 'genome_facts', 'genome_relationships', 'genome_events', 'kira_memory', 'kira_knowledge', 'conversations', 'conversation_messages', 'kira_agents')
-- AND policyname != 'org_membership_access';