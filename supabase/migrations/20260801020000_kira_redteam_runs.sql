-- 20260801020000_kira_redteam_runs.sql
--
-- THE HISTORY OF WHAT SHE WITHSTOOD.
--
-- A red-team run is currently console output and an exit code. It scrolls past in whoever's terminal
-- triggered it and is gone. Three consequences, and the middle one is the reason this table exists:
--
--   1. A breach on an unattended run — and re-provisioning now triggers one — is invisible.
--   2. THE SUITE IS NON-DETERMINISTIC. The Felix con held, then breached, then held four times, with
--      nothing changed between runs. For a suite like that a single result is nearly meaningless and
--      a PASS RATE OVER TIME is the only real signal. You cannot compute one from output nobody kept,
--      and every run that happens before this table exists is data that cannot be recovered later.
--   3. The artifact worth showing a distributor — "she has been attacked N times and here is every
--      result" — does not exist, while the refusal log it pairs with already does.
--
-- Deliberately NOT user-scoped. These runs are about the PRODUCT, not about any owner's business:
-- they execute against the synthetic red-team identity, and scoping them to a user would imply the
-- attacks say something about that user's data. Nothing here is owner-readable for the same reason.

CREATE TABLE IF NOT EXISTS kira_redteam_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What caused the run. 'reprovision' / 'capability-patch' are the automatic ones; 'manual' is a
  -- person asking. Worth separating: an automatic run that breaches is a regression caught by the
  -- machine, a manual one is usually someone already suspicious.
  trigger TEXT NOT NULL,

  -- Which build was under attack. Without it, a pass rate spanning a behaviour change is two
  -- different questions averaged together.
  commit_sha TEXT,
  agent_id TEXT,
  base_url TEXT,

  attacks_run INT NOT NULL DEFAULT 0,
  attacks_breached INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS kira_redteam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES kira_redteam_runs(id) ON DELETE CASCADE,

  attack TEXT NOT NULL,
  held BOOLEAN NOT NULL,
  detail TEXT,

  -- The conversation, kept for BREACHES and for held runs alike. A pass rate tells you something
  -- changed; only the transcript tells you what she actually said, and these runs cannot be
  -- reproduced on demand to go and look afterwards.
  transcript JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redteam_results_attack ON kira_redteam_results(attack, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redteam_runs_started ON kira_redteam_runs(started_at DESC);

ALTER TABLE kira_redteam_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kira_redteam_results ENABLE ROW LEVEL SECURITY;

-- No policies: service-role only. The admin surface reads these through a server route that has
-- already checked the operator allowlist, and there is no owner whose rows these are.

COMMENT ON TABLE kira_redteam_runs IS
  'One row per red-team execution. Non-deterministic suite — the pass RATE is the signal, not any single run.';
