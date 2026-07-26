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

import { createMnemoClient } from '@caistech/mnemo';
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
