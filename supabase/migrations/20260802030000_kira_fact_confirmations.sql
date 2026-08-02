-- 20260802030000_kira_fact_confirmations.sql
--
-- THE DIFFERENCE BETWEEN "HE SAID IT" AND "HE CONFIRMED IT".
--
-- The Genome's third axis, decided 2026-08-02 (docs/GENOME_BUYER_FORMAT.md §2): a buyer discounts a
-- claim he cannot check. "The pricing rule is X" is an assertion. "The owner was read this back on
-- 4 August and agreed" is evidence he can put in a file, and it is the axis the product is actually
-- paid for.
--
-- THREE STATES, and only the third counts:
--
--   asserted   he said it once, in passing
--   sourced    it is traceable to the conversation he said it in  (kira_memory.source_conversation_id)
--   confirmed  she read it back to him and he agreed              (this table)
--
-- WHY A TABLE AND NOT A BOOLEAN SHE SETS. "Confirmed" is a buyer-facing claim, which puts it in the
-- class this codebase has repeatedly learned to enforce rather than request. Every guard that held
-- hooked a real event — declined_because on record_refusal, about_business on save_memory. Every rule
-- that lived only in a description was walked around, one of them 24 minutes after shipping. So a
-- confirmation is a ROW: which fact, when, and what he actually said. It cannot be asserted in prose.
--
-- APPEND-ONLY, because the history is the point. A fact confirmed in March and denied in August is
-- not a contradiction to be resolved by overwriting — it is exactly what a buyer needs to see, and
-- it is how a business changes. kira_memory carries the LATEST outcome for fast reads; this table
-- carries the account of how it got there.
--
-- IT CANNOT BE BACKFILLED, and that is deliberate. Every fact captured before today is `sourced` at
-- best. The confirmed count starts at zero and grows only as she asks. A thin buyer view is the
-- honest state of the record; a confirmation invented for an existing row is the one lie this
-- document could not survive.

CREATE TABLE IF NOT EXISTS kira_fact_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CASCADE: a deleted fact has no confirmation to account for. The evidence exists to support a
  -- claim, so it must not outlive the claim and be re-attached to something else.
  memory_id UUID NOT NULL REFERENCES kira_memory(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- The only three answers there are. Enforced by the database because the enum is what makes the
  -- axis meaningful, and a value invented at 3am is a confirmation nobody can defend.
  --
  --   confirmed  "yes, that's right"
  --   corrected  "no — it's actually X"     -> the fact is parked, and the corrected version is
  --                                            saved separately through save_memory, which carries
  --                                            the entity guard. One tool, one job.
  --   denied     "no, that's wrong"         -> the fact is parked. A fact he says is untrue must
  --                                            stop being asserted in his name immediately.
  outcome TEXT NOT NULL CHECK (outcome IN ('confirmed', 'corrected', 'denied')),

  -- HIS WORDS, not her summary of them. The whole value of this row to a buyer is that it records
  -- what the owner actually said when the fact was put to him.
  said TEXT,

  kira_agent_id UUID,
  source_conversation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_confirmations_memory ON kira_fact_confirmations(memory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fact_confirmations_user ON kira_fact_confirmations(user_id, created_at DESC);

-- The latest outcome, denormalised onto the fact so rendering a Genome is one query rather than a
-- join per entry. The table above stays the source of truth for HOW it got here.
ALTER TABLE kira_memory ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE kira_memory ADD COLUMN IF NOT EXISTS confirmed_outcome TEXT;

DO $$
BEGIN
  ALTER TABLE kira_memory
    ADD CONSTRAINT kira_memory_confirmed_outcome_check
    CHECK (confirmed_outcome IS NULL OR confirmed_outcome IN ('confirmed', 'corrected', 'denied'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN kira_memory.confirmed_at IS
  'When this fact was last read back to the owner. NULL means asserted-or-sourced, never confirmed — and must never be filled by anything but a real confirmation event.';

ALTER TABLE kira_fact_confirmations ENABLE ROW LEVEL SECURITY;

-- The owner may read the record of what he was asked and what he answered. Writes are service-role
-- only: a confirmation the owner could insert himself would be worth nothing to the buyer it exists
-- to convince.
DROP POLICY IF EXISTS "own confirmations readable" ON kira_fact_confirmations;
CREATE POLICY "own confirmations readable" ON kira_fact_confirmations
  FOR SELECT USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = kira_fact_confirmations.user_id));

COMMENT ON TABLE kira_fact_confirmations IS
  'Append-only record of facts read back to the owner and what he said. The Genome''s verifiable axis: a buyer discounts what he cannot check.';
