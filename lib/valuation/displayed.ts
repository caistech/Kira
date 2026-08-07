// lib/valuation/displayed.ts
//
// THE FIGURES, ROUNDED ONCE, IN ONE PLACE — so every screen shows the same numbers and the
// subtraction on screen is true.
//
// WHY THIS EXISTS. Ray, 7 August, walked the product with a calculator, because the result page had
// just earned that scrutiny by explaining honestly why it rounds. He found ONE figure with FOUR
// values:
//
//     result page          $270,000
//     /plan                $271,000
//     dashboard banner     $271,443
//     dashboard card       $271,000, described as "the difference between $1,570,000 and $1,840,000"
//
// That last one is the killer: $1,840,000 − $1,570,000 = $270,000. The card contradicts itself in
// two lines, on the product whose entire pitch is telling him what his business is worth. His words:
// "If it can't subtract, why would I believe the multiple?"
//
// WHY IT KEPT RECURRING, which matters more than the bug. This was ALREADY FIXED once, correctly, on
// `/business-valuation` — `displayedGap` derives the gap from the two ROUNDED figures rather than
// rounding the gap independently, and it carries a good comment explaining why. It was fixed on the
// page the tester complained about. Nothing carried it to the dashboard or to /plan, because the
// rounding lived at each call site as `formatMoneyApprox(x)` rather than in one derivation the
// screens consume. Fixing the instance instead of the class is the failure `TESTING_STANDARD` §2.3
// names, and this is its third recorded instance in this repo.
//
// THE RULE: a screen never rounds a valuation figure itself. It asks for the set, and the set is
// internally consistent by construction — `gap` IS `potential − today` in displayed terms, because
// it is computed from them rather than alongside them.

// ⚠️ `approxNumber` currently exists TWICE — here from `currency.ts` (the canonical home, beside the
// formatter whose rule it mirrors) and a second exported copy in `app/api/genome/export/route.ts`.
// Two implementations of "how we round money" is the same fork that produced the four-value gap;
// the export route's copy should be deleted in favour of this import. Recorded rather than done, so
// it is a decision and not a drive-by change to the export contract.
import { approxNumber, formatMoney, formatMoneyApprox, DEFAULT_CURRENCY } from '@/lib/valuation/currency';

export interface RawFigures {
  worthToday: number;
  worthPotential: number;
  /** Ignored deliberately — see `gap` below. Accepted so callers can pass a stored row straight in. */
  gap?: number;
  walkAway?: number;
}

export interface DisplayedFigures {
  /** Rounded numbers — for arithmetic that must agree with what is on screen. */
  today: number;
  potential: number;
  gap: number;
  walkAway: number | null;
  /** The exact strings rendered. Never re-format these. */
  todayText: string;
  potentialText: string;
  gapText: string;
  walkAwayText: string | null;
}

/**
 * Every valuation figure a screen shows, rounded once and mutually consistent.
 *
 * ⚠️ THE STORED `gap` IS DELIBERATELY DISCARDED. It is the difference of the UNROUNDED figures, so
 * displaying it beside rounded today/potential values reproduces exactly the contradiction this
 * module exists to end. The gap shown must be the difference of the numbers shown.
 */
// `currency` is the CODE ('AUD'), not the Currency record — that is what formatMoneyApprox takes.
export function displayedFigures(raw: RawFigures, currency: string = DEFAULT_CURRENCY): DisplayedFigures {
  const today = approxNumber(Number(raw.worthToday) || 0);
  const potential = approxNumber(Number(raw.worthPotential) || 0);
  const gap = Math.max(0, potential - today);
  const walkAway = raw.walkAway == null ? null : approxNumber(Number(raw.walkAway) || 0);

  return {
    today,
    potential,
    gap,
    walkAway,
    todayText: formatMoneyApprox(today, currency),
    potentialText: formatMoneyApprox(potential, currency),
    gapText: formatMoneyApprox(gap, currency),
    walkAwayText: walkAway == null ? null : formatMoneyApprox(walkAway, currency),
  };
}

export interface DisplayedUplift {
  /** The rounded uplift to show. The set of these sums EXACTLY to the displayed gap. */
  uplift: number;
  /** The exact string to render. Never re-format it — see the warning below. */
  upliftText: string;
}

/**
 * The itemised parts of the gap, rounded so they add up to the gap actually printed above them.
 *
 * WHY THIS EXISTS. The model already reconciles the raw uplifts — `computeValuation` sums them and
 * puts any remainder onto the largest factor, so in full precision they equal the gap exactly. The
 * result page then rounded each one INDEPENDENTLY for display, which breaks that guarantee, because
 * a sum of rounded numbers is not the rounded sum:
 *
 *     73,800 + 61,500 + 26,900 + 17,300 = 179,500     under a headline reading $180,000
 *
 * Ray added them up. He does that because the page above has just explained, honestly, why it
 * rounds — which earns exactly the scrutiny it then fails. His words: "It isn't a big error. It is
 * the kind of small error that makes a man check the big ones."
 *
 * This is the SAME class of defect as the four-value gap this module was written for, one level
 * down: rounding applied per call site rather than once over the whole set. So it is fixed the same
 * way — the page asks for the set, and the set is consistent by construction.
 *
 * THE REMAINDER GOES ON THE LARGEST, deliberately, because that is what `computeValuation` already
 * does with the raw remainder. Two different reconciliation rules for the same quantity would be a
 * fork of the arithmetic, and spreading a few hundred dollars across every line would move numbers
 * he has no way to check instead of the one line best able to absorb it.
 *
 * ⚠️ RENDER `upliftText`, NOT `formatMoneyApprox(uplift)`. The reconciled figure carries the
 * remainder, so it is no longer guaranteed to sit at 3 significant figures — passing it back through
 * the approximate formatter would re-round it and reintroduce the very gap this closes.
 */
export function displayedUplifts<T extends { uplift: number }>(
  factors: readonly T[],
  displayedGap: number,
  currency: string = DEFAULT_CURRENCY,
): Array<T & DisplayedUplift> {
  const rounded = factors.map((f) => approxNumber(Number(f.uplift) || 0));
  const sum = rounded.reduce((total, n) => total + n, 0);
  const remainder = displayedGap - sum;

  // Largest by rounded value — the line with the most room to carry the difference unnoticed.
  let largest = -1;
  for (let i = 0; i < rounded.length; i += 1) {
    if (rounded[i]! > 0 && (largest === -1 || rounded[i]! > rounded[largest]!)) largest = i;
  }
  if (remainder !== 0 && largest !== -1) {
    rounded[largest] = Math.max(0, rounded[largest]! + remainder);
  }

  return factors.map((f, i) => ({
    ...f,
    uplift: rounded[i]!,
    upliftText: formatMoney(rounded[i]!, currency),
  }));
}
