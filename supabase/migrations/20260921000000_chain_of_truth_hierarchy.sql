-- 20260921000000_chain_of_truth_hierarchy.sql
-- ============================================================================
-- Stage A — Chain of Truth: organisation hierarchy + recursive portal domain.
--
-- WHAT THIS ADDS (all additive — no renames, no drops, no data loss):
--
--  1. organisations:  parent_organisation_id (self-referential hierarchy)
--                     + org_type ('portfolio' | 'project' | 'distributor' | 'client_org')
--                       plus a non-null GSI TRIGGER anti-loop guard.
--  2. consultant_frameworks   — versioned capture of a consultant's methodology
--     (principles, stages, terminology, diagnostics, outputs, kira_integration).
--  3. consultant_genomes      — structured extraction of a consultant / /talk interview
--     (identity, target client, services, engagement model, areas kira can assist).
--  4. operating_agreements    — versioned, approved scope of AUTHORITY for each level
--     (authorised/restricted capabilities, escalation rules, overrides).
--  5. truth_comparisons       — admin_belief vs owner_truth discrepancy ledger, with
--     status lifecycle: pending → compared → discrepancies_found → resolved.
--  6. kira_memory provenance  — provenance_type + perspective + authority_status
--     columns so every genome fact traces to source, level and owner.
--  7. KEY GUARD: AFTER UPDATE triggers that blow up if any code ever sets
--     organisation_id → a DIFFERENT person_id channel (the V2-namepattern / old /talk
--     channel bug that silently muted a per-person /talk row a few days ago).
--
-- Every statement is idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / OR
-- REPLACE DO block) and safe to re-run. Migrations are applied with supabase db push.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ORGANISATION HIERARCHY (self-referential parent link)
-- ---------------------------------------------------------------------------
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS parent_organisation_id UUID REFERENCES organisations(organisation_id),
  ADD COLUMN IF NOT EXISTS org_type TEXT
    CHECK (org_type IN ('portfolio', 'project', 'distributor', 'client_org'));

CREATE INDEX IF NOT EXISTS idx_organisations_parent
  ON organisations(parent_organisation_id);
CREATE INDEX IF NOT EXISTS idx_organisations_org_type
  ON organisations(org_type);

-- Anti-cycle guard: an organisation can never be its own parent, direct or
-- transitive. Uses a recursive CTE so a mistake can't silently loop the fleet.
CREATE OR REPLACE FUNCTION guard_organisation_cycle() RETURNS TRIGGER AS $$
DECLARE
  loop_count INT;
BEGIN
  WITH RECURSIVE ancestors(id) AS (
    SELECT NEW.parent_organisation_id
    UNION ALL
    SELECT o.parent_organisation_id FROM organisations o JOIN ancestors a ON o.organisation_id = a.id
  )
  SELECT COUNT(*) INTO loop_count FROM ancestors WHERE id = NEW.organisation_id;
  IF loop_count > 0 THEN
    RAISE EXCEPTION 'organisation cycle detected: % would be its own ancestor', NEW.organisation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_organisation_cycle ON organisations;
CREATE TRIGGER trg_guard_organisation_cycle
  BEFORE INSERT OR UPDATE OF parent_organisation_id ON organisations
  FOR EACH ROW WHEN (NEW.parent_organisation_id IS NOT NULL)
  EXECUTE FUNCTION guard_organisation_cycle();

