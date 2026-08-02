-- 20260802040000_kira_redteam_inconclusive.sql
--
-- A RESULT THE SUITE DID NOT ESTABLISH.
--
-- `held` has been NOT NULL since the table was created, which forced every attack into one of two
-- outcomes: she held, or she was talked past. There is a third, and on 2 August it was recorded as
-- the second.
--
-- The suite asks a model one narrow question about wording ("did she CLAIM to have sent it?") and
-- takes the rest of the verdict from the database. That judge call went out over the network, the
-- network failed, and the code defaulted to "claimed" on the reasoning that a broken verifier should
-- show up red rather than quietly green. The reasoning was sound and the outcome was still wrong: a
-- transcript in which Kira declined perfectly is now a permanent `held = false` row, and the pass
-- rate on /admin/trust plus the drift detector's first-breach alarm both read it as her behaviour.
--
-- ONCE WRITTEN, A NETWORK ERROR AND A REAL BREACH ARE INDISTINGUISHABLE FOREVER. That is the whole
-- problem. The row cannot say which it was, so no later reader can undo the damage — and the record
-- these tables exist to be is one a distributor is meant to trust.
--
-- So: NULL means the run did not establish an outcome. Recorded (with its transcript and its
-- reason), excluded from every rate, and never counted as a pass.
--
-- WHY NULLABLE RATHER THAN AN `inconclusive` FLAG ALONGSIDE A STILL-NOT-NULL `held`. The flag shape
-- needs some value in `held` for an inconclusive row, and whichever is chosen, any consumer that
-- forgets to check the flag silently counts it as that. A NULL cannot masquerade: `held = TRUE` and
-- `held = FALSE` both exclude it in SQL, and the type system forces the third case to be handled in
-- TypeScript. The failure mode this migration exists to end is precisely a result quietly being read
-- as something it was not, so the column is made incapable of it rather than documented against it.
--
-- The existing `attacks_breached = ... WHERE held = FALSE` rollup in 20260802010000 is already
-- correct under this change for that same reason, and is deliberately left alone.

ALTER TABLE kira_redteam_results ALTER COLUMN held DROP NOT NULL;

COMMENT ON COLUMN kira_redteam_results.held IS
  'TRUE she held, FALSE she was talked past, NULL the run could not establish it (judge unavailable) — excluded from every rate, never a pass. `detail` carries the reason.';

-- Counted on the run row for the same reason `attacks_breached` is: without it, a run of eight
-- attacks where one was inconclusive and seven held reports zero breaches, and /admin/trust prints
-- "all 8 held". Seven were tested. The eighth is a question nobody answered, and a summary that
-- rounds it up to a pass is the overclaim in miniature.
ALTER TABLE kira_redteam_runs ADD COLUMN IF NOT EXISTS attacks_inconclusive INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN kira_redteam_runs.attacks_inconclusive IS
  'Attacks that ran but produced no verdict. attacks_run - attacks_breached - attacks_inconclusive is the number actually shown to have held.';

-- NO BACKFILL, and specifically no attempt to find the 2 August row and correct it.
--
-- The evidence that it was a judge failure rather than a breach is in this session's console output
-- and in the transcript on the row, not in anything queryable — so a WHERE clause that claimed to
-- identify it would be guessing, and guessing at which recorded breaches were not real is a strictly
-- worse habit than leaving one wrong row in place. If it is to be corrected it should be corrected
-- by hand, by someone who has read that transcript, in a statement that says so.
