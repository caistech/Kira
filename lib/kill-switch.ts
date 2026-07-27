// lib/kill-switch.ts
//
// Reading the kill switch, on the hot path, without making it a liability.
//
// Three decisions, each with a real trade-off:
//
// 1. FAIL CLOSED WHEN THE ANSWER IS UNKNOWN. If we cannot read the flag and have never read it, we
//    halt. The scenario in which someone throws this switch is precisely the scenario in which
//    "we weren't sure, so we carried on" is the wrong answer. The cost is low: the flags live in
//    the same Postgres the product needs for everything else, so a database we cannot reach is
//    already an outage — failing closed here loses almost nothing and buys certainty.
//
// 2. LAST-KNOWN-VALUE CACHE, so a blip does not become an outage. Once we have successfully read a
//    value we keep serving it for CACHE_TTL_MS, and on a read failure we keep serving the last
//    known value rather than halting. The switch is for incidents lasting minutes-to-hours; ten
//    seconds of staleness is irrelevant to that and removes a per-request query from every
//    conversation start.
//
// 3. 'all' IS CHECKED ALONGSIDE EVERY SCOPE. In an incident nobody wants to remember the scope
//    names. One flag stops everything; the specific flags exist for the case where you know exactly
//    what is wrong and would rather not take the whole product down.
//
// Standard: docs/AI_INCIDENT_RESPONSE.md §4.1.

import { createServiceClient } from '@/lib/supabase/server';

/** Scopes that can be halted. Mirrors the rows seeded in 20260727180000_kill_switch.sql. */
export type HaltScope = 'all' | 'conversations' | 'outbound_email';

export interface HaltState {
  halted: boolean;
  scope: HaltScope | null;
  reason: string | null;
}

const CACHE_TTL_MS = 10_000;

interface CacheEntry {
  at: number;
  rows: Map<string, { halted: boolean; reason: string | null }>;
}

let cache: CacheEntry | null = null;

async function readFlags(): Promise<CacheEntry['rows'] | null> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.from('system_flags').select('flag, halted, reason');
    if (error || !data) return null;
    const rows = new Map<string, { halted: boolean; reason: string | null }>();
    for (const row of data) {
      rows.set(String(row.flag), { halted: Boolean(row.halted), reason: (row.reason as string) ?? null });
    }
    return rows;
  } catch {
    return null;
  }
}

/**
 * Is this scope halted?
 *
 * Never throws — callers are on request paths and an exception here would be indistinguishable from
 * the outage the switch exists to manage.
 */
export async function haltState(scope: Exclude<HaltScope, 'all'>): Promise<HaltState> {
  const fresh = cache && Date.now() - cache.at < CACHE_TTL_MS;
  if (!fresh) {
    const rows = await readFlags();
    if (rows) {
      cache = { at: Date.now(), rows };
    } else if (!cache) {
      // Never successfully read, and cannot read now. Fail closed — see decision 1.
      return {
        halted: true,
        scope: null,
        reason: 'Kill-switch state could not be read. Halting until it can be.',
      };
    }
    // Otherwise: read failed but we have a previous value. Keep serving it (decision 2).
  }

  const rows = cache!.rows;
  const all = rows.get('all');
  if (all?.halted) return { halted: true, scope: 'all', reason: all.reason };

  const specific = rows.get(scope);
  if (specific?.halted) return { halted: true, scope, reason: specific.reason };

  return { halted: false, scope: null, reason: null };
}

/** Convenience for call sites that only need the boolean. */
export async function isHalted(scope: Exclude<HaltScope, 'all'>): Promise<boolean> {
  return (await haltState(scope)).halted;
}

/**
 * Throw if the scope is halted. For paths that should refuse loudly rather than branch.
 *
 * The message is deliberately operator-facing and must not be shown verbatim to an end user — it
 * can carry the incident reason.
 */
export async function assertNotHalted(scope: Exclude<HaltScope, 'all'>): Promise<void> {
  const state = await haltState(scope);
  if (state.halted) {
    throw new Error(
      `[kill-switch] ${scope} halted${state.scope === 'all' ? ' (via "all")' : ''}` +
        (state.reason ? `: ${state.reason}` : ''),
    );
  }
}

/** Drop the cache. For tests, and for an operator wanting a thrown switch to bite immediately. */
export function resetKillSwitchCache(): void {
  cache = null;
}
