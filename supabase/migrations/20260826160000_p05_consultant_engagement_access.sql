-- ============================================================================
-- P0.5 STEP 2C: CONSULTANT / ENGAGEMENT ACCESS SEMANTICS
-- ============================================================================
-- Scope: RLS policies for consultant and engagement tables, access control
-- for consultant relationships and engagement participation.
--
-- EXCLUDED from this migration (deferred to Step 2D):
--   - API rebinding (Step 2D)
--   - Knowledge / Decision / Action / Outcome / Learning (Step 5)
--
-- Governing principles:
--   - Consultant access is scoped to their relationships
--   - Engagement access is scoped to participants and organisation members
--   - Cross-organisation access is denied
--   - Historical relationships do not confer current access
-- ============================================================================

-- STEP 2C.1: Enable RLS on consultant and engagement tables
-- ---------------------------------------------------------------------------

ALTER TABLE consultant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_history ENABLE ROW LEVEL SECURITY;

-- STEP 2C.2: Create RLS policies for consultant_profiles
-- ---------------------------------------------------------------------------

-- Consultant profiles: consultants can view their own profile
CREATE POLICY "consultant_view_own" ON consultant_profiles
    FOR SELECT USING (
        person_id = (
            SELECT person_id FROM auth_credentials
            WHERE auth_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND status = 'active'
            LIMIT 1
        )
    );

-- Consultant profiles: organisation members can view consultants they have relationships with
CREATE POLICY "org_view_consultants" ON consultant_profiles
    FOR SELECT USING (
        consultant_id IN (
            SELECT cr.consultant_id FROM consultant_relationships cr
            WHERE auth_user_has_organisation_access(cr.organisation_id)
            AND cr.status = 'active'
        )
    );

-- STEP 2C.3: Create RLS policies for consultant_relationships
-- ---------------------------------------------------------------------------

-- Consultant relationships: organisation members can view relationships in their organisation
CREATE POLICY "org_view_consultant_relationships" ON consultant_relationships
    FOR SELECT USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- Consultant relationships: consultants can view their own relationships
CREATE POLICY "consultant_view_own_relationships" ON consultant_relationships
    FOR SELECT USING (
        consultant_id IN (
            SELECT cp.consultant_id FROM consultant_profiles cp
            WHERE cp.person_id = (
                SELECT person_id FROM auth_credentials
                WHERE auth_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
                AND status = 'active'
                LIMIT 1
            )
        )
    );

-- STEP 2C.4: Create RLS policies for consultant_history
-- ---------------------------------------------------------------------------

-- Consultant history: organisation members can view history for their organisation
CREATE POLICY "org_view_consultant_history" ON consultant_history
    FOR SELECT USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- STEP 2C.5: Create RLS policies for engagements
-- ---------------------------------------------------------------------------

-- Engagements: organisation members can view engagements in their organisation
CREATE POLICY "org_view_engagements" ON engagements
    FOR SELECT USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- Engagements: participants can view engagements they are part of
CREATE POLICY "participant_view_engagements" ON engagements
    FOR SELECT USING (
        engagement_id IN (
            SELECT ep.engagement_id FROM engagement_participants ep
            WHERE ep.participant_type = 'member'
            AND ep.participant_id_ref = (
                SELECT person_id FROM auth_credentials
                WHERE auth_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
                AND status = 'active'
                LIMIT 1
            )
            AND ep.status = 'active'
        )
    );

-- STEP 2C.6: Create RLS policies for engagement_participants
-- ---------------------------------------------------------------------------

-- Engagement participants: organisation members can view participants in their organisation's engagements
CREATE POLICY "org_view_engagement_participants" ON engagement_participants
    FOR SELECT USING (
        engagement_id IN (
            SELECT e.engagement_id FROM engagements e
            WHERE auth_user_has_organisation_access(e.organisation_id)
        )
    );

-- Engagement participants: participants can view other participants in engagements they are part of
CREATE POLICY "participant_view_participants" ON engagement_participants
    FOR SELECT USING (
        engagement_id IN (
            SELECT ep2.engagement_id FROM engagement_participants ep2
            WHERE ep2.participant_type = 'member'
            AND ep2.participant_id_ref = (
                SELECT person_id FROM auth_credentials
                WHERE auth_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
                AND status = 'active'
                LIMIT 1
            )
            AND ep2.status = 'active'
        )
    );

-- STEP 2C.7: Create RLS policies for engagement_history
-- ---------------------------------------------------------------------------

-- Engagement history: organisation members can view history for their organisation's engagements
CREATE POLICY "org_view_engagement_history" ON engagement_history
    FOR SELECT USING (
        engagement_id IN (
            SELECT e.engagement_id FROM engagements e
            WHERE auth_user_has_organisation_access(e.organisation_id)
        )
    );

-- STEP 2C.8: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'consultant_engagement_rls',
    gen_random_uuid(),
    'bridge',
    'confirmed',
    'rls_setup',
    'Consultant and engagement RLS policies created',
    NOW()
FROM users u;

-- STEP 2C.9: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: RLS enabled on all consultant/engagement tables
-- Expected: all tables have relrowsecurity = true
-- SELECT c.relname, c.relrowsecurity
-- FROM pg_class c
-- WHERE c.relname IN ('consultant_profiles', 'consultant_relationships', 'consultant_history', 'engagements', 'engagement_participants', 'engagement_history');

-- Verification 2: Correct number of policies per table
-- Expected: consultant_profiles: 2, consultant_relationships: 2, consultant_history: 1, engagements: 2, engagement_participants: 2, engagement_history: 1
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE tablename IN ('consultant_profiles', 'consultant_relationships', 'consultant_history', 'engagements', 'engagement_participants', 'engagement_history')
-- GROUP BY tablename;

-- Verification 3: All policies use auth_user_has_organisation_access
-- Expected: all SELECT policies reference this function
-- SELECT policyname, tablename FROM pg_policies
-- WHERE tablename IN ('consultant_profiles', 'consultant_relationships', 'consultant_history', 'engagements', 'engagement_participants', 'engagement_history')
-- AND qual LIKE '%auth_user_has_organisation_access%';
