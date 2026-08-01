-- 20260801160000_kira_refusals_observed.sql
--
-- A THIRD SOURCE, because the first two cannot see the most common refusal.
--
--   approval  the server watched it happen (approve_task without an explicit yes). Needs nothing
--             from the model, and only covers one narrow case.
--   agent     she called record_refusal herself. Covers everything else — in principle.
--   observed  read back out of the transcript after the conversation ended.  ← this migration
--
-- WHY. `agent` was measured at 0/6 and then 1/6 across three separate attempts to fix it with
-- words: the tool description was rewritten, the boundary was re-anchored to what EXISTS rather than
-- what is imaginable, and the "yet" hedge was named and forbidden. She declines out loud, correctly,
-- every time — and does not call the tool. The rate did not move.
--
-- Every mechanism that HAS worked here hooked a call she already makes: declined_because on
-- record_refusal, about_business on save_memory, speaking_to on the disclosure tools. That approach
-- has no purchase on this one, because the failure IS the absent call. There is no invocation to
-- attach a required parameter to.
--
-- So the observation moves to where the whole conversation already gets read: the distil pass that
-- runs when a session ends. One extra extraction on a transcript we are already processing, rather
-- than a classifier on every live turn — a refusal record is an audit artifact, not something the
-- owner is waiting on mid-sentence.
--
-- The contamination risk is the same one `declined_because` exists to stop: a tool failure logged as
-- a refusal. Rows written by the sweep go through the SAME classification requirement and the SAME
-- DB CHECK as every other row, so the loosening here is only about WHO noticed, never about what
-- counts.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kira_refusals_source_check') THEN
    ALTER TABLE kira_refusals DROP CONSTRAINT kira_refusals_source_check;
  END IF;

  ALTER TABLE kira_refusals
    ADD CONSTRAINT kira_refusals_source_check
    CHECK (source IN ('approval', 'agent', 'observed'));
END $$;

COMMENT ON COLUMN kira_refusals.source IS
  'Who noticed: approval = the server watched it, agent = she called record_refusal, observed = read back out of the transcript at distil. All three carry the same declined_because requirement.';
