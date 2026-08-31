-- ============================================================================
-- P0.7.4: TEMPORAL QUERY PATTERNS
-- ============================================================================
-- Scope: SQL functions for temporal knowledge queries.
--
-- Governing principle:
--   - Knowledge has effective_from/to semantics
--   - Current vs historical knowledge must be queryable
--   - Supersession chains must be traversable
--   - Point-in-time queries must be supported
--
-- Invariant compliance:
--   - INV-012: Temporal knowledge (current vs historical)
-- ============================================================================

-- STEP 1: Point-in-time query functions
-- ---------------------------------------------------------------------------

-- Function to get all knowledge effective at a specific time
CREATE OR REPLACE FUNCTION get_knowledge_at_point_in_time(
    p_organisation_id UUID,
    p_point_in_time TIMESTAMPTZ DEFAULT NOW()
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
    effective_to TIMESTAMPTZ,
    is_current BOOLEAN,
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
        ok.effective_to,
        ok.is_current,
        ok.supplied_by,
        ok.engagement_id
    FROM organisational_knowledge ok
    WHERE ok.organisation_id = p_organisation_id
    AND ok.effective_from <= p_point_in_time
    AND (ok.effective_to IS NULL OR ok.effective_to > p_point_in_time)
    ORDER BY ok.effective_from DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_knowledge_at_point_in_time(UUID, TIMESTAMPTZ) IS 'Get knowledge effective at a specific point in time. P0.7.4';

-- Function to get knowledge history (when was this knowledge believed?)
CREATE OR REPLACE FUNCTION get_knowledge_history(
    p_organisation_id UUID,
    p_knowledge_type TEXT DEFAULT NULL,
    p_subject TEXT DEFAULT NULL,
    p_predicate TEXT DEFAULT NULL
)
RETURNS TABLE (
    knowledge_id UUID,
    knowledge_type TEXT,
    subject TEXT,
    predicate TEXT,
    object TEXT,
    epistemic_state TEXT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    is_current BOOLEAN,
    duration INTERVAL
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
        ok.effective_from,
        ok.effective_to,
        ok.is_current,
        CASE
            WHEN ok.effective_to IS NOT NULL THEN ok.effective_to - ok.effective_from
            ELSE NOW() - ok.effective_from
        END as duration
    FROM organisational_knowledge ok
    WHERE ok.organisation_id = p_organisation_id
    AND (p_knowledge_type IS NULL OR ok.knowledge_type = p_knowledge_type)
    AND (p_subject IS NULL OR ok.subject = p_subject)
    AND (p_predicate IS NULL OR ok.predicate = p_predicate)
    ORDER BY ok.effective_from DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_knowledge_history(UUID, TEXT, TEXT, TEXT) IS 'Get history of knowledge over time. P0.7.4';

-- STEP 2: Supersession chain functions
-- ---------------------------------------------------------------------------

-- Function to get supersession chain for a knowledge object
CREATE OR REPLACE FUNCTION get_supersession_chain(
    p_knowledge_id UUID,
    p_max_depth INT DEFAULT 10
)
RETURNS TABLE (
    knowledge_id UUID,
    knowledge_type TEXT,
    subject TEXT,
    predicate TEXT,
    object TEXT,
    epistemic_state TEXT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    superseded_by UUID,
    depth INT
) AS $$
DECLARE
    v_current_id UUID := p_knowledge_id;
    v_depth INT := 0;
BEGIN
    WHILE v_current_id IS NOT NULL AND v_depth < p_max_depth LOOP
        RETURN QUERY
        SELECT
            ok.knowledge_id,
            ok.knowledge_type,
            ok.subject,
            ok.predicate,
            ok.object,
            ok.epistemic_state,
            ok.effective_from,
            ok.effective_to,
            ok.superseded_by,
            v_depth as depth
        FROM organisational_knowledge ok
        WHERE ok.knowledge_id = v_current_id;
        
        -- Get next in chain
        SELECT ok.superseded_by INTO v_current_id
        FROM organisational_knowledge ok
        WHERE ok.knowledge_id = v_current_id;
        
        v_depth := v_depth + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_supersession_chain(UUID, INT) IS 'Get supersession chain for a knowledge object. P0.7.4';

-- Function to get all knowledge that supersedes a given knowledge
CREATE OR REPLACE FUNCTION get_superseded_knowledge(
    p_organisation_id UUID
)
RETURNS TABLE (
    knowledge_id UUID,
    knowledge_type TEXT,
    subject TEXT,
    predicate TEXT,
    object TEXT,
    epistemic_state TEXT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    superseded_by UUID,
    supersession_reason TEXT
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
        ok.effective_from,
        ok.effective_to,
        ok.superseded_by,
        ok.supersession_reason
    FROM organisational_knowledge ok
    WHERE ok.organisation_id = p_organisation_id
    AND ok.epistemic_state = 'superseded'
    AND ok.superseded_by IS NOT NULL
    ORDER BY ok.effective_to DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_superseded_knowledge(UUID) IS 'Get all superseded knowledge for an organisation. P0.7.4';

-- STEP 3: Conflict detection functions
-- ---------------------------------------------------------------------------

-- Function to get all conflicting knowledge
CREATE OR REPLACE FUNCTION get_conflicting_knowledge(
    p_organisation_id UUID
)
RETURNS TABLE (
    knowledge_id_a UUID,
    knowledge_id_b UUID,
    subject TEXT,
    predicate TEXT,
    object_a TEXT,
    object_b TEXT,
    effective_from_a TIMESTAMPTZ,
    effective_from_b TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.knowledge_id as knowledge_id_a,
        b.knowledge_id as knowledge_id_b,
        a.subject,
        a.predicate,
        a.object as object_a,
        b.object as object_b,
        a.effective_from as effective_from_a,
        b.effective_from as effective_from_b
    FROM organisational_knowledge a
    JOIN organisational_knowledge b ON
        a.organisation_id = b.organisation_id
        AND a.knowledge_type = b.knowledge_type
        AND a.subject = b.subject
        AND a.predicate = b.predicate
        AND a.object != b.object
        AND a.knowledge_id != b.knowledge_id
        AND a.is_current = TRUE
        AND b.is_current = TRUE
    WHERE a.organisation_id = p_organisation_id
    ORDER BY a.subject, a.predicate, a.effective_from;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_conflicting_knowledge(UUID) IS 'Get all conflicting knowledge for an organisation. P0.7.4';

-- STEP 4: Knowledge statistics functions
-- ---------------------------------------------------------------------------

-- Function to get knowledge statistics for an organisation
CREATE OR REPLACE FUNCTION get_knowledge_statistics(
    p_organisation_id UUID
)
RETURNS TABLE (
    knowledge_type TEXT,
    total_count BIGINT,
    current_count BIGINT,
    historical_count BIGINT,
    superseded_count BIGINT,
    avg_confidence NUMERIC,
    oldest_knowledge TIMESTAMPTZ,
    newest_knowledge TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ok.knowledge_type,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE ok.is_current = TRUE) as current_count,
        COUNT(*) FILTER (WHERE ok.is_current = FALSE AND ok.epistemic_state != 'superseded') as historical_count,
        COUNT(*) FILTER (WHERE ok.epistemic_state = 'superseded') as superseded_count,
        AVG(ok.confidence) as avg_confidence,
        MIN(ok.effective_from) as oldest_knowledge,
        MAX(ok.effective_from) as newest_knowledge
    FROM organisational_knowledge ok
    WHERE ok.organisation_id = p_organisation_id
    GROUP BY ok.knowledge_type
    ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_knowledge_statistics(UUID) IS 'Get knowledge statistics for an organisation. P0.7.4';

-- STEP 5: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'temporal_query_patterns',
    gen_random_uuid(),
    'canonical',
    'confirmed',
    'new_functions',
    'Temporal query patterns implemented for organisational knowledge. P0.7.4',
    NOW()
FROM users u;
