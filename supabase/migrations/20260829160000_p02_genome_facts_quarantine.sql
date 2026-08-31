-- ============================================================================
-- P0.2: Genome Facts Quarantine
-- ============================================================================
-- Quarantines 79 genome_facts rows that lack organisational context:
--   41 ORPHAN/UNRESOLVED — real owner 1e2a34bd-..., no membership path,
--     referenced genome_entities are also NULL-org. Organisation cannot be resolved.
--   38 SENTINEL/TEST — synthetic user_ids (0000...01, 0000...02), no production
--     identity or organisational membership.
--
-- Does NOT assign any organisation_id. Does NOT create any holding organisation.
-- All original identifiers, provenance, content, timestamps preserved.
-- Transactional and reversible (quarantine columns can be NULLed to undo).
--
-- Migration Version: 20260829160000
-- ============================================================================

BEGIN;

-- 1. Add quarantine metadata columns (idempotent)
ALTER TABLE genome_facts ADD COLUMN IF NOT EXISTS quarantine_status TEXT;
ALTER TABLE genome_facts ADD COLUMN IF NOT EXISTS quarantine_reason TEXT;
ALTER TABLE genome_facts ADD COLUMN IF NOT EXISTS quarantined_at TIMESTAMPTZ;

-- 2. Capture the candidate sets BEFORE mutating, so the validation asserts what
--    this migration actually touched rather than a prod-only historical snapshot.
--    On a clean database both candidate counts are 0 and the migration is a no-op.
SELECT count(*) AS n INTO TEMP TABLE _quarantine_candidates_orphan
  FROM genome_facts
 WHERE user_id = '1e2a34bd-2ab0-4a8a-8182-305b4ab29e5f'
   AND organisation_id IS NULL;

SELECT count(*) AS n INTO TEMP TABLE _quarantine_candidates_sentinel
  FROM genome_facts
 WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
   AND organisation_id IS NULL;

-- 3. Quarantine ORPHAN/UNRESOLVED rows (any that still exist — no hard-coded count)
UPDATE genome_facts
SET quarantine_status = 'ORPHAN_UNRESOLVED',
    quarantine_reason = 'No Person to Organisation membership could be established for user_id 1e2a34bd-2ab0-4a8a-8182-305b4ab29e5f. Referenced genome_entities are also NULL-org. Organisation cannot be resolved.',
    quarantined_at = NOW()
WHERE user_id = '1e2a34bd-2ab0-4a8a-8182-305b4ab29e5f'
  AND organisation_id IS NULL;

-- 4. Quarantine SENTINEL/TEST rows (any that still exist — no hard-coded count)
UPDATE genome_facts
SET quarantine_status = 'SENTINEL_TEST',
    quarantine_reason = 'Synthetic test/seed user. No production identity or organisational membership.',
    quarantined_at = NOW()
WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
  AND organisation_id IS NULL;

-- 5. Audit ledger — record what was actually quarantined, never a fabricated count.
--    gen_random_uuid() is retained as source_record_id for ledger-uniqueness only; the
--    authoritative per-row record is the row's own quarantine columns.
INSERT INTO migration_ledger (
  legacy_user_id, canonical_person_id, canonical_organisation_id,
  source_table, source_record_id, migration_phase,
  resolution_status, resolution_method, resolution_reason,
  notes, migration_timestamp
)
SELECT
  '1e2a34bd-2ab0-4a8a-8182-305b4ab29e5f', NULL, NULL,
  'genome_facts', gen_random_uuid(), 'genome-quarantine',
  'orphan_unresolved', 'quarantine-no-membership-path',
  'No Person to Organisation membership established. Referenced genome_entities also NULL-org.',
  'genome_facts orphan rows quarantined per current database state.',
  NOW()
WHERE (SELECT n FROM _quarantine_candidates_orphan) > 0;

INSERT INTO migration_ledger (
  legacy_user_id, canonical_person_id, canonical_organisation_id,
  source_table, source_record_id, migration_phase,
  resolution_status, resolution_method, resolution_reason,
  notes, migration_timestamp
)
SELECT
  '00000000-0000-0000-0000-000000000001', NULL, NULL,
  'genome_facts', gen_random_uuid(), 'genome-quarantine',
  'sentinel_test', 'quarantine-sentinel',
  'Synthetic test/seed user. No production identity or organisational membership.',
  'genome_facts sentinel rows quarantined per current database state.',
  NOW()
FROM (SELECT 1) u
WHERE (SELECT n FROM _quarantine_candidates_sentinel) > 0;

-- 6. Validation — asserts are relative to the candidate sets captured above, so
--    the migration replays cleanly on an empty database AND still enforces the
--    invariant on the populated database it was originally written against.
DO $$
DECLARE
  v_orphan       INT;
  v_sentinel     INT;
  v_quarantined  INT;
  v_fab_org      INT;
  v_cand_orphan  INT;
  v_cand_sentinel INT;
BEGIN
  SELECT COALESCE(n, 0) INTO v_cand_orphan    FROM _quarantine_candidates_orphan;
  SELECT COALESCE(n, 0) INTO v_cand_sentinel  FROM _quarantine_candidates_sentinel;

  SELECT count(*) INTO v_orphan      FROM genome_facts WHERE quarantine_status = 'ORPHAN_UNRESOLVED';
  SELECT count(*) INTO v_sentinel    FROM genome_facts WHERE quarantine_status = 'SENTINEL_TEST';
  SELECT count(*) INTO v_quarantined FROM genome_facts WHERE quarantine_status IS NOT NULL;
  SELECT count(*) INTO v_fab_org     FROM genome_facts WHERE quarantine_status IS NOT NULL AND organisation_id IS NOT NULL;

  -- Every candidate found up front must have been quarantined by this migration.
  ASSERT v_orphan     = v_cand_orphan,     'ORPHAN expected '   || v_cand_orphan   || ', got ' || v_orphan;
  ASSERT v_sentinel   = v_cand_sentinel,   'SENTINEL expected ' || v_cand_sentinel || ', got ' || v_sentinel;
  ASSERT v_quarantined = v_cand_orphan + v_cand_sentinel,
         'Total quarantined expected ' || (v_cand_orphan + v_cand_sentinel) || ', got ' || v_quarantined;
  ASSERT v_fab_org    = 0,                'Fabricated org assignments expected 0, got ' || v_fab_org;

  RAISE NOTICE 'P0.2 quarantine validated: orphan=% sentinel=% quarantined=% fabricated_org=% candidates(orphan=%, sentinel=%)',
    v_orphan, v_sentinel, v_quarantined, v_fab_org, v_cand_orphan, v_cand_sentinel;
END $$;

COMMIT;
