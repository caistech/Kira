-- 20260720200000_client_profiles.sql
-- The Client Profile — the structured artifact the deep-discovery phase builds and the
-- operational Kira is briefed from. One row per user (the subject), deepened across
-- discovery sessions. Holds the merged structured profile + the discovery-complete gate.
--
-- Per DATA_STANDARD: this is the STRUCTURED store for the exact/durable profile facts; the
-- raw discovery transcript rides the convai memory loop (conversations/kira_memory), and the
-- distilled interpretive layer is seeded into kira_memory for the operational agent's recall.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- The merged structured profile (shape = the Zod ClientProfile in lib/kira/discovery-schema.ts).
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Gate: fraction (0..1) of key fields populated, and whether we've crossed the threshold.
  completeness NUMERIC NOT NULL DEFAULT 0,
  discovery_complete BOOLEAN NOT NULL DEFAULT false,

  -- Discovery accrues over multiple coaching sessions.
  sessions_count INT NOT NULL DEFAULT 0,
  last_discovery_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_profiles_user_idx ON client_profiles (user_id);

-- RLS: own row (via the auth bridge). Service role (used by the discovery onResult sink)
-- bypasses RLS.
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_profiles_select_own ON client_profiles;
CREATE POLICY client_profiles_select_own ON client_profiles
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
