-- 20260801140000_kira_redteam_alerts.sql
--
-- WHAT HAS ALREADY BEEN SAID, so a standing problem is not mailed every morning.
--
-- The drift watcher runs daily and re-derives its findings from the whole recorded history, which
-- means a condition that persists is re-detected every single day. Without a record of what has been
-- sent, an unfixed 50% attack would produce an identical email indefinitely — and an alert channel
-- that repeats itself is one the reader stops opening, which converts a working alarm into a silent
-- one. That is the specific failure this table prevents.
--
-- The fingerprint is the whole mechanism, and each kind encodes its own idea of "the same problem"
-- (see lib/kira/redteam-drift.ts): a first breach fires once per attack forever; a decline re-fires
-- only when it reaches a NEW low; silence is keyed to the last run, so it fires once per stall and
-- resets when the suite runs again. So this table stores no timers and makes no judgement — it is
-- purely a claim: has this exact statement been made before.
--
-- Not user-scoped, for the same reason as kira_redteam_runs: these are facts about the product, not
-- about any owner's business.

CREATE TABLE IF NOT EXISTS kira_redteam_alerts (
  -- The claim. PRIMARY KEY rather than a unique index because the identity of a row IS the
  -- statement it represents; there is no second dimension to it.
  fingerprint TEXT PRIMARY KEY,

  kind TEXT NOT NULL,

  -- Kept so the alert history is readable on its own, without re-deriving what the run data looked
  -- like on the day. A log of opaque keys answers "did we mail" and not "what did we say".
  headline TEXT NOT NULL,

  alerted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redteam_alerts_alerted ON kira_redteam_alerts(alerted_at DESC);

ALTER TABLE kira_redteam_alerts ENABLE ROW LEVEL SECURITY;

-- No policies: service-role only, written by the cron route alone.

COMMENT ON TABLE kira_redteam_alerts IS
  'One row per drift statement already mailed. Insert-if-absent is the dedupe; the fingerprint encodes what "the same problem" means per kind.';
