// lib/kira/apply-profile.ts
// Shared "apply a fresh Client Profile extraction" sink, used by BOTH the voice discovery loop
// (lib/kira/discovery.ts onResult) and the ingestion pre-brief (app/api/kira/discovery/ingest).
// It deepens the stored profile (mergeProfile — never regresses), recomputes the gate, and seeds a
// briefing memory into the user's active operational agents. Single source so the two paths can't
// drift.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type ClientProfile,
  mergeProfile,
  computeCompleteness,
  buildProfileBriefing,
  DISCOVERY_COMPLETE_THRESHOLD,
} from './discovery-schema';
import { type OrganisationContext } from '@/lib/auth';
import { saveMemory } from './memory-contract';

export async function applyProfileExtraction(
  supabase: SupabaseClient,
  orgContext: OrganisationContext,
  extracted: ClientProfile,
  opts: { source: string; bumpSession: boolean },
): Promise<{ completeness: number; discovery_complete: boolean }> {
  const organisationId = orgContext.organisationId;
  const userId = orgContext.personId;

  const { data: existing } = await supabase
    .from('client_profiles')
    .select('profile, sessions_count')
    .eq('organisation_id', organisationId)
    .maybeSingle();

  const merged = mergeProfile((existing?.profile as Partial<ClientProfile>) ?? {}, extracted);
  const completeness = computeCompleteness(merged);
  const discovery_complete = completeness >= DISCOVERY_COMPLETE_THRESHOLD;
  // Ingestion pre-briefs deepen the profile but are NOT conversations — they don't bump
  // sessions_count (which drives the "we've spoken before" recall) or last_discovery_at.
  const sessionsCount = (existing?.sessions_count ?? 0) + (opts.bumpSession ? 1 : 0);

  const row: Record<string, unknown> = {
    user_id: userId,
    organisation_id: organisationId,
    profile: merged,
    completeness,
    discovery_complete,
    sessions_count: sessionsCount,
    updated_at: new Date().toISOString(),
  };
  if (opts.bumpSession) row.last_discovery_at = new Date().toISOString();

  // INV-020: the Client Profile is organisation-owned, so it is read AND written by
  // organisation_id. The transition migration added organisation_id (NOT NULL) but defined no
  // unique constraint on it, so a plain upsert-with-conflict-target would reference an index that
  // does not exist — a read-then-update-or-insert keyed by organisation_id is the same semantics
  // without depending on one.
  if (existing) {
    await supabase.from('client_profiles').update(row).eq('organisation_id', organisationId);
  } else {
    await supabase.from('client_profiles').insert(row);
  }

  const { data: agents } = await supabase
    .from('kira_agents')
    .select('id')
    .eq('organisation_id', orgContext.organisationId)
    .eq('status', 'active');
  if (agents && agents.length > 0) {
    const briefing = buildProfileBriefing(merged);
    for (const a of agents) {
      await saveMemory(orgContext, {
        agentId: a.id,
        memoryType: 'context',
        content: briefing,
        importance: 9,
        assistantStateFields: { tags: ['client_profile', opts.source] },
      });
    }
  }

  return { completeness, discovery_complete };
}
