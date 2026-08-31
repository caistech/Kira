-- ============================================================================
-- P2.4-2D: kira_drafts organisational ownership — ADD + BACKFILL + QUARANTINE
-- ============================================================================
-- kira_drafts holds the Setup-Kira framework brief the owner reviews before
-- Operational Kira is created (handoff drafts). Per the P2.3 migration matrix
-- it is Organisation-owned (a setup draft describes the same business a subsequent
-- valuation/genome/agent describe), and it is the ONE doing-slice table Phase 1B
-- (20260828001718) omitted entirely:
--
--   - NO organisation_id column at all
--   - NO user_id UUID (only user_name TEXT + session_id TEXT + agent_id UUID)
--   - legacy RLS is a wide-open SELECT/UPDATE for anon+authenticated
--
-- The draft is linked to its owner through kira_agents: a draft that has been
-- turned into an Operational Kira carries agent_id -> kira_agents(id), and
-- kira_agents now carries organisation_id. Drafts that are still pre-approval
-- (status='draft') have no agent_id — but the ONLY flow that creates them runs in
-- an authenticated browser session, whose agent (if any exists) carries the org.
--
-- DISPOSITION
--   A. ADD organisation_id (nullable initially for backfill).
--   B. BACKFILL from the canonical chain: kira_drafts.agent_id -> kira_agents ->
--      organisation_id; fall back to the membership chain on kira_agents.user_id
--      for approved/created drafts whose agent_id is null.
--   C. QUARANTINE owned-ish rows (approved/created, session-bound) whose org
--      cannot be resolved — same precedent as kira_tasks / genome_facts: never
--      force-assign, never invent a holding organisation.
--   D. REPLACE the wide-open legacy RLS with parameterised policies.
--   E. ADD the org-anchored read index.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A. ADD the ownership column + quarantine metadata (before backfill so the
--    check can distinguish "quarantined legacy" from "unresolved").
-- ---------------------------------------------------------------------------
ALTER TABLE kira_drafts ADD COLUMN IF NOT EXISTS
    organisation_id UUID REFERENCES organisations(organisation_id);
ALTER TABLE kira_drafts ADD COLUMN IF NOT EXISTS quarantine_status TEXT;
ALTER TABLE kira_drafts ADD COLUMN IF NOT EXISTS quarantine_reason TEXT;
ALTER TABLE kira_drafts ADD COLUMN IF NOT EXISTS quarantined_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- B. BACKFILL. First from the draft's own agent binding (the draft exists because
--    an Operational Kira was (or will be) minted for that org); then from the
--    membership chain keyed on the creating agent's person. Drafts still in
--    'draft' have no agent yet — the setup flow populates organisation_id from
--    the session context on write (Phase 3 code change), so they are not
--    backfilled here, only quarantined if they look owned.
-- ---------------------------------------------------------------------------
UPDATE kira_drafts d
   SET organisation_id = a.organisation_id
  FROM kira_agents a
 WHERE d.organisation_id IS NULL
   AND d.agent_id IS NOT NULL
   AND a.id = d.agent_id
   AND a.organisation_id IS NOT NULL;

UPDATE kira_drafts d
   SET organisation_id = m.organisation_id
  FROM kira_agents a
  JOIN organisation_memberships m ON m.person_id = a.user_id
   AND m.status = 'active' AND (m.valid_to IS NULL OR m.valid_to > NOW())
 WHERE d.organisation_id IS NULL
   AND d.agent_id IS NULL
   AND d.status IN ('approved', 'created')
   AND a.id = d.agent_id;

-- ---------------------------------------------------------------------------
-- C. QUARANTINE: an approved/created draft whose org cannot be resolved is flagged
--    so it is excluded from every org-scoped surface and visible only to the
--    service role. Purely-in-progress 'draft' rows without a resolvable org are
--    left in place (the setup flow will stamp them) — they are not owned yet.
-- ---------------------------------------------------------------------------
UPDATE kira_drafts
   SET quarantine_status = 'quarantined',
       quarantine_reason = E'kira_drafts org rebinding: no resolvable agent or organisation membership; not force-assigned per canonical model',
       quarantined_at = NOW()
 WHERE status IN ('approved', 'created')
   AND organisation_id IS NULL
   AND quarantine_status IS NULL;

-- ---------------------------------------------------------------------------
-- E. ADD the org-anchored read index.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS kira_drafts_org_idx
    ON kira_drafts (organisation_id);

-- ---------------------------------------------------------------------------
-- D. REPLACE the wide-open legacy RLS.
--    The original policy let ANY anon/authenticated session SELECT and UPDATE
--    every draft — an owner could read and mutate another owner's pending brief.
--    Canonical set: org members may read their org's drafts; admin/owner may
--    manage (approve/expire) them; service role still handles the setup inserts.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can insert drafts" ON kira_drafts;
DROP POLICY IF EXISTS "Allow reading drafts" ON kira_drafts;
DROP POLICY IF EXISTS "Allow updating drafts" ON kira_drafts;

CREATE POLICY kira_drafts_org_member_select ON kira_drafts
    FOR SELECT USING (
        organisation_id IS NOT NULL
        AND auth_user_has_organisation_access(organisation_id)
    );

CREATE POLICY kira_drafts_org_admin_manage ON kira_drafts
    FOR ALL USING (
        organisation_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = kira_drafts.organisation_id
              AND om.person_id = (SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
              AND om.status = 'active' AND om.role IN ('admin','owner'))
    )
    WITH CHECK (
        organisation_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM organisation_memberships om
            WHERE om.organisation_id = kira_drafts.organisation_id
              AND om.person_id = (SELECT person_id FROM auth_credentials
                  WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
              AND om.status = 'active' AND om.role IN ('admin','owner'))
    );

COMMIT;
