-- ============================================================================
-- TIER 2 DISTRIBUTOR — DISTRIBUTOR PORTFOLIO (Option A, 2026-09-15)
-- ============================================================================
-- The 4-tier distributor model:
--   Tier 1  corporate platform admin (us)
--   Tier 2  distributor admin         (partner)   ← THIS migration
--   Tier 3  org admin / owner         (client)
--   Tier 4  org users                 (client)
--
-- Decision (2026-09-15, approved): a NEW distributor_portfolio junction table.
--   - organisations / users / organisation_memberships untouched — zero
--     disruption to existing ownership semantics.
--   - introducers untouched — the attribution/commission layer stays separate
--     from the visibility/administration layer.
--   - A distributor is NOT an org role (no CHECK change on organisation_memberships.
--    role): it is a cross-org relationship recorded here.
--
-- Access model: RLS on this table is service-role only (no direct policies —
-- same pattern as organisation_memberships). Cross-org visibility is mediated
-- by the auth_user_is_distributor_for fallback inside the canonical RLS
-- authority auth_user_has_organisation_access: members pass first, a
-- distributor fallback fires only when the membership check fails.
--
-- Idempotent; safe to re-run.
-- ============================================================================

-- 1. Distributor portfolio: the cross-org administration relationship
CREATE TABLE IF NOT EXISTS distributor_portfolio (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_person_id  UUID NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
    client_organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    status                 TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'suspended', 'archived')),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at             TIMESTAMPTZ,
    UNIQUE (distributor_person_id, client_organisation_id)
);

COMMENT ON TABLE distributor_portfolio IS
  'Tier 2: a distributor person granted visibility/administration over a client organisation they do not belong to. RLS-mediated via auth_user_is_distributor_for; no direct policy (service-role only). 2026-09-15.';

-- 2. Is the current auth user an active distributor for the given organisation?
CREATE OR REPLACE FUNCTION auth_user_is_distributor_for(p_organisation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_auth_user_id TEXT;
    v_person_id UUID;
    v_is_distributor BOOLEAN;
BEGIN
    v_auth_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
    IF v_auth_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Canonical chain first, legacy fallback (same as auth_user_has_organisation_access)
    SELECT person_id INTO v_person_id
    FROM auth_credentials
    WHERE auth_user_id = v_auth_user_id
    AND status = 'active'
    LIMIT 1;

    IF v_person_id IS NULL THEN
        SELECT id INTO v_person_id
        FROM users
        WHERE auth_user_id::text = v_auth_user_id
        AND status = 'active'
        LIMIT 1;
    END IF;

    IF v_person_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM distributor_portfolio
        WHERE distributor_person_id = v_person_id
        AND client_organisation_id = p_organisation_id
        AND status = 'active'
        AND removed_at IS NULL
    ) INTO v_is_distributor;

    RETURN v_is_distributor;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auth_user_is_distributor_for(UUID) IS
  'Check if current auth user is an active (not suspended, not removed) distributor for the given client organisation. Tier 2 cross-org access. 2026-09-15.';

-- 3. Extend the canonical RLS authority: members pass first; only when the
--    membership check fails, fall back to the distributor check.
CREATE OR REPLACE FUNCTION auth_user_has_organisation_access(p_organisation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_auth_user_id TEXT;
    v_person_id UUID;
    v_has_access BOOLEAN;
BEGIN
    v_auth_user_id := current_setting('request.jwt.claims', true)::json->>'sub';

    IF v_auth_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT person_id INTO v_person_id
    FROM auth_credentials
    WHERE auth_user_id = v_auth_user_id
    AND status = 'active'
    LIMIT 1;

    IF v_person_id IS NULL THEN
        SELECT id INTO v_person_id
        FROM users
        WHERE auth_user_id::text = v_auth_user_id
        AND status = 'active'
        LIMIT 1;
    END IF;

    IF v_person_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM organisation_memberships
        WHERE person_id = v_person_id
        AND organisation_id = p_organisation_id
        AND status = 'active'
        AND (valid_to IS NULL OR valid_to > NOW())
    ) INTO v_has_access;

    -- Tier 2 fallback: a distributor oversees the org without belonging to it.
    IF NOT v_has_access THEN
        v_has_access := auth_user_is_distributor_for(p_organisation_id);
    END IF;

    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auth_user_has_organisation_access(UUID) IS
  'Check if current auth user has active membership in organisation, OR is an active distributor for it (Tier 2 fallback added 2026-09-15). Canonical authority for RLS.';

-- 4. RLS: service-role only (no direct policies). App users reach portfolio rows
--    only through the SECURITY DEFINER auth_user_is_distributor_for function.
ALTER TABLE distributor_portfolio ENABLE ROW LEVEL SECURITY;