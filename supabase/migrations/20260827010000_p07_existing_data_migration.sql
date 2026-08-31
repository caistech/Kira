-- ============================================================================
-- P0.7.5: EXISTING DATA MIGRATION
-- ============================================================================
-- PURPOSE
--   Migrate existing legacy knowledge into the canonical knowledge/evidence
--   architecture without inventing fields that do not exist in the legacy
--   schema and without falsely asserting provenance.
--
-- GOVERNING PRINCIPLES
--   1. Promote, don't relabel.
--   2. kira_knowledge is raw source material -> evidence.
--   3. genome_entities / genome_facts are structured legacy genome records.
--   4. Legacy genome records are migrated only where a reliable
--      user_id -> organisation_id mapping exists.
--   5. Never fabricate provenance.
--   6. Never use organisation_id = user_id as an assumed identity mapping.
--   7. Migration is idempotent.
--
-- IMPORTANT
--   This migration assumes the following canonical tables already exist:
--
--     organisations
--     organisational_knowledge
--     evidence
--     knowledge_evidence_links
--     promotion_rules
--     migration_ledger
--
--   It also assumes the legacy tables use the schema established by the
--   existing Kira Genome implementation:
--
--     genome_entities:
--       id, user_id, area_key, entity_type, name, status, confidence,
--       source_type, source_id, source_reference, observed_at, created_at,
--       updated_at, confirmed_at, superseded_at, supersedes
--
--     genome_facts:
--       id, user_id, entity_id, area_key, subject, predicate, value,
--       value_type, unit, status, confidence, source_type, source_id,
--       source_reference, observed_at, created_at, updated_at, confirmed_at,
--       valid_from, valid_to, superseded_at, supersedes
--
--     kira_knowledge:
--       existing legacy RAG/source-material table.
--
-- ============================================================================
-- STEP 0 — SAFETY / PRE-FLIGHT
-- ============================================================================

DO $$
BEGIN

    IF to_regclass('public.organisations') IS NULL THEN
        RAISE EXCEPTION
            'P0.7.5 aborted: public.organisations does not exist';
    END IF;

    IF to_regclass('public.organisational_knowledge') IS NULL THEN
        RAISE EXCEPTION
            'P0.7.5 aborted: public.organisational_knowledge does not exist';
    END IF;

    IF to_regclass('public.evidence') IS NULL THEN
        RAISE EXCEPTION
            'P0.7.5 aborted: public.evidence does not exist';
    END IF;

    IF to_regclass('public.knowledge_evidence_links') IS NULL THEN
        RAISE EXCEPTION
            'P0.7.5 aborted: public.knowledge_evidence_links does not exist';
    END IF;

END $$;


-- ============================================================================
-- STEP 1 — BUILD LEGACY USER → ORGANISATION RESOLUTION
-- ============================================================================
--
-- DO NOT assume:
--
--     organisations.organisation_id = users.id
--
-- The canonical migration architecture explicitly requires an identity
-- resolution layer between legacy users and canonical organisations.
--
-- If the project already has a canonical membership/identity mapping, use it.
--
-- The migration below discovers a mapping from organisation_memberships where
-- available. It deliberately does NOT create an organisation when no reliable
-- mapping exists.
--
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS _p075_user_organisation_map (
    user_id UUID PRIMARY KEY,
    organisation_id UUID NOT NULL
) ON COMMIT DROP;


-- ---------------------------------------------------------------------------
-- Preferred mapping: canonical organisation membership
-- ---------------------------------------------------------------------------

DO $$
BEGIN

    IF to_regclass('public.organisation_memberships') IS NOT NULL THEN

        INSERT INTO _p075_user_organisation_map (
            user_id,
            organisation_id
        )
        SELECT
            om.person_id,
            om.organisation_id
        FROM organisation_memberships om
        WHERE om.person_id IS NOT NULL
          AND om.organisation_id IS NOT NULL
        ON CONFLICT (user_id) DO NOTHING;

    END IF;

END $$;


-- ---------------------------------------------------------------------------
-- Optional legacy mapping through auth_credentials/persons
--
-- Only used where those canonical tables actually exist.
-- ---------------------------------------------------------------------------

