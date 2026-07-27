-- 20260727180000_kill_switch.sql
--
-- The control that lets a person stop the product mid-flight.
--
-- WHY. AI_INCIDENT_RESPONSE.md §4.1 lists "no global kill switch" as a known gap: containment was
-- per-account (suspend an introducer, delete a memory) or per-deploy (roll back). Neither helps in
-- the case that actually matters — something wrong happening across many accounts at once, at a time
-- when a redeploy is the slowest possible response. The unrecoverable failure is a wrong send at
-- volume: one bad template times fifty recipients, under our ABN, at 2am.
--
-- Draft-only postures and careful review are good, but they are POSTURES. A kill switch is a
-- CONTROL. This is the control.
--
-- SHAPE. One row per haltable scope, not a boolean column somewhere. A scope carries WHO threw it,
-- WHEN, and WHY — because the first question on finding a halted system is "who did this and can I
-- undo it", and an unexplained flag gets cleared by whoever is least informed.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS system_flags (
  -- The scope being halted. Deliberately an open TEXT rather than an enum: a new haltable surface
  -- should be one INSERT, not a migration during an incident.
  flag TEXT PRIMARY KEY,
  halted BOOLEAN NOT NULL DEFAULT FALSE,
  -- Why it was thrown. Shown to operators; never shown to end users.
  reason TEXT,
  set_by TEXT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE system_flags IS
  'Operational kill switches. A halted scope refuses work immediately, without a redeploy. Read by lib/kill-switch.ts; service-role only.';

-- Seed the scopes we know how to halt. Present-and-false is deliberate: the reader must be able to
-- tell "not halted" from "never heard of this scope", and only a seeded row proves the former.
INSERT INTO system_flags (flag, halted, reason, set_by)
VALUES
  ('all',            FALSE, NULL, 'migration'),
  ('conversations',  FALSE, NULL, 'migration'),
  ('outbound_email', FALSE, NULL, 'migration')
ON CONFLICT (flag) DO NOTHING;

-- RLS on, with NO policy: service-role only. There is no read path for a signed-in user and no
-- write path for anyone but the operator. A kill switch a user can read is a probe of our incident
-- state; one a user could write is the incident.
ALTER TABLE system_flags ENABLE ROW LEVEL SECURITY;

-- Keep updated_at honest, since "when was this thrown" is the first thing anyone asks.
CREATE OR REPLACE FUNCTION system_flags_touch() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.halted IS DISTINCT FROM OLD.halted THEN
    NEW.set_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS system_flags_touch_trg ON system_flags;
CREATE TRIGGER system_flags_touch_trg
  BEFORE UPDATE ON system_flags
  FOR EACH ROW EXECUTE FUNCTION system_flags_touch();

-- ─────────────────────────────────────────────────────────────────────────────
-- Throwing it, for the runbook
-- ─────────────────────────────────────────────────────────────────────────────
--
--   UPDATE system_flags SET halted = TRUE, reason = '<what is wrong>', set_by = '<who>'
--   WHERE flag = 'all';
--
-- Clearing it is the same statement with halted = FALSE. Takes effect within the cache TTL in
-- lib/kill-switch.ts (10s), with no deploy.
