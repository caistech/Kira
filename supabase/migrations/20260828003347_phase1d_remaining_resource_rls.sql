-- ============================================================================
-- P2.4 PHASE 1D: REMAINING RESOURCE RLS
-- ============================================================================
-- decisions: direct organisation_id
-- outcomes: direct organisation_id
-- kira_instance_history: via kira_instances.instance_id → organisation_id
-- ============================================================================

-- ---------------------------------------------------------------------------
-- decisions — direct org ownership
-- ---------------------------------------------------------------------------
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS decisions_org_member_select ON decisions;
CREATE POLICY decisions_org_member_select ON decisions
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

DROP POLICY IF EXISTS decisions_org_admin_manage ON decisions;
CREATE POLICY decisions_org_admin_manage ON decisions
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = decisions.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = decisions.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- ---------------------------------------------------------------------------
-- outcomes — direct org ownership
-- ---------------------------------------------------------------------------
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outcomes_org_member_select ON outcomes;
CREATE POLICY outcomes_org_member_select ON outcomes
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

DROP POLICY IF EXISTS outcomes_org_admin_manage ON outcomes;
CREATE POLICY outcomes_org_admin_manage ON outcomes
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = outcomes.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = outcomes.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- ---------------------------------------------------------------------------
-- kira_instance_history — org via parent kira_instances
-- ---------------------------------------------------------------------------
ALTER TABLE kira_instance_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kira_instance_history_org_member_select ON kira_instance_history;
CREATE POLICY kira_instance_history_org_member_select ON kira_instance_history
    FOR SELECT USING (EXISTS (SELECT 1 FROM kira_instances ki
        WHERE ki.instance_id = kira_instance_history.instance_id
          AND auth_user_has_organisation_access(ki.organisation_id)));

DROP POLICY IF EXISTS kira_instance_history_org_admin_manage ON kira_instance_history;
CREATE POLICY kira_instance_history_org_admin_manage ON kira_instance_history
    FOR ALL USING (EXISTS (SELECT 1 FROM kira_instances ki
        JOIN organisation_memberships om ON om.organisation_id = ki.organisation_id
        WHERE ki.instance_id = kira_instance_history.instance_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM kira_instances ki
        JOIN organisation_memberships om ON om.organisation_id = ki.organisation_id
        WHERE ki.instance_id = kira_instance_history.instance_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- ---------------------------------------------------------------------------
-- Service role bypass (explicit for completeness)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS decisions_service_role_all ON decisions;
CREATE POLICY decisions_service_role_all ON decisions
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS outcomes_service_role_all ON outcomes;
CREATE POLICY outcomes_service_role_all ON outcomes
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS kira_instance_history_service_role_all ON kira_instance_history;
CREATE POLICY kira_instance_history_service_role_all ON kira_instance_history
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');