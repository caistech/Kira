-- ============================================================================
-- P0.7.3: KNOWLEDGE PROMOTION PIPELINE
-- ============================================================================
-- Scope: Functions and triggers that promote evidence to organisational knowledge.
--
-- Governing principle:
--   - Promote, don't relabel
--   - Evidence is raw source; knowledge is governed organisational memory
--   - Promotion requires validation and deduplication
--
-- Pipeline stages:
--   1. Evidence capture (raw conversation/document/observation)
--   2. Candidate extraction (NLP/LLM processing)
--   3. Deduplication check (avoid duplicate knowledge)
--   4. Conflict detection (identify contradictions)
--   5. Confidence scoring (validate confidence)
--   6. Knowledge creation (organisational knowledge object)
--   7. Provenance linking (link knowledge to evidence)
-- ============================================================================

-- STEP 1: Create promotion_functions table (configurable promotion rules)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS promotion_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    knowledge_type TEXT NOT NULL CHECK (knowledge_type IN (
        'fact', 'belief', 'decision', 'relationship', 'capability',
        'constraint', 'preference', 'process', 'risk', 'opportunity', 'lesson'
    )),
    evidence_type TEXT NOT NULL CHECK (evidence_type IN (
        'conversation', 'document', 'observation', 'import', 'system'
    )),
    min_confidence NUMERIC(3,2) DEFAULT 0.5,
    auto_promote BOOLEAN DEFAULT FALSE,
    requires_validation BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organisation_id, knowledge_type, evidence_type)
);

COMMENT ON TABLE promotion_rules IS 'Configurable rules for promoting evidence to knowledge. P0.7.3';

-- STEP 2: Create promotion_candidates table (extracted knowledge candidates)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS promotion_candidates (
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
    
    -- Extracted candidate knowledge
    knowledge_type TEXT NOT NULL CHECK (knowledge_type IN (
        'fact', 'belief', 'decision', 'relationship', 'capability',
        'constraint', 'preference', 'process', 'risk', 'opportunity', 'lesson'
    )),
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    description TEXT,
    
    -- Extraction metadata
    extraction_method TEXT NOT NULL CHECK (extraction_method IN ('llm', 'rule', 'manual', 'system')),
    extraction_model TEXT,                           -- Which model extracted this
    extraction_prompt TEXT,                          -- Which prompt was used
    extraction_confidence NUMERIC(3,2) DEFAULT 0.5,
    
    -- Deduplication
    potential_duplicate_id UUID REFERENCES organisational_knowledge(knowledge_id),
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_reason TEXT,
    
    -- Conflict detection
    conflicts_with_id UUID REFERENCES organisational_knowledge(knowledge_id),
    has_conflict BOOLEAN DEFAULT FALSE,
    conflict_reason TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'promoted', 'duplicate', 'conflict'
    )),
    reviewed_by UUID REFERENCES persons(person_id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE promotion_candidates IS 'Extracted knowledge candidates pending promotion. P0.7.3';

CREATE INDEX IF NOT EXISTS idx_promotion_candidates_organisation_id ON promotion_candidates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_promotion_candidates_status ON promotion_candidates(status);
CREATE INDEX IF NOT EXISTS idx_promotion_candidates_evidence_id ON promotion_candidates(evidence_id);

-- STEP 3: Create promotion_log table (audit trail of promotions)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS promotion_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES promotion_candidates(candidate_id) ON DELETE CASCADE,
    knowledge_id UUID REFERENCES organisational_knowledge(knowledge_id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN (
        'extracted', 'duplicate_detected', 'conflict_detected', 
        'approved', 'promoted', 'rejected', 'deduplicated'
    )),
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID REFERENCES persons(person_id),
    reason TEXT,
    metadata JSONB
);

COMMENT ON TABLE promotion_log IS 'Audit trail of knowledge promotion pipeline. P0.7.3';

CREATE INDEX IF NOT EXISTS idx_promotion_log_organisation_id ON promotion_log(organisation_id);

-- STEP 4: Create promotion functions
-- ---------------------------------------------------------------------------

