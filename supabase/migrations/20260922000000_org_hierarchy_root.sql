-- 20260922000000_org_hierarchy_root.sql
-- ============================================================================
-- Stage A follow-up — the parent_organisation_id root that Stage A
-- (20260921000000_chain_of_truth_hierarchy.sql) added but nothing populated.
--
-- The target hierarchy is portfolio -> project -> distributor -> client_org
-- (docs/TARGET_TECHNICAL_DESIGN_CHAIN_OF_TRUTH.md), and each org's parent is
-- "whichever org the person creating it belongs to". That works for
-- distributor -> client_org (the creating distributor's own org row exists),
-- but admin-created distributor orgs had nothing to point at: there was no
-- 'project'-level org row inside Kira's own database representing Kira
-- itself — that concept only existed in a DIFFERENT Supabase project (CAS's
-- portfolio_projects table), which this same-table FK cannot reference.
--
-- WHAT THIS DOES:
--  1. Creates ONE root organisation (org_type='project', legal_name='Kira')
--     inside Kira's own organisations table — idempotent, inserted only if
--     no such row exists yet.
--  2. Backfills every EXISTING distributor org with no parent to point at it.
--     Unambiguous: there is exactly one root, so no guessing across records.
--
-- Deliberately NOT backfilling existing client_org rows here — which
-- distributor "owns" a given client_org is derivable from distributor_portfolio
-- but not always unambiguous (reassignment history, zero or multiple active
-- rows), and guessing wrong would fabricate a hierarchy edge rather than
-- record a real one. New client_org rows get their parent set correctly going
-- forward in app/distributor/(panel)/actions.ts. Portfolio-level (org_type=
-- 'portfolio', i.e. Corporate AI Solutions itself) is deliberately NOT created
-- here either — nothing needs it yet, and the root project row's own parent
-- stays NULL rather than inventing a second row nothing references.
-- ============================================================================

BEGIN;

-- 1. The root 'project' org. Guarded by existence, not a fixed UUID, so this
--    is safe to re-run (supabase db push re-applies every migration file).
INSERT INTO organisations (legal_name, trading_name, org_type, status)
SELECT 'Kira', 'Kira', 'project', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM organisations WHERE org_type = 'project' AND legal_name = 'Kira'
);

-- 2. Backfill every existing parentless distributor org to point at the root.
UPDATE organisations
SET parent_organisation_id = (
  SELECT organisation_id FROM organisations WHERE org_type = 'project' AND legal_name = 'Kira' LIMIT 1
)
WHERE org_type = 'distributor' AND parent_organisation_id IS NULL;

COMMIT;
