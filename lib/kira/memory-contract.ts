// lib/kira/memory-contract.ts
// The canonical memory boundary for Kira.
//
// All read/write operations on `kira_memory` MUST cross this boundary.
// It enforces organisational ownership (OrganisationId), enforces that PersonId is provenance only,
// and prohibits silent fallbacks to user-owned semantics.

import { createServiceClientV2 } from '@/lib/supabase/server';
import { type OrganisationContext } from '@/lib/auth';

export interface SaveMemoryParams {
  content: string;
  memoryType: 'preference' | 'context' | 'goal' | 'decision' | 'followup' | 'correction' | 'insight';
  importance?: number;
  tags?: string[];
  sourceConversationId?: string | null;
  assistantStateFields?: Record<string, unknown>;
  belongsElsewhere?: boolean;
  parkedReason?: string;
  parkedEntity?: string;
  agentId?: string | null;
}

export interface RecallMemoryParams {
  query: string;
  limit?: number;
  agentId?: string | null;
}

export interface MemoryEntry {
  id: string;
  content: string;
  importance: number | null;
  created_at: string;
}

/**
 * Persist a memory under the organisation context.
 */
export async function saveMemory(
  ctx: OrganisationContext,
  params: SaveMemoryParams
): Promise<{ success: boolean; memoryId?: string; error?: string }> {
  const supabase = createServiceClientV2();

  const { error } = await supabase.from('kira_memory').insert({
    organisation_id: ctx.organisationId,
    user_id: ctx.personId, // provenance
    agent_id: params.agentId ?? null,
    kira_agent_id: params.agentId ?? null,
    memory_type: params.memoryType,
    content: params.content,
    importance: params.importance ?? 6,
    source_conversation_id: params.sourceConversationId ?? null,
    ...(params.assistantStateFields ?? {}),
    ...(params.belongsElsewhere
      ? {
          active: false,
          parked_reason: params.parkedReason ?? 'entity:other',
          ...(params.parkedEntity ? { parked_entity: params.parkedEntity } : {}),
        }
      : {}),
  });

  if (error) {
    console.error('[memory-contract] saveMemory failed:', error);
    return { success: false, error: 'Failed to save memory' };
  }

  return { success: true };
}

/**
 * Recall memories under the organisation context.
 */
export async function recallMemory(
  ctx: OrganisationContext,
  params: RecallMemoryParams
): Promise<MemoryEntry[]> {
  const supabase = createServiceClientV2();

  let q = supabase
    .from('kira_memory')
    .select('id, content, importance, created_at')
    .eq('organisation_id', ctx.organisationId)
    .eq('active', true)
    .ilike('content', `%${params.query}%`)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 6);

  if (params.agentId) q = q.eq('agent_id', params.agentId);

  const { data, error } = await q;
  if (error) {
    console.error('[memory-contract] recallMemory failed:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    content: String(row.content ?? ''),
    importance: row.importance,
    created_at: row.created_at,
  }));
}
