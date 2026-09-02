// lib/genome/access-log.ts — the record behind "our support team can see what Kira has captured".
//
// ⚠️ THE WRITE MUST NOT BREAK THE VIEW, AND THE VIEW MUST NOT BE SILENT ABOUT IT.
//
// Two failure modes pull in opposite directions and both are real:
//
//   Throw on a logging failure  → an operator cannot open a record to help someone, because the
//                                 audit table is down. Support is now blocked by its own paperwork.
//   Swallow it entirely         → the log quietly stops recording, the owner's page keeps saying
//                                 "nobody has looked", and the promise is worse than never made.
//
// So: never throw, always console.error loudly. The page that reads it says plainly that it lists
// operator views and nothing else, rather than implying a completeness it cannot guarantee.

import { createServiceClientV2 } from '@/lib/supabase/server';

export interface GenomeView {
  viewedBy: string;
  surface: string;
  viewedAt: string;
}

/**
 * Record that an operator opened an owner's Genome.
 *
 * Fire-and-forget by contract — the caller does not await a decision on it.
 */
export async function recordGenomeView(input: {
  userId: string;
  viewedBy: string;
  surface: string;
}): Promise<void> {
  if (!input.userId || !input.viewedBy) return;
  try {
    const { error } = await createServiceClientV2().from('genome_access_log').insert({
      user_id: input.userId,
      viewed_by: input.viewedBy,
      surface: input.surface,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    // Loud, because a silent stop here turns an accountability back into a promise.
    console.error('[genome-access-log] FAILED TO RECORD A VIEW:', e);
  }
}

/**
 * What to show the owner.
 *
 * ⚠️ SCOPED BY THE CALLER'S OWN id, always. This table names operators, so a query that took an
 * id from anywhere other than the session would let one owner enumerate who works here and whose
 * records they opened.
 */
export async function readGenomeViews(userId: string, limit = 50): Promise<GenomeView[]> {
  if (!userId) return [];
  try {
    const { data, error } = await createServiceClientV2()
      .from('genome_access_log')
      .select('viewed_by, surface, viewed_at')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      viewedBy: String(row.viewed_by),
      surface: String(row.surface),
      viewedAt: String(row.viewed_at),
    }));
  } catch (e) {
    console.error('[genome-access-log] could not read views:', e);
    return [];
  }
}