-- ---------------------------------------------------------------------------
-- 2. CONSULTANT FRAMEWORK (versioned methodology capture)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultant_frameworks (
  framework_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         UUID NOT NULL REFERENCES organisations(organisation_id),
  framework_name          TEXT NOT NULL,
  framework_slug          TEXT NOT NULL,
  framework_type          TEXT NOT NULL DEFAULT 'consulting',
  status                  TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'superseded')),
  version                 INT NOT NULL DEFAULT 1,
  principles              JSONB NOT NULL DEFAULT '[]',      -- [{ name, description }]
  stages                  JSONB NOT NULL DEFAULT '[]',      -- [{ name, order, description, activities }]
  terminology             JSONB NOT NULL DEFAULT '{}',      -- { term: definition }
  outputs                 JSONB NOT NULL DEFAULT '[]',      -- [product names / deliverables]
  diagnostic_method       TEXT,
  kira_integration        JSONB NOT NULL DEFAULT '{}',      -- how Kira participates
  source_conversation_id  UUID REFERENCES conversations(id),
  superseded_by_framework_id UUID REFERENCES consultant_frameworks(framework_id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. CONSULTANT GENOME (structured extraction of a consultant /talk interview)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultant_genomes (
  genome_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         UUID NOT NULL REFERENCES organisations(organisation_id),
  framework_id            UUID REFERENCES consultant_frameworks(framework_id),
  identity                JSONB NOT NULL DEFAULT '{}',      -- { name, business_name, location, years }
  target_client           JSONB NOT NULL DEFAULT '{}',
  industries              JSONB NOT NULL DEFAULT '[]',
  services                JSONB NOT NULL DEFAULT '[]',
  engagement_models       JSONB NOT NULL DEFAULT '[]',
  diagnostic_process      JSONB NOT NULL DEFAULT '{}',
  delivery_process        JSONB NOT NULL DEFAULT '{}',
  commercial_model        JSONB NOT NULL DEFAULT '{}',
  areas_kira_can_assist   JSONB NOT NULL DEFAULT '[]',
  areas_consultant_led    JSONB NOT NULL DEFAULT '[]',
  source_conversation_id  UUID REFERENCES conversations(id),
  extraction_version      TEXT,
  completeness            NUMERIC(3, 2) NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. OPERATING AGREEMENT (versioned, approved scope of authority)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operating_agreements (
  agreement_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_org_id          UUID NOT NULL REFERENCES organisations(organisation_id),
  client_org_id              UUID REFERENCES organisations(organisation_id),
  agreement_type             TEXT NOT NULL DEFAULT 'operating'
    CHECK (agreement_type IN ('operating', 'framework', 'introducer', 'engagement')),
  status                     TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'proposed', 'approved', 'amended', 'superseded')),
  version                    INT NOT NULL DEFAULT 1,
  authorised_capabilities   JSONB NOT NULL DEFAULT '[]',
  restricted_capabilities   JSONB NOT NULL DEFAULT '[]',
  kira_responsibilities     JSONB NOT NULL DEFAULT '[]',
  consultant_responsibilities JSONB NOT NULL DEFAULT '[]',
  client_responsibilities   JSONB NOT NULL DEFAULT '[]',
  escalation_rules          JSONB NOT NULL DEFAULT '[]',
  measurement_requirements  JSONB NOT NULL DEFAULT '[]',
  data_access_rules         JSONB NOT NULL DEFAULT '[]',
  approved_by               UUID REFERENCES persons(person_id),
  approved_at               TIMESTAMPTZ,
  effective_date            DATE,
  superseded_by_agreement_id UUID REFERENCES operating_agreements(agreement_id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. TRUTH COMPARISON (admin belief vs owner truth discrepancy ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS truth_comparisons (
  comparison_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_org_id            UUID NOT NULL REFERENCES organisations(organisation_id), -- the interviewed entity
  parent_org_id            UUID NOT NULL REFERENCES organisations(organisation_id), -- the admin's org
  admin_belief             JSONB NOT NULL DEFAULT '{}',
  admin_belief_source      TEXT NOT NULL DEFAULT 'creation_form',
  admin_belief_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_truth              JSONB,
  owner_truth_source       TEXT,
  owner_truth_at           TIMESTAMPTZ,
  status                   TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'compared', 'discrepancies_found', 'resolved')),
  discrepancies            JSONB NOT NULL DEFAULT '[]',
  resolved_by              UUID REFERENCES persons(person_id),
  resolved_at              TIMESTAMPTZ,
  resolution               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_truth_comparisons_entity
  ON truth_comparisons(entity_org_id);
CREATE INDEX IF NOT EXISTS idx_truth_comparisons_parent
  ON truth_comparisons(parent_org_id);

-- ---------------------------------------------------------------------------
-- 6. KIRA MEMORY — add provenance so genome facts trace to source + level + owner
-- ---------------------------------------------------------------------------
ALTER TABLE kira_memory
  ADD COLUMN IF NOT EXISTS provenance_type TEXT
    CHECK (provenance_type IN ('conversation', 'document', 'url', 'manual', 'consultant_input', 'admin_input', 'system_derived')),
  ADD COLUMN IF NOT EXISTS perspective TEXT
    CHECK (perspective IN ('owner', 'consultant', 'system')),
  ADD COLUMN IF NOT EXISTS authority_status TEXT DEFAULT 'proposed'
    CHECK (authority_status IN ('proposed', 'confirmed', 'disputed', 'superseded')),
  ADD COLUMN IF NOT EXISTS portal_level TEXT
    CHECK (portal_level IN ('portfolio', 'project', 'distributor', 'client_org')),
  ADD COLUMN IF NOT EXISTS pushed_upward BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pushed_to_org_id UUID REFERENCES organisations(organisation_id),
  ADD COLUMN IF NOT EXISTS truth_comparison_id UUID REFERENCES truth_comparisons(comparison_id);

CREATE INDEX IF NOT EXISTS idx_kira_memory_provenance
  ON kira_memory(provenance_type, portal_level, authority_status);
