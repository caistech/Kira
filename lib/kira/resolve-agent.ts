// lib/kira/resolve-agent.ts
// Canonical Kira agent resolution — the ONE place every Kira-enabled surface answers "which agent
// is Kira in this context?" /dashboard and the other authenticated surfaces (via KiraShapeSection),
// /genome, /drafts, /requests and /talk all consume this, so a caller is handed the SAME agent
// wherever she appears.
//
// WHY THIS IS A SINGLE FUNCTION. The old model had /talk resolving by person_id (the caller's own
// agent) while KiraShapeSection resolved org-wide with no person filter and no ordering — so an
// organisation holding more than one kira_agents row handed one surface the caller's own Kira and
// another surface a different member's, arbitrarily. That is the measured "agent at /talk ≠ agent
// at /dashboard" divergence. Resolution is consolidated here so no surface can drift again.
//
// Ordering, deliberately:
//   1. the caller's own business agent (active)   — "business Kira wins" applies to the CALLER
//   2. the caller's own any other active agent     — a personal Kira is still HIS
//   3. an explicit organisation-level fallback     — the org's shared Kira, for members with no own
//      agent (the INV-020 org-ownership model). Business-first, then any active.
// Within each tier ordering is deterministic (last_conversation_at desc, created_at desc), so two
// surfaces can never disagree about which row "first" means.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ResolvedKiraAgent {
  id: string;
  person_id: string;
  organisation_id: string | null;
  journey_type: string;
  status: string;
  elevenlabs_agent_id: string;
}

export type AgentResolutionReason =
  | 'own-business'
  | 'own-other'
  | 'org-fallback'
  | 'none';

export interface AgentResolution {
  agent: ResolvedKiraAgent | null;
  reason: AgentResolutionReason;
}

interface CallerScope {
  personId: string;
  organisationId: string;
}

const AGENT_COLUMNS =
  'id, person_id, organisation_id, journey_type, status, elevenlabs_agent_id';

interface AgentRow {
  id: string;
  person_id: string;
  organisation_id: string | null;
  journey_type: string;
  status: string;
  elevenlabs_agent_id: string;
}

async function fetchAgents(
  svc: SupabaseClient,
  column: 'person_id' | 'organisation_id',
  value: string,
): Promise<AgentRow[]> {
  const { data } = await svc
    .from('kira_agents')
    .select(AGENT_COLUMNS)
    .eq(column, value)
    .neq('status', 'deleted')
    .order('last_conversation_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return (data ?? []) as AgentRow[];
}

const firstBusiness = (rows: AgentRow[]) =>
  rows.find((row) => row.journey_type === 'business' && row.status === 'active') ??
  rows.find((row) => row.status === 'active');

const resolve = (row: AgentRow): ResolvedKiraAgent => ({
  id: row.id,
  person_id: row.person_id,
  organisation_id: row.organisation_id,
  journey_type: row.journey_type,
  status: row.status,
  elevenlabs_agent_id: row.elevenlabs_agent_id,
});

export async function resolveCanonicalKiraAgent(
  svc: SupabaseClient,
  caller: CallerScope,
): Promise<AgentResolution> {
  const own = await fetchAgents(svc, 'person_id', caller.personId);

const ownAgent = firstBusiness(own);
  if (ownAgent) {
    return {
      agent: resolve(ownAgent),
      reason: ownAgent.journey_type === 'business' ? 'own-business' : 'own-other',
    };
  }

  // No organisation-level fallback. Each caller has their own Kira agent: an
  // org-level agent belonging to another Person can never satisfy this caller's
  // lookup. The caller's only resolutions are their own agents — otherwise Kira
  // must be provisioned for them (KiraBootstrap → /api/kira/ensure).
  return { agent: null, reason: 'none' };
}