DO $$
BEGIN

    IF to_regclass('public.auth_credentials') IS NOT NULL
       AND to_regclass('public.persons') IS NOT NULL
       AND to_regclass('public.organisation_memberships') IS NOT NULL THEN

        INSERT INTO _p075_user_organisation_map (
            user_id,
            organisation_id
        )
        SELECT DISTINCT
            ac.auth_user_id::UUID as user_id,
            om.organisation_id
        FROM auth_credentials ac
        JOIN persons p
          ON p.person_id = ac.person_id
        JOIN organisation_memberships om
          ON om.person_id = p.person_id
        WHERE ac.auth_user_id IS NOT NULL
          AND om.organisation_id IS NOT NULL
        ON CONFLICT (user_id) DO NOTHING;

    END IF;

END $$;


-- ============================================================================
-- STEP 2 — MIGRATE LEGACY GENOME ENTITIES
-- ============================================================================
--
-- genome_entities does NOT contain:
--
--   subject
--   predicate
--   object
--   description
--   severity
--   supplied_by
--   engagement_id
--   kira_instance_id
--
-- Therefore the entity is represented as an organisational knowledge object
-- using its actual fields.
--
-- The entity's name becomes the object/value.
--
-- Example:
--
--   entity_type = 'customer'
--   name        = 'ABC Plumbing'
--
-- becomes conceptually:
--
--   subject   = 'customer'
--   predicate = 'is'
--   object    = 'ABC Plumbing'
--
-- Provenance remains explicitly legacy-genome provenance.
--
-- ============================================================================

INSERT INTO organisational_knowledge (
    organisation_id,
    knowledge_type,
    subject,
    predicate,
    object,
    epistemic_state,
    confidence,
    effective_from,
    is_current,
    source_type,
    supplied_at,
    created_at
)
SELECT
    m.organisation_id,

    'fact',

    ge.entity_type,

    'is',

    ge.name,

    CASE ge.status
        WHEN 'confirmed' THEN 'validated'
        WHEN 'observed' THEN 'observed'
        WHEN 'contradicted' THEN 'disputed'
        WHEN 'superseded' THEN 'superseded'
        WHEN 'rejected' THEN 'disputed'
        ELSE 'asserted'
    END,

    COALESCE(ge.confidence, 0.5),

    COALESCE(ge.observed_at, ge.created_at),

    CASE
        WHEN ge.status IN ('superseded', 'rejected', 'contradicted')
            THEN FALSE
        ELSE TRUE
    END,

    'legacy_genome_entity',

    COALESCE(ge.observed_at, ge.created_at),

    ge.created_at

FROM genome_entities ge

JOIN _p075_user_organisation_map m
  ON m.user_id = ge.user_id

WHERE NOT EXISTS (
    SELECT 1
    FROM organisational_knowledge ok
    WHERE ok.organisation_id = m.organisation_id
      AND ok.knowledge_type = 'fact'
      AND ok.subject = ge.entity_type
      AND ok.predicate = 'is'
      AND ok.object = ge.name
);


-- ============================================================================
-- STEP 3 — MIGRATE LEGACY GENOME FACTS
-- ============================================================================
--
-- genome_facts uses:
--
--   subject
--   predicate
--   value
--
-- It does NOT use an "object" column.
--
-- Therefore value becomes the canonical object representation.
--
-- ============================================================================

INSERT INTO organisational_knowledge (
    organisation_id,
    knowledge_type,
    subject,
    predicate,
    object,
    epistemic_state,
    confidence,
    effective_from,
    is_current,
    source_type,
    supplied_at,
    created_at
)
SELECT
    m.organisation_id,

    'fact',

    gf.subject,

    gf.predicate,

    gf.value,

    CASE gf.status
        WHEN 'confirmed' THEN 'validated'
        WHEN 'observed' THEN 'observed'
        WHEN 'contradicted' THEN 'disputed'
        WHEN 'superseded' THEN 'superseded'
        WHEN 'rejected' THEN 'disputed'
        ELSE 'asserted'
    END,

    COALESCE(gf.confidence, 0.5),

    COALESCE(
        gf.valid_from,
        gf.observed_at,
        gf.created_at
    ),

    CASE
        WHEN gf.status IN ('superseded', 'rejected', 'contradicted')
            THEN FALSE
        ELSE TRUE
    END,

    'legacy_genome_fact',

    COALESCE(gf.observed_at, gf.created_at),

    gf.created_at

FROM genome_facts gf

JOIN _p075_user_organisation_map m
  ON m.user_id = gf.user_id

