-- 20260720600000_fix_welcome_back_recall.sql
-- Voice-memory recall bug (found by /voice-auditor, 2026-07-20): get_conversation_context() filtered
-- `AND c.status = 'active'`, but a FINISHED conversation is 'completed' (the canonical post-call loop
-- maps done -> completed). So the "welcome back, we discussed X" recall never found any prior
-- conversation — has_history was always false even with completed conversations full of messages.
-- This is the storage≠memory trap: data persists (conversations/conversation_messages), but the
-- recall query never surfaces it. Fix: look at the most recent active-OR-completed conversation.
--
-- Body reproduced verbatim from 20260119000000_kira_complete.sql except the status filter; same
-- signature + return type (no 42P13). Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION get_conversation_context(
  p_agent_id UUID,
  p_user_id UUID,
  p_message_limit INTEGER DEFAULT 20
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  last_conv RECORD;
  time_gap INTERVAL;
BEGIN
  SELECT
    c.id,
    c.last_message_at,
    c.last_topic,
    c.summary,
    c.message_count,
    c.title
  INTO last_conv
  FROM conversations c
  WHERE c.kira_agent_id = p_agent_id
    AND c.user_id = p_user_id
    AND c.status IN ('active', 'completed')   -- FIX: was `= 'active'` (finished convos are 'completed')
  ORDER BY c.last_message_at DESC NULLS LAST
  LIMIT 1;

  IF last_conv.id IS NULL THEN
    RETURN json_build_object(
      'has_history', false,
      'recent_messages', '[]'::json,
      'memories', '[]'::json
    );
  END IF;

  time_gap := NOW() - last_conv.last_message_at;

  SELECT json_build_object(
    'has_history', true,
    'conversation_id', last_conv.id,
    'last_message_at', last_conv.last_message_at,
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
        json_build_object(
          'id', m.id,
          'role', m.role,
          'content', m.content,
          'timestamp', m.timestamp
        ) ORDER BY m.timestamp DESC
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
        json_build_object(
          'id', mem.id,
          'type', mem.memory_type,
          'content', mem.content,
          'importance', mem.importance
        ) ORDER BY mem.importance DESC
      ), '[]'::json)
      FROM (
        SELECT * FROM kira_memory
        WHERE kira_agent_id = p_agent_id
          AND user_id = p_user_id
          AND active = true
        ORDER BY importance DESC, created_at DESC
        LIMIT 10
      ) mem
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
