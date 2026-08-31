-- Phase 2: Canonical Knowledge Model for the Business Genome.
--
-- Creates the four knowledge primitives:
--   genome_entities      — typed business entities (customers, suppliers, systems, etc.)
--   genome_facts         — structured facts with subject/predicate/value
--   genome_relationships — connections between entities
--   genome_events        — immutable audit trail of how the Genome changed
--
-- These tables are SEPARATE from kira_memory. kira_memory remains the interaction/context
-- memory layer. The Genome is the structured, evolving model of the business.

-- GENOME ENTITIES

CREATE TABLE IF NOT EXISTS genome_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  area_key TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','confirmed','observed','contradicted','superseded','rejected')),
  confidence REAL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source_type TEXT NOT NULL
    CHECK (source_type IN ('conversation','document','system','inferred','owner_input')),
  source_id UUID,
  source_reference TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  supersedes UUID REFERENCES genome_entities(id),
  CONSTRAINT genome_entities_unique_per_user UNIQUE (user_id, entity_type, name)
);

CREATE INDEX IF NOT EXISTS idx_genome_entities_user_area ON genome_entities(user_id, area_key);
CREATE INDEX IF NOT EXISTS idx_genome_entities_user_type ON genome_entities(user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_genome_entities_user_status ON genome_entities(user_id, status);
CREATE INDEX IF NOT EXISTS idx_genome_entities_supersedes ON genome_entities(supersedes) WHERE supersedes IS NOT NULL;

-- GENOME FACTS

CREATE TABLE IF NOT EXISTS genome_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  entity_id UUID REFERENCES genome_entities(id) ON DELETE SET NULL,
  area_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  value TEXT,
  value_type TEXT DEFAULT 'text'
    CHECK (value_type IN ('text','number','boolean','date','money','percentage')),
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','confirmed','observed','contradicted','superseded','rejected')),
  confidence REAL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source_type TEXT NOT NULL
    CHECK (source_type IN ('conversation','document','system','inferred','owner_input')),
  source_id UUID,
  source_reference TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  supersedes UUID REFERENCES genome_facts(id)
);

CREATE INDEX IF NOT EXISTS idx_genome_facts_user_area ON genome_facts(user_id, area_key);
CREATE INDEX IF NOT EXISTS idx_genome_facts_entity ON genome_facts(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_genome_facts_user_status ON genome_facts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_genome_facts_supersedes ON genome_facts(supersedes) WHERE supersedes IS NOT NULL;

-- GENOME RELATIONSHIPS

CREATE TABLE IF NOT EXISTS genome_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subject_entity_id UUID REFERENCES genome_entities(id) ON DELETE CASCADE NOT NULL,
  predicate TEXT NOT NULL,
  object_entity_id UUID REFERENCES genome_entities(id) ON DELETE SET NULL,
  object_value TEXT,
  area_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','confirmed','observed','contradicted','superseded','rejected')),
  confidence REAL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source_type TEXT NOT NULL
    CHECK (source_type IN ('conversation','document','system','inferred','owner_input')),
  source_id UUID,
  source_reference TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  supersedes UUID REFERENCES genome_relationships(id)
);

CREATE INDEX IF NOT EXISTS idx_genome_rels_user_area ON genome_relationships(user_id, area_key);
CREATE INDEX IF NOT EXISTS idx_genome_rels_subject ON genome_relationships(subject_entity_id);
CREATE INDEX IF NOT EXISTS idx_genome_rels_object ON genome_relationships(object_entity_id) WHERE object_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_genome_rels_predicate ON genome_relationships(user_id, predicate);
CREATE INDEX IF NOT EXISTS idx_genome_rels_supersedes ON genome_relationships(supersedes) WHERE supersedes IS NOT NULL;

-- GENOME EVENTS (immutable audit trail)

CREATE TABLE IF NOT EXISTS genome_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'entity_created','entity_confirmed','entity_updated','entity_superseded',
      'entity_contradicted','entity_rejected','entity_removed',
      'fact_created','fact_confirmed','fact_updated','fact_superseded',
      'fact_contradicted','fact_rejected',
      'relationship_created','relationship_confirmed','relationship_removed'
    )),
  entity_id UUID,
  fact_id UUID,
  relationship_id UUID,
  previous_value JSONB,
  new_value JSONB,
  trigger_source TEXT,
  trigger_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_genome_events_user ON genome_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_genome_events_entity ON genome_events(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_genome_events_fact ON genome_events(fact_id) WHERE fact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_genome_events_type ON genome_events(event_type);

-- ROW LEVEL SECURITY

ALTER TABLE genome_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE genome_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE genome_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE genome_events ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies (same pattern as kira_memory)
CREATE POLICY "Service role full access" ON genome_entities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON genome_facts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON genome_relationships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON genome_events FOR ALL USING (true) WITH CHECK (true);

-- Updated-at triggers

CREATE OR REPLACE FUNCTION update_genome_entity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_genome_entities_updated
  BEFORE UPDATE ON genome_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_genome_entity_updated_at();

CREATE TRIGGER trg_genome_facts_updated
  BEFORE UPDATE ON genome_facts
  FOR EACH ROW
  EXECUTE FUNCTION update_genome_entity_updated_at();

CREATE TRIGGER trg_genome_relationships_updated
  BEFORE UPDATE ON genome_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_genome_entity_updated_at();
