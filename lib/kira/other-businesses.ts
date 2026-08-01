// lib/kira/other-businesses.ts
// What has already been ruled out of this owner's Genome as belonging to a DIFFERENT company.
//
// ONE COPY, ON PURPOSE. Both distil paths need this — the typed transport's end-of-session pass and
// the voice post-call webhook — and it existed as two hand-written queries for about an hour. In
// that hour the ordering defect below was found and fixed in one of them, which is the whole
// argument for this file: the second copy would have kept the bug and nothing would have said so.
//
// THE ORDERING IS THE POINT, not tidiness. The first version ran unordered with a limit. Once an
// owner had more parked facts than the limit, which ones came back was arbitrary — and in the
// measured case it dropped the row written SIX SECONDS EARLIER in the very conversation being
// distilled. Every red-team run invents a differently-named company, so forty stale exclusions
// exclude nothing about the current one: the list was full and the only entry that mattered was
// missing. It read exactly like the exclusion prompt failing, and it was a correct mechanism being
// fed the wrong forty rows.

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * How many parked facts to carry into the extractor prompt.
 *
 * Enough to cover the businesses an owner actually mentions, bounded because this is pasted into a
 * system prompt and an unbounded list would crowd out the instruction it is attached to.
 */
const MAX_EXCLUSIONS = 40;

/**
 * @param supabase service-role client (both callers already hold one)
 * @param userId   the owner whose record is being distilled
 * @param memoryTable table name — Kira renames the convai tables (kira_memory, not convai_memory)
 */
export async function parkedOtherBusinesses(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string | undefined,
  memoryTable: string,
): Promise<string[]> {
  if (!userId) return [];
  try {
    const { data } = await supabase
      .from(memoryTable)
      .select('content')
      .eq('user_id', userId)
      .eq('parked_reason', 'entity:other')
      // NEWEST FIRST — see the header. Without it the exclusion that matters is the one dropped.
      .order('created_at', { ascending: false })
      .limit(MAX_EXCLUSIONS);
    return (data ?? []).map((m: { content: unknown }) => String(m.content ?? '')).filter(Boolean);
  } catch (error) {
    // Degrade, never fail the distil: losing the exclusions costs entity separation on one
    // conversation, and throwing here would cost the owner every fact from it.
    console.error('[other-businesses] could not read parked facts (distil continues):', error);
    return [];
  }
}
