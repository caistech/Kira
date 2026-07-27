-- 20260727120000_valuation_history.sql
--
-- Makes the introducer board's existing promise true.
--
-- THE DEFECT. introducer_owner_projection() documents itself as returning "status + valuation
-- movement, never content", and returns valuation_gap / valuation_today / readiness / valuation_at
-- joined from business_valuations — a table with a UNIQUE index on user_id, written only by an
-- upsert in /api/onboarding/complete. One row, overwritten in place. valuation_at is v.updated_at,
-- which tells an introducer WHEN the number last changed and never WHAT IT CHANGED FROM. Two visits
-- three months apart show different figures with no way to know it moved, by how much, or in which
-- direction. A live feature makes a claim the schema cannot support, and the movement column is the
-- entire reason a broker comes back.
--
-- WHY ADDITIVE, NOT A CONVERSION. Six callers read business_valuations expecting exactly one row
-- per user (.maybeSingle(), .in(userIds)). Making it append-only would break every one of them.
-- So business_valuations stays the CURRENT row and this adds the time series beside it.
--
-- WHY MODEL VERSION AND INPUTS TRAVEL WITH EVERY SNAPSHOT. There is a deliberate note in
-- lib/valuation/model.ts that re-weighting the model is unsafe because it "would re-price
-- valuations already shown to people". With history that gets worse, not better: a weight change
-- would retroactively rewrite everyone's climb. A snapshot that records the inputs AND the code
-- version that read them can be recomputed and defended years later, when a buyer's advisor asks
-- how the number was derived. Without them the series is decoration.
--
-- Design: VALUATION_LOOP.md §4.1 + decision D5. Idempotent.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The time series
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS business_valuation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- What produced this row. Without these two the series cannot be recomputed or defended.
  model_version TEXT NOT NULL,
  inputs JSONB NOT NULL,

  -- Why it exists, so a corrected baseline is never mistaken for a regression. 'onboarding' is the
  -- first point; 'weekly' is the scheduled re-score; 'verification' is an adapter connecting and
  -- CORRECTING self-reported figures (which legitimately moves the number down); 'manual' is an
  -- operator action; 'backfill' is a row reconstructed from business_valuations by this migration.
  source TEXT NOT NULL CHECK (source IN ('onboarding','weekly','verification','manual','backfill')),

  currency TEXT NOT NULL DEFAULT 'USD',
  gap NUMERIC,
  worth_today NUMERIC,
  worth_potential NUMERIC,
  walk_away NUMERIC,
  sde_multiple NUMERIC,

  -- The VALUATION-BEARING track. Moves only on an owner-confirmed factor change, so it is coarse
  -- and steps rarely. This is the number a buyer can be shown (VALUATION_LOOP.md §8).
  readiness NUMERIC,
  -- The per-client ceiling: 85 + that client's own growth contribution, since growth is
  -- capturable:false in the model and is measured rather than improved. Recorded per snapshot
  -- because it MOVES when their trends change — a falling ceiling narrows the gap without any
  -- sellability work changing, and that must be visible rather than silent.
  readiness_potential NUMERIC,

  -- The OBJECTIVE track (0-100). Moves weekly on evidence, shows how close the next confirmation
  -- is, and never touches the valuation. Nullable until the admission-test machinery lands
  -- (ADMISSION_TESTS.md) — the column exists now so the series is continuous when it does.
  progress NUMERIC,

  -- Why this snapshot differs from the last, in the owner's words, e.g. "you delegated supplier
  -- chasing". A step with no reason attached reads as the number wobbling on its own.
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The only access pattern: one owner's series, newest first.
CREATE INDEX IF NOT EXISTS business_valuation_snapshots_user_time
  ON business_valuation_snapshots (user_id, captured_at DESC);

ALTER TABLE business_valuation_snapshots ENABLE ROW LEVEL SECURITY;

-- Same bridge as the parent table: an owner reads their own history, nobody else does. Introducers
-- reach it ONLY through introducer_owner_projection() below, which is SECURITY DEFINER and returns
-- movement rather than rows.
DROP POLICY IF EXISTS business_valuation_snapshots_select_own ON business_valuation_snapshots;
CREATE POLICY business_valuation_snapshots_select_own ON business_valuation_snapshots
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

