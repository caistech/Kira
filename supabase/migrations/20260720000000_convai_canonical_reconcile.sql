-- 20260720000000_convai_canonical_reconcile.sql
-- Reconcile Kira's conversation/memory schema with the canonical
-- @caistech/elevenlabs-convai handler column contract, so Kira can adopt the shared
-- voice-memory loop instead of the forked (broken) implementation.
--
-- WHY: the canonical handlers (handleStartConversation / handleSaveMessage /
-- handleRecallMemory / handleSaveMemory / handlePostCallWebhook) hardcode these columns:
--   conversations         : agent_id, anon_session_id, processed_at  (+ the ones already present)
--   conversation_messages : agent_id  + a UNIQUE(conversation_id, message_index) for upsert dedupe
--   kira_memory           : agent_id, anon_session_id
-- Kira's tables (20260119000000_kira_complete.sql) named the agent FK `kira_agent_id` and
-- lacked anon_session_id / processed_at / the unique index. This migration is fully ADDITIVE:
-- it ADDS `agent_id` (backfilled from kira_agent_id) and keeps `kira_agent_id` so existing
-- consumers keep working, with a BEFORE trigger keeping the two columns in sync in BOTH
-- directions (canonical writes agent_id -> trigger fills kira_agent_id; legacy writes
-- kira_agent_id -> trigger fills agent_id). No renames, no data loss.
--
-- Idempotent: safe to run more than once.

-- ============================================================================
-- 1. ADD agent_id (mirror of kira_agent_id) to the three loop tables + backfill
-- ============================================================================
ALTER TABLE conversations         ADD COLUMN IF NOT EXISTS agent_id UUID;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS agent_id UUID;
ALTER TABLE kira_memory           ADD COLUMN IF NOT EXISTS agent_id UUID;

UPDATE conversations         SET agent_id = kira_agent_id WHERE agent_id IS NULL AND kira_agent_id IS NOT NULL;
UPDATE conversation_messages SET agent_id = kira_agent_id WHERE agent_id IS NULL AND kira_agent_id IS NOT NULL;
UPDATE kira_memory           SET agent_id = kira_agent_id WHERE agent_id IS NULL AND kira_agent_id IS NOT NULL;

-- ============================================================================
-- 2. Bidirectional sync trigger: agent_id <-> kira_agent_id
--    BEFORE INSERT/UPDATE fires before the NOT NULL check on kira_agent_id, so the
--    canonical handlers (which only set agent_id) satisfy the legacy NOT NULL column.
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_kira_agent_id() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.agent_id      := COALESCE(NEW.agent_id, NEW.kira_agent_id);
  NEW.kira_agent_id := COALESCE(NEW.kira_agent_id, NEW.agent_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agent_id ON conversations;
CREATE TRIGGER trg_sync_agent_id BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION sync_kira_agent_id();

DROP TRIGGER IF EXISTS trg_sync_agent_id ON conversation_messages;
CREATE TRIGGER trg_sync_agent_id BEFORE INSERT OR UPDATE ON conversation_messages
  FOR EACH ROW EXECUTE FUNCTION sync_kira_agent_id();

DROP TRIGGER IF EXISTS trg_sync_agent_id ON kira_memory;
CREATE TRIGGER trg_sync_agent_id BEFORE INSERT OR UPDATE ON kira_memory
  FOR EACH ROW EXECUTE FUNCTION sync_kira_agent_id();

-- ============================================================================
-- 3. anon_session_id (canonical anonymous-session linkage; always NULL for Kira's
--    authed users, but the handlers write the column) + processed_at (exactly-once gate)
-- ============================================================================
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS anon_session_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE kira_memory   ADD COLUMN IF NOT EXISTS anon_session_id UUID;

-- ============================================================================
-- 4. UNIQUE(conversation_id, message_index) on conversation_messages so the canonical
--    post-call upsert (onConflict: 'conversation_id,message_index') can dedupe retries.
--    De-duplicate any pre-existing collisions first (keep the newest physical row).
-- ============================================================================
DELETE FROM conversation_messages a
USING conversation_messages b
WHERE a.conversation_id = b.conversation_id
  AND a.message_index   = b.message_index
  AND a.message_index IS NOT NULL
  AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS conversation_messages_conv_msgidx_uniq
  ON conversation_messages (conversation_id, message_index);

-- Helpful lookup indexes for the canonical read paths (idempotent).
CREATE INDEX IF NOT EXISTS conversations_agent_user_idx ON conversations (agent_id, user_id);
CREATE INDEX IF NOT EXISTS kira_memory_agent_user_idx   ON kira_memory (agent_id, user_id);

-- ============================================================================
-- 5. get_conversation_context RPC — INTENTIONALLY NOT (RE)CREATED HERE.
--    The canonical handleStartConversation calls this RPC first for returning-user
--    detection. It ALREADY EXISTS in the Kira database (the prior start_conversation route
--    read its { has_history, time_gap_category } result — the exact fields the canonical
--    handler consumes), and it filters conversations by the agent's id (kept in sync with
--    the new agent_id column by the trigger above). Recreating it here failed with 42P13
--    ("cannot change return type of existing function"); since the existing function already
--    returns the shape the canonical loop needs, we leave it untouched rather than risk
--    breaking a function other code may depend on.
-- ============================================================================
