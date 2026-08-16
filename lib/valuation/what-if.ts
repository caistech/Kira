// lib/valuation/what-if.ts — "what is it worth if I fix the Gary problem and nothing else?"
//
// ⚠️ THE ASK, AND IT IS A SALES ARGUMENT RATHER THAN A FEATURE REQUEST.
//
//   "The most useful thing you could give me isn't the number, it's 'here is your number if you fix
//    the Gary problem and nothing else.' You already compute the four buckets. Let me tick one and
//    watch the figure move. That's what would make me pay, and it's the demonstration that closes
//    the sale — right now I take the $270k entirely on faith." — Ray, 2026-08-16
//
// ⚠️ IT RECOMPUTES, IT DOES NOT ADD UP THE UPLIFTS. The obvious implementation sums the per-factor
// `uplift` figures already printed on the cards, and it is wrong: readiness is a weighted sum fed
// through a single interpolation across the band, so two factors fixed together do NOT move the
// number by the sum of what each moves alone. Summing would overstate every multi-tick combination
// and understate nothing — always in the flattering direction, on the one screen whose entire job is
// being straight with him.
//
// So the selected factors are set to their best answer and `computeValuation` runs again. Same
// function, same band, same rounding as the page. The figure he sees is one the model actually
// produces, which is also the only version he could check against a re-run.

import { computeValuation, type ValuationInputs } from './model';

/** The four capturable factors, and the answer each becomes when it is fixed. */
export const WHAT_IF_BEST: {
  key: 'ownerDependence' | 'systems' | 'recurringRevenue' | 'clientConcentration';
  best: string;
}[] = [
  // NOT `fully_managed`. That is a business with a manager running it — a different business, bought
  // by hiring, not by writing anything down. `mostly_runs` is the honest ceiling for what capturing
  // knowledge alone achieves, and overstating it here would put a number on the screen that Kira
  // cannot deliver.
  { key: 'ownerDependence', best: 'mostly_runs' },
  { key: 'systems', best: 'documented_team' },
  // Recurring revenue and client spread are NOT things documentation fixes on its own — they need
  // contracts signed and new customers won. They are offered because he asked to model his own
  // business, not because we claim to move them.
  { key: 'recurringRevenue', best: 'strong' },
  { key: 'clientConcentration', best: 'diversified' },
];

export interface WhatIfResult {
  today: number;
  potential: number;
  readiness: number;
}

/**
 * Re-run the valuation with the named factors at their best answer.
 *
 * Unknown keys are ignored rather than throwing: this is called from a checkbox list, and a stale
 * key from an older tab must not take the result screen down.
 */
export function whatIf(answers: ValuationInputs, fixed: readonly string[]): WhatIfResult {
  const next: Record<string, unknown> = { ...answers };
  for (const factor of WHAT_IF_BEST) {
    if (fixed.includes(factor.key)) next[factor.key] = factor.best;
  }
  const result = computeValuation(next as unknown as ValuationInputs);
  return { today: result.today, potential: result.potential, readiness: result.readiness };
}
