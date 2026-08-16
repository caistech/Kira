// The number that moves — and the rules that stop it moving for the wrong reasons.
//
// `readiness` has two writers, both at signup, and nothing has ever moved it for anyone. That is why
// the dashboard's "we grow this every week" was false for every owner who ever read it. This is the
// movement, and it is deliberately a SECOND number rather than a recomputation of the first.
//
// WHY NOT JUST RECOMPUTE `readiness`. `MODEL_VERSION` exists because re-weighting "would silently
// rewrite everyone's history", and recomputing in place does exactly that — the baseline a man was
// shown on the day he paid would quietly become a different number, and the series would be
// uninterpretable. So:
//
//   readiness      — THE BASELINE. What the thirteen questions said, on the day. Frozen.
//   readiness_now  — WHERE HE IS NOW, from evidenced items. This file.
//
// The dashboard already says "Transferability at your baseline", which stops being a hedge and
// becomes literally correct: progress is a delta from a fixed origin, which is the only honest way
// to show it.
//
// ⚠️ THREE RULES, AND EACH ONE EXISTS TO STOP A SPECIFIC DISHONESTY.
//
// 1. A PLAN MOVES NOTHING. Only an item that is actually `answered` counts, and for pathway items
//    only an EVIDENCED milestone counts. Agreeing to a pathway must never lift the score, or the
//    product rewards intending to change — more flattering than rewarding talking and slower to
//    disprove. He would arrive in a data room with a good number and a business that still stops
//    when he does.
//
// 2. IT CAN GO DOWN. Capture reveals dependencies nobody had priced. "Who could step into your job
//    — nobody" is evidence that should LOWER ownerDependence however diligently he answered. A
//    machine where every answer raises the score is a machine that rewards talking. "Your number
//    moved down $180k, and here is the sentence that did it" is the most credible thing this
//    product can say.
//
// 3. NO EVIDENCE MEANS NO OPINION. A factor with nothing assessed keeps its baseline sub-score
//    exactly. It is not defaulted to zero (which would crater every new owner's number the moment
//    this shipped) and not defaulted to one. Silence is silence.

import type { AssessedItem } from '@/lib/genome/checklist-bands';
import { CHECKLIST, type FactorKey } from '@/lib/genome/checklist';

/** Must match `WEIGHTS` in model.ts. `evidenced-readiness.test.ts` asserts it against that source. */
export const FACTOR_WEIGHTS: Record<FactorKey, number> = {
  ownerDependence: 3,
  systems: 2,
  recurringRevenue: 1.75,
  clientConcentration: 1.25,
  growth: 2,
};

const TOTAL_WEIGHT = Object.values(FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);

export interface FactorEvidence {
  factor: FactorKey;
  /** Required items mapped to this factor that are `answered`. */
  answered: number;
  /** Required items mapped to this factor, total. The denominator. */
  total: number;
  /** The sub-score the evidence supports, 0–1. Null when nothing has been assessed. */
  evidencedScore: number | null;
  /** The baseline sub-score from the thirteen questions, carried through unchanged. */
  baselineScore: number;
  /** What the evidence actually did to it. Negative is a real and expected outcome. */
  delta: number;
}

export interface EvidencedReadiness {
  /** 0–1. The number to show as "where you are now". */
  readinessNow: number;
  /** 0–1. Unchanged, for the delta. */
  baseline: number;
  factors: FactorEvidence[];
  /** True when nothing has been assessed at all — the caller must show the baseline alone. */
  unassessed: boolean;
}

/**
 * How much a factor's evidenced score is trusted over its self-reported baseline.
 *
 * Evidence is blended in proportion to how much of it there is, rather than replacing the baseline
 * the moment a single item lands. One answered item out of four saying "nobody can step into my
 * job" is real information and should move the number — but it is not four times more informative
 * than the questionnaire, and letting it swing the whole factor would make the score lurch around
 * on single sentences, which reads as noise and destroys trust in it faster than being wrong would.
 *
 * At full coverage the evidence wins outright: every required item assessed IS a better answer than
 * a form he filled in before he paid.
 */
function blend(baseline: number, evidenced: number, coverage: number): number {
  return baseline * (1 - coverage) + evidenced * coverage;
}

/**
 * `answered` items count 1. `weak` and `open` count 0.
 *
 * Weak scoring zero is the point of gate 2: an answer that fails its substance test must not be
 * able to move the number, or the rubric has reverted to counting.
 */
export function evidenceForFactor(
  factor: FactorKey,
  assessed: Map<string, AssessedItem>,
): { answered: number; total: number } {
  // Required items only. Supporting items add depth to the DOCUMENT; letting them move the price
  // would mean a man could lift his valuation by answering the easy questions, which is the
  // rewards-talking failure in a subtler form.
  const items = CHECKLIST.filter((i) => i.factor === factor && i.required);
  const answered = items.filter((i) => assessed.get(i.key)?.status === 'answered').length;
  return { answered, total: items.length };
}

export function computeEvidencedReadiness(
  baselineFactors: Record<FactorKey, number>,
  assessedItems: AssessedItem[],
): EvidencedReadiness {
  const assessed = new Map(assessedItems.map((a) => [a.itemKey, a]));

  // "Assessed" means a verdict was actually reached, not that a row exists. An area returned as all
  // `open` because the model was unreachable must not be read as evidence that everything is
  // missing — that is degrade-don't-fake at the scoring layer, and getting it wrong would show a
  // collapsed score to a man whose only problem was our API key.
  const anyVerdict = assessedItems.some((a) => a.status !== 'open');

  const factors: FactorEvidence[] = (Object.keys(FACTOR_WEIGHTS) as FactorKey[]).map((factor) => {
    const { answered, total } = evidenceForFactor(factor, assessed);
    const baselineScore = baselineFactors[factor] ?? 0;

    if (!anyVerdict || total === 0) {
      return { factor, answered, total, evidencedScore: null, baselineScore, delta: 0 };
    }

    const evidencedScore = answered / total;
    const coverage = total === 0 ? 0 : answered / total;
    const blended = blend(baselineScore, evidencedScore, coverage);
    return {
      factor,
      answered,
      total,
      evidencedScore,
      baselineScore,
      delta: blended - baselineScore,
    };
  });

  const baseline =
    (Object.keys(FACTOR_WEIGHTS) as FactorKey[]).reduce(
      (sum, f) => sum + (baselineFactors[f] ?? 0) * FACTOR_WEIGHTS[f],
      0,
    ) / TOTAL_WEIGHT;

  const readinessNow =
    factors.reduce((sum, f) => sum + (f.baselineScore + f.delta) * FACTOR_WEIGHTS[f.factor], 0) /
    TOTAL_WEIGHT;

  return {
    readinessNow: Math.max(0, Math.min(1, readinessNow)),
    baseline: Math.max(0, Math.min(1, baseline)),
    factors,
    unassessed: !anyVerdict,
  };
}

/**
 * The sentence a movement deserves: which factor moved, and by how much.
 *
 * Returned as data, not prose, so the copy stays with the rest of the voice and a test can assert
 * the arithmetic without pinning the wording. Sorted by absolute size — the biggest mover is what
 * he wants to know about, whichever direction it went.
 */
export function movementDrivers(result: EvidencedReadiness): FactorEvidence[] {
  return result.factors
    .filter((f) => Math.abs(f.delta) > 0.001)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