WHERE NOT EXISTS (
    SELECT 1
    FROM organisational_knowledge ok
    WHERE ok.organisation_id = m.organisation_id
      AND ok.knowledge_type = 'fact'
      AND ok.subject = gf.subject
      AND ok.predicate = gf.predicate
      AND ok.object = gf.value
);


-- ============================================================================
-- STEP 4 — MIGRATE kira_knowledge → evidence
-- ============================================================================
--
-- IMPORTANT:
--
-- kira_knowledge is raw source material.
--
-- It must NOT be promoted directly into organisational knowledge.
--
-- The canonical model explicitly separates:
--
--     interaction/source
--            ↓
--         evidence
--            ↓
--       governed knowledge
--
-- We therefore preserve the legacy record as evidence.
--
-- Because the exact kira_knowledge schema may vary between historical
-- migrations, this step intentionally uses only columns established by the
-- existing implementation where available.
--
-- ============================================================================

INSERT INTO evidence (
    organisation_id,
    evidence_type,
    title,
    content,
    content_summary,
    source_table,
    source_id,
    captured_at,
    created_at,
    metadata
)
SELECT
    m.organisation_id,

    'conversation',

    kk.title,

    kk.raw_content,

    LEFT(kk.raw_content, 500),

    'kira_knowledge',

    kk.id,

    kk.created_at,

    kk.created_at,

    jsonb_strip_nulls(
        jsonb_build_object(
            'legacy_table', 'kira_knowledge',
            'legacy_record_id', kk.id,
            'chunk_index',
                CASE
                    WHEN to_jsonb(kk) ? 'chunk_index'
                    THEN to_jsonb(kk)->>'chunk_index'
                    ELSE NULL
                END,
            'total_chunks',
                CASE
                    WHEN to_jsonb(kk) ? 'total_chunks'
                    THEN to_jsonb(kk)->>'total_chunks'
                    ELSE NULL
                END,
            'model',
                CASE
                    WHEN to_jsonb(kk) ? 'model'
                    THEN to_jsonb(kk)->>'model'
                    ELSE NULL
                END
        )
    )

FROM kira_knowledge kk

JOIN _p075_user_organisation_map m
  ON m.user_id = kk.user_id

WHERE NOT EXISTS (
    SELECT 1
    FROM evidence e
    WHERE e.source_table = 'kira_knowledge'
      AND e.source_id = kk.id
);


-- ============================================================================
-- STEP 5 — DO NOT FABRICATE GENOME → EVIDENCE LINKS
-- ============================================================================
--
-- The previous migration attempted:
--
--     genome record
--          ↓
--     evidence
--
-- by matching timestamps.
--
-- That is unsafe.
--
-- Equal timestamps do NOT prove that a particular piece of evidence produced
-- a particular genome record.
--
-- The actual genome schema contains:
--
--     source_type
--     source_id
--     source_reference
--
-- Therefore links should only be created when source_id can be reliably
-- resolved to an evidence record.
--
-- We handle the known kira_knowledge source explicitly.
--
-- ---------------------------------------------------------------------------
-- GENOME FACTS
-- ---------------------------------------------------------------------------

INSERT INTO knowledge_evidence_links (
    knowledge_id,
    evidence_id,
    link_type,
    confidence
)
SELECT DISTINCT
    ok.knowledge_id,
    e.evidence_id,
    'derived_from',
    1.0

FROM genome_facts gf

JOIN _p075_user_organisation_map m
  ON m.user_id = gf.user_id

JOIN evidence e
  ON e.organisation_id = m.organisation_id
 AND e.source_table = 'kira_knowledge'
 AND e.source_id = gf.source_id

JOIN organisational_knowledge ok
  ON ok.organisation_id = m.organisation_id
 AND ok.knowledge_type = 'fact'
 AND ok.subject = gf.subject
 AND ok.predicate = gf.predicate
 AND ok.object = gf.value

WHERE gf.source_type = 'kira_knowledge'
  AND gf.source_id IS NOT NULL

  AND NOT EXISTS (
      SELECT 1
      FROM knowledge_evidence_links kel
      WHERE kel.knowledge_id = ok.knowledge_id
        AND kel.evidence_id = e.evidence_id
  );


-- ---------------------------------------------------------------------------
-- GENOME ENTITIES
--
-- Same rule: only create a provenance link when source_type/source_id gives
-- us an actual evidence identity.
-- ---------------------------------------------------------------------------

