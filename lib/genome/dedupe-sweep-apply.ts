// lib/genome/dedupe-sweep-apply.ts — the caller `swallowedIds` never had.
//
// ⚠️ THE RULE WAS WRITTEN, TESTED, AND WIRED TO NOTHING. `swallowedIds` has existed since
// 2026-08-16, with a full account of the defect it was built for and a passing suite, and no code
// path in the repo called it. Ray's document therefore still carried his pricing twice on the
// walkthrough after it was written — and the duplicates are the root of three separate findings, not
// one:
//
//   1. "My pricing is in there twice. Once under How work is priced and quoted, and again word for
//      word at the bottom of the loose list."
//   2. The privacy contradiction. Of the two near-identical Gary rows, ONE is marked `not-yet-told`
//      and the other is not — so the screen truthfully said "kept out of the handover document"
//      about its copy while the document truthfully contained the other. Ray: "the screen and the
//      file are telling me two different things about the single most sensitive thing in this
//      product."
//   3. The four disagreeing counts, which are four honest tallies of a set containing duplicates.
//
// This is the "correct, tested and unreachable" class that project memory names as the dominant
// defect here. The rule was never wrong; nothing ran it.
//
// ⚠️ DEACTIVATE, NEVER DELETE. `active: false` keeps the row recoverable and out of every read path,
// which is the same park-don't-drop posture the entity guard takes. A dedupe that destroys is one
// bad containment score away from removing a fact an owner told us once.

import { createServiceClient } from '@/lib/supabase/server';

import { swallowedIds, type SweepableMemory } from './dedupe-sweep';

/**
 * Drop the restatements from one owner's active memories.
 *
 * Returns how many were parked. Never throws: this runs at the end of the post-call pipeline, and a
 * failure here must not lose the conversation that produced the facts.
 */
export async function sweepDuplicateMemories(
  userId: string | undefined,
  table: string,
): Promise<number> {
  if (!userId) return 0;
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from(table)
      // ⚠️ `confirmed_at`, NOT `genome_confirmed_at`. The first version named a column that does not
      // exist, so the query errored into the catch below and the sweep did nothing — a caller that
      // reads exactly like a working one. Verified against the live table before wiring.
      .select('id, content, confirmed_at')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(500);
    if (error) throw new Error(error.message);

    const memories: SweepableMemory[] = (data ?? []).map((row) => ({
      id: String(row.id),
      content: String(row.content ?? ''),
      // A fact he has read back and agreed with is evidence, and is never dropped.
      confirmed: Boolean(row.confirmed_at),
    }));

    const drop = swallowedIds(memories);
    if (drop.length === 0) return 0;

    const { error: updateError } = await svc
      .from(table)
      .update({ active: false, parked_reason: 'duplicate:swallowed' })
      .in('id', drop);
    if (updateError) throw new Error(updateError.message);

    console.info(`[dedupe-sweep] parked ${drop.length} swallowed memories for ${userId}`);
    return drop.length;
  } catch (e) {
    console.error('[dedupe-sweep] sweep failed:', e);
    return 0;
  }
}
