-- ============================================================================
-- P2.4: search_knowledge_semantic — ORGANISATION-SCOPED SEMANTIC SEARCH
-- ============================================================================
-- Scope: Replace the user-scoped semantic search RPC with an organisation-scoped version.
-- The previous function (match_kira_knowledge_chunks) filtered by user_id.
-- This function filters by organisation_id, ensuring semantic search can never
-- return knowledge from another organisation.
--
-- Governing invariants:
--   INV-001: Organisation persists independently of People
--   INV-020: Persistent intelligence anchored to Organisation, not Person
-- ============================================================================

-- STEP 1: Create the organisation-scoped semantic search function
-- ---------------------------------------------------------------------------
-- Filters by organisation_id on the kira_knowledge table (parent of chunks).
-- Joins kira_knowledge_chunks → kira_knowledge to resolve organisation scope.
-- This ensures the vector search operates only within the organisation's corpus.

CREATE OR REPLACE FUNCTION search_knowledge_semantic(
    p_organisation_id   uuid,
    p_query_embedding   vector(1536),
    p_match_threshold   float DEFAULT 0.5,
    p_match_count       int   DEFAULT 10,
    p_topic             text  DEFAULT NULL,
    p_source_type       text  DEFAULT NULL
) RETURNS TABLE (
    id                  uuid,
    title               text,
    summary             text,
    key_points          text[],
    url                 text,
    source_type         text,
    relevance_note      text,
    created_by          text,
    created_at          timestamptz,
    topic               text,
    similarity          float
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT
        k.id,
        k.title,
        k.summary,
        k.key_points,
        k.url,
        k.source_type,
        k.relevance_note,
        k.created_by,
        k.created_at,
        k.topic,
        1 - (c.embedding <=> p_query_embedding) AS similarity
    FROM kira_knowledge_chunks c
    JOIN kira_knowledge k ON k.id = c.knowledge_id
    WHERE k.organisation_id = p_organisation_id
      AND c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> p_query_embedding) > p_match_threshold
      AND (p_topic IS NULL OR k.topic = p_topic)
      AND (p_source_type IS NULL OR k.source_type = p_source_type)
    ORDER BY c.embedding <=> p_query_embedding
    LIMIT p_match_count;
$$;

-- STEP 2: Grant execute to authenticated and service roles
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION search_knowledge_semantic(uuid, vector, float, int, text, text)
    TO authenticated, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the function exists and has correct signature
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'search_knowledge_semantic'
        AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'P2.4 verification FAILED: search_knowledge_semantic function not created';
    END IF;

    RAISE NOTICE 'P2.4 verification PASSED: search_knowledge_semantic function created';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- The legacy function match_kira_knowledge_chunks(p_user_id, ...) remains for
-- backward compatibility but should not be used by new code paths.
--
-- This function is called by lib/kira/knowledge-search.ts semanticSearch()
-- which now passes organisationId instead of userId.
--
-- The composite index idx_kira_knowledge_org_status_created (created in
-- 20260827100000_p04_kira_knowledge_org_scope.sql) supports efficient
-- organisation-scoped retrieval.
-- ============================================================================