-- ============================================================================
-- P0.7.1: KNOWLEDGE OBJECT SCHEMA
-- ============================================================================
-- Scope: Create organisational knowledge tables that implement the semantic
-- contract from P0.7 Knowledge Layer Architecture.
--
-- Governing principle:
--   - Conversation is evidence; knowledge is governed organisational memory
--   - Every knowledge object has provenance, epistemic state, temporal semantics
--   - Knowledge is organisation-scoped, not person-scoped or instance-scoped
--   - Promote, don't relabel (existing data becomes evidence, not knowledge)
--
-- Invariant compliance:
--   - INV-009: Knowledge survives Kira Instance replacement
--   - INV-010: Conversation ≠ Knowledge
--   - INV-011: Full provenance chain
--   - INV-012: Temporal semantics (effective_from/to, is_current)
--   - INV-020: Organisation is the enduring anchor
-- ============================================================================

-- STEP 1: Create organisational_knowledge table (canonical knowledge objects)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organisational_knowledge (
    knowledge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organisation anchor (INV-020: organisation is enduring subject)
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    
    -- Knowledge content
    knowledge_type TEXT NOT NULL CHECK (knowledge_type IN (
        'fact', 'belief', 'decision', 'relationship', 'capability',
        'constraint', 'preference', 'process', 'risk', 'opportunity', 'lesson'
    )),
    subject TEXT NOT NULL,                           -- What this knowledge is about
    predicate TEXT NOT NULL,                          -- The relationship/property
    object TEXT NOT NULL,                             -- The value or target (string representation)
    object_type TEXT NOT NULL DEFAULT 'text' CHECK (object_type IN (
        'text', 'structured_value', 'reference', 'json'
    )),
    object_value JSONB,                              -- Structured value if applicable
    object_metadata JSONB,                           -- Currency, units, references
    description TEXT,                                 -- Optional extended description
    
    -- Epistemic state (INV-010: what we know vs what we heard)
    epistemic_state TEXT NOT NULL DEFAULT 'asserted' CHECK (epistemic_state IN (
        'asserted', 'observed', 'inferred', 'validated', 
        'disputed', 'superseded', 'historical', 'opinion', 'unknown'
    )),
    confidence NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Temporal semantics (INV-012: current vs historical knowledge)
    supplied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- When information was provided to Kira
    observed_at TIMESTAMPTZ,                          -- When the information was observed
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When this became believed effective
    effective_to TIMESTAMPTZ,                         -- NULL = currently believed
    is_current BOOLEAN NOT NULL DEFAULT TRUE,         -- DERIVED from effective_from/to
    
    -- Provenance chain (INV-011: who/when/why/engagement)
    -- NOTE: Multi-evidence support via knowledge_evidence_links table (P0.7.2)
    -- evidence_id is retained as primary/source evidence reference
    source_type TEXT NOT NULL CHECK (source_type IN (
        'conversation', 'document', 'observation', 'import', 'inference', 'system'
    )),
    evidence_id UUID,                                 -- Primary evidence reference (P0.7.2)
    supplied_by UUID REFERENCES persons(person_id),   -- Who provided this
    engagement_id UUID REFERENCES engagements(engagement_id),  -- Which engagement
    ownership_period_id UUID REFERENCES ownership_periods(ownership_period_id),  -- Which ownership period
    kira_instance_id UUID REFERENCES kira_instances(instance_id),     -- Which instance captured (optional)
    
    -- Governance (validation, supersession)
    validated_by UUID REFERENCES persons(person_id),
    validated_at TIMESTAMPTZ,
    superseded_by UUID REFERENCES organisational_knowledge(knowledge_id),
    supersession_reason TEXT,
    
    -- Knowledge derivation (Knowledge → Knowledge for inferred knowledge)
    -- Use knowledge_relationships table with relationship_type = 'derives_from' for explicit derivation
    -- derived_from_ids is a materialised array for query performance
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES persons(person_id)
);

