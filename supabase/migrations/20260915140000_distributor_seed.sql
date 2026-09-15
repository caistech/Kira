-- ============================================================================
-- DISTRIBUTOR SEED — FIRST TIER 2 DISTRIBUTOR (BRIAN KERRIGAN / EXCELERATING)
-- ============================================================================
-- Established 2026-09-15 on the strength of the Kira + STAR pilot conversations
-- (Brian Kerrigan, Excelerating Business Growth). Brian is granted a distributor
-- portfolio over the "Corporate AI Solutions" beta tenant org — the shared org
-- under which distributors experience user-level Kira
-- (DISTRIBUTOR_EXPERIENCE_PATHWAY_SPEC §1) so he can test the client-facing
-- beta before the STAR integration shape is finalised.
--
-- Provisional identity: Brian has NOT signed in via the canonical auth chain, so
-- he gets a persons row with no auth_credentials (same pattern as E1.0-A). His
-- end-to-end access activates the moment he signs in and the auth link resolves.
--
-- Idempotent; safe to re-run. Every INSERT is guarded.
-- ============================================================================

BEGIN;

-- 1. Provisional person for Brian (no auth_credentials — see header note).
INSERT INTO persons (email, first_name, last_name, status, created_at)
VALUES ('bkerrigan@excelerating.com', 'Brian', 'Kerrigan', 'active', NOW())
ON CONFLICT (email) DO NOTHING;

-- 2. Beta tenant org — the shared owner-journey org. Created if absent
--    (legal_name has no UNIQUE constraint; WHERE NOT EXISTS is the guard).
INSERT INTO organisations (legal_name, trading_name, status, created_at)
SELECT 'Corporate AI Solutions', 'Corporate AI Solutions', 'active', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM organisations WHERE legal_name = 'Corporate AI Solutions'
);

-- 3. Portfolio entry: Brian oversees the beta tenant org.
INSERT INTO distributor_portfolio (distributor_person_id, client_organisation_id, status, created_at)
SELECT p.person_id, o.organisation_id, 'active', NOW()
FROM persons p, organisations o
WHERE p.email = 'bkerrigan@excelerating.com'
  AND o.legal_name = 'Corporate AI Solutions'
ON CONFLICT (distributor_person_id, client_organisation_id) DO NOTHING;

COMMIT;