-- 20260921020000_stage_a_lanes.sql
-- ============================================================================
-- Stage A.2 — Consultant / distributor lanes on kira_agents
--
-- WHAT THIS CHANGES (all additive / relaxation — no data movement, no drops of
-- used columns):
--
--  1. `kira_agents.journey_type` CHECK relaxed to include the consultant and
--     distributor lanes (the canonical hierarchy: platform admin → consultant /
--     distributor → client organisation → organisation users). The CHECK was
--     `('personal','business')`; the consultant lane cannot exist while the
--     capture/mint paths read it, and inserting a `journey_type='consultant'`
--     row today violates the CHECK.
--
--  2. `kira_agents.user_id` is no longer NOT NULL. An agent's OWNER is now
--     always the canonical `person_id` (the person-scoped unique index
--     `kira_one_active_agent_per_person_journey` enforces one active agent per
--     person per journey). `user_id` is legacy provenance on that row; a
--     consultant agent being minted against a consultant person must not be
--     forced to fabricate a legacy `users` row to satisfy a NOT NULL FK that
--     the ownership model no longer relies on.
--
--  The uniqueness model is NOT changed here: the person-scoped partial unique
--  index (migration 20260907090000) is already canonical.
-- ============================================================================

BEGIN;

-- 1. Relax the journey_type CHECK to the four canonical lanes.
ALTER TABLE public.kira_agents
    DROP CONSTRAINT IF EXISTS kira_agents_journey_type_check;
ALTER TABLE public.kira_agents
    ADD CONSTRAINT kira_agents_journey_type_check
    CHECK (journey_type IN ('personal', 'business', 'consultant', 'distributor'));

-- 2. user_id becomes nullable (legacy provenance; ownership is person_id).
ALTER TABLE public.kira_agents
    ALTER COLUMN user_id DROP NOT NULL;

COMMIT;