-- Function to check for duplicate knowledge
CREATE OR REPLACE FUNCTION check_duplicate_knowledge(
    p_organisation_id UUID,
    p_knowledge_type TEXT,
    p_subject TEXT,
    p_predicate TEXT,
    p_object TEXT
)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    existing_knowledge_id UUID,
    similarity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TRUE as is_duplicate,
        ok.knowledge_id as existing_knowledge_id,
        CASE
            WHEN ok.subject = p_subject AND ok.predicate = p_predicate AND ok.object = p_object THEN 1.0
            WHEN ok.subject = p_subject AND ok.predicate = p_predicate THEN 0.8
            WHEN ok.subject = p_subject THEN 0.5
            ELSE 0.3
        END as similarity_score
    FROM organisational_knowledge ok
    WHERE ok.organisation_id = p_organisation_id
    AND ok.knowledge_type = p_knowledge_type
    AND ok.is_current = TRUE
    AND (
        ok.subject = p_subject
        OR ok.predicate = p_predicate
        OR similarity_score > 0.7
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_duplicate_knowledge(UUID, TEXT, TEXT, TEXT, TEXT) IS 'Check for duplicate knowledge. P0.7.3';

-- Function to check for conflicting knowledge
CREATE OR REPLACE FUNCTION check_conflicting_knowledge(
    p_organisation_id UUID,
    p_knowledge_type TEXT,
    p_subject TEXT,
    p_predicate TEXT,
    p_object TEXT
)
RETURNS TABLE (
    has_conflict BOOLEAN,
    conflicting_knowledge_id UUID,
    conflict_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TRUE as has_conflict,
        ok.knowledge_id as conflicting_knowledge_id,
        'Conflicting value for ' || p_predicate || ': ' || ok.object || ' vs ' || p_object as conflict_reason
    FROM organisational_knowledge ok
    WHERE ok.organisation_id = p_organisation_id
    AND ok.knowledge_type = p_knowledge_type
    AND ok.is_current = TRUE
    AND ok.subject = p_subject
    AND ok.predicate = p_predicate
    AND ok.object != p_object
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_conflicting_knowledge(UUID, TEXT, TEXT, TEXT, TEXT) IS 'Check for conflicting knowledge. P0.7.3';

-- Function to promote candidate to knowledge
CREATE OR REPLACE FUNCTION promote_candidate_to_knowledge(
    p_candidate_id UUID,
    p_performed_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_candidate RECORD;
    v_new_knowledge_id UUID;
BEGIN
    -- Get candidate
    SELECT * INTO v_candidate FROM promotion_candidates WHERE candidate_id = p_candidate_id;
    
    IF NOT FOUND OR v_candidate.status != 'pending' THEN
        RETURN NULL;
    END IF;
    
    -- Create organisational knowledge
    INSERT INTO organisational_knowledge (
        organisation_id,
        knowledge_type,
        subject,
        predicate,
        object,
        description,
        epistemic_state,
        confidence,
        effective_from,
        is_current,
        source_type,
        evidence_id,
        supplied_by,
        supplied_at,
        created_by
    ) VALUES (
        v_candidate.organisation_id,
        v_candidate.knowledge_type,
        v_candidate.subject,
        v_candidate.predicate,
        v_candidate.object,
        v_candidate.description,
        'asserted',
        v_candidate.extraction_confidence,
        NOW(),
        TRUE,
        'conversation',  -- From evidence
        v_candidate.evidence_id,
        NULL,  -- Will be set from evidence
        NOW(),
        p_performed_by
    ) RETURNING knowledge_id INTO v_new_knowledge_id;
    
    -- Link evidence to knowledge
    INSERT INTO knowledge_evidence_links (knowledge_id, evidence_id, link_type, confidence)
    VALUES (v_new_knowledge_id, v_candidate.evidence_id, 'derived_from', v_candidate.extraction_confidence);
    
    -- Update candidate status
    UPDATE promotion_candidates
    SET 
        status = 'promoted',
        reviewed_by = p_performed_by,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE candidate_id = p_candidate_id;
    
    -- Log promotion
    INSERT INTO promotion_log (organisation_id, candidate_id, knowledge_id, action, performed_by)
    VALUES (v_candidate.organisation_id, p_candidate_id, v_new_knowledge_id, 'promoted', p_performed_by);
    
    RETURN v_new_knowledge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION promote_candidate_to_knowledge(UUID, UUID) IS 'Promote candidate to organisational knowledge. P0.7.3';

-- STEP 5: Enable RLS on promotion tables
-- ---------------------------------------------------------------------------

ALTER TABLE promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_log ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create RLS policies (organisation-scoped)
-- ---------------------------------------------------------------------------

-- promotion_rules: org members can view rules for their org
CREATE POLICY "org_membership_access" ON promotion_rules
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- promotion_candidates: org members can view candidates for their org
CREATE POLICY "org_membership_access" ON promotion_candidates
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- promotion_log: org members can view log for their org
CREATE POLICY "org_membership_access" ON promotion_log
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- STEP 7: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'knowledge_promotion_pipeline',
    gen_random_uuid(),
    'canonical',
    'confirmed',
    'new_structure',
    'Knowledge promotion pipeline created. Promotes evidence to governed organisational knowledge.',
    NOW()
FROM users u;

-- STEP 8: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: promotion_rules table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotion_rules');

-- Verification 2: promotion_candidates table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotion_candidates');

-- Verification 3: promotion_log table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotion_log');

-- Verification 4: Helper functions exist
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_duplicate_knowledge');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_conflicting_knowledge');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'promote_candidate_to_knowledge');
