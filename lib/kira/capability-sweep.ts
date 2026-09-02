// After the distil: re-file anything she wrote about HER OWN reach as assistant state.
//
// WHY A SWEEP AND NOT A GUARD AT THE WRITE. There are two writers, and only one of them is ours.
// `save_memory` goes through handleKiraSaveMemory, where the guard sits and works. The end-of-
// conversation distil calls `completeConversationMemory` in @caistech/elevenlabs-convai, which
// inserts straight into the table — so a guard on the tool handler is walked past entirely. That was
// measured, not assumed: the guard shipped, and the next red-team run still filed six of them.
//
// This is the same shape as forgetParkedEntityLeaks directly alongside it, which exists because the
// distil paraphrases and arrives in words an exclusion list never matched. Same problem, same
// remedy: let the distil write, then correct what it filed.
//
// WHAT IT CORRECTS. Asked point-blank what she could reach, she answers honestly — and the distiller
// records the answers as facts about the BUSINESS, tagged `systems`, which is one of the nine real
// Genome areas and specifically the one a buyer reads to judge whether the business runs without its
// owner. Nine rows in one conversation on the first run that caught it; four near-duplicates of the
// same non-fact.
//
// It compounds rather than sitting still: recall includes `genome_section IS NULL`, so an
// unclassified row is read back to her next session, teaches her the limitation is real, and she
// writes it again. Re-filing it `none` is what takes it out of recall.
//
// RE-FILED, NEVER DELETED. `none` is what the owner's own "everything else you have told me" list
// renders, so he can still see it and remove it, while the buyer's handover never carries it.
// Deleting would be the product quietly editing his record.

import { createServiceClientV2 } from '@/lib/supabase/server';
import { resolveOrganisationForPerson } from '@/lib/auth';
import { isAssistantOrProductClaim } from './poison-detect.mjs';

/** Only rows from the conversation that just ended — never a retrospective rewrite of his record. */
const RECENT_MS = 10 * 60 * 1000;

export async function refileAssistantCapabilityClaims(
  organisationId: string | undefined,
  memoryTable: string,
): Promise<number> {
  if (!organisationId) return 0;
  try {
    const supabase = createServiceClientV2();
    const { data } = await supabase
      .from(memoryTable)
      .select('id, content, genome_section, genome_about')
      .eq('organisation_id', organisationId)
      .eq('active', true)
      .gte('created_at', new Date(Date.now() - RECENT_MS).toISOString())
      .limit(100);

    let refiled = 0;
    for (const row of data ?? []) {
      const r = row as { id: string; content: unknown; genome_section: unknown; genome_about: unknown };
      // BOTH classes: what she said she cannot do, AND our own interface described as his business.
      // The second has no negation in it, so the capability detector alone is blind to it — see
      // isProductSurfaceClaim for the row that reached a live Genome tagged `operations`.
      if (!isAssistantOrProductClaim(String(r.content ?? ''))) continue;
      // Already inert — either the tag path worked or a previous sweep caught it.
      if (r.genome_about === 'assistant' || r.genome_section === 'none') continue;

      const now = new Date().toISOString();
      const { error } = await supabase
        .from(memoryTable)
        .update({
          genome_section: 'none',
          genome_headline: '',
          genome_about: 'assistant',
          genome_classified_at: now,
          // Stamped so the row never enters the re-review queue, which selects on these being null.
          // Left unstamped it would be re-proposed for classification forever, which is one of the
          // ways the same non-fact ends up with four near-duplicate rows.
          genome_private_reason: null,
          genome_privacy_classified_at: now,
          genome_owner_dependent: null,
        })
        .eq('id', r.id);
      if (!error) refiled += 1;
    }
    return refiled;
  } catch (error) {
    // Hygiene, not the record. Losing this costs one conversation's tidiness; throwing would cost
    // him every fact from it — the same trade the refusal sweep beside this one makes.
    console.error('[capability-sweep] failed (memories still saved):', error);
    return 0;
  }
}
