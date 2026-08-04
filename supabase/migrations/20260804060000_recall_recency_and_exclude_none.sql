-- 20260804060000_recall_recency_and_exclude_none.sql
--
-- WHY: the owner reported that Kira had "no recollection" of a conversation held hours earlier, and
-- a general loss of quality compared with earlier sessions. Measured against production the same
-- day, on his own account:
--
--   * 91 active memories on his live agent; the connect payload carried TEN.
--   * The selection was `ORDER BY importance DESC, created_at DESC LIMIT 10` — the ten
--     highest-importance facts OF ALL TIME, with recency only breaking ties.
--   * His importance distribution: 4 rows at 10, 16 at 9, 28 at 8, 28 at 7, 11 at 6, 4 at 5.
--     Twenty rows compete for ten slots, so the cut-off sat at importance 9 and SEVENTY-ONE
--     memories sat permanently below it.
--   * Eight of his ten Lot 442 memories scored 8, 7 or 6. She arrived holding two abstract
--     governance lines about Lot 442 and none of the substance — not the excavation drawings, not
--     the data-room files, not the contacts he had asked her to find.
--
-- She was not forgetting the conversation. She was never told about it.
--
-- THE DRIFT THIS EXPLAINS, which matters more than the single incident: because the ordering is
-- importance-first, the slice is effectively FROZEN around whatever scored 9-10 early on. Every new
-- fact must outrank an incumbent to be seen at all. At ~20 memories the top ten was half his
-- history and she seemed to know him; at 91 it is 11%, and the excluded 89% is disproportionately
-- RECENT. The product degraded as it was used, which is the exact inverse of what it promises.
-- Nothing broke — he crossed a threshold.
--
-- ── THE FIX: two lanes, not a bigger number ─────────────────────────────────────────────────────
--
-- Raising the limit alone would not have helped, because the problem is the ORDER, not the count:
-- at LIMIT 20 the cut-off simply moves to importance 8 and recent low-scored facts are still last
-- in the queue. So the slice is now the UNION of two lanes, which is how the owner described human
-- memory working:
--
--   STANDING — top 10 by importance. The durable rules that must always be in the room: the
--              governance gate, the strict separation of Lot 442 and Lot 91.
--   RECENT   — top 10 by recency, whatever they scored. What was actually just discussed.
--
-- Deduped by UNION, so the payload is 10-20 rows. The previous behaviour is a STRICT SUBSET of the
-- new one: nothing she knew yesterday is taken away, and recent context stops being crowded out by
-- four-week-old importance-10 facts. That property is deliberate — a recall change that silently
-- removed a fact she used to have would be indistinguishable, from the owner's seat, from the bug
-- being fixed here.
--
-- ── AND: `none`-filed rows are excluded ─────────────────────────────────────────────────────────
--
-- Two of his ten slots were Kira talking about HERSELF — "the assistant role includes identifying
-- and prompting to capture undocumented knowledge" at importance 10, and "there is an unresolved
-- issue to verify access to the Gmail account" at importance 9. That is 20% of her working memory
-- spent on notes about the assistant, displacing real business facts.
--
-- `genome_section = 'none'` is the classifier's verdict for chit-chat, notes about the assistant,
-- and facts about another company — already excluded from the Genome and the buyer's handover. It
-- has no more business in her working memory than in the document. NULL is NOT excluded: null means
-- not-yet-classified, and dropping those would hide every fact captured in the last few minutes —
-- reintroducing this very bug from the other end.
--
-- SCOPE: this is the connect-time PUSH only. The `recall_memory` PULL (lib/kira/recall.ts, Mnemo
-- semantic + substring) is deliberately untouched — it is query-scoped rather than slot-scarce, and
-- if the owner asks "what did you say about my Gmail access" she should still find it.
--
-- ⚠️ THIS DOES NOT, ON ITS OWN, MAKE HER ANSWER "tell me about 442". Verified against production:
-- the pull path already returns the right facts for a natural-language question with no keyword
-- overlap, so retrieval works and Mnemo is doing its job. What fails is the DECISION to retrieve —
-- a 38,848-character prompt with 17 tools on gpt-4.1-mini. That is tracked separately.
--
-- Body reproduced verbatim from 20260720600000_fix_welcome_back_recall.sql except the `memories`
-- sub-select; same signature and return type (no 42P13). Idempotent (CREATE OR REPLACE).

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
    AND c.status IN ('active', 'completed')
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
          'importance', mem.importance,
          -- Carried so she can say "you told me on Tuesday" instead of asserting every fact as
          -- timeless. The handover document already dates every claim; the voice had no way to.
          'captured_at', mem.created_at
        ) ORDER BY mem.importance DESC, mem.created_at DESC
      ), '[]'::json)
      FROM (
        -- STANDING: the durable rules, unchanged from the previous behaviour.
        (
          SELECT id, memory_type, content, importance, created_at
          FROM kira_memory
          WHERE kira_agent_id = p_agent_id
            AND user_id = p_user_id
            AND active = true
            AND (genome_section IS NULL OR genome_section <> 'none')
          ORDER BY importance DESC, created_at DESC
          LIMIT 10
        )
        UNION
        -- RECENT: what was actually just discussed, whatever it scored.
        (
          SELECT id, memory_type, content, importance, created_at
          FROM kira_memory
          WHERE kira_agent_id = p_agent_id
            AND user_id = p_user_id
            AND active = true
            AND (genome_section IS NULL OR genome_section <> 'none')
          ORDER BY created_at DESC
          LIMIT 10
        )
      ) mem
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
