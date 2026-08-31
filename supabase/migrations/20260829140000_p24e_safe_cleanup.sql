-- ============================================================================
-- P2.4-E SAFE CLEANUP — Dead legacy SQL surface removal
-- ============================================================================
-- Scope: Drop/rebind functions verified to have ZERO consumers (SQL + TS),
--   so they have no dependency on E1.0 production identity population.
--
-- Verified dead (2026-08-29, live):
--   - resolve_user_id_from_organisation() — 0 SQL callers, 0 TS callers.
--     Self-flagged "backward compat during bridge. Will need update when UUID
--     reuse ends." Reverse resolver (org -> single user) is architecturally
--     invalid for multi-person orgs.
--   - search_kira_knowledge() — 0 app callers; app uses search_knowledge_semantic.
--     Rebound to filter by organisation_id instead of user_id (the column
--     already exists on kira_knowledge) to remove the user_id ownership read.
--
-- This is cleanup, NOT a semantic migration. No fallback branches are touched
-- here; those are gated behind E1.0.
-- ============================================================================

-- STEP 1: Drop the dead reverse resolver
DROP FUNCTION IF EXISTS resolve_user_id_from_organisation(UUID);

-- STEP 2: Rebind the orphaned knowledge search to the organisation anchor
DROP FUNCTION IF EXISTS search_kira_knowledge(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION search_kira_knowledge(
    p_organisation_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    summary TEXT,
    key_points TEXT[],
    url TEXT,
    source_type TEXT,
    relevance_note TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ,
    rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
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
    ts_rank(k.search_vector, plainto_tsquery('english', p_query)) AS rank
  FROM kira_knowledge k
  WHERE k.organisation_id = p_organisation_id
    AND (
      k.search_vector @@ plainto_tsquery('english', p_query)
      OR k.title ILIKE '%' || p_query || '%'
      OR k.summary ILIKE '%' || p_query || '%'
    )
  ORDER BY rank DESC, k.created_at DESC
  LIMIT p_limit;
END;
$$;