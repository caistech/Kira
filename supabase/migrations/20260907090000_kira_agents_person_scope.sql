-- Migration: 20260907090000_kira_agents_person_scope.sql
-- Purpose: Remap kira_agents from organisation-scoped to person-scoped.
--
-- WHY: every Kira user gets their own ElevenLabs agent (own coach, prompt/configuration,
-- voice identity, conversation context). The current org-scoped unique index
-- (kira_one_active_agent_per_org_journey on (organisation_id, journey_type)) means all
-- members of an organisation share one ElevenLabs agent — so a second person talking to
-- the shared agent resolves through the provisioner's identity, not their own.
--
-- This migration ONLY attaches a canonical person_id to each EXISTING kira_agents row,
-- based on the row's own legacy user_id ownership. It does NOT clone or reuse any
-- existing agent for a person who has no row — those people get a fresh ElevenLabs agent
-- provisioned by /api/kira/ensure on their next contact.

BEGIN;

-- 1. Add the canonical person scope column (nullable during backfill).
ALTER TABLE public.kira_agents
    ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES persons(person_id);

-- 2. Backfill person_id from the existing row's legacy ownership:
--    kira_agents.user_id (users.id) → users.auth_user_id → auth_credentials.auth_user_id
--    → auth_credentials.person_id.
--    This binds each existing agent to ITS OWNER'S person, never to anyone else.
UPDATE public.kira_agents ka
SET person_id = ac.person_id
FROM users u
JOIN auth_credentials ac ON ac.auth_user_id::uuid = u.auth_user_id
WHERE ka.user_id = u.id
  AND ka.person_id IS NULL;

-- 3. Enforce the invariant: an active agent must name its owning person.
--    (person_id stays nullable for non-active/deleted rows.)
ALTER TABLE public.kira_agents
    ADD CONSTRAINT kira_agents_active_person_id_check
    CHECK (status <> 'active' OR person_id IS NOT NULL);

-- 4. Drop the organisation-scoped "one active agent per org per journey" index.
DROP INDEX IF EXISTS public.kira_one_active_agent_per_org_journey;

-- 5. Create the person-scoped equivalent: one active agent per person per journey.
CREATE UNIQUE INDEX kira_one_active_agent_per_person_journey
    ON public.kira_agents (person_id, journey_type)
    WHERE status = 'active';

-- 6. Index the person column for the ensure/agent/chat lookups.
CREATE INDEX IF NOT EXISTS idx_kira_agents_person_id ON public.kira_agents(person_id);

-- 7. RLS: an authenticated caller may read/write ONLY their own agent.
--    Org-members do NOT get blanket access to every agent in the org — the agent is
--    personal. Org admins keep org management; the service role keeps full access.
DROP POLICY IF EXISTS kira_agents_org_member_select ON public.kira_agents;
CREATE POLICY kira_agents_owner_access ON public.kira_agents
    FOR ALL USING (
        person_id IN (
            SELECT ac.person_id FROM auth_credentials ac
            WHERE ac.auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              AND ac.status = 'active'
        )
    ) WITH CHECK (
        person_id IN (
            SELECT ac.person_id FROM auth_credentials ac
            WHERE ac.auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
              AND ac.status = 'active'
        )
    );

COMMIT;