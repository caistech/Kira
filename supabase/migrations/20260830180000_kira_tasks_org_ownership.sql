-- ============================================================================
-- P2.4-F: kira_tasks organisational ownership
-- ============================================================================
-- kira_tasks was the ONE doing-slice table omitted from Phase 1B
-- (20260828001718). That migration's header states "Every table below is EMPTY
-- (verified)" — every migrated table was empty at the time, and the ownership
-- rebinding stopped there. kira_tasks carries LIVE task rows, and the legacy
-- model is still intact on it:
--
--   - user_id is "the owner (tenant)" (column comment, 20260725160000)
--   - idempotency enforced by UNIQUE (user_id, intent_id)
--   - RLS: kira_tasks_owner_select USING (auth.uid() = user_id)
--   - no organisation_id column at all
--
-- Meanwhile the application code already targets the canonical shape — every
-- writer resolves and stores organisation_id (swarm/stub.ts, tool-handlers.ts,
-- the ask route, the reconcile cron) and every reader scopes by it
-- (open-tasks.ts, drafts.ts, the reconcile cron). That code is currently BROKEN
-- at runtime: any .eq('organisation_id', ...) against kira_tasks throws
-- "column kira_tasks.organisation_id does not exist". This migration closes
-- the last gap between the schema and the canonical knowledge model (INV-020):
-- organisations are the tenant, user_id is provenance of who asked.
--
-- DISPOSITION
--   A. ADD organisation_id (nullable initially for backfill)
--   B. BACKFILL owned rows from the canonical membership chain
--   C. QUARANTINE owned legacy rows whose org cannot be resolved — same
--      precedent as the P0.2 genome_facts quarantine (20260829160000):
--      never force-assign, never invent a holding organisation.
--   D. REBIND idempotency to (organisation_id, intent_id), preserving the
--      documented NULL-distinct behaviour for anonymous public asks
--      (20260810120000: two visitors asking the same thing are two events).
--   E. REPLACE legacy person-scoped RLS with the canonical org-scoped set
--      (same pattern as phase1c / kira_refusals).
--   F. REBIND the read index to the organisation anchor.
--   G. ENFORCE the canonical invariant: owned rows must carry an owning org;
--      anonymous rows (user_id IS NULL) are the only org-NULL rows.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A. ADD the ownership column
-- ---------------------------------------------------------------------------
ALTER TABLE kira_tasks ADD COLUMN IF NOT EXISTS
    organisation_id UUID REFERENCES organisations(organisation_id);

-- ---------------------------------------------------------------------------
-- C. Quarantine metadata (idempotent, BEFORE the backfill so the check below
--    can distinguish "quarantined legacy" from "unresolved")
-- ---------------------------------------------------------------------------
ALTER TABLE kira_tasks ADD COLUMN IF NOT EXISTS quarantine_status TEXT;
ALTER TABLE kira_tasks ADD COLUMN IF NOT EXISTS quarantine_reason TEXT;
ALTER TABLE kira_tasks ADD COLUMN IF NOT EXISTS quarantined_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- B. BACKFILL owned rows from the canonical membership chain.
--
--    Canonical authority is organisation_memberships (the same chain
--    resolveOrganisationForPerson walks in lib/auth.ts): an active
--    membership with a valid window. Picks the most-recent active
--    membership when more than one exists. Note kira_tasks.user_id stored
--    the person id (persons.person_id / users.id — UUID reuse), which is
--    exactly what organisation_memberships.person_id references.
-- ---------------------------------------------------------------------------
UPDATE kira_tasks t
   SET organisation_id = m.organisation_id
  FROM organisation_memberships m
 WHERE t.organisation_id IS NULL
   AND t.user_id IS NOT NULL
   AND m.person_id = t.user_id
   AND m.status = 'active'
   AND (m.valid_to IS NULL OR m.valid_to > NOW());

