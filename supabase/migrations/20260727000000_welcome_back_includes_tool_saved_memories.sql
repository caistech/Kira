-- 20260727000000_welcome_back_includes_tool_saved_memories.sql
-- Welcome-back said "we've spoken before" and then had nothing to say about it.
--
-- TWO defects in the previous definition, both of which empty the `memories` array while
-- `has_history` still reports true — the agent is told it has met you and handed no content:
--
--   1. `kira_agent_id = p_agent_id` excludes NULL. The canonical server-baked identity path
--      (resolveToolIdentity) documents agentId as OPTIONAL — omitted so recall spans the whole user,
--      which is right for one-agent-per-user — so handleSaveMemory writes every tool-saved fact with
--      the agent column NULL. Those are precisely the facts the agent chose to remember, and they
--      were the ones being hidden. Now `(kira_agent_id = p_agent_id OR kira_agent_id IS NULL)`.
--
--   2. Memories were computed inside the has-history branch, so a user with memories but no prior
--      CONVERSATION row got `[]`. The canonical package definition reads memories first, always,
--      independently of any conversation's existence or status; this clone had drifted back.
--
-- Idempotent (CREATE OR REPLACE); identical signature and return shape.

CREATE OR REPLACE FUNCTION get_conversation_context(
  p_agent_id UUID,
  p_user_id UUID,
  p_message_limit INTEGER DEFAULT 20
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  last_conv RECORD;
  effective_ts TIMESTAMPTZ;
  time_gap INTERVAL;
  memories_json JSON;
BEGIN
  -- Memories FIRST — always, regardless of whether a conversation row exists or what status it is
  -- in. A returning user's facts do not depend on the bookkeeping around the call they were said in.
  SELECT COALESCE(json_agg(
    json_build_object('id', mem.id, 'type', mem.memory_type, 'content', mem.content, 'importance', mem.importance)
    ORDER BY mem.importance DESC
  ), '[]'::json)
  INTO memories_json
  FROM (
    SELECT * FROM kira_memory
    WHERE (kira_agent_id = p_agent_id OR kira_agent_id IS NULL)
      AND user_id = p_user_id
      AND active = true
    ORDER BY importance DESC, created_at DESC
    LIMIT 10
  ) mem;

  SELECT
    c.id,
    c.last_message_at,
    c.started_at,
    c.created_at,
    c.last_topic,
    c.summary,
    c.message_count,
    c.title
  INTO last_conv
  FROM conversations c
  WHERE c.kira_agent_id = p_agent_id
    AND c.user_id = p_user_id
    AND c.status IN ('active', 'completed')
  -- Newest by whatever timestamp exists — a just-ended, not-yet-processed chat (last_message_at
  -- NULL) must still win over an older processed one.
  ORDER BY COALESCE(c.last_message_at, c.started_at, c.created_at) DESC
  LIMIT 1;

  IF last_conv.id IS NULL THEN
    RETURN json_build_object(
      'has_history', false,
      'recent_messages', '[]'::json,
      'memories', memories_json
    );
  END IF;

  effective_ts := COALESCE(last_conv.last_message_at, last_conv.started_at, last_conv.created_at);
  time_gap := NOW() - effective_ts;

  SELECT json_build_object(
    'has_history', true,
    'conversation_id', last_conv.id,
    'last_message_at', effective_ts,
    'time_gap_seconds', EXTRACT(EPOCH FROM time_gap)::INTEGER,
    'time_gap_category',
      CASE
        WHEN time_gap < INTERVAL '1 hour' THEN 'recent'
        WHEN time_gap < INTERVAL '1 day' THEN 'today'
        WHEN time_gap < INTERVAL '7 days' THEN 'this_week'
        ELSE 'older'
      END,
    'last_topic', last_conv.last_topic,
    'summary', last_conv.summary,
    'message_count', last_conv.message_count,
    'title', last_conv.title,
    'recent_messages', (
      SELECT COALESCE(json_agg(
        json_build_object('id', m.id, 'role', m.role, 'content', m.content, 'timestamp', m.timestamp)
        ORDER BY m.timestamp DESC
      ), '[]'::json)
      FROM (
        SELECT * FROM conversation_messages
        WHERE conversation_id = last_conv.id
        ORDER BY timestamp DESC
        LIMIT p_message_limit
      ) m
    ),
    'memories', memories_json
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