INSERT INTO knowledge_evidence_links (
    knowledge_id,
    evidence_id,
    link_type,
    confidence
)
SELECT DISTINCT
    ok.knowledge_id,
    e.evidence_id,
    'derived_from',
    1.0

FROM genome_entities ge

JOIN _p075_user_organisation_map m
  ON m.user_id = ge.user_id

JOIN evidence e
  ON e.organisation_id = m.organisation_id
 AND e.source_table = 'kira_knowledge'
 AND e.source_id = ge.source_id

JOIN organisational_knowledge ok
  ON ok.organisation_id = m.organisation_id
 AND ok.knowledge_type = 'fact'
 AND ok.subject = ge.entity_type
 AND ok.predicate = 'is'
 AND ok.object = ge.name

WHERE ge.source_type = 'kira_knowledge'
  AND ge.source_id IS NOT NULL

  AND NOT EXISTS (
      SELECT 1
      FROM knowledge_evidence_links kel
      WHERE kel.knowledge_id = ok.knowledge_id
        AND kel.evidence_id = e.evidence_id
  );


-- ============================================================================
-- STEP 6 — DEFAULT PROMOTION RULES
-- ============================================================================
--
-- Promotion rules apply to future governed promotion.
--
-- Do not manufacture rules for knowledge types that the actual table rejects.
--
-- Only insert the canonical types already established by the architecture.
--
-- ============================================================================

INSERT INTO promotion_rules (
    organisation_id,
    knowledge_type,
    evidence_type,
    min_confidence,
    auto_promote,
    requires_validation
)
SELECT
    o.organisation_id,
    kt.knowledge_type,
    et.evidence_type,
    0.5,
    FALSE,
    TRUE

FROM organisations o

CROSS JOIN (
    VALUES
        ('fact'),
        ('belief'),
        ('decision'),
        ('relationship'),
        ('capability')
) AS kt(knowledge_type)

CROSS JOIN (
    VALUES
        ('conversation'),
        ('document'),
        ('observation')
) AS et(evidence_type)

WHERE NOT EXISTS (
    SELECT 1
    FROM promotion_rules pr
    WHERE pr.organisation_id = o.organisation_id
      AND pr.knowledge_type = kt.knowledge_type
      AND pr.evidence_type = et.evidence_type
);


-- ============================================================================
-- STEP 7 — MIGRATION LEDGER
-- ============================================================================
--
-- DO NOT create a fake migration record per user using gen_random_uuid().
--
-- The ledger should record actual migrated source records.
--
-- This allows:
--
--     legacy record
--          ↓
--     canonical organisation
--
-- to be audited later.
--
-- Only insert ledger rows for records that were actually resolvable to an
-- organisation.
--
-- ============================================================================

INSERT INTO migration_ledger (
    legacy_user_id,
    canonical_organisation_id,
    source_table,
    source_record_id,
    migration_phase,
    resolution_status,
    resolution_method,
    resolution_reason,
    migration_timestamp
)
SELECT
    ge.user_id,
    m.organisation_id,
    'genome_entities',
    ge.id,
    'P0.7.5',
    'confirmed',
    'canonical_membership_resolution',
    'Legacy genome entity migrated to organisation-scoped organisational knowledge.',
    NOW()

FROM genome_entities ge

JOIN _p075_user_organisation_map m
  ON m.user_id = ge.user_id

WHERE NOT EXISTS (
    SELECT 1
    FROM migration_ledger ml
    WHERE ml.source_table = 'genome_entities'
      AND ml.source_record_id = ge.id
      AND ml.migration_phase = 'P0.7.5'
);


-- ---------------------------------------------------------------------------
-- genome_facts ledger
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (
    legacy_user_id,
    canonical_organisation_id,
    source_table,
    source_record_id,
    migration_phase,
    resolution_status,
    resolution_method,
    resolution_reason,
    migration_timestamp
)
SELECT
    gf.user_id,
    m.organisation_id,
    'genome_facts',
    gf.id,
    'P0.7.5',
    'confirmed',
    'canonical_membership_resolution',
    'Legacy genome fact migrated to organisation-scoped organisational knowledge.',
    NOW()

FROM genome_facts gf

JOIN _p075_user_organisation_map m
  ON m.user_id = gf.user_id

