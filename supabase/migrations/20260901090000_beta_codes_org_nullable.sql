-- Corrective migration: make beta_codes.organisation_id NULLABLE.
--
-- WHY: production's beta_codes.organisation_id is UUID NOT NULL with no default, but:
--   1. the repo's beta_codes migration (20260815100000_beta_codes.sql) defines NO organisation_id, and
--   2. the P2.4 migration plan (P24_MIGRATION_PLAN.md) does not list beta_codes in either the
--      "has organisation_id" or "missing it" set — its documented pattern is "add organisation_id
--      nullable initially for backfill" (line 71), then enforce NOT NULL later.
--
-- That leaves prod's NOT NULL column out of the migration history (undocumented drift, the class of
-- thing DRIFT_AND_GUARDS.md exists to catch).
--
-- CONCEPTUAL REASON IT MUST BE NULLABLE AT MINT: a beta code is minted BEFORE the owner/account/org
-- exists — a code's whole purpose is to CREATE the account at redemption. At mint time there is no
-- valid organisation to reference, so NOT NULL at mint is self-contradictory. The org is created and
-- attributed at redemption, which is where organisation_id is populated, matching the P2.4 backfill
-- pattern (nullable -> backfill -> enforce).
--
-- Operator-approved 2026-09-01.

ALTER TABLE public.beta_codes
  ALTER COLUMN organisation_id DROP NOT NULL;

COMMENT ON COLUMN public.beta_codes.organisation_id IS
  'The organisation that redeemed this code, populated at redemption. Nullable because a code is '
  'minted before any account/org exists — P2.4 backfill pattern (nullable at mint, populate on '
  'redemption, enforce later).';
