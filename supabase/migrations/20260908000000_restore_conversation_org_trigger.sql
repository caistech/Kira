-- 20260908000000_restore_conversation_org_trigger.sql
-- Fix the Kira post-call webhook 500 ("Failed to create conversation").
--
-- CAUSE: 20260826200000_p05_legacy_authority_retirement.sql deliberately dropped the
-- trigger that filled conversations.organisation_id from users.id (legacy identity path).
-- 20260905100000_enforce_org_id_not_null.sql then made the column NOT NULL. But the
-- canonical @caistech/elevenlabs-convai handlePostCallWebhook inserts conversations WITHOUT
-- organisation_id, so every webhook-delivered conversation INSERT now violates the constraint
-- and the post-call webhook returns 500. No conversation is persisted at all.
--
-- FIX: supply organisation_id at write time from the AGENT's organisation_id. This is the
-- canonical tenant source (the agent is provisioned per-org — kira_agents.organisation_id),
-- NOT the retired users.id authority. Applies to the orphan post-call path (no prior start)
-- and to any other raw insert that omits organisation_id; rows that already carry the org are
-- untouched.
--
-- Idempotent: create-or-replace.

CREATE OR REPLACE FUNCTION kira_fill_conversation_org_from_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.organisation_id IS NULL AND NEW.agent_id IS NOT NULL THEN
        SELECT organisation_id INTO NEW.organisation_id
        FROM kira_agents
        WHERE id = NEW.agent_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_org_from_agent ON conversations;
CREATE TRIGGER trg_conversations_org_from_agent
  BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION kira_fill_conversation_org_from_agent();