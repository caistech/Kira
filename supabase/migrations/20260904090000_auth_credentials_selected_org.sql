-- ACTIVE ORGANISATION SELECTION ON AUTH_CREDENTIALS
--
-- A person can belong to multiple organisations (e.g. an owner running several
-- businesses, or an advisor with several clients). getCurrentOrganisationContext()
-- historically resolved "the" org by picking the most-recently-started active
-- membership — recency is not the same as "the org I am working in right now".
--
-- This migration stores the user's explicit choice of current organisation on
-- auth_credentials, the canonical auth_user_id -> person_id bridge. It is
-- deliberately stored:
--   * server-side (never a client-enforceable cookie — a client can never force
--     an org they are not a member of),
--   * on auth_credentials so it shares the person's auth lifecycle and is
--     resolved on every request without an extra table.
--
-- The value is a FOREIGN KEY to organisations, and authorisation is ALWAYS
-- re-verified against organisation_memberships at read time by
-- getCurrentOrganisationContext — the switcher can only ever select an org the
-- person has an ACTIVE membership in.

ALTER TABLE public.auth_credentials
  ADD COLUMN IF NOT EXISTS selected_org_id uuid;

COMMENT ON COLUMN public.auth_credentials.selected_org_id IS
  'The organisation this person is currently working in. Authoritative only when the person has an active organisation_memberships row for it; getCurrentOrganisationContext falls back to the most-recent active membership when unset or unauthorized.';

-- Backfill: for users with exactly one active membership, default their
-- selection to it so existing single-org users are unaffected and immediately
-- deterministic rather than recency-dependent.
UPDATE public.auth_credentials ac
SET selected_org_id = sub.org_id
FROM (
  SELECT om.person_id, om.organisation_id AS org_id
  FROM organisation_memberships om
  WHERE om.status = 'active'
    AND om.valid_to IS NULL
  GROUP BY om.person_id, om.organisation_id
) sub
WHERE ac.person_id = sub.person_id
  AND ac.selected_org_id IS NULL
  AND (SELECT COUNT(DISTINCT om2.organisation_id)
       FROM organisation_memberships om2
       WHERE om2.person_id = ac.person_id
         AND om2.status = 'active'
         AND om2.valid_to IS NULL) = 1;