WHERE NOT EXISTS (
    SELECT 1
    FROM migration_ledger ml
    WHERE ml.source_table = 'genome_facts'
      AND ml.source_record_id = gf.id
      AND ml.migration_phase = 'P0.7.5'
);


-- ---------------------------------------------------------------------------
-- kira_knowledge ledger
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (
    legacy_user_id,
    canonical_organisation_id,
    source_table,
    source_record_id,
    migration_phase,
    resolution_status,
    resolution_method,
    resolution_reason,
    migration_timestamp
)
SELECT
    kk.user_id,
    m.organisation_id,
    'kira_knowledge',
    kk.id,
    'P0.7.5',
    'confirmed',
    'canonical_membership_resolution',
    'Legacy kira_knowledge record preserved as evidence.',
    NOW()

FROM kira_knowledge kk

JOIN _p075_user_organisation_map m
  ON m.user_id = kk.user_id

WHERE NOT EXISTS (
    SELECT 1
    FROM migration_ledger ml
    WHERE ml.source_table = 'kira_knowledge'
      AND ml.source_record_id = kk.id
      AND ml.migration_phase = 'P0.7.5'
);


-- ============================================================================
-- STEP 8 — REPORT UNRESOLVED LEGACY DATA
-- ============================================================================
--
-- These records are NOT silently discarded.
--
-- They simply cannot be safely promoted into organisation-scoped canonical
-- data until their organisation identity is resolved.
--
-- ============================================================================

DO $$
DECLARE
    unresolved_entities INTEGER;
    unresolved_facts INTEGER;
    unresolved_knowledge INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO unresolved_entities
    FROM genome_entities ge
    LEFT JOIN _p075_user_organisation_map m
      ON m.user_id = ge.user_id
    WHERE m.user_id IS NULL;

    SELECT COUNT(*)
    INTO unresolved_facts
    FROM genome_facts gf
    LEFT JOIN _p075_user_organisation_map m
      ON m.user_id = gf.user_id
    WHERE m.user_id IS NULL;

    SELECT COUNT(*)
    INTO unresolved_knowledge
    FROM kira_knowledge kk
    LEFT JOIN _p075_user_organisation_map m
      ON m.user_id = kk.user_id
    WHERE m.user_id IS NULL;

    RAISE NOTICE
        'P0.7.5 unresolved legacy records: genome_entities=%, genome_facts=%, kira_knowledge=%',
        unresolved_entities,
        unresolved_facts,
        unresolved_knowledge;

END $$;


-- ============================================================================
-- STEP 9 — VERIFICATION
-- ============================================================================

-- Organisations receiving migrated knowledge
SELECT
    COUNT(*) AS organisational_knowledge_count
FROM organisational_knowledge;


-- Evidence created from legacy kira_knowledge
SELECT
    COUNT(*) AS migrated_evidence_count
FROM evidence
WHERE source_table = 'kira_knowledge';


-- Provenance links
SELECT
    COUNT(*) AS knowledge_evidence_link_count
FROM knowledge_evidence_links;


-- Promotion rules
SELECT
    COUNT(*) AS promotion_rule_count
FROM promotion_rules;


-- ---------------------------------------------------------------------------
-- Check for orphaned canonical knowledge
-- Expected: 0
-- ---------------------------------------------------------------------------

SELECT COUNT(*) AS orphaned_knowledge
FROM organisational_knowledge ok
LEFT JOIN organisations o
  ON o.organisation_id = ok.organisation_id
WHERE o.organisation_id IS NULL;


-- ---------------------------------------------------------------------------
-- Check for duplicate current knowledge
-- Expected: 0
-- ---------------------------------------------------------------------------

SELECT COUNT(*) AS duplicate_current_knowledge
FROM (
    SELECT
        organisation_id,
        knowledge_type,
        subject,
        predicate,
        object,
        COUNT(*) AS duplicate_count
    FROM organisational_knowledge
    WHERE is_current = TRUE
    GROUP BY
        organisation_id,
        knowledge_type,
        subject,
        predicate,
        object
    HAVING COUNT(*) > 1
) duplicates;


-- ---------------------------------------------------------------------------
-- Check migration ledger coverage
-- ---------------------------------------------------------------------------

SELECT
    source_table,
    COUNT(*) AS migrated_records
FROM migration_ledger
WHERE migration_phase = 'P0.7.5'
GROUP BY source_table
ORDER BY source_table;


-- ============================================================================
-- END P0.7.5
-- ============================================================================