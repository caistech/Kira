-- ============================================================================
-- P2.4 PHASE 1B: LEGACY RESOURCE OWNERSHIP — CANONICAL DISPOSITION
-- ============================================================================
-- Every table below is EMPTY (verified). Disposition:
--   A. Org-owned resources lacking organisation_id  -> ADD organisation_id NOT NULL
--   B. Tables already carrying organisation_id      -> verify/keep
--   C. Legacy users FK  -> DROP (users.id is provenance-only, never authority;
--                          user_id column retained as provenance/actor)
--   D. business_identity -> RETIRE (superseded by ownership_periods per P0.7)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- D. RETIRE business_identity (superseded by ownership_periods + persons)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS business_identity;

-- ---------------------------------------------------------------------------
-- A1. ADD organisation_id (NOT NULL references organisations) + DROP users FK
-- ---------------------------------------------------------------------------
ALTER TABLE business_valuations
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE business_valuations DROP CONSTRAINT business_valuations_user_id_fkey;

ALTER TABLE business_valuation_snapshots
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE business_valuation_snapshots DROP CONSTRAINT business_valuation_snapshots_user_id_fkey;

ALTER TABLE client_profiles
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE client_profiles DROP CONSTRAINT client_profiles_user_id_fkey;

ALTER TABLE drive_documents
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE drive_documents DROP CONSTRAINT drive_documents_user_id_fkey;

ALTER TABLE email_logs
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE email_logs DROP CONSTRAINT email_logs_user_id_fkey;

ALTER TABLE beta_codes
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE beta_codes DROP CONSTRAINT beta_codes_redeemed_user_id_fkey;

ALTER TABLE genome_item_status
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE genome_item_status DROP CONSTRAINT genome_item_status_user_id_fkey;

ALTER TABLE genome_pathways
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE genome_pathways DROP CONSTRAINT genome_pathways_user_id_fkey;

ALTER TABLE genome_access_log
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE genome_access_log DROP CONSTRAINT genome_access_log_user_id_fkey;

ALTER TABLE introductions
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE introductions DROP CONSTRAINT introductions_owner_user_id_fkey;

ALTER TABLE kira_refusals
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE kira_refusals DROP CONSTRAINT kira_refusals_user_id_fkey;

ALTER TABLE kira_research_sessions
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE kira_research_sessions DROP CONSTRAINT kira_research_sessions_user_id_fkey;

ALTER TABLE knowledge_files
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE knowledge_files DROP CONSTRAINT knowledge_files_user_id_fkey;

ALTER TABLE knowledge_urls
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE knowledge_urls DROP CONSTRAINT knowledge_urls_user_id_fkey;

ALTER TABLE loi_commitments
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE loi_commitments DROP CONSTRAINT loi_commitments_user_id_fkey;

ALTER TABLE setup_sessions
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE setup_sessions DROP CONSTRAINT setup_sessions_user_id_fkey;

ALTER TABLE user_feedback
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE user_feedback DROP CONSTRAINT user_feedback_user_id_fkey;

ALTER TABLE voice_connect_events
    ADD COLUMN organisation_id UUID NOT NULL REFERENCES organisations(organisation_id);
ALTER TABLE voice_connect_events DROP CONSTRAINT voice_connect_events_user_id_fkey;

-- ---------------------------------------------------------------------------
-- A2. kira_knowledge_chunks -> org via parent kira_knowledge (no direct org)
-- ---------------------------------------------------------------------------
ALTER TABLE kira_knowledge_chunks DROP CONSTRAINT kira_knowledge_chunks_user_id_fkey;

-- ---------------------------------------------------------------------------
-- B. DROP users FK (provenance only) on tables already org-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE conversations DROP CONSTRAINT conversations_user_id_fkey;
ALTER TABLE conversation_messages DROP CONSTRAINT conversation_messages_user_id_fkey;
ALTER TABLE kira_memory DROP CONSTRAINT kira_memory_user_id_fkey;
ALTER TABLE kira_knowledge DROP CONSTRAINT kira_knowledge_user_id_fkey;
ALTER TABLE genome_entities DROP CONSTRAINT genome_entities_user_id_fkey;
ALTER TABLE genome_facts DROP CONSTRAINT genome_facts_user_id_fkey;
ALTER TABLE genome_relationships DROP CONSTRAINT genome_relationships_user_id_fkey;
ALTER TABLE genome_events DROP CONSTRAINT genome_events_user_id_fkey;
