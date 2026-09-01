-- ============================================================================
-- SMALL WIN: ABSENCES TABLE + MEMBERSHIP SPEND GUARDRAIL
-- ============================================================================
-- The "small win" is the owner being able to be away for a month or two while
-- Kira watches the business and answers for the person standing in. For that
-- win to be real (and provable), the owner must be able to RECORD an absence
-- and later point at it: "I was away two weeks, the replacement asked Kira 14
-- questions, 3 needed me." That record lives here.
--
-- Also adds a per-membership spend guardrail so a replacement/CFO seat can be
-- given access WITHOUT spend discretion (the "limited admin" ask): a seat with
-- can_spend = false can talk to Kira and use the shared knowledge but cannot
-- reach a paid action.
--
-- Both additions are ADDITIVE and default to today's behaviour (no existing
-- row or route changes):
--   - absences is a brand-new table with RLS mirroring the canonical pattern
--     (member-select + owner/admin-manage, see 20260828010000_phase1c_canonical_rls.sql).
--   - organisation_memberships.can_spend defaults to true — no seat loses
--     spend access unless an owner explicitly sets it false.
--
-- This migration is idempotent: every CREATE/ALTER is guarded.
-- ============================================================================

-- STEP 1: absences table (the "you were away" record)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS absences (
    absence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
    replacement_person_id UUID REFERENCES persons(person_id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'ended', 'voided')),
    questions_handled INT NOT NULL DEFAULT 0,
    required_owner INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT absences_dates_ok CHECK (ended_at IS NULL OR ended_at >= started_at)
);

COMMENT ON TABLE absences IS 'The small-win proof: a recorded period the business ran without its owner, through Kira. P0.x.';

CREATE INDEX IF NOT EXISTS idx_absences_organisation_id ON absences(organisation_id);
CREATE INDEX IF NOT EXISTS idx_absences_person_id ON absences(person_id);
CREATE INDEX IF NOT EXISTS idx_absences_status ON absences(status);

ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- Member-select: any active member of the organisation can read that org's absences.
DROP POLICY IF EXISTS absences_org_member_select ON absences;
CREATE POLICY absences_org_member_select ON absences
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

-- Owner/admin-manage: only owner/admin members can record or change absences.
DROP POLICY IF EXISTS absences_org_admin_manage ON absences;
CREATE POLICY absences_org_admin_manage ON absences
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = absences.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = absences.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner')));

-- STEP 2: membership spend guardrail
-- ---------------------------------------------------------------------------
-- Default true => no behaviour change. An owner sets a seat false to give
-- access without spend discretion. Enforcement is at the route layer (checkout /
-- provisioning), not in RLS, so a blocked seat still sees the product.
ALTER TABLE organisation_memberships
    ADD COLUMN IF NOT EXISTS can_spend BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN organisation_memberships.can_spend IS 'Spend/lifecycle guardrail. false = this seat can use Kira and the shared knowledge but cannot reach a paid action. Default true (no behaviour change). P0.x.';
