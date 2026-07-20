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

export async function applyProfileExtraction(
  supabase: SupabaseClient,
  userId: string,
  extracted: ClientProfile,
  opts: { source: string; bumpSession: boolean },
): Promise<{ completeness: number; discovery_complete: boolean }> {
  const { data: existing } = await supabase
    .from('client_profiles')
    .select('profile, sessions_count')
    .eq('user_id', userId)
    .maybeSingle();

  const merged = mergeProfile((existing?.profile as Partial<ClientProfile>) ?? {}, extracted);
  const completeness = computeCompleteness(merged);
  const discovery_complete = completeness >= DISCOVERY_COMPLETE_THRESHOLD;
  // Ingestion pre-briefs deepen the profile but are NOT conversations — they don't bump
  // sessions_count (which drives the "we've spoken before" recall) or last_discovery_at.
  const sessionsCount = (existing?.sessions_count ?? 0) + (opts.bumpSession ? 1 : 0);

  const row: Record<string, unknown> = {
    user_id: userId,
    profile: merged,
    completeness,
    discovery_complete,
    sessions_count: sessionsCount,
    updated_at: new Date().toISOString(),
  };
  if (opts.bumpSession) row.last_discovery_at = new Date().toISOString();

  await supabase.from('client_profiles').upsert(row, { onConflict: 'user_id' });

  // Brief any active operational agents so their recall surfaces the deepened profile.
  const { data: agents } = await supabase
    .from('kira_agents')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (agents && agents.length > 0) {
    const briefing = buildProfileBriefing(merged);
    for (const a of agents) {
      await supabase.from('kira_memory').insert({
        user_id: userId,
        kira_agent_id: a.id,
        memory_type: 'context',
        content: briefing,
        importance: 9,
        tags: ['client_profile', opts.source],
      });
    }
  }

  return { completeness, discovery_complete };
}
