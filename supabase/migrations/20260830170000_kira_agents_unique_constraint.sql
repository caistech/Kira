-- Migration: 20260830170000_kira_agents_unique_constraint.sql
-- Purpose: Remap unique constraint on kira_agents from user_id to organisation_id.

BEGIN;

-- 1. Drop legacy user-scoped partial unique index (20260120000000)
DROP INDEX IF EXISTS public.kira_one_active_agent_per_journey;

-- 2. Drop legacy user-scoped unique constraint (20260119000000)
ALTER TABLE IF EXISTS public.kira_agents 
    DROP CONSTRAINT IF EXISTS kira_agents_user_id_journey_type_key;

-- 3. Create canonical organisation-scoped unique index
CREATE UNIQUE INDEX kira_one_active_agent_per_org_journey 
ON public.kira_agents (organisation_id, journey_type) 
WHERE status = 'active';

COMMIT;
