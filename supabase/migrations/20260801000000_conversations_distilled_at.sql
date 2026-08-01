-- 20260801000000_conversations_distilled_at.sql
--
-- WHEN WAS THIS CONVERSATION LAST TURNED INTO MEMORY?
--
-- Distillation is triggered from the browser when the owner leaves. That trigger is about to fire
-- far more often — `visibilitychange` fires on every tab switch, not only on the last one — because
-- `pagehide` alone does not survive a mobile browser backgrounding the tab and killing it, which is
-- exactly how a phone session ends.
--
-- Firing more often is only safe if repeating the work is cheap, and today it is not: the pipeline
-- re-runs LLM extraction across the whole transcript every time. Without a marker, a typing session
-- with eight tab switches pays for eight full extractions of the same conversation and gives the
-- extractor eight chances to word the same fact slightly differently — and only LITERAL repeats are
-- collapsed downstream, so the reworded ones survive as duplicates.
--
-- One nullable timestamp is enough: distil only when a message exists that is newer than it.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS distilled_at TIMESTAMPTZ;

COMMENT ON COLUMN conversations.distilled_at IS
  'When this conversation was last distilled into memory. NULL = never. The distil path skips when no message is newer than this, so the leave-the-page trigger can fire freely.';
