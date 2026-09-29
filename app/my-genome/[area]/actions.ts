'use server';

// Assessing one area on demand, and storing the verdict.
//
// WHY ON DEMAND RATHER THAN ON PAGE LOAD. The assessment is a model call per area; running nine on
// every visit to the Genome would put seconds in front of a man who only wanted to look at it, and
// most visits change nothing. So it is an action he takes, and the panel is honest about not having
// run yet — which is true, and is a better thing to show than a spinner.
//
// WHY IT STORES. The same verdict must read the same way twice running. A criticism that rewords
// itself on refresh reads as arbitrary, and this one is telling a man his answer about his own
// business was not good enough — that has to sound like a considered position, not a new opinion
// each time he looks.

import { revalidatePath } from 'next/cache';

import { getAuthUser, resolveOrganisationForPerson } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { GENOME_AREAS, type AreaKey } from '@/lib/genome/areas';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { assessAreaEntries } from '@/lib/genome/checklist-assess';
import { fetchAdmittedChecklist } from '@/lib/genome/checklist';
import { discoverTasks, createTask, fetchTaskItems } from '@/lib/genome/tasks';
import { writeObservedVerdicts } from '@/lib/genome/orchestrator-evidence';
import { recomputeEvidencedReadiness } from '@/lib/valuation/recompute-readiness';

const AREA_KEYS = new Set(GENOME_AREAS.map((a) => a.key));

export interface AssessState {
  error?: string;
  assessed?: number;
  /** Where he is now, 0-1, after this assessment. Null when there is no baseline to move from. */
  readinessNow?: number | null;
  /** The frozen origin, so the caller can state a delta rather than a bare figure. */
  baseline?: number | null;
}

export async function assessArea(area: string): Promise<AssessState> {
  const authUser = await getAuthUser();
  if (!authUser?.id) return { error: 'You are not signed in.' };
  if (!AREA_KEYS.has(area as AreaKey)) return { error: 'That is not one of the nine areas.' };

  const orgContext = await resolveOrganisationForPerson(authUser.id);
  if (!orgContext) return { error: 'No organisation membership found.' };
  const genome = await deriveOwnerGenome(orgContext);
  const section = genome.sections.find((s) => s.key === area);
  const entries = (section?.entries ?? []).map((e) => ({
    id: e.id,
    headline: e.headline,
    content: e.content,
  }));

  // The supabase client is shared by the ledger fetch and the verdict write below.
  const supabase = createServiceClientV2();

  // The admission gate's live set (T3): a question the operator admitted for this area is assessed
  // alongside the founding cohort — until there is a verdict it returns 'open', which is precisely
  // the monotonic honesty guarantee (a new question lowers the band until it is answered).
  const admitted = await fetchAdmittedChecklist(supabase);

  // Task discovery — the operational-completeness layer (lib/genome/tasks.ts). Runs in the same
  // on-demand action as the assessment itself, for the same reason assessment is on-demand rather
  // than on page load: this is a model call, and it belongs to the button he pressed, not his visit.
  // Newly discovered tasks join THIS SAME assessment pass so he sees them scored, not just added.
  const existingTasks = await fetchTaskItems(supabase, orgContext.organisationId, area as AreaKey);
  const proposals = await discoverTasks(
    area as AreaKey,
    entries,
    existingTasks.map((t) => t.ownerPrompt),
  );
  for (const proposal of proposals) {
    await createTask(supabase, {
      organisationId: orgContext.organisationId,
      discoveredByUserId: authUser.id,
      area: area as AreaKey,
      name: proposal.name,
      sourceType: 'conversation',
    });
  }
  const taskItems = proposals.length
    ? await fetchTaskItems(supabase, orgContext.organisationId, area as AreaKey)
    : existingTasks;

  const verdicts = await assessAreaEntries(area as AreaKey, entries, {}, [...admitted, ...taskItems]);

  // Orchestrator's observed evidence (lib/genome/orchestrator-evidence.ts) — INDEPENDENT of the
  // conversational record above, so it runs even when there is nothing on the record at all. Real
  // automation evidence existing has nothing to do with whether he has talked to Kira about this
  // area; the two are different questions answered by different sources (DATA_STANDARD R2).
  // tenantId IS authUser.id — confirmed in docs/GENOME_WRITE_BACK.md.
  const observedResult = await writeObservedVerdicts(
    supabase,
    orgContext.organisationId,
    authUser.id,
    authUser.id,
    area as AreaKey,
  );

  // Everything open means nothing was established from the conversational record — either there is
  // nothing on the record, or the model was unreachable. Writing a full set of `open` rows would
  // make an outage indistinguishable from a genuinely empty area FOREVER, because the panel would
  // then read as assessed. Degrade, don't fake: write nothing FROM THE LLM PATH and let it keep
  // saying it has not been checked — but still revalidate if the observed-evidence write above found
  // something, since that is real regardless of what the conversation did or didn't say.
  if (verdicts.every((v) => v.status === 'open')) {
    if (observedResult.observed) {
      revalidatePath(`/my-genome/${area}`);
      revalidatePath('/my-genome');
    }
    return { assessed: observedResult.observed ? 1 : 0 };
  }

  const { error } = await supabase.from('genome_item_status').upsert(
    verdicts.map((v) => ({
      // INV-020: organisation_id is the ownership anchor; user_id is provenance only.
      organisation_id: orgContext.organisationId,
      user_id: authUser.id,
      item_key: v.itemKey,
      area,
      status: v.status,
      why: v.why,
      evidence: v.evidence,
      assessed_at: new Date().toISOString(),
      assessed_by: 'checklist-assess/gpt-4.1-mini',
    })),
    { onConflict: 'organisation_id,item_key' },
  );

  if (error) {
    console.error('[assessArea] could not store verdicts:', error);
    return { error: 'The check ran but could not be saved. Try again in a moment.' };
  }

  // THE NUMBER MOVES HERE, and only here. Recomputed across EVERY area, not just this one — the
  // score is a property of the whole record, and updating it from one area's verdicts would make it
  // depend on the order he happened to press the buttons in.
  //
  // Deliberately after the upsert and deliberately not awaited into the failure path: if the
  // recompute fails he still keeps the assessment he asked for, and the number simply does not move.
  const movement = await recomputeEvidencedReadiness(authUser.id);

  revalidatePath(`/my-genome/${area}`);
  revalidatePath('/my-genome');
  revalidatePath('/dashboard');
  return {
    assessed: verdicts.filter((v) => v.status !== 'open').length,
    readinessNow: movement.readinessNow,
    baseline: movement.baseline,
  };
}
