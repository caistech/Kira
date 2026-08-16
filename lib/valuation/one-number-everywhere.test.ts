// ONE FIGURE, ONE VALUE, ON EVERY SCREEN — enforced, because asking people to remember has failed
// four times.
//
// THE HISTORY, because it is the argument for this file existing at all:
//
//   7 Aug   Ray walks the product with a calculator and finds ONE figure with FOUR values —
//           $270,000 / $271,000 / $271,443 / and a card describing "$271,000" as the difference
//           between $1,570,000 and $1,840,000, which is $270,000. His words: "If it can't subtract,
//           why would I believe the multiple?"
//   7 Aug   Fixed — `lib/valuation/displayed.ts` is extracted, and its own header states the rule:
//           "a screen never rounds a valuation figure itself. It asks for the set."
//   16 Aug  Ray walks it again and finds the SAME defect: $190,000 on the result page and the
//           dashboard, $184,000 on /plan and /my-genome. Same session, same account, two values.
//
// It came back because the fix was applied to the pages that had been complained about, and the
// rounding stayed at every OTHER call site. `TESTING_STANDARD` §2.3 names this exactly — fixing the
// instance rather than the class — and the module's own header already said so in writing. A rule
// stated in a comment at the top of the right file was not enough; this is that rule with a
// mechanism under it.
//
// ⚠️ THIS IS NOT A BAN ON `formatMoneyApprox`. It is a ban on rounding a VALUATION figure at a call
// site. Prices, uplift lines and arbitrary money are fine — the tell is `worth_today`,
// `worth_potential` and `gap`, which must reconcile with each other on screen and therefore have to
// be rounded together.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { stripComments } from '@/lib/source-scan';
import { displayedFigures } from './displayed';

const repoRoot = path.resolve(__dirname, '..', '..');

/** Every screen that shows the owner his own valuation figures. */
const SCREENS = [
  'app/business-valuation/page.tsx',
  'app/dashboard/page.tsx',
  'app/plan/page.tsx',
  'app/my-genome/page.tsx',
];

const read = (rel: string) => stripComments(readFileSync(path.join(repoRoot, rel), 'utf8'));

/**
 * Any single-argument call whose argument is a raw valuation field — `money(g.gap)`,
 * `fmt(result.worthPotential)`, `approx(worth_today)`.
 *
 * ⚠️ IT KEYS ON THE ARGUMENT, NOT THE FUNCTION NAME, and that is the whole point. The first version
 * matched `formatMoneyApprox(<field>` — and every one of these screens ALIASES the formatter locally
 * (`const money = (n) => formatMoneyApprox(n, …)`), so the real call site reads `money(g.gap)` and
 * the check sailed straight past it. Reintroducing the exact defect left the suite green.
 * A guard keyed to a name cannot see a rename.
 */
const CALL_WITH_VALUATION_FIELD =
  /(\w+)\(\s*(?:[A-Za-z_$][\w$]*[.?]{1,2})?(?:gap|worthToday|worth_today|worthPotential|worth_potential)\b/g;

/** Calls that are ALLOWED to receive a raw figure — the derivation itself, and plain arithmetic. */
const ALLOWED = new Set(['displayedFigures', 'displayedUplifts', 'priceForProfit', 'Number', 'Math', 'round']);

describe('every screen asks for the set rather than rounding its own', () => {
  for (const screen of SCREENS) {
    it(`${screen} consumes displayedFigures`, () => {
      expect(read(screen), `${screen} must not round valuation figures itself`).toMatch(
        /displayedFigures\(/,
      );
    });
  }

  it('⚠️ no screen passes a raw valuation field to any formatter', () => {
    // THE LOAD-BEARING ONE. Mutation-verified: restoring `money(g.gap)` in app/my-genome/page.tsx
    // turns this red. The first draft did not, which is why the note above exists.
    const offenders: string[] = [];
    for (const screen of SCREENS) {
      for (const m of read(screen).matchAll(CALL_WITH_VALUATION_FIELD)) {
        if (!ALLOWED.has(m[1])) offenders.push(`${screen}: ${m[0]}…)`);
      }
    }
    expect(
      offenders,
      ['round these together via displayedFigures instead:', ...offenders].join('\n'),
    ).toEqual([]);
  });
});

describe('the set is internally consistent by construction', () => {
  it('the displayed gap IS the difference of the displayed pair', () => {
    // Ray's actual figures, 16 August: stored 1,132,643 / 1,316,525 / gap 183,882. Rounded
    // independently the gap reads $184,000 while the pair reads $1,130,000 and $1,320,000 — a
    // difference of $190,000. The subtraction on screen has to be true.
    const f = displayedFigures({ worthToday: 1_132_643, worthPotential: 1_316_525 });
    expect(f.potential - f.today).toBe(f.gap);
    expect(f.gapText).toBe('$190,000');
  });

  it('holds for a spread of real-shaped inputs', () => {
    for (const [today, potential] of [
      [1_132_643, 1_316_525],
      [412_800, 505_119],
      [88_400, 96_050],
      [2_940_112, 3_615_988],
    ] as const) {
      const f = displayedFigures({ worthToday: today, worthPotential: potential });
      expect(f.potential - f.today, `${today} → ${potential}`).toBe(f.gap);
    }
  });

  it('never shows a negative gap', () => {
    const f = displayedFigures({ worthToday: 900_000, worthPotential: 880_000 });
    expect(f.gap).toBe(0);
  });
});
