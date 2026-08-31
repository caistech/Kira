-- ============================================================================
-- P0.7.2: EVIDENCE SCHEMA
-- ============================================================================
-- Scope: Create evidence tables that separate conversation/document source
-- material from governed organisational knowledge.
--
-- Governing principle:
--   - Conversation is evidence; knowledge is governed organisational memory
--   - Evidence is the raw source material that knowledge is derived from
--   - Evidence retention is separate from knowledge retention
--   - Evidence links to knowledge objects via provenance chain
--
-- Invariant compliance:
--   - INV-010: Conversation ≠ Knowledge
--   - INV-011: Evidence provides provenance for knowledge
-- ============================================================================

-- STEP 1: Create evidence table (canonical evidence/source material)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS evidence (
    evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organisation anchor
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    
    -- Evidence content
    evidence_type TEXT NOT NULL CHECK (evidence_type IN (
        'conversation', 'document', 'observation', 'import', 'system'
    )),
    title TEXT,                                      -- Optional title/description
    content TEXT,                                    -- The actual evidence content
    content_summary TEXT,                            -- Optional summary
    content_type TEXT,                               -- MIME type if applicable
    
    -- Source reference (where does this evidence come from?)
    source_table TEXT,                               -- Table name (conversations, etc.)
    source_id UUID,                                 -- FK to source record
    source_ref TEXT,                                 -- External reference if applicable
    
    -- Capture metadata
    captured_by UUID REFERENCES persons(person_id), -- Who captured this evidence
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- When captured
    engagement_id UUID REFERENCES engagements(engagement_id),  -- Which engagement
    kira_instance_id UUID REFERENCES kira_instances(instance_id),  -- Which instance
    
    -- Temporal
    evidence_date TIMESTAMPTZ,                       -- When the evidence was created
    retention_until TIMESTAMPTZ,                     -- Optional retention policy
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB                                  -- Additional metadata
);

COMMENT ON TABLE evidence IS 'Canonical evidence/source material. Raw source that knowledge is derived from. P0.7.2';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_organisation_id ON evidence(organisation_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_evidence_captured_by ON evidence(captured_by);
CREATE INDEX IF NOT EXISTS idx_evidence_engagement_id ON evidence(engagement_id);
CREATE INDEX IF NOT EXISTS idx_evidence_captured_at ON evidence(captured_at);

-- STEP 2: Create knowledge_evidence_links table (links knowledge to evidence)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS knowledge_evidence_links (
    link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_id UUID NOT NULL REFERENCES organisational_knowledge(knowledge_id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
    link_type TEXT NOT NULL CHECK (link_type IN (
        'derived_from', 'supported_by', 'contradicted_by', 'validated_by'
    )),
    confidence NUMERIC(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES persons(person_id),
    UNIQUE(knowledge_id, evidence_id, link_type)
);

COMMENT ON TABLE knowledge_evidence_links IS 'Links organisational knowledge to supporting/contradicting evidence. P0.7.2';

CREATE INDEX IF NOT EXISTS idx_knowledge_evidence_links_knowledge ON knowledge_evidence_links(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_evidence_links_evidence ON knowledge_evidence_links(evidence_id);

-- STEP 3: Create knowledge_provenance_view (view for provenance queries)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW knowledge_provenance_view AS
SELECT
    ok.knowledge_id,
    ok.organisation_id,
    ok.knowledge_type,
    ok.subject,
    ok.predicate,
    ok.object,
    ok.epistemic_state,
    ok.confidence AS knowledge_confidence,
    ok.effective_from,
    ok.effective_to,
    ok.is_current,
    ok.supplied_by AS knowledge_supplied_by,
    ok.engagement_id AS knowledge_engagement_id,
    ok.ownership_period_id AS knowledge_ownership_period_id,
    e.evidence_id,
    e.evidence_type,
    e.title AS evidence_title,
    e.content AS evidence_content,
    e.source_table,
    e.source_id,
    e.captured_by AS evidence_captured_by,
    e.captured_at AS evidence_captured_at,
    kcl.link_type AS evidence_link_type,
    kcl.confidence AS evidence_link_confidence
FROM organisational_knowledge ok
LEFT JOIN knowledge_evidence_links kcl ON ok.knowledge_id = kcl.knowledge_id
LEFT JOIN evidence e ON kcl.evidence_id = e.evidence_id;

COMMENT ON VIEW knowledge_provenance_view IS 'View joining knowledge with provenance information. P0.7.2';

-- STEP 4: Enable RLS on evidence tables
-- ---------------------------------------------------------------------------

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_evidence_links ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS policies (organisation-scoped)
-- ---------------------------------------------------------------------------

-- evidence: org members can view evidence in their org
CREATE POLICY "org_membership_access" ON evidence
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- knowledge_evidence_links: org members can view links for their org's knowledge
CREATE POLICY "org_membership_access" ON knowledge_evidence_links
    FOR ALL USING (
        knowledge_id IN (
            SELECT ok.knowledge_id FROM organisational_knowledge ok
            WHERE auth_user_has_organisation_access(ok.organisation_id)
        )
    );

-- STEP 6: Create helper functions
-- ---------------------------------------------------------------------------

-- Function to get evidence for an organisation
CREATE OR REPLACE FUNCTION get_organisation_evidence(
    p_organisation_id UUID,
    p_evidence_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    evidence_id UUID,
    evidence_type TEXT,
    title TEXT,
    content_summary TEXT,
    source_table TEXT,
    source_id UUID,
    captured_by UUID,
    captured_at TIMESTAMPTZ,
    engagement_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.evidence_id,
        e.evidence_type,
        e.title,
        e.content_summary,
        e.source_table,
        e.source_id,
        e.captured_by,
        e.captured_at,
        e.engagement_id
    FROM evidence e
    WHERE e.organisation_id = p_organisation_id
    AND (p_evidence_type IS NULL OR e.evidence_type = p_evidence_type)
    ORDER BY e.captured_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_organisation_evidence(UUID, TEXT) IS 'Get evidence for an organisation. P0.7.2';

-- Function to link evidence to knowledge
CREATE OR REPLACE FUNCTION link_evidence_to_knowledge(
    p_knowledge_id UUID,
    p_evidence_id UUID,
    p_link_type TEXT,
    p_confidence NUMERIC DEFAULT 1.0
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO knowledge_evidence_links (knowledge_id, evidence_id, link_type, confidence)
    VALUES (p_knowledge_id, p_evidence_id, p_link_type, p_confidence)
    ON CONFLICT (knowledge_id, evidence_id, link_type) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_evidence_to_knowledge(UUID, UUID, TEXT, NUMERIC) IS 'Link evidence to knowledge object. P0.7.2';

-- STEP 7: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'evidence_schema',
    gen_random_uuid(),
    'canonical',
    'confirmed',
    'new_structure',
    'Evidence tables created per P0.7 architecture. Separates source material from governed knowledge.',
    NOW()
FROM users u;

-- STEP 8: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: evidence table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evidence');

-- Verification 2: knowledge_evidence_links table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_evidence_links');

-- Verification 3: knowledge_provenance_view exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE view_name = 'knowledge_provenance_view');

-- Verification 4: RLS enabled
-- Expected: true
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('evidence', 'knowledge_evidence_links');
