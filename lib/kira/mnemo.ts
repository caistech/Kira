// lib/kira/mnemo.ts
// Kira's Mnemo integration — the EXPERIENTIAL/semantic-memory lane (DATA_STANDARD §6 target #2).
//
// Role split (DATA_STANDARD, and Seam 2 of the Gareth/Shah brief):
//   - kira_memory (our Supabase) stays the DURABLE, RLS'd, PII-safe source of truth + near-term recall.
//   - Mnemo is the SEMANTIC INDEX over the DISTILLED facts — it finds a differently-worded recurrence
//     ("what happened on that job six weeks ago") that the substring recall misses. Same pattern as
//     the bug-knowledge protocol: the JSON stays source of truth, Mnemo is the semantic index over it.
//
// Guardrails (I4/S4): only DISTILLED facts leave our infra (never raw transcripts/PDFs). Scope is
// PER-USER (isolation, S2 — a stable id, never a mutable string), so one owner's memory can never
// surface for another. PII posture is Seam-2 question #9 in the brief (who enforces distillation at
// the boundary) — for now we send the already-distilled kira_memory facts, per-user-scoped.
//
// Fail-soft: no MNEMO_API_KEY → add no-ops, search returns []; recall degrades to kira_memory alone.
// This shape mirrors scripts/bug-memory.mjs so #4 can lift it into the canonical voice-memory package.

const API_URL = (process.env.MNEMO_API_URL || 'https://api.mnemohq.com').replace(/\/$/, '');

function apiKey(): string | undefined {
  return process.env.MNEMO_API_KEY?.trim() || undefined;
}

export function mnemoEnabled(): boolean {
  return Boolean(apiKey());
}

// Per-user isolation via a namespaced org-scope id (org type is the proven Mnemo scope shape).
function scopeFor(userId: string) {
  return { type: 'org' as const, id: `kira-user-${userId}` };
}

/** Add distilled facts to a user's experiential memory. No-ops without a key. Never throws. */
export async function mnemoAdd(userId: string, contents: string[]): Promise<number> {
  const key = apiKey();
  const items = (contents || []).map((c) => c?.trim()).filter(Boolean);
  if (!key || !userId || items.length === 0) return 0;
  try {
    const res = await fetch(`${API_URL}/v1/memories`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: scopeFor(userId), items: items.map((content) => ({ content })) }),
    });
    return res.ok ? items.length : 0;
  } catch {
    return 0;
  }
}

/** Semantic search over a user's experiential memory. Returns [] without a key or on any error. */
export async function mnemoSearch(userId: string, query: string, limit = 6): Promise<string[]> {
  const key = apiKey();
  if (!key || !userId || !query?.trim()) return [];
  try {
    const res = await fetch(`${API_URL}/v1/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, scope: scopeFor(userId), limit }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((r: any) => r?.content?.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