COMMENT ON TABLE organisational_knowledge IS 'Canonical organisational knowledge objects. Governed memory, not conversation history. P0.7.1';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_knowledge_organisation_id ON organisational_knowledge(organisation_id);
CREATE INDEX IF NOT EXISTS idx_org_knowledge_type ON organisational_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_org_knowledge_epistemic_state ON organisational_knowledge(epistemic_state);
CREATE INDEX IF NOT EXISTS idx_org_knowledge_is_current ON organisational_knowledge(is_current);
CREATE INDEX IF NOT EXISTS idx_org_knowledge_effective_from ON organisational_knowledge(effective_from);
CREATE INDEX IF NOT EXISTS idx_org_knowledge_effective_to ON organisational_knowledge(effective_to);
CREATE INDEX IF NOT EXISTS idx_org_knowledge_superseded_by ON organisational_knowledge(superseded_by);
CREATE INDEX IF NOT EXISTS idx_org_knowledge_engagement_id ON organisational_knowledge(engagement_id);
CREATE INDEX IF NOT EXISTS idx_org_knowledge_evidence_id ON organisational_knowledge(evidence_id);

-- Composite index for current knowledge queries
CREATE INDEX IF NOT EXISTS idx_org_knowledge_current ON organisational_knowledge(organisation_id, is_current, knowledge_type) WHERE is_current = TRUE;

-- STEP 2: Create organisational_knowledge_history table (audit trail)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organisational_knowledge_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_id UUID NOT NULL REFERENCES organisational_knowledge(knowledge_id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'validated', 'superseded', 'disputed', 'archived')),
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID REFERENCES persons(person_id),
    reason TEXT,
    previous_state JSONB,                             -- Snapshot of previous state
    metadata JSONB
);

COMMENT ON TABLE organisational_knowledge_history IS 'Immutable audit trail of knowledge object lifecycle events. P0.7.1';

CREATE INDEX IF NOT EXISTS idx_org_knowledge_history_knowledge_id ON organisational_knowledge_history(knowledge_id);

-- STEP 3: Create knowledge_relationships table (relationships between knowledge objects)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS knowledge_relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    source_knowledge_id UUID NOT NULL REFERENCES organisational_knowledge(knowledge_id) ON DELETE CASCADE,
    target_knowledge_id UUID NOT NULL REFERENCES organisational_knowledge(knowledge_id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN (
        'supports', 'contradicts', 'supersedes', 'depends_on', 'related_to', 'derives_from'
    )),
    confidence NUMERIC(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES persons(person_id),
    UNIQUE(source_knowledge_id, target_knowledge_id, relationship_type)
);

COMMENT ON TABLE knowledge_relationships IS 'Relationships between knowledge objects (support, contradiction, supersession). P0.7.1';

CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source ON knowledge_relationships(source_knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target ON knowledge_relationships(target_knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_type ON knowledge_relationships(relationship_type);

-- STEP 4: Enable RLS on knowledge tables
-- ---------------------------------------------------------------------------

ALTER TABLE organisational_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisational_knowledge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_relationships ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS policies (organisation-scoped)
-- ---------------------------------------------------------------------------

-- organisational_knowledge: org members can view knowledge in their org
CREATE POLICY "org_membership_access" ON organisational_knowledge
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- organisational_knowledge_history: org members can view history for their org's knowledge
CREATE POLICY "org_membership_access" ON organisational_knowledge_history
    FOR ALL USING (
        knowledge_id IN (
            SELECT ok.knowledge_id FROM organisational_knowledge ok
            WHERE auth_user_has_organisation_access(ok.organisation_id)
        )
    );

-- knowledge_relationships: org members can view relationships in their org
CREATE POLICY "org_membership_access" ON knowledge_relationships
    FOR ALL USING (auth_user_has_organisation_access(organisation_id));

-- STEP 6: Create helper functions
-- ---------------------------------------------------------------------------

-- Function to get current knowledge for an organisation by type
CREATE OR REPLACE FUNCTION get_current_knowledge(
    p_organisation_id UUID,
    p_knowledge_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    knowledge_id UUID,
    knowledge_type TEXT,
    subject TEXT,
    predicate TEXT,
    object TEXT,
    epistemic_state TEXT,
    confidence NUMERIC,
    effective_from TIMESTAMPTZ,
    supplied_by UUID,
    engagement_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ok.knowledge_id,
        ok.knowledge_type,
        ok.subject,
        ok.predicate,
        ok.object,
        ok.epistemic_state,
        ok.confidence,
        ok.effective_from,
        ok.supplied_by,
        ok.engagement_id
    FROM organisational_knowledge ok
    WHERE ok.organisation_id = p_organisation_id
    AND ok.is_current = TRUE
    AND (p_knowledge_type IS NULL OR ok.knowledge_type = p_knowledge_type)
    ORDER BY ok.effective_from DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_knowledge(UUID, TEXT) IS 'Get current organisational knowledge. P0.7.1';

-- Function to get knowledge at a specific point in time
CREATE OR REPLACE FUNCTION get_knowledge_at_time(
    p_organisation_id UUID,
    p_point_in_time TIMESTAMPTZ,
    p_knowledge_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    knowledge_id UUID,
    knowledge_type TEXT,
    subject TEXT,
    predicate TEXT,
    object TEXT,
    epistemic_state TEXT,
    confidence NUMERIC,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ok.knowledge_id,
        ok.knowledge_type,
        ok.subject,
        ok.predicate,
        ok.object,
        ok.epistemic_state,
        ok.confidence,
        ok.effective_from,
        ok.effective_to
    FROM organisational_knowledge ok
    WHERE ok.organisation_id = p_organisation_id
    AND ok.effective_from <= p_point_in_time
    AND (ok.effective_to IS NULL OR ok.effective_to > p_point_in_time)
    AND (p_knowledge_type IS NULL OR ok.knowledge_type = p_knowledge_type)
    ORDER BY ok.effective_from DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_knowledge_at_time(UUID, TIMESTAMPTZ, TEXT) IS 'Get knowledge effective at a specific point in time. P0.7.1';

-- Function to supersede knowledge
CREATE OR REPLACE FUNCTION supersede_knowledge(
    p_knowledge_id UUID,
    p_new_knowledge_id UUID,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Mark old knowledge as superseded
    UPDATE organisational_knowledge
    SET 
        is_current = FALSE,
        effective_to = NOW(),
        epistemic_state = 'superseded',
        superseded_by = p_new_knowledge_id,
        supersession_reason = p_reason,
        updated_at = NOW()
    WHERE knowledge_id = p_knowledge_id;
    
    -- Record in history
    INSERT INTO organisational_knowledge_history (knowledge_id, action, reason)
    VALUES (p_knowledge_id, 'superseded', p_reason);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION supersede_knowledge(UUID, UUID, TEXT) IS 'Supersede knowledge with new knowledge. P0.7.1';

-- STEP 7: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'knowledge_object_schema',
    gen_random_uuid(),
    'canonical',
    'confirmed',
    'new_structure',
    'Organisational knowledge tables created per P0.7 architecture',
    NOW()
FROM users u;

-- STEP 8: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: organisational_knowledge table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisational_knowledge');

-- Verification 2: organisational_knowledge_history table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisational_knowledge_history');

-- Verification 3: knowledge_relationships table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_relationships');

-- Verification 4: RLS enabled on all tables
-- Expected: all relrowsecurity = true
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('organisational_knowledge', 'organisational_knowledge_history', 'knowledge_relationships');

-- Verification 5: Correct number of policies
-- Expected: 3 tables × 1 policy each = 3
-- SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('organisational_knowledge', 'organisational_knowledge_history', 'knowledge_relationships');

-- Verification 6: Helper functions exist
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_knowledge');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_knowledge_at_time');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'supersede_knowledge');
