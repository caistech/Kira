// lib/kira/entity-sweep.ts
// The semantic half of keeping another company out of this Genome.
//
// The database trigger (20260802020000) parks any memory naming a company already ruled out, no
// matter which path wrote it. That closes Postgres. It cannot close Mnemo, because the distil
// dual-writes: the canonical pipeline hands the fact to the semantic lane as well, and a row parked
// in one store while it is published to the other leaves the guard technically satisfied and
// practically absent. She would still recall it, still say it, and the owner would have no way to
// tell — which is the exact failure the Remove button was fixed for on 31 July.
//
// So this runs AFTER a distil: whatever the trigger just parked is taken back out of the semantic
// lane too.
//
// FAIL-SOFT, LIKE EVERY MEMORY PATH. A Mnemo outage must degrade recall, never break a session
// (DATA_STANDARD R4). Nothing here throws, and the count is returned so the caller can log a partial
// sweep rather than report a clean one.

import { createServiceClient } from '@/lib/supabase/server';
import { mnemoForget } from '@/lib/kira/mnemo';

/**
 * How far back to look for rows this distil caused.
 *
 * A distil writes within seconds of being called, so a few minutes is generous. Bounded because the
 * alternative — sweeping every parked fact the owner has ever had — would re-check the whole history
 * on every session end, and would keep asking Mnemo to forget things it forgot weeks ago.
 */
const RECENT_MS = 10 * 60 * 1000;

/**
 * Take newly-parked other-business facts out of the semantic lane.
 *
 * Deliberately keyed on the PARK, not on which path did the parking. A fact parked by save_memory was
 * never written to Mnemo, so asking Mnemo to forget it matches nothing and costs one lookup — and
 * that is far better than maintaining a second idea of which writes reached the semantic lane, which
 * would be one more thing to keep in step.
 *
 * @returns how many semantic copies were actually removed
 */
export async function forgetParkedEntityLeaks(
  userId: string | undefined,
  memoryTable: string,
): Promise<number> {
  if (!userId) return 0;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from(memoryTable)
      .select('content')
      .eq('user_id', userId)
      .eq('parked_reason', 'entity:other')
      .gte('created_at', new Date(Date.now() - RECENT_MS).toISOString())
      .limit(50);

    let forgotten = 0;
    for (const row of data ?? []) {
      const content = String((row as { content: unknown }).content ?? '');
      if (!content) continue;
      const result = await mnemoForget(userId, content);
      forgotten += result.forgotten;
    }
    if (forgotten) console.warn(`[entity-sweep] removed ${forgotten} other-business fact(s) from the semantic lane`);
    return forgotten;
  } catch (error) {
    console.error('[entity-sweep] could not sweep the semantic lane:', error);
    return 0;
  }
}
