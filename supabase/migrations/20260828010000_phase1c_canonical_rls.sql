-- ============================================================================
-- P2.4 PHASE 1C: CANONICAL RLS ON MIGRATED RESOURCES
-- ============================================================================
-- Replaces legacy user-scoped policies (user_id IN (SELECT users.id ...))
-- with canonical organisation-scoped policies on every migrated resource.
-- Authority: auth_user_has_organisation_access() + org admin membership.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Dynamic drop of ALL existing policies on the migrated tables, then recreate
-- the canonical set. This removes every legacy user-scoped policy at once.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname, tablename FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'beta_codes','business_valuation_snapshots','business_valuations',
              'client_profiles','conversation_messages','conversations',
              'drive_documents','email_logs','genome_access_log','genome_entities',
              'genome_events','genome_facts','genome_item_status','genome_pathways',
              'genome_relationships','introductions','kira_knowledge_chunks',
              'kira_memory','kira_refusals','kira_research_sessions','knowledge_files',
              'knowledge_urls','loi_commitments','setup_sessions','user_feedback',
              'voice_connect_events'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Create canonical policies on each migrated resource
-- ---------------------------------------------------------------------------

-- beta_codes
DROP POLICY IF EXISTS beta_codes_org_member_select ON beta_codes;
CREATE POLICY beta_codes_org_member_select ON beta_codes
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS beta_codes_org_admin_manage ON beta_codes;
CREATE POLICY beta_codes_org_admin_manage ON beta_codes
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = beta_codes.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = beta_codes.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- business_valuations
DROP POLICY IF EXISTS business_valuations_org_member_select ON business_valuations;
CREATE POLICY business_valuations_org_member_select ON business_valuations
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS business_valuations_org_admin_manage ON business_valuations;
CREATE POLICY business_valuations_org_admin_manage ON business_valuations
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = business_valuations.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = business_valuations.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- business_valuation_snapshots
DROP POLICY IF EXISTS business_valuation_snapshots_org_member_select ON business_valuation_snapshots;
CREATE POLICY business_valuation_snapshots_org_member_select ON business_valuation_snapshots
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS business_valuation_snapshots_org_admin_manage ON business_valuation_snapshots;
CREATE POLICY business_valuation_snapshots_org_admin_manage ON business_valuation_snapshots
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = business_valuation_snapshots.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = business_valuation_snapshots.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- client_profiles
DROP POLICY IF EXISTS client_profiles_org_member_select ON client_profiles;
CREATE POLICY client_profiles_org_member_select ON client_profiles
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS client_profiles_org_admin_manage ON client_profiles;
CREATE POLICY client_profiles_org_admin_manage ON client_profiles
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = client_profiles.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = client_profiles.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- conversations
DROP POLICY IF EXISTS conversations_org_member_select ON conversations;
CREATE POLICY conversations_org_member_select ON conversations
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS conversations_org_admin_manage ON conversations;
CREATE POLICY conversations_org_admin_manage ON conversations
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = conversations.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = conversations.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- conversation_messages (has own organisation_id; FK via conversations)
DROP POLICY IF EXISTS conversation_messages_org_member_select ON conversation_messages;
CREATE POLICY conversation_messages_org_member_select ON conversation_messages
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS conversation_messages_org_admin_manage ON conversation_messages;
CREATE POLICY conversation_messages_org_admin_manage ON conversation_messages
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = conversation_messages.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = conversation_messages.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- drive_documents
DROP POLICY IF EXISTS drive_documents_org_member_select ON drive_documents;
CREATE POLICY drive_documents_org_member_select ON drive_documents
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS drive_documents_org_admin_manage ON drive_documents;
CREATE POLICY drive_documents_org_admin_manage ON drive_documents
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = drive_documents.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = drive_documents.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- email_logs
DROP POLICY IF EXISTS email_logs_org_member_select ON email_logs;
CREATE POLICY email_logs_org_member_select ON email_logs
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS email_logs_org_admin_manage ON email_logs;
CREATE POLICY email_logs_org_admin_manage ON email_logs
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = email_logs.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = email_logs.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- genome_entities / genome_facts / genome_relationships / genome_events / genome_item_status / genome_pathways
DROP POLICY IF EXISTS genome_entities_org_member_select ON genome_entities;
CREATE POLICY genome_entities_org_member_select ON genome_entities
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

