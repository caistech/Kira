-- 20260801010000_kira_refusals.sql
--
-- A WRITTEN RECORD OF WHAT SHE DECLINED.
--
-- Today a refusal is words in a call and then nothing. She declines to send without approval, or to
-- file a document nobody asked her to keep, and the moment the conversation ends there is no trace
-- that it happened. That is a strange thing to throw away, for two reasons.
--
-- The first is the owner's. He is selling a business, often before he has told his staff or his
-- family, and he is handing an agent access to his Drive, his contacts and his mail. "It refused,
-- and here is the record" is the single most reassuring artifact such a person can be shown — and
-- the one thing that distinguishes a boundary that holds from a boundary that is merely claimed.
--
-- The second is ours. The red team asserts that she refuses; this is where a refusal becomes
-- evidence rather than a transcript someone has to read. It is also how a slow regression becomes
-- visible: refusals that stop being recorded are a guard that stopped firing.
--
-- WHAT GOES IN. A refusal is a decision NOT to act. It is not an error, and not a tool that failed —
-- "Drive isn't connected" is a failure and belongs in logs, not here. Mixing the two would bury the
-- signal in noise within a week, which is how audit tables die.

CREATE TABLE IF NOT EXISTS kira_refusals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Nullable on purpose: a refusal is worth recording even when the binding cannot be resolved.
  -- kira_memory made agent id NOT NULL and every write from the documented one-agent-per-user path
  -- failed the constraint behind a 200, which is the mistake not to repeat here.
  kira_agent_id UUID REFERENCES kira_agents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- 'approval'  the owner was asked and said no, or approval was never given — server-observed,
  --             guaranteed, requires nothing of the model.
  -- 'agent'     she declined in conversation and recorded it herself.
  source TEXT NOT NULL CHECK (source IN ('approval', 'agent')),

  -- What she was asked to do, in the owner's terms, and why she did not.
  asked TEXT NOT NULL,
  reason TEXT,

  -- The task this concerned, when there was one.
  task_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kira_refusals_user_created ON kira_refusals(user_id, created_at DESC);

ALTER TABLE kira_refusals ENABLE ROW LEVEL SECURITY;

-- The owner reads their own refusals; nothing but the service role writes them. A record the subject
-- can edit is not a record.
DROP POLICY IF EXISTS kira_refusals_owner_read ON kira_refusals;
CREATE POLICY kira_refusals_owner_read ON kira_refusals
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

COMMENT ON TABLE kira_refusals IS
  'Durable record of what Kira declined to do and why. Refusals only — never tool failures.';
