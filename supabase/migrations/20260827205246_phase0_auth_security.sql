-- ============================================================================
-- P2.4 PHASE 0: AUTH SECURITY BOUNDARY
-- ============================================================================
-- Enable RLS on canonical identity tables and apply canonical policies.
-- Authority: auth_user_has_organisation_access() + JWT resolution.
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. auth_credentials — P0 Security: Credential exposure risk
-- -----------------------------------------------------------------------------
ALTER TABLE auth_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Credential owner can SELECT/UPDATE/DELETE own credentials
-- Resolves: JWT 'sub' claim -> auth_credentials.auth_user_id
DROP POLICY IF EXISTS credential_self_select ON auth_credentials;
CREATE POLICY credential_self_select ON auth_credentials
    FOR SELECT USING (
        auth_user_id = (
            (current_setting('request.jwt.claims', true))::json ->> 'sub'
        )
    );

DROP POLICY IF EXISTS credential_self_update ON auth_credentials;
CREATE POLICY credential_self_update ON auth_credentials
    FOR UPDATE USING (
        auth_user_id = (
            (current_setting('request.jwt.claims', true))::json ->> 'sub'
        )
    ) WITH CHECK (
        auth_user_id = (
            (current_setting('request.jwt.claims', true))::json ->> 'sub'
        )
    );

DROP POLICY IF EXISTS credential_self_delete ON auth_credentials;
CREATE POLICY credential_self_delete ON auth_credentials
    FOR DELETE USING (
        auth_user_id = (
            (current_setting('request.jwt.claims', true))::json ->> 'sub'
        )
    );

-- Policy: Service role has full access (migrations, admin)
DROP POLICY IF EXISTS credential_service_role_all ON auth_credentials;
CREATE POLICY credential_service_role_all ON auth_credentials
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 2. organisations — Canonical tenant boundary
-- -----------------------------------------------------------------------------
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

-- Policy: Organisation members can SELECT
-- Uses canonical authority function
DROP POLICY IF EXISTS org_member_select ON organisations;
CREATE POLICY org_member_select ON organisations
    FOR SELECT USING (
        auth_user_has_organisation_access(organisation_id)
    );

-- Policy: Organisation admins can INSERT/UPDATE/DELETE
-- Admin = membership.role IN ('admin', 'owner') AND status = 'active'
DROP POLICY IF EXISTS org_admin_manage ON organisations;
CREATE POLICY org_admin_manage ON organisations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = organisations.organisation_id
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
            WHERE om.organisation_id = organisations.organisation_id
              AND om.person_id = (
                  SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              )
              AND om.status = 'active'
              AND om.role IN ('admin', 'owner')
        )
    );

-- Policy: Service role has full access
DROP POLICY IF EXISTS org_service_role_all ON organisations;
CREATE POLICY org_service_role_all ON organisations
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 3. persons — Canonical human identity
-- -----------------------------------------------------------------------------
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

-- Policy: Person can SELECT/UPDATE/DELETE own record
-- Resolves: JWT 'sub' -> auth_credentials.auth_user_id -> person_id
DROP POLICY IF EXISTS person_self_select ON persons;
CREATE POLICY person_self_select ON persons
    FOR SELECT USING (
        person_id = (
            SELECT person_id FROM auth_credentials
            WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
        )
    );

DROP POLICY IF EXISTS person_self_update ON persons;
CREATE POLICY person_self_update ON persons
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

-- Policy: Organisation members can SELECT persons in their org
-- Via organisation_memberships
DROP POLICY IF EXISTS person_org_member_select ON persons;
CREATE POLICY person_org_member_select ON persons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organisation_memberships om
            WHERE om.person_id = persons.person_id
              AND om.status = 'active'
              AND auth_user_has_organisation_access(om.organisation_id)
        )
    );

-- Policy: Service role has full access
DROP POLICY IF EXISTS person_service_role_all ON persons;
CREATE POLICY person_service_role_all ON persons
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- VERIFICATION QUERIES (run after migration)
-- -----------------------------------------------------------------------------
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN ('auth_credentials', 'organisations', 'persons');
--
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('auth_credentials', 'organisations', 'persons')
-- ORDER BY tablename, policyname;