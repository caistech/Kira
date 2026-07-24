-- 20260724000000_business_valuations.sql
-- Persists a user's business valuation (the gap they saw) so the sales page price and the Gap
-- Dashboard both reference THEIR number. Keyed to the app users table (users.id); RLS lets a user
-- read their own row via the auth_user_id bridge. Server code uses the service role (bypasses RLS).
-- Idempotent.

CREATE TABLE IF NOT EXISTS business_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The raw ValuationInputs, so the full result can be recomputed anywhere.
  inputs JSONB NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  -- Denormalised headline figures (for cheap dashboard/price reads).
  gap NUMERIC NOT NULL DEFAULT 0,
  worth_today NUMERIC NOT NULL DEFAULT 0,
  worth_potential NUMERIC NOT NULL DEFAULT 0,
  walk_away NUMERIC NOT NULL DEFAULT 0,
  sde_multiple NUMERIC,
  readiness NUMERIC,
  industry TEXT,
  -- The monthly price band they were quoted at sign-up.
  quoted_monthly NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One current valuation per user (latest wins via upsert).
CREATE UNIQUE INDEX IF NOT EXISTS business_valuations_user_uniq ON business_valuations (user_id);

ALTER TABLE business_valuations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_valuations_select_own ON business_valuations;
CREATE POLICY business_valuations_select_own ON business_valuations
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );
