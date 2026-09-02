// Writing the number that moves.
//
// `evidenced-readiness.ts` computes it; this puts it in the database. They were deliberately built
// separately — the arithmetic is pure and tested against fabricated inputs, and this is the part
// that has to talk to two tables and a stored model version — but until this existed the computation
// had no caller, which is the exact `feedback-correct-tested-and-unreachable` shape this repo keeps
// producing. It is written the same day as the function it calls, on purpose.
//
// ⚠️ `readiness` IS NEVER TOUCHED. It is the baseline — what the thirteen questions said on the day
// he paid — and recomputing it in place would silently rewrite the number he was shown, which is the
// objection MODEL_VERSION exists to answer. Progress is a delta from a fixed origin or it is not
// progress, it is just a number that changed.
//
// ⚠️ THE BASELINE FACTORS ARE RE-DERIVED FROM THE STORED `inputs`, NOT READ FROM A COLUMN. Only the
// composite `readiness` was ever persisted; the five sub-scores were not. Re-running
// `computeValuation` on the same inputs reproduces them exactly, and it self-checks: if the
// recomputed composite does not match the stored one, the model has changed under the snapshot and
// the honest thing is to refuse rather than blend a new model's sub-scores into an old baseline.

import { createServiceClientV2 } from '@/lib/supabase/server';

import { computeValuation, MODEL_VERSION, type ValuationInputs } from './model';
import { computeEvidencedReadiness } from './evidenced-readiness';
import type { FactorKey } from '@/lib/genome/checklist';
import type { AssessedItem, ItemStatus } from '@/lib/genome/checklist-bands';

export interface RecomputeResult {
  /** Null when there was nothing to compute — no valuation, or nothing assessed. */
  readinessNow: number | null;
  baseline: number | null;
  /** Why nothing was written, for a caller that wants to say something honest. */
  reason?: 'no-valuation' | 'no-assessment' | 'model-drift' | 'write-failed';
}

/**
 * Recompute `readiness_now` for one owner and store it.
 *
 * Never throws. This runs off the back of an assessment the owner asked for, and a failure here must
 * degrade to "the number did not move" rather than losing the assessment that did succeed.
 */
export async function recomputeEvidencedReadiness(organisationId: string): Promise<RecomputeResult> {
  const supabase = createServiceClientV2();

  const { data: valuation, error: valError } = await supabase
    .from('business_valuations')
    // ⚠️ NO `model_version` HERE — it lives on `valuation_snapshots` (the append-only history),
    // never on this row. Selecting it errors, and the error would have surfaced only at runtime as
    // "the number never moves". The drift self-check below does not need it: comparing the
    // recomputed composite against the stored one detects a model change without naming it.
    .select('inputs, readiness')
    .eq('organisation_id', organisationId)
    .maybeSingle();

  if (valError) {
    console.error('[recompute-readiness] could not read the valuation:', valError);
    return { readinessNow: null, baseline: null, reason: 'no-valuation' };
  }
  // No baseline means nothing to move FROM. An owner who never ran the questions has a Genome and
  // no valuation, and inventing an origin for him would be worse than showing him bands alone.
  if (!valuation?.inputs) return { readinessNow: null, baseline: null, reason: 'no-valuation' };

  const { data: rows, error: statusError } = await supabase
    .from('genome_item_status')
    .select('item_key, status, why')
    .eq('organisation_id', organisationId);

  if (statusError) {
    console.error('[recompute-readiness] could not read item status:', statusError);
    return { readinessNow: null, baseline: null, reason: 'no-assessment' };
  }

  const assessed: AssessedItem[] = (rows ?? []).map((r) => ({
    itemKey: r.item_key as string,
    status: r.status as ItemStatus,
    why: (r.why as string | null) ?? null,
    evidence: [],
  }));

  let result;
  try {
    const recomputed = computeValuation(valuation.inputs as ValuationInputs);

    // THE SELF-CHECK. If re-running the model on the same inputs no longer reproduces the stored
    // composite, the model has moved since the snapshot — and blending today's sub-scores into
    // yesterday's baseline would produce a delta that is partly evidence and partly a code change,
    // with no way to tell them apart. Refuse instead. A missing number is honest; a number that
    // silently mixes those two is not.
    const storedReadiness = Number(valuation.readiness ?? NaN);

    // ⚠️ THE RECOMPUTED VALUE IS CHECKED FOR FINITENESS FIRST, AND THAT IS NOT DEFENSIVE PADDING.
    // The obvious form of this guard — `Math.abs(recomputed - stored) > 0.005` — passes silently on
    // NaN, because every comparison with NaN is false. So a malformed `inputs` row would produce NaN
    // sub-scores, sail through the drift check as though it agreed, and write NaN to the column.
    // Found by a test that fed it inputs of the wrong shape; the guard reported no drift and the
    // baseline came back NaN. A guard that cannot fire on the worst input is not a guard.
    if (!Number.isFinite(recomputed.readiness)) {
      console.warn(`[recompute-readiness] model produced no usable figure for ${organisationId} — refusing`);
      return { readinessNow: null, baseline: null, reason: 'model-drift' };
    }

    if (Number.isFinite(storedReadiness) && Math.abs(recomputed.readiness - storedReadiness) > 0.005) {
      console.warn(
        `[recompute-readiness] model drift for ${organisationId}: stored ${storedReadiness} vs recomputed ` +
          `${recomputed.readiness} (model is now ${MODEL_VERSION}) — refusing`,
      );
      return { readinessNow: null, baseline: storedReadiness, reason: 'model-drift' };
    }

    const baselineFactors = Object.fromEntries(
      recomputed.factors.map((f) => [f.key, f.score]),
    ) as Record<FactorKey, number>;

    result = computeEvidencedReadiness(baselineFactors, assessed);
  } catch (error) {
    console.error('[recompute-readiness] compute failed:', error);
    return { readinessNow: null, baseline: null, reason: 'no-valuation' };
  }

  // Nothing assessed anywhere: leave the column NULL rather than writing a figure equal to the
  // baseline. Null reads as "not measured yet", which is true; a stored duplicate of the baseline
  // reads as "measured, and unchanged", which is not.
  if (result.unassessed) {
    return { readinessNow: null, baseline: result.baseline, reason: 'no-assessment' };
  }

  const { error: writeError } = await supabase
    .from('business_valuations')
    .update({
      readiness_now: result.readinessNow,
      readiness_now_at: new Date().toISOString(),
    })
    .eq('organisation_id', organisationId);

  if (writeError) {
    console.error('[recompute-readiness] write failed:', writeError);
    return { readinessNow: result.readinessNow, baseline: result.baseline, reason: 'write-failed' };
  }

  return { readinessNow: result.readinessNow, baseline: result.baseline };
}