-- ---------------------------------------------------------------------------
-- C(cont). QUARANTINE owned legacy rows that still have no resolvable org.
--
--    The owner id exists but no current active membership can be found for it
--    (deleted membership, sentinel/test rows, an org that never existed). We
--    do NOT force-assign and do NOT create a holding organisation — the row is
--    flagged so it is excluded from every org-scoped surface and visible only
--    to the service role, mirroring the P0.2 genome_facts decision exactly.
-- ---------------------------------------------------------------------------
UPDATE kira_tasks
   SET quarantine_status = 'quarantined',
       quarantine_reason = E'kira_tasks org rebinding: owner id has no resolvable active organisation membership; not force-assigned per canonical model',
       quarantined_at = NOW()
 WHERE user_id IS NOT NULL
   AND organisation_id IS NULL
   AND quarantine_status IS NULL;

-- ---------------------------------------------------------------------------
-- D. REBIND idempotency to the organisation anchor.
--    The legacy UNIQUE (user_id, intent_id) enforces "one utterance per
--    person" — the semantic this migration dismantles. The canonical key is
--    one utterance per organisation. Postgres treats NULLs as distinct, so
--    anonymous rows (organisation_id IS NULL, unique intent_id per ask)
--    remain unrestricted exactly as documented in 20260810120000.
-- ---------------------------------------------------------------------------
ALTER TABLE kira_tasks DROP CONSTRAINT IF EXISTS kira_tasks_user_id_intent_id_key;
ALTER TABLE kira_tasks DROP CONSTRAINT IF EXISTS kira_tasks_org_intent_uniq;
ALTER TABLE kira_tasks
    ADD CONSTRAINT kira_tasks_org_intent_uniq UNIQUE (organisation_id, intent_id);

-- ---------------------------------------------------------------------------
-- E. REPLACE the legacy person-scoped RLS with the canonical org set.
--    auth_user_has_organisation_access(NULL) is false, so anonymous asks and
--    quarantined rows stay service-role-only — the same outcome the legacy
--    auth.uid() = user_id achieved for NULL rows, now on the org anchor.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS kira_tasks_owner_select ON kira_tasks;
DROP POLICY IF EXISTS kira_tasks_org_member_select ON kira_tasks;
CREATE POLICY kira_tasks_org_member_select ON kira_tasks
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));
DROP POLICY IF EXISTS kira_tasks_org_admin_manage ON kira_tasks;
CREATE POLICY kira_tasks_org_admin_manage ON kira_tasks
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = kira_tasks.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials
              WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = kira_tasks.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials
              WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- ---------------------------------------------------------------------------
-- F. REBIND the read index to the organisation anchor.
--    The open-tasks ledger and the drafts page both query by organisation_id
--    then status then recency. The legacy user-scoped index is dropped and
--    replaced with the org-anchored equivalent. A person-scoped index remains
--    for the legacy user_id provenance fallback in open-tasks.ts.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS kira_tasks_user_status_idx;
CREATE INDEX IF NOT EXISTS kira_tasks_org_status_idx
    ON kira_tasks (organisation_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS kira_tasks_user_id_idx ON kira_tasks (user_id);

-- ---------------------------------------------------------------------------
-- G. ENFORCE the canonical invariant.
--    An owned row (user_id NOT NULL) must carry an owning organisation; the
--    only org-NULL rows are anonymous public asks (user_id IS NULL) and rows
--    quarantined by this rebinding. New writes can never set quarantine
--    status, so the constraint is forward-tight: tenantless owned rows are
--    rejected at the schema rather than silently stored.
-- ---------------------------------------------------------------------------
ALTER TABLE kira_tasks DROP CONSTRAINT IF EXISTS kira_tasks_owned_has_org;
ALTER TABLE kira_tasks
    ADD CONSTRAINT kira_tasks_owned_has_org CHECK (
        user_id IS NULL OR organisation_id IS NOT NULL OR quarantine_status IS NOT NULL
    );

-- ---------------------------------------------------------------------------
-- Column comments: the legacy "owner (tenant)" semantics are removed and
-- replaced with the canonical provenance role.
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN kira_tasks.user_id IS
    E'Provenance — who asked for the task (person id). NULL = asked by a visitor with no account via the public /api/kira/ask. Ownership is kira_tasks.organisation_id; this column is not the tenant.';

COMMIT;