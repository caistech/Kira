-- ============================================================================
-- P0.5 STEP 1A: CANONICAL IDENTITY — MIGRATION VERIFICATION
-- ============================================================================
-- Scope: Create canonical identity tables, backfill from legacy, add
-- organisation_id to knowledge tables, create write triggers.
--
-- EXCLUDED from this migration (deferred to Step 1B+):
--   - organisation_memberships (Step 1B: Membership/Tenant Context)
--   - ownership_periods (later remediation)
--   - RLS authority transfer (Step 1C)
--   - API route rebinding (Step 1D)
--
-- Governing principle: users.id semantic overload is the root cause of every
-- architectural conflict. This migration separates Organisation and Person
-- into independent entities. UUID reuse (organisations.id = users.id) is a
-- migration convenience, NOT semantic identity.
-- ============================================================================

-- STEP 1A.1: Create canonical identity tables
-- ---------------------------------------------------------------------------

-- Organisation: the enduring business entity
CREATE TABLE IF NOT EXISTS organisations (
    organisation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name TEXT NOT NULL,
    trading_name TEXT,
    abn TEXT UNIQUE,
    entity_type TEXT DEFAULT 'unknown',
    industry TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE organisations IS 'The enduring business entity. Independent of Person. P0.5 Step 1A. UUID reuse: organisations.id = users.id (migration convenience only).';

-- Person: a distinct human identity
CREATE TABLE IF NOT EXISTS persons (
    person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE persons IS 'A distinct human identity. Independent of Organisation membership. P0.5 Step 1A. UUID reuse: persons.id = users.id (migration convenience only).';

-- Auth Credential: linking auth to Person
CREATE TABLE IF NOT EXISTS auth_credentials (
    auth_credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
    auth_provider TEXT NOT NULL DEFAULT 'email',
    auth_user_id TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (auth_provider, auth_user_id)
);

COMMENT ON TABLE auth_credentials IS 'Auth credential linked to Person. Multiple auth credentials per Person possible. P0.5 Step 1A.';

-- Migration Ledger: immutable record of every migration decision
CREATE TABLE IF NOT EXISTS migration_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_user_id UUID NOT NULL,
    canonical_person_id UUID,
    canonical_organisation_id UUID NOT NULL,
    source_table TEXT NOT NULL,
    source_record_id UUID NOT NULL,
    migration_phase TEXT NOT NULL,
    resolution_status TEXT NOT NULL,
    resolution_method TEXT NOT NULL,
    resolution_reason TEXT,
    migration_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validation_status TEXT DEFAULT 'pending',
    rollback_status TEXT DEFAULT 'active',
    notes TEXT
);

COMMENT ON TABLE migration_ledger IS 'Immutable record of every migration decision. Append-only. P0.5 Step 1A.';

-- Legacy Identity Map: tracks how legacy users map to canonical entities
CREATE TABLE IF NOT EXISTS legacy_identity_map (
    legacy_user_id UUID NOT NULL,
    canonical_person_id UUID NOT NULL,
    canonical_organisation_id UUID NOT NULL,
    resolution_method TEXT NOT NULL,
    confidence NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_by TEXT NOT NULL DEFAULT 'system',
    notes TEXT,
    PRIMARY KEY (legacy_user_id, canonical_person_id, canonical_organisation_id)
);

COMMENT ON TABLE legacy_identity_map IS 'Tracks how legacy users map to canonical entities. Immutable. P0.5 Step 1A.';

-- STEP 1A.2: Backfill canonical identity from legacy users + business_identity
-- ---------------------------------------------------------------------------

-- Backfill organisations from users + business_identity
-- organisations.id = users.id (migration convenience, not semantic identity)
-- ON CONFLICT DO NOTHING handles both PK (organisation_id) and unique (abn) conflicts
INSERT INTO organisations (organisation_id, legal_name, trading_name, abn, entity_type, industry, status, created_at)
SELECT
    usr.id,
    COALESCE(biz.legal_name, usr.first_name || ' ' || usr.last_name, 'Unknown Organisation'),
    biz.trading_name,
    biz.abn,
    'unknown',
    NULL,
    CASE WHEN usr.status = 'active' THEN 'active' ELSE 'inactive' END,
    usr.created_at
FROM users usr
LEFT JOIN business_identity biz ON biz.user_id = usr.id
ON CONFLICT DO NOTHING;

-- Backfill persons from users
-- persons.id = users.id (migration convenience, not semantic identity)
INSERT INTO persons (person_id, email, first_name, last_name, status, created_at)
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    CASE WHEN u.status = 'active' THEN 'active' ELSE 'inactive' END,
    u.created_at
FROM users u
ON CONFLICT (person_id) DO NOTHING;

-- Backfill auth_credentials from users.auth_user_id
INSERT INTO auth_credentials (person_id, auth_provider, auth_user_id, status, created_at)
SELECT
    u.id,
    COALESCE(u.auth_provider, 'email'),
    u.auth_user_id::text,
    CASE WHEN u.status = 'active' THEN 'active' ELSE 'revoked' END,
    u.created_at
FROM users u
WHERE u.auth_user_id IS NOT NULL
ON CONFLICT (auth_provider, auth_user_id) DO NOTHING;

-- Backfill migration_ledger for every legacy user
INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'users',
    u.id,
    'bridge',
    'confirmed',
    'direct',
    'Direct 1:1 mapping from users to organisations and persons',
    NOW()
FROM users u;

-- Backfill legacy_identity_map
INSERT INTO legacy_identity_map (legacy_user_id, canonical_person_id, canonical_organisation_id, resolution_method, confidence, resolved_at, resolved_by, notes)
SELECT
    u.id,
    u.id,
    u.id,
    'direct',
    1.0,
    NOW(),
    'system',
    'Initial backfill: users.id = organisations.id = persons.id (migration convenience)'
FROM users u
ON CONFLICT DO NOTHING;

-- STEP 1A.3: Add organisation_id FK to knowledge tables
-- ---------------------------------------------------------------------------

-- genome_entities
ALTER TABLE genome_entities ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_genome_entities_organisation_id ON genome_entities(organisation_id);

-- genome_facts
ALTER TABLE genome_facts ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_genome_facts_organisation_id ON genome_facts(organisation_id);

-- genome_relationships
ALTER TABLE genome_relationships ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_genome_relationships_organisation_id ON genome_relationships(organisation_id);

-- genome_events
ALTER TABLE genome_events ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_genome_events_organisation_id ON genome_events(organisation_id);

-- kira_memory
ALTER TABLE kira_memory ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_kira_memory_organisation_id ON kira_memory(organisation_id);

-- kira_knowledge
ALTER TABLE kira_knowledge ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_kira_knowledge_organisation_id ON kira_knowledge(organisation_id);

-- conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organisation_id ON conversations(organisation_id);

-- conversation_messages
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_organisation_id ON conversation_messages(organisation_id);

-- kira_agents
ALTER TABLE kira_agents ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_kira_agents_organisation_id ON kira_agents(organisation_id);

-- STEP 1A.4: Backfill organisation_id on knowledge tables
-- ---------------------------------------------------------------------------

-- Since organisations.id = users.id (migration convenience), we can directly copy
UPDATE genome_entities SET organisation_id = user_id WHERE organisation_id IS NULL;
UPDATE genome_facts SET organisation_id = user_id WHERE organisation_id IS NULL;
UPDATE genome_relationships SET organisation_id = user_id WHERE organisation_id IS NULL;
UPDATE genome_events SET organisation_id = user_id WHERE organisation_id IS NULL;
UPDATE kira_memory SET organisation_id = user_id WHERE organisation_id IS NULL;
UPDATE kira_knowledge SET organisation_id = user_id WHERE organisation_id IS NULL;
UPDATE conversations SET organisation_id = user_id WHERE organisation_id IS NULL;
UPDATE conversation_messages SET organisation_id = (SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id) WHERE organisation_id IS NULL;
UPDATE kira_agents SET organisation_id = user_id WHERE organisation_id IS NULL;

-- STEP 1A.5: Create triggers to sync organisation_id on write
-- ---------------------------------------------------------------------------

-- Function to get organisation_id from user_id (Bridge phase: 1:1 mapping)
CREATE OR REPLACE FUNCTION get_organisation_id_from_user(p_user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN p_user_id; -- During Bridge phase: organisations.id = users.id
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-populate organisation_id on genome_entities insert
CREATE OR REPLACE FUNCTION sync_organisation_id_genome_entities()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_genome_entities_sync_organisation_id
    BEFORE INSERT ON genome_entities
    FOR EACH ROW
    EXECUTE FUNCTION sync_organisation_id_genome_entities();

-- Trigger: auto-populate organisation_id on genome_facts insert
CREATE OR REPLACE FUNCTION sync_organisation_id_genome_facts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_genome_facts_sync_organisation_id
    BEFORE INSERT ON genome_facts
    FOR EACH ROW
    EXECUTE FUNCTION sync_organisation_id_genome_facts();

-- Trigger: auto-populate organisation_id on kira_memory insert
CREATE OR REPLACE FUNCTION sync_organisation_id_kira_memory()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kira_memory_sync_organisation_id
    BEFORE INSERT ON kira_memory
    FOR EACH ROW
    EXECUTE FUNCTION sync_organisation_id_kira_memory();

-- Trigger: auto-populate organisation_id on conversations insert
CREATE OR REPLACE FUNCTION sync_organisation_id_conversations()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organisation_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.organisation_id := get_organisation_id_from_user(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversations_sync_organisation_id
    BEFORE INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION sync_organisation_id_conversations();

-- STEP 1A.6: Verification queries (for manual or automated verification)
-- ---------------------------------------------------------------------------

-- These queries verify the migration was applied correctly.
-- They should return zero rows if the migration is complete and consistent.

-- Verification 1: No knowledge rows missing organisation_id
-- Expected: 0 rows
-- SELECT 'genome_entities' as table_name, COUNT(*) as missing FROM genome_entities WHERE organisation_id IS NULL
-- UNION ALL
-- SELECT 'genome_facts', COUNT(*) FROM genome_facts WHERE organisation_id IS NULL
-- UNION ALL
-- SELECT 'genome_relationships', COUNT(*) FROM genome_relationships WHERE organisation_id IS NULL
-- UNION ALL
-- SELECT 'genome_events', COUNT(*) FROM genome_events WHERE organisation_id IS NULL
-- UNION ALL
-- SELECT 'kira_memory', COUNT(*) FROM kira_memory WHERE organisation_id IS NULL
-- UNION ALL
-- SELECT 'kira_knowledge', COUNT(*) FROM kira_knowledge WHERE organisation_id IS NULL
-- UNION ALL
-- SELECT 'conversations', COUNT(*) FROM conversations WHERE organisation_id IS NULL
-- UNION ALL
-- SELECT 'kira_agents', COUNT(*) FROM kira_agents WHERE organisation_id IS NULL;

-- Verification 2: No knowledge rows with invalid organisation_id
-- Expected: 0 rows
-- SELECT 'genome_entities' as table_name, COUNT(*) as invalid FROM genome_entities WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations)
-- UNION ALL
-- SELECT 'genome_facts', COUNT(*) FROM genome_facts WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations)
-- UNION ALL
-- SELECT 'kira_memory', COUNT(*) FROM kira_memory WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations);

-- Verification 3: Every legacy user has a canonical organisation and person
-- Expected: 0 rows
-- SELECT u.id, o.organisation_id, p.person_id FROM users u LEFT JOIN organisations o ON o.organisation_id = u.id LEFT JOIN persons p ON p.person_id = u.id WHERE o.organisation_id IS NULL OR p.person_id IS NULL;

-- Verification 4: Migration ledger has entry for every legacy user
-- Expected: 0 rows
-- SELECT u.id FROM users u LEFT JOIN migration_ledger ml ON ml.legacy_user_id = u.id WHERE ml.ledger_id IS NULL;
