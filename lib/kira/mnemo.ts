// lib/kira/mnemo.ts
// Kira's Mnemo access — now a THIN ADAPTER over the canonical client, not a fourth HTTP client.
//
// This file used to hand-roll the `/v1/memories` and `/v1/search` calls. So did SayFix, so did
// `scripts/bug-memory.mjs`, so did `@caistech/planning-memory` — four implementations of the same
// two requests, differing only in how they chose a scope. The transport now lives in
// `@caistech/mnemo`; what stays here is the part that is genuinely Kira's: the SCOPE POLICY.
//
// The file survives rather than being deleted because three callers depend on these names
// (`recall.ts`, `uid-tools.ts`, `integration/stubs.ts`), and because per-user scoping IS a Kira
// decision worth keeping visible in Kira.
//
// ⚠️ THE SCOPE PREFIX IS FROZEN AT 'kira-user-'. The Mnemo scope id is the container itself —
// facts written under `kira-user-<id>` are invisible from any other prefix. Changing it would
// orphan every fact ever stored for every Kira user. `voiceMemoryScope` is imported from the voice
// package so the prefix used here and the one used by the post-call pipeline cannot drift apart.
//
// Role split (DATA_STANDARD D1/D3): `kira_memory` in our Supabase stays the durable, RLS'd,
// PII-safe source of truth; Mnemo is the SEMANTIC INDEX over the distilled facts, finding the
// differently-worded recurrence that substring recall misses. Only DISTILLED facts leave our
// infrastructure — never transcripts or raw artifacts (I4/S4).
//
// Fail-soft is inherited from the client: no MNEMO_API_KEY → add no-ops, search returns [], and
// recall degrades to kira_memory alone. Nothing here throws.

import { createMnemoClient, normaliseFact } from '@caistech/mnemo';
import { voiceMemoryScope } from '@caistech/elevenlabs-convai';

/** Frozen — see the warning above. */
const SCOPE_PREFIX = 'kira-user-';

const client = createMnemoClient({ label: 'kira/mnemo' });

export function mnemoEnabled(): boolean {
  return client.enabled();
}

/** Add distilled facts to a user's experiential memory. No-ops without a key. Never throws. */
export async function mnemoAdd(userId: string, contents: string[]): Promise<number> {
  if (!userId) return 0;
  return client.add(voiceMemoryScope(SCOPE_PREFIX, userId), contents);
}

/** Semantic search over a user's experiential memory. Returns [] without a key or on any error. */
export async function mnemoSearch(userId: string, query: string, limit = 6): Promise<string[]> {
  if (!userId) return [];
  return client.search(voiceMemoryScope(SCOPE_PREFIX, userId), query, limit);
}

/**
 * Forget one fact from a user's semantic memory — the other half of redacting it.
 *
 * WHY IT IS NEEDED. `save_memory` dual-writes: the fact goes into `kira_memory` AND into Mnemo. The
 * owner's Remove button parked the Postgres row, which took it out of the Genome, out of recall and
 * out of the export — and left the semantic copy, so she could still bring it up in a later
 * conversation. He would have taken it back from everything he could see and been wrong.
 *
 * ⚠️ GATED ON AN EXACT NORMALISED MATCH, NOT THE TOP HIT. Mnemo search is SEMANTIC: asking it for
 * "the yard is sublet from Corvid Holdings" cheerfully returns the nearest neighbours, and the
 * nearest neighbour of a fact about his business is another fact about his business. Deleting the
 * top hit would mean a redaction that sometimes removes the wrong line — silently, permanently from
 * his point of view, and in the one feature whose entire purpose is that he controls what is kept.
 *
 * So the candidates are compared on the same normalised form the save path already dedupes with,
 * and only exact matches are forgotten. A near-miss is left alone and reported as not-found.
 *
 * @returns `forgotten` — how many were removed; and `matched`, so the caller can tell "there was
 *   nothing there" apart from "there was something and it would not go". Reporting a clean removal
 *   in either of those cases would be the same lie in different clothes.
 */
export async function mnemoForget(userId: string, content: string): Promise<{ matched: number; forgotten: number }> {
  const wanted = normaliseFact(String(content ?? ''));
  if (!userId || !wanted) return { matched: 0, forgotten: 0 };

  // A wider net than a redaction needs, deliberately: the same fact may be stored more than once
  // (worded identically), and the exact-match filter below is what makes over-fetching safe.
  const candidates = await client.find(voiceMemoryScope(SCOPE_PREFIX, userId), content, 20);
  const exact = candidates.filter((m) => normaliseFact(m.content) === wanted);
  if (exact.length === 0) return { matched: 0, forgotten: 0 };

  let forgotten = 0;
  for (const memory of exact) {
    if (await client.forget(memory.id)) forgotten += 1;
  }
  return { matched: exact.length, forgotten };
}
