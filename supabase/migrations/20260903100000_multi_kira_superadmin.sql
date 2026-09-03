-- KIRA multi-Kira-per-org + superadmin architecture
--
-- Extends the reset identity model to support:
--   - an org with MULTIPLE Kira agents (multi-tenant per org)
--   - a superadmin role (a FUNCTION, not an owner) who manages the org, its
--     Kira agents, and appoints users
--   - the owner role remaining a SEPARATE role from superadmin (an owner may
--     or may not hold the superadmin function)
--   - two-tier beta testers (superadmin beta vs user beta)
--
-- Idempotent. Safe to run repeatedly.

BEGIN;

-- ============================================================================
-- 1. SUPERADMIN ROLE
-- ============================================================================
--
-- Extend the membership role CHECK to include 'superadmin' as a distinct
-- role. The owner stays a SEPARATE role; superadmin is the administrative
-- function that governs the org and its Kira instances.
--
-- portal_access: which portal(s) this membership grants.
--   'admin' -> /admin/*  (superadmin management)
--   'user'  -> /portal/* (product UI)
--   'both'  -> superadmin who also uses the product
--
-- Default 'user'. When role = 'superadmin' we default to 'admin'.

ALTER TABLE public.organisation_memberships
  DROP CONSTRAINT IF EXISTS organisation_memberships_role_check;

ALTER TABLE public.organisation_memberships
  ADD CONSTRAINT organisation_memberships_role_check
  CHECK (
    role = ANY (ARRAY[
      'superadmin',
      'owner',
      'admin',
      'consultant',
      'employee',
      'advisor',
      'member'
    ])
  );

ALTER TABLE public.organisation_memberships
  ADD COLUMN IF NOT EXISTS portal_access TEXT
    NOT NULL DEFAULT 'user'
    CHECK (portal_access IN ('admin', 'user', 'both'));

ALTER TABLE public.organisation_memberships
  ADD COLUMN IF NOT EXISTS appointed_by UUID
    REFERENCES public.persons(person_id);

COMMENT ON COLUMN public.organisation_memberships.portal_access IS
  'Which portal this membership grants: admin (superadmin), user (product), or both.';
COMMENT ON COLUMN public.organisation_memberships.appointed_by IS
  'Person who appointed this member. Superadmin appointment provenance.';

-- ============================================================================
-- 2. PER-ORG KIRA CONFIGURATION
-- ============================================================================
--
-- organisations.kira_config holds per-org Kira agent settings (which agents
-- exist, their models, voices, enabled features). This is the multi-Kira
-- substrate: one org may run several Kira agents with different scopes.

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS kira_config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- A column indicating the org's Kira deployment flag (1:1 for now, multi later).
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS kira_status TEXT
    NOT NULL DEFAULT 'provisioned'
    CHECK (kira_status IN ('provisioned', 'active', 'suspended', 'archived'));

COMMENT ON COLUMN public.organisations.kira_config IS
  'Per-org Kira agent configuration (agents, models, voices, feature flags). Multi-Kira substrate.';

-- ============================================================================
-- 3. TWO-TIER BETA TESTERS
-- ============================================================================
--
-- beta_codes.beta_type distinguishes a superadmin-tier beta tester (who, on
-- redemption, becomes a superadmin of their org) from a user-tier beta tester
-- (who becomes a normal member).

ALTER TABLE public.beta_codes
  ADD COLUMN IF NOT EXISTS beta_type TEXT
    NOT NULL DEFAULT 'user'
    CHECK (beta_type IN ('superadmin', 'user'));

ALTER TABLE public.beta_codes
  ADD COLUMN IF NOT EXISTS org_name TEXT;

COMMENT ON COLUMN public.beta_codes.beta_type IS
  'Beta tier: superadmin testers provision a Kira org and manage it; user testers join as members.';

-- ============================================================================
-- 4. INDEXES / GUARDRAILS
-- ============================================================================

-- Only ONE active superadmin per org keeps authority unambiguous. A second
-- superadmin must be appointed by revoking/replacing, or by explicit dual
-- grant — the unique constraint is the safety rail.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_superadmin_per_org
  ON public.organisation_memberships (organisation_id)
  WHERE role = 'superadmin' AND status = 'active' AND portal_access <> 'both';

-- Fast lookup: person's admin memberships.
CREATE INDEX IF NOT EXISTS idx_memberships_admin_portal
  ON public.organisation_memberships (person_id, portal_access, status)
  WHERE portal_access IN ('admin', 'both');

COMMIT;