COMMENT ON TABLE business_valuation_snapshots IS
  'Append-only valuation history. business_valuations holds the CURRENT row; this holds the series. Every row carries model_version + inputs so it can be recomputed and defended later.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill — every existing owner gets their baseline point
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Without this the board has a current number and no origin, which is the same hole it has today.
-- created_at (not updated_at) is the honest capture time for a row written at onboarding.
-- Guarded so re-running the migration cannot duplicate anyone's baseline.

INSERT INTO business_valuation_snapshots (
  user_id, captured_at, model_version, inputs, source, currency,
  gap, worth_today, worth_potential, walk_away, sde_multiple, readiness
)
SELECT
  v.user_id, v.created_at, 'pre-versioning', v.inputs, 'backfill', v.currency,
  v.gap, v.worth_today, v.worth_potential, v.walk_away, v.sde_multiple, v.readiness
FROM business_valuations v
WHERE NOT EXISTS (
  SELECT 1 FROM business_valuation_snapshots s WHERE s.user_id = v.user_id
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. The projection now returns MOVEMENT, which is what it always claimed
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Return type changes, so this is a DROP + CREATE rather than CREATE OR REPLACE.
-- The existing columns are unchanged and keep their meaning; the baseline columns are added.
-- Still status and movement only — never content.

DROP FUNCTION IF EXISTS introducer_owner_projection(UUID);

CREATE FUNCTION introducer_owner_projection(p_introducer_id UUID)
RETURNS TABLE (
  introduction_id     UUID,
  status              TEXT,
  first_touch_at      TIMESTAMPTZ,
  owner_label         TEXT,
  owner_since         TIMESTAMPTZ,
  valuation_gap       NUMERIC,
  valuation_today     NUMERIC,
  readiness           NUMERIC,
  valuation_at        TIMESTAMPTZ,
  -- Added: where they started, so "movement" is a difference rather than a bare figure.
  baseline_gap        NUMERIC,
  baseline_today      NUMERIC,
  baseline_readiness  NUMERIC,
  baseline_at         TIMESTAMPTZ,
  readiness_potential NUMERIC,
  snapshot_count      INTEGER
) AS $$
  WITH baseline AS (
    SELECT DISTINCT ON (user_id)
      user_id, gap, worth_today, readiness, captured_at
    FROM business_valuation_snapshots
    ORDER BY user_id, captured_at ASC
  ),
  latest AS (
    SELECT DISTINCT ON (user_id)
      user_id, readiness_potential, captured_at
    FROM business_valuation_snapshots
    ORDER BY user_id, captured_at DESC
  ),
  counts AS (
    SELECT user_id, COUNT(*)::INTEGER AS n
    FROM business_valuation_snapshots
    GROUP BY user_id
  )
  SELECT
    i.id,
    i.status,
    i.first_touch_at,
    -- A recognisable label, not a contact record: first name + the initial of the last.
    COALESCE(
      NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || LEFT(COALESCE(u.last_name, ''), 1)), ''),
      SPLIT_PART(COALESCE(u.email, i.prospect_email, ''), '@', 1)
    ),
    u.created_at,
    v.gap,
    v.worth_today,
    v.readiness,
    -- Prefer the latest SNAPSHOT time: it is when the number was actually taken, whereas
    -- v.updated_at moves whenever the current row is touched for any reason.
    COALESCE(l.captured_at, v.updated_at),
    b.gap,
    b.worth_today,
    b.readiness,
    b.captured_at,
    l.readiness_potential,
    COALESCE(c.n, 0)
  FROM introductions i
  LEFT JOIN users u ON u.id = i.owner_user_id
  LEFT JOIN business_valuations v ON v.user_id = i.owner_user_id
  LEFT JOIN baseline b ON b.user_id = i.owner_user_id
  LEFT JOIN latest   l ON l.user_id = i.owner_user_id
  LEFT JOIN counts   c ON c.user_id = i.owner_user_id
  WHERE i.introducer_id = p_introducer_id
  ORDER BY i.first_touch_at DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION introducer_owner_projection IS
  'The ONLY sanctioned read path from an introducer to their owners. Returns status + valuation MOVEMENT (baseline vs current, from business_valuation_snapshots), never content. Pass the introducer id resolved from a verified session.';

REVOKE ALL ON FUNCTION introducer_owner_projection(UUID) FROM PUBLIC, anon, authenticated;
