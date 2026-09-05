BEGIN;

-- ============================================================================
-- Organisation Onboarding (invitations) — name columns on beta_codes
-- ============================================================================
-- RLS for beta_codes already ships in 20260828010000_phase1c_canonical_rls.sql
-- (beta_codes_org_member_select + beta_codes_org_admin_manage). The only gap for
-- the admin invitation flow is personalisation: first_name / last_name so an
-- invited person's canonical record is pre-populated at redemption.

ALTER TABLE public.beta_codes
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT;

COMMENT ON COLUMN public.beta_codes.first_name IS
    'Pre-populates the canonical person at redemption. NULL = invitee enters their name.';

COMMENT ON COLUMN public.beta_codes.last_name IS
    'Pre-populates the canonical person at redemption. NULL = invitee enters their name.';

COMMIT;