-- 20261002010000_fact_confirmations_organisation.sql
--
-- confirm_fact had NEVER written a row in production (kira_fact_confirmations: 0 rows, 2026-10-02).
-- Commit 4d79901 (2026-08-31, organisation-scoped access) changed the insert to carry
-- `organisation_id` and renamed `said` to `user_said` in code, with no migration for either — so every
-- confirmation failed on an unknown column and she told the owner "I couldn't write that down just
-- now" (John Orian, 2026-10-01, twice in a row).
--
-- The column name `said` stays: it is what the table has always held. The code goes back to it.
-- `organisation_id` is added here, because the INV-020 rule (organisation-owned rows) is the
-- intended design and the handler already resolves the organisation before it writes. Nullable so
-- the migration cannot fail on existing rows — there are none — and so a write is never refused for
-- a missing org on a path that has not resolved one yet.

ALTER TABLE kira_fact_confirmations ADD COLUMN IF NOT EXISTS organisation_id UUID;

DO $$
BEGIN
  ALTER TABLE kira_fact_confirmations
    ADD CONSTRAINT kira_fact_confirmations_organisation_id_fkey
    FOREIGN KEY (organisation_id) REFERENCES organisations(organisation_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_fact_confirmations_organisation
  ON kira_fact_confirmations(organisation_id, created_at DESC);
