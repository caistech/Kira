-- 20260725140000_welcome_back_newest_conversation.sql
-- Welcome-back picked the WRONG (older) conversation. get_conversation_context ordered by
-- `last_message_at DESC NULLS LAST`, but last_message_at is only set once a conversation is
-- POST-CALL processed. A just-ended chat that hasn't finished processing has it NULL, so it sorted
-- last and an OLDER, already-processed conversation won — the "bounced back to the Perth chat" bug.
--
-- Fix: order by COALESCE(last_message_at, started_at, created_at) so the genuinely-newest
-- conversation is always chosen, and use the same coalesced timestamp for the time-gap so it never
-- breaks on a null. Idempotent (CREATE OR REPLACE); same signature + return type.

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
BEGIN
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
      'memories', '[]'::json
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
    'memories', (
      SELECT COALESCE(json_agg(
        json_build_object('id', mem.id, 'type', mem.memory_type, 'content', mem.content, 'importance', mem.importance)
        ORDER BY mem.importance DESC
      ), '[]'::json)
      FROM (
        SELECT * FROM kira_memory
        WHERE kira_agent_id = p_agent_id AND user_id = p_user_id AND active = true
        ORDER BY importance DESC, created_at DESC
        LIMIT 10
      ) mem
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
