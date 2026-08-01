-- 20260802010000_kira_redteam_runs_aborted.sql
--
-- TELLING "STOPPED" APART FROM "DIED".
--
-- A run row with no finish time is read by the drift detector as DIED, and that reading exists for a
-- good reason: a suite that vanished partway must never be counted as green, because whatever it had
-- not reached yet is untested and an unattended breach hides in exactly that gap.
--
-- But it cannot currently tell apart two different things:
--
--   DIED     the process disappeared and nobody knows why. Genuinely alarming — something is wrong
--            with the harness, the network or the agent, and the untested remainder is unknown.
--   ABORTED  the run was interrupted and SAID SO on the way out, recording how far it got. Nothing
--            is hidden: the results it did produce are in the table, and the row states the rest was
--            never attempted.
--
-- The first deserves an email. The second is a person pressing Ctrl-C during a working session, and
-- mailing about it trains the reader to ignore the channel — which is the failure mode the drift
-- alerting was deliberately shaped around in the first place.
--
-- So an abort is now RECORDED rather than inferred. `aborted_at` is written by the suite itself as it
-- exits (scripts/red-team.mjs), which is what makes it evidence rather than an assumption: nothing
-- outside the run is entitled to decide it stopped for a harmless reason.

ALTER TABLE kira_redteam_runs ADD COLUMN IF NOT EXISTS aborted_at TIMESTAMPTZ;
ALTER TABLE kira_redteam_runs ADD COLUMN IF NOT EXISTS aborted_reason TEXT;

COMMENT ON COLUMN kira_redteam_runs.aborted_at IS
  'Set by the suite when it exits before completing. An abort is CLOSED-with-a-reason; a row with neither finished_at nor aborted_at died silently and is alerted on.';

-- ── The four runs from 2026-08-01 ──────────────────────────────────────────────────────────────────
--
-- Closed retrospectively, because they predate the suite being able to close itself. Each was
-- interrupted mid-session while the attack list was being extended (2, 3, 5 and 6 of 8 attacks
-- completed); the results they DID produce are already in kira_redteam_results and continue to count
-- towards every pass rate, which is why this is a bookkeeping correction and not a deletion.
--
-- The counts are DERIVED from the results actually recorded rather than assumed — the run rows say
-- attacks_run 0 only because that column is written at the finish these runs never reached.
--
-- The cause of each interrupt was not recorded at the time and is NOT invented here. That is the
-- whole reason the suite now writes its own reason on the way out.
--
-- Bounded by a hard date so this can never become a janitor that quietly closes future dead runs —
-- auto-closing a death is precisely how the signal would be lost.
UPDATE kira_redteam_runs r
SET
  aborted_at = COALESCE(
    (SELECT MAX(created_at) FROM kira_redteam_results WHERE run_id = r.id),
    r.started_at
  ),
  aborted_reason = 'interrupted during a development session; closed retrospectively 2026-08-02, cause not recorded at the time',
  attacks_run = (SELECT COUNT(*) FROM kira_redteam_results WHERE run_id = r.id),
  attacks_breached = (SELECT COUNT(*) FROM kira_redteam_results WHERE run_id = r.id AND held = FALSE)
WHERE r.finished_at IS NULL
  AND r.aborted_at IS NULL
  AND r.started_at < '2026-08-02T00:00:00Z';
