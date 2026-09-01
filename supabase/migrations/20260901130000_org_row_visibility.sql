-- ============================================================================
-- P0: ORG ROW VISIBILITY (role-scoped knowledge) — IDEMPOTENT RE-APPLY
-- ============================================================================

-- STEP 1: read helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_can_read_org_row(p_org_id UUID, p_visibility TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_auth_user_id TEXT;
    v_is_admin BOOLEAN;
BEGIN
    IF NOT auth_user_has_organisation_access(p_org_id) THEN
        RETURN FALSE;
    END IF;

    IF p_visibility IS NULL OR p_visibility = 'org' THEN
        RETURN TRUE;
    END IF;

    IF p_visibility = 'owner' THEN
        v_auth_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
        SELECT EXISTS (
            SELECT 1 FROM organisation_memberships om
            JOIN auth_credentials ac ON ac.person_id = om.person_id
            WHERE ac.auth_user_id = v_auth_user_id
              AND om.organisation_id = p_org_id
              AND om.status = 'active'
              AND (om.valid_to IS NULL OR om.valid_to > now())
              AND om.role IN ('owner','admin')
        ) INTO v_is_admin;
        RETURN v_is_admin;
    END IF;

    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION auth_user_can_read_org_row(UUID, TEXT) IS 'Role-scoped read for org knowledge: ''owner'' rows read only by active owner/admin seats; ''org'' (default) rows by every active member. P0.';

-- STEP 2: visibility column on the core knowledge tables
-- ---------------------------------------------------------------------------
ALTER TABLE genome_entities      ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'org' CHECK (visibility IN ('org','owner'));
ALTER TABLE genome_facts         ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'org' CHECK (visibility IN ('org','owner'));
ALTER TABLE genome_relationships ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'org' CHECK (visibility IN ('org','owner'));
ALTER TABLE genome_events        ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'org' CHECK (visibility IN ('org','owner'));
ALTER TABLE kira_memory          ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'org' CHECK (visibility IN ('org','owner'));
ALTER TABLE kira_knowledge       ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'org' CHECK (visibility IN ('org','owner'));
ALTER TABLE conversations        ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'org' CHECK (visibility IN ('org','owner'));
ALTER TABLE kira_agents          ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'org' CHECK (visibility IN ('org','owner'));

-- STEP 3: replace the flat org_membership_access FOR ALL with visibility-aware SELECT + write-preserving policies.
-- ---------------------------------------------------------------------------

-- Helper to safely drop all potential policies
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN ('genome_entities', 'genome_facts', 'genome_relationships', 'genome_events', 'kira_memory', 'kira_knowledge', 'conversations', 'conversation_messages', 'kira_agents')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_org_member_select', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_org_member_write', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_membership_access', t);
    END LOOP;
END $$;

-- Policies
CREATE POLICY genome_entities_org_member_select ON genome_entities FOR SELECT USING (auth_user_can_read_org_row(organisation_id, visibility));
CREATE POLICY genome_entities_org_member_write ON genome_entities FOR ALL USING (auth_user_has_organisation_access(organisation_id)) WITH CHECK (auth_user_has_organisation_access(organisation_id));

CREATE POLICY genome_facts_org_member_select ON genome_facts FOR SELECT USING (auth_user_can_read_org_row(organisation_id, visibility));
CREATE POLICY genome_facts_org_member_write ON genome_facts FOR ALL USING (auth_user_has_organisation_access(organisation_id)) WITH CHECK (auth_user_has_organisation_access(organisation_id));

CREATE POLICY genome_relationships_org_member_select ON genome_relationships FOR SELECT USING (auth_user_can_read_org_row(organisation_id, visibility));
CREATE POLICY genome_relationships_org_member_write ON genome_relationships FOR ALL USING (auth_user_has_organisation_access(organisation_id)) WITH CHECK (auth_user_has_organisation_access(organisation_id));

CREATE POLICY genome_events_org_member_select ON genome_events FOR SELECT USING (auth_user_can_read_org_row(organisation_id, visibility));
CREATE POLICY genome_events_org_member_write ON genome_events FOR ALL USING (auth_user_has_organisation_access(organisation_id)) WITH CHECK (auth_user_has_organisation_access(organisation_id));

CREATE POLICY kira_memory_org_member_select ON kira_memory FOR SELECT USING (auth_user_can_read_org_row(organisation_id, visibility));
CREATE POLICY kira_memory_org_member_write ON kira_memory FOR ALL USING (auth_user_has_organisation_access(organisation_id)) WITH CHECK (auth_user_has_organisation_access(organisation_id));

CREATE POLICY kira_knowledge_org_member_select ON kira_knowledge FOR SELECT USING (auth_user_can_read_org_row(organisation_id, visibility));
CREATE POLICY kira_knowledge_org_member_write ON kira_knowledge FOR ALL USING (auth_user_has_organisation_access(organisation_id)) WITH CHECK (auth_user_has_organisation_access(organisation_id));

CREATE POLICY conversations_org_member_select ON conversations FOR SELECT USING (auth_user_can_read_org_row(organisation_id, visibility));
CREATE POLICY conversations_org_member_write ON conversations FOR ALL USING (auth_user_has_organisation_access(organisation_id)) WITH CHECK (auth_user_has_organisation_access(organisation_id));

CREATE POLICY conversation_messages_org_member_select ON conversation_messages FOR SELECT USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_messages.conversation_id AND auth_user_can_read_org_row(c.organisation_id, c.visibility)));
CREATE POLICY conversation_messages_org_member_write ON conversation_messages FOR ALL USING (auth_user_has_organisation_access((SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id))) WITH CHECK (auth_user_has_organisation_access((SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id)));

CREATE POLICY kira_agents_org_member_select ON kira_agents FOR SELECT USING (auth_user_can_read_org_row(organisation_id, visibility));
CREATE POLICY kira_agents_org_member_write ON kira_agents FOR ALL USING (auth_user_has_organisation_access(organisation_id)) WITH CHECK (auth_user_has_organisation_access(organisation_id));
