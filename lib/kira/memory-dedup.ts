// lib/kira/memory-dedup.ts
// Collapses repeated memory facts (#2). The post-call distil appends facts every conversation, so
// over time near-identical facts pile up ("Dennis is working on Kira for business owner…" a dozen
// times) — recall gets noisy and Mnemo fills with duplicates. This keeps the newest of each
// duplicate group active and marks the rest superseded (active=false), so recall stays clean.
//
// Matching is normalized-text (lowercase, punctuation/whitespace stripped) — it catches the literal
// repeats that are the bulk of the noise. Semantic near-duplicates ("developing X" vs "currently
// developing X") are a later refinement (would need embeddings); this is the high-value 80%.

import { createServiceClient } from '@/lib/supabase/server';

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Deactivate duplicate active facts for a user, keeping the newest of each normalized group.
 * Returns the number deactivated. Best-effort — never throws into the post-call path.
 */
export async function dedupeUserMemory(userId: string): Promise<number> {
  if (!userId) return 0;
  const supabase = createServiceClient();
  try {
    const { data: rows } = await supabase
      .from('kira_memory')
      .select('id, content, created_at')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false }); // newest first → first seen per group is the keeper

    const seen = new Set<string>();
    const supersede: string[] = [];
    for (const r of rows ?? []) {
      const key = normalize(String((r as any).content || ''));
      if (!key) continue;
      if (seen.has(key)) supersede.push((r as any).id);
      else seen.add(key);
    }
    if (!supersede.length) return 0;

    await supabase.from('kira_memory').update({ active: false }).in('id', supersede);
    return supersede.length;
  } catch (e) {
    console.error('[memory-dedup] failed:', e);
    return 0;
  }
}

/** Normalized set of a user's ACTIVE memory — used to skip writing duplicates to Mnemo. */
export async function activeMemoryKeys(userId: string): Promise<Set<string>> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('kira_memory')
    .select('content')
    .eq('user_id', userId)
    .eq('active', true);
  return new Set((data ?? []).map((r: any) => normalize(String(r.content || ''))).filter(Boolean));
}

export { normalize as normalizeMemory };
