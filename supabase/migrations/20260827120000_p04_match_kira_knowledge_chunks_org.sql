-- ============================================================================
-- P2.4: match_kira_knowledge_chunks — ORGANISATION-SCOPED LEGACY SEARCH
-- ============================================================================
-- Scope: Update the legacy match_kira_knowledge_chunks RPC to filter by
-- organisation_id instead of user_id. This function is still called by
-- lib/kira/knowledge-tool.ts (ElevenLabs voice agent tool) and possibly
-- other legacy paths.
--
-- The previous function filtered by user_id on the chunks table directly.
-- This version joins through kira_knowledge to resolve organisation scope,
-- ensuring the legacy search can never return knowledge from another organisation.
--
-- Governing invariants:
--   INV-001: Organisation persists independently of People
--   INV-020: Persistent intelligence anchored to Organisation, not Person
-- ============================================================================

-- STEP 0: Ensure columns referenced by the function exist
-- ---------------------------------------------------------------------------
-- The file_name/file_type/file_size columns must exist before the function
-- body references k.file_name. Originally added in 20260827140000; added here
-- first so this migration is self-contained (IF NOT EXISTS is idempotent).

ALTER TABLE kira_knowledge ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE kira_knowledge ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE kira_knowledge ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- STEP 1: Drop and recreate the organisation-scoped function
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS match_kira_knowledge_chunks(uuid, vector, int, float);

CREATE OR REPLACE FUNCTION match_kira_knowledge_chunks(
    p_organisation_id   uuid,
    p_query_embedding   vector(1536),
    p_match_count       int   DEFAULT 6,
    p_min_similarity    float DEFAULT 0.15
) RETURNS TABLE (
    id                  uuid,
    knowledge_id        uuid,
    title               text,
    content             text,
    file_name           text,
    url                 text,
    similarity          float
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT
        c.id,
        c.knowledge_id,
        k.title,
        c.content,
        k.file_name,
        k.url,
        1 - (c.embedding <=> p_query_embedding) AS similarity
    FROM kira_knowledge_chunks c
    JOIN kira_knowledge k ON k.id = c.knowledge_id
    WHERE k.organisation_id = p_organisation_id
      AND c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> p_query_embedding) > p_min_similarity
    ORDER BY c.embedding <=> p_query_embedding
    LIMIT p_match_count;
$$;

-- STEP 2: Grant execute to authenticated and service roles
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION match_kira_knowledge_chunks(uuid, vector, int, float)
    TO authenticated, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'match_kira_knowledge_chunks'
        AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'P2.4 verification FAILED: match_kira_knowledge_chunks function not created';
    END IF;

    RAISE NOTICE 'P2.4 verification PASSED: match_kira_knowledge_chunks function updated to organisation scope';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- This function is called by lib/kira/knowledge-tool.ts for the ElevenLabs
-- voice agent search_knowledge tool. The caller now passes organisation_id
-- (resolved from person_id via organisation_memberships) instead of user_id.
--
-- The composite index idx_kira_knowledge_org_status_created supports
-- efficient organisation-scoped retrieval.
-- ============================================================================