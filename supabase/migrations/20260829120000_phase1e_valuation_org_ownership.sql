-- Phase 1E: rebind business_valuations ownership constraint + SQL functions from person scope
-- to organisation scope.
--
-- The canonical knowledge model made organisation_id the ownership/scope key and the P2.4-B
-- decision confirmed the Business Valuation is Organisation-owned. The legacy unique index
-- business_valuations_user_uniq (UNIQUE on user_id) enforced ONE VALUATION PER PERSON — the exact
-- ownership semantic this phase dismantles — and application code already targets the canonical
-- shape via `onConflict: 'organisation_id'` in /api/onboarding/complete and /api/valuation/claim.
-- Those two architectures cannot coexist: Postgres rejects an upsert conflict target that no unique
-- index supports.

DROP INDEX IF EXISTS business_valuations_user_uniq;
ALTER TABLE business_valuations
  ADD CONSTRAINT business_valuations_org_uniq UNIQUE (organisation_id);

-- ---------------------------------------------------------------------------
-- introducer_owner_projection: rebind from person-keyed to organisation-keyed
-- ---------------------------------------------------------------------------
-- The function (recreated with movement columns in 20260727120000_valuation_history.sql) joined the
-- valuation line and the snapshot CTEs on i.owner_user_id — a person-scoped ownership read under a
-- SECURITY DEFINER, i.e. a legacy semantic dependency that the org model must not let survive.
-- Rebound here: valuation + baseline/latest/counts all resolve through the Organisation, using the
-- introductions.organisation_id added in the Phase 1B migration. The `users` join and owner_label
-- remain person-keyed deliberately — a person's name is genuine person identity (provenance), not
-- valuation ownership.

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
  -- Where they started, so "movement" is a difference rather than a bare figure.
  baseline_gap        NUMERIC,
  baseline_today      NUMERIC,
  baseline_readiness  NUMERIC,
  baseline_at         TIMESTAMPTZ,
  readiness_potential NUMERIC,
  snapshot_count      INTEGER
) AS $$
  WITH baseline AS (
    SELECT DISTINCT ON (organisation_id)
      organisation_id, gap, worth_today, readiness, captured_at
    FROM business_valuation_snapshots
    ORDER BY organisation_id, captured_at ASC
  ),
  latest AS (
    SELECT DISTINCT ON (organisation_id)
      organisation_id, readiness_potential, captured_at
    FROM business_valuation_snapshots
    ORDER BY organisation_id, captured_at DESC
  ),
  counts AS (
    SELECT organisation_id, COUNT(*)::INTEGER AS n
    FROM business_valuation_snapshots
    GROUP BY organisation_id
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
  LEFT JOIN business_valuations v ON v.organisation_id = i.organisation_id
  LEFT JOIN baseline b ON b.organisation_id = i.organisation_id
  LEFT JOIN latest   l ON l.organisation_id = i.organisation_id
  LEFT JOIN counts   c ON c.organisation_id = i.organisation_id
  WHERE i.introducer_id = p_introducer_id
  ORDER BY i.first_touch_at DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION introducer_owner_projection IS
  'The ONLY sanctioned read path from an introducer to their owners. Returns status + valuation MOVEMENT (baseline vs current, from business_valuation_snapshots), never content. ORGANISATION-scoped since Phase 1E: valuation + snapshots resolve through i.organisation_id; only the owner name-label remains person-keyed. Pass the introducer id resolved from a verified session.';

REVOKE ALL ON FUNCTION introducer_owner_projection(UUID) FROM PUBLIC, anon, authenticated;