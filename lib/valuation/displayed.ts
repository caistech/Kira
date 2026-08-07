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
import { approxNumber, formatMoneyApprox, DEFAULT_CURRENCY } from '@/lib/valuation/currency';

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
