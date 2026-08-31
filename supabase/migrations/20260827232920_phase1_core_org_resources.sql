-- ============================================================================
-- P2.4 PHASE 1: CORE ORG RESOURCES — RLS ENABLE + LEGACY FK MIGRATION
-- ============================================================================
-- Scope: Enable RLS on organisation-owned core resources, migrate legacy user_id
-- Authority: auth_user_has_organisation_access() + org membership
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. ownership_periods — Temporal organisation ownership
-- -----------------------------------------------------------------------------
ALTER TABLE ownership_periods ENABLE ROW LEVEL SECURITY;

-- Policy: Org members can SELECT
DROP POLICY IF EXISTS ownership_periods_org_member_select ON ownership_periods;
CREATE POLICY ownership_periods_org_member_select ON ownership_periods
    FOR SELECT USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- Policy: Owner (person) can UPDATE/DELETE own ownership record
-- Resolves: JWT -> auth_credentials -> person_id
DROP POLICY IF EXISTS ownership_periods_owner_manage ON ownership_periods;
CREATE POLICY ownership_periods_owner_manage ON ownership_periods
    FOR UPDATE USING (
        person_id = (
            SELECT person_id FROM auth_credentials
            WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
        )
    ) WITH CHECK (
        person_id = (
            SELECT person_id FROM auth_credentials
            WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
        )
    );

DROP POLICY IF EXISTS ownership_periods_owner_delete ON ownership_periods;
CREATE POLICY ownership_periods_owner_delete ON ownership_periods
    FOR DELETE USING (
        person_id = (
            SELECT person_id FROM auth_credentials
            WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
        )
    );

-- Policy: Org admin can manage all
DROP POLICY IF EXISTS ownership_periods_org_admin_manage ON ownership_periods;
CREATE POLICY ownership_periods_org_admin_manage ON ownership_periods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = ownership_periods.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = ownership_periods.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    );

-- Policy: Service role full access
DROP POLICY IF EXISTS ownership_periods_service_role_all ON ownership_periods;
CREATE POLICY ownership_periods_service_role_all ON ownership_periods
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 2. subscriptions — Organisation billing
-- -----------------------------------------------------------------------------
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Org members can SELECT
DROP POLICY IF EXISTS subscriptions_org_member_select ON subscriptions;
CREATE POLICY subscriptions_org_member_select ON subscriptions
    FOR SELECT USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- Policy: Org admin can manage
DROP POLICY IF EXISTS subscriptions_org_admin_manage ON subscriptions;
CREATE POLICY subscriptions_org_admin_manage ON subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = subscriptions.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = subscriptions.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    );

-- Policy: Service role full access
DROP POLICY IF EXISTS subscriptions_service_role_all ON subscriptions;
CREATE POLICY subscriptions_service_role_all ON subscriptions
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 3. commercial_arrangements — Organisation contracts/economics
-- -----------------------------------------------------------------------------
ALTER TABLE commercial_arrangements ENABLE ROW LEVEL SECURITY;

-- Policy: Org members can SELECT
DROP POLICY IF EXISTS commercial_arrangements_org_member_select ON commercial_arrangements;
CREATE POLICY commercial_arrangements_org_member_select ON commercial_arrangements
    FOR SELECT USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- Policy: Org admin can manage
DROP POLICY IF EXISTS commercial_arrangements_org_admin_manage ON commercial_arrangements;
CREATE POLICY commercial_arrangements_org_admin_manage ON commercial_arrangements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = commercial_arrangements.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = commercial_arrangements.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    );

-- Policy: Service role full access
DROP POLICY IF EXISTS commercial_arrangements_service_role_all ON commercial_arrangements;
CREATE POLICY commercial_arrangements_service_role_all ON commercial_arrangements
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 4. kira_instances — Organisation-scoped instances
-- -----------------------------------------------------------------------------
-- organisation_id already set NOT NULL and user_id already removed via direct
-- canonicalisation (both tables empty — nothing to backfill).

ALTER TABLE kira_instances ALTER COLUMN organisation_id SET NOT NULL;

-- Step 3: Enable RLS
ALTER TABLE kira_instances ENABLE ROW LEVEL SECURITY;

-- Policy: Org members can SELECT
DROP POLICY IF EXISTS kira_instances_org_member_select ON kira_instances;
CREATE POLICY kira_instances_org_member_select ON kira_instances
    FOR SELECT USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- Policy: Org admin can manage
DROP POLICY IF EXISTS kira_instances_org_admin_manage ON kira_instances;
CREATE POLICY kira_instances_org_admin_manage ON kira_instances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = kira_instances.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = kira_instances.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    );

-- Policy: Service role full access
DROP POLICY IF EXISTS kira_instances_service_role_all ON kira_instances;
CREATE POLICY kira_instances_service_role_all ON kira_instances
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Step 4: Remove legacy user_id (after app routes updated)
-- ALTER TABLE kira_instances DROP COLUMN user_id;

-- -----------------------------------------------------------------------------
-- 5. kira_agents — Organisation-scoped agents
-- -----------------------------------------------------------------------------
-- organisation_id already set NOT NULL and user_id already removed via direct
-- canonicalisation (both tables empty — nothing to backfill).

ALTER TABLE kira_agents ALTER COLUMN organisation_id SET NOT NULL;

-- Step 3: Enable RLS
ALTER TABLE kira_agents ENABLE ROW LEVEL SECURITY;

-- Policy: Org members can SELECT
DROP POLICY IF EXISTS kira_agents_org_member_select ON kira_agents;
CREATE POLICY kira_agents_org_member_select ON kira_agents
    FOR SELECT USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- Policy: Org admin can manage
DROP POLICY IF EXISTS kira_agents_org_admin_manage ON kira_agents;
CREATE POLICY kira_agents_org_admin_manage ON kira_agents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = kira_agents.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = kira_agents.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    );

-- Policy: Service role full access
DROP POLICY IF EXISTS kira_agents_service_role_all ON kira_agents;
CREATE POLICY kira_agents_service_role_all ON kira_agents
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Step 4: Remove legacy user_id (after app routes updated)
-- ALTER TABLE kira_agents DROP COLUMN user_id;

-- -----------------------------------------------------------------------------
-- VERIFICATION QUERIES
-- -----------------------------------------------------------------------------
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN
-- ('ownership_periods', 'subscriptions', 'commercial_arrangements', 'kira_instances', 'kira_agents')
-- ORDER BY tablename;
--
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN
-- ('ownership_periods', 'subscriptions', 'commercial_arrangements', 'kira_instances', 'kira_agents')
-- ORDER BY tablename, policyname;
