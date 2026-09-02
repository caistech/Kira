-- KIRA emergency identity reset
--
-- The current canonical identity rows are disposable beta/test data.
-- Reset them so the next authenticated /plan POST rebuilds a clean:
--   auth user -> auth_credentials -> person -> organisation -> membership
--   -> optional ownership period
--
-- IMPORTANT: CASCADE intentionally removes public data that depends on these
-- identity rows. It does NOT delete Supabase auth.users themselves.
-- The currently authenticated Supabase user can therefore sign in and rebuild
-- a clean application identity through /plan.

TRUNCATE TABLE
  public.ownership_periods,
  public.organisation_memberships,
  public.auth_credentials,
  public.persons,
  public.organisations
RESTART IDENTITY CASCADE;

-- Leave the legacy users table untouched. It is provenance/compatibility data,
-- not canonical authority.
