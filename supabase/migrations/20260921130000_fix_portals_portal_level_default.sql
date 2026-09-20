-- Fix the invalid portal_level default.
--
-- `portals.portal_level DEFAULT 'business'` (created in 20260921010000) violates the
-- column's own CHECK (portfolio | project | distributor | client_org). Any INSERT that
-- omits portal_level is therefore rejected — the autobootstrap cron/script landed portal
-- URLs only when a row already existed. Writers now supply portal_level + journey_type
-- explicitly (see app/api/cron/autobootstrap-portals/route.ts); this migration removes the
-- landmine so an omission fails loudly at NOT NULL rather than silently at the CHECK.

ALTER TABLE portals
  ALTER COLUMN portal_level DROP DEFAULT,
  ALTER COLUMN journey_type DROP DEFAULT;