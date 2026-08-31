-- ============================================================================
-- P2.4: kira_knowledge ORGANISATIONAL SCOPING
-- ============================================================================
-- Scope: Complete the migration of kira_knowledge from Person-scoped to
-- Organisation-scoped. The P0.5 migration added organisation_id (nullable)
-- and backfilled all rows. This migration:
--   1. Verifies backfill is complete (no NULL organisation_id rows)
--   2. Makes organisation_id NOT NULL
--   3. Changes user_id FK action from CASCADE to SET NULL (preserves knowledge
--      when Person is deleted; user_id becomes provenance/contributor)
--   4. Adds composite index for organisation-scoped queries
--
-- Governing invariants:
--   INV-001: Organisation persists independently of People
--   INV-009: Organisational intelligence survives consultant/Person changes
--   INV-020: Persistent intelligence anchored to Organisation, not Person
--
-- What this does NOT do (deferred to application-layer changes):
--   - Update read paths to filter by organisation_id (P2.4.4)
--   - Update write paths to always set organisation_id (already correct)
--   - Add regression tests (P2.4.8)
-- ============================================================================

-- STEP 1: Verify backfill is complete
-- ---------------------------------------------------------------------------
-- If any rows have organisation_id IS NULL, this migration will fail.
-- This is intentional: we must not proceed with incomplete data.

DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM kira_knowledge
    WHERE organisation_id IS NULL;

    IF null_count > 0 THEN
        RAISE EXCEPTION 'P2.4 migration blocked: % rows have organisation_id IS NULL', null_count;
    END IF;

    RAISE NOTICE 'P2.4: All kira_knowledge rows have organisation_id populated';
END $$;

-- STEP 2: Make organisation_id NOT NULL
-- ---------------------------------------------------------------------------
-- The P0.5 backfill populated organisation_id = user_id for all rows.
-- This constraint ensures no future rows can be inserted without organisation scope.

ALTER TABLE kira_knowledge
    ALTER COLUMN organisation_id SET NOT NULL;

-- STEP 3: Change user_id FK action from CASCADE to SET NULL
-- ---------------------------------------------------------------------------
-- Current: user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
-- Target:  user_id UUID REFERENCES users(id) ON DELETE SET NULL
--
-- Rationale:
--   - organisation_id is now the tenant boundary (NOT NULL)
--   - user_id becomes provenance/contributor (who created this knowledge)
--   - Deleting a Person must NOT destroy organisational knowledge (INV-001, INV-020)
--   - SET NULL preserves the knowledge while recording that the contributor is gone
--   - NOT NULL constraint on user_id is removed to allow SET NULL to function

-- First, drop the existing FK constraint
ALTER TABLE kira_knowledge
    DROP CONSTRAINT IF EXISTS kira_knowledge_user_id_fkey;

-- Then, re-add with SET NULL behavior and allow NULL
ALTER TABLE kira_knowledge
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE kira_knowledge
    ADD CONSTRAINT kira_knowledge_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- STEP 4: Add index for organisation-scoped queries
-- ---------------------------------------------------------------------------
-- The existing idx_kira_knowledge_organisation_id covers single-column lookups.
-- This composite index optimises the common query pattern:
-- organisation_id + source_type + created_at
-- (kira_knowledge has no 'status' column; source_type is the discriminator.)

CREATE INDEX IF NOT EXISTS idx_kira_knowledge_org_source_created
    ON kira_knowledge(organisation_id, source_type, created_at DESC);

-- STEP 5: Add composite index for organisation + source_type queries
-- ---------------------------------------------------------------------------
-- The knowledge search often filters by organisation + source_type

CREATE INDEX IF NOT EXISTS idx_kira_knowledge_org_source
    ON kira_knowledge(organisation_id, source_type);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify no NULL organisation_id rows exist
DO $$
DECLARE
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM kira_knowledge;
    SELECT COUNT(*) INTO null_count FROM kira_knowledge WHERE organisation_id IS NULL;

    RAISE NOTICE 'P2.4 verification: % total rows, % with NULL organisation_id', total_count, null_count;

    IF null_count > 0 THEN
        RAISE EXCEPTION 'P2.4 verification FAILED: % rows still have NULL organisation_id', null_count;
    END IF;

    RAISE NOTICE 'P2.4 verification PASSED: all rows have organisation_id';
END $$;

-- Verify user_id is now nullable
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'kira_knowledge'
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'P2.4 verification FAILED: user_id is still NOT NULL';
    END IF;

    RAISE NOTICE 'P2.4 verification PASSED: user_id is nullable';
END $$;

-- Verify FK constraint exists with SET NULL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'kira_knowledge_user_id_fkey'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE EXCEPTION 'P2.4 verification FAILED: kira_knowledge_user_id_fkey constraint missing';
    END IF;

    RAISE NOTICE 'P2.4 verification PASSED: FK constraint exists';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- After this migration:
--   organisation_id: NOT NULL (tenant boundary)
--   user_id: NULLABLE, ON DELETE SET NULL (provenance/contributor)
--   RLS: already organisation-scoped via auth_user_has_organisation_access (P0.5)
--   Read paths: must be updated to filter by organisation_id (P2.4.4)
-- ============================================================================