DROP POLICY IF EXISTS genome_facts_org_member_select ON genome_facts;
CREATE POLICY genome_facts_org_member_select ON genome_facts
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

DROP POLICY IF EXISTS genome_relationships_org_member_select ON genome_relationships;
CREATE POLICY genome_relationships_org_member_select ON genome_relationships
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

DROP POLICY IF EXISTS genome_events_org_member_select ON genome_events;
CREATE POLICY genome_events_org_member_select ON genome_events
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

DROP POLICY IF EXISTS genome_item_status_org_member_select ON genome_item_status;
CREATE POLICY genome_item_status_org_member_select ON genome_item_status
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

DROP POLICY IF EXISTS genome_pathways_org_member_select ON genome_pathways;
CREATE POLICY genome_pathways_org_member_select ON genome_pathways
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- genome_access_log
DROP POLICY IF EXISTS genome_access_log_org_member_select ON genome_access_log;
CREATE POLICY genome_access_log_org_member_select ON genome_access_log
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- introductions (org-scoped; introducer relationship preserved via introducer_id)
DROP POLICY IF EXISTS introductions_org_member_select ON introductions;
CREATE POLICY introductions_org_member_select ON introductions
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS introductions_org_admin_manage ON introductions;
CREATE POLICY introductions_org_admin_manage ON introductions
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = introductions.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = introductions.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- kira_knowledge_chunks (scoped via parent kira_knowledge)
DROP POLICY IF EXISTS kira_knowledge_chunks_org_member_select ON kira_knowledge_chunks;
CREATE POLICY kira_knowledge_chunks_org_member_select ON kira_knowledge_chunks
    FOR SELECT USING (EXISTS (SELECT 1 FROM kira_knowledge k
        WHERE k.id = kira_knowledge_chunks.knowledge_id
          AND auth_user_has_organisation_access(k.organisation_id)));

-- kira_memory
DROP POLICY IF EXISTS kira_memory_org_member_select ON kira_memory;
CREATE POLICY kira_memory_org_member_select ON kira_memory
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- kira_refusals
DROP POLICY IF EXISTS kira_refusals_org_member_select ON kira_refusals;
CREATE POLICY kira_refusals_org_member_select ON kira_refusals
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS kira_refusals_org_admin_manage ON kira_refusals;
CREATE POLICY kira_refusals_org_admin_manage ON kira_refusals
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = kira_refusals.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = kira_refusals.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- kira_research_sessions
DROP POLICY IF EXISTS kira_research_sessions_org_member_select ON kira_research_sessions;
CREATE POLICY kira_research_sessions_org_member_select ON kira_research_sessions
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- knowledge_files
DROP POLICY IF EXISTS knowledge_files_org_member_select ON knowledge_files;
CREATE POLICY knowledge_files_org_member_select ON knowledge_files
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- knowledge_urls
DROP POLICY IF EXISTS knowledge_urls_org_member_select ON knowledge_urls;
CREATE POLICY knowledge_urls_org_member_select ON knowledge_urls
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- loi_commitments
DROP POLICY IF EXISTS loi_commitments_org_member_select ON loi_commitments;
CREATE POLICY loi_commitments_org_member_select ON loi_commitments
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- setup_sessions
DROP POLICY IF EXISTS setup_sessions_org_member_select ON setup_sessions;
CREATE POLICY setup_sessions_org_member_select ON setup_sessions
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- user_feedback
DROP POLICY IF EXISTS user_feedback_org_member_select ON user_feedback;
CREATE POLICY user_feedback_org_member_select ON user_feedback
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- voice_connect_events
DROP POLICY IF EXISTS voice_connect_events_org_member_select ON voice_connect_events;
CREATE POLICY voice_connect_events_org_member_select ON voice_connect_events
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- Service-role policies (bypass RLS inherently; kept for explicitness)
