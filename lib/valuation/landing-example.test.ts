// The figures on the landing page must be the ones the calculator returns.
//
// THE FAILURE THIS EXISTS FOR, measured 2026-08-05. The model was rebuilt on 08-03 and corrected
// again on 08-04 (register A1-A4), and the landing page was not updated with it. It carried:
//
//   captured $1.02M   gap $438k        <- from before the correction
//   model     $777k       $195k        <- what the calculator actually returns
//
// A 2.25x overstatement of the gap, on the number the whole product sells on, in front of a broker
// who appraises businesses for a living. Walk-away and today matched exactly, which is what made it
// invisible: two of the four figures were right, so nothing looked stale.
//
// The source comment already said "Whoever changes the model must change these with it." That is a
// note asking someone to remember. This is the mechanism.
//
// IT DOES NOT ASSERT THE FIGURES ARE GOOD — only that the shop window shows what the shop sells.
// Changing the model is allowed; changing it and leaving the page behind is not.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeValuation, type ValuationInputs } from './model';

/**
 * The example both landings show: a plumbing business entirely in the owner's head.
 *
 * The SDE is pinned by the two figures that were always correct — walk-away $220k and today $582k —
 * so this is the same business the page has always described, not a new one chosen to fit.
 */
const EXAMPLE: ValuationInputs = {
  industry: 'Plumbing',
  turnover: 325_000 * 5,
  annualProfit: 325_000,
  tangibleAssets: 220_000,
  profitTrend: 'flat',
  marginTrend: 'stable',
  clientTrend: 'stable',
  clientConcentration: 'concentrated',
  ownerDependence: 'i_am_the_business',
  systems: 'in_my_head',
  recurringRevenue: 'none',
};

/** "$777k" / "$1.02M" — the way the page writes a figure. */
function short(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}k`;
}

const PAGES = ['components/landing/LandingNew.tsx', 'components/landing/LandingClassic.tsx'];
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('the landing example matches the calculator', () => {
  const v = computeValuation(EXAMPLE);

  it('produces the walk-away and today figures the page is built around', () => {
    // If these drift the example itself has moved, and the test below would silently start
    // asserting a different business.
    //
    // ⚠️ `today` MOVED $582k -> $684k on 2026-08-08 with the sector-scaled band (MODEL_VERSION
    // 2026-08-08.1), and this is the one edit in the file that is legitimate to make. The business
    // is unchanged — same plumber, same $325k SDE, same $220k of gear, still entirely in his head —
    // and `walkAway` is untouched, which is the check that it is the same business.
    //
    // What moved is what the market pays him: 1.79x -> 2.10x. Under the flat band an owner-dependent
    // plumbing business was priced BELOW anything Australian guidance describes (published floor
    // 2.0x, "on the tools, one residential builder"). The overclaim at the top of the band had a
    // matching under-claim at the bottom, and this example was sitting in it.
    expect(short(v.walkAway)).toBe('$220k');
    expect(short(v.today)).toBe('$684k');
  });

  for (const page of PAGES) {
    it(`${page} shows the captured figure the model returns`, () => {
      expect(read(page)).toContain(short(v.potential));
    });

    it(`${page} shows the gap the model returns`, () => {
      expect(read(page)).toContain(short(v.gap));
    });

    it(`${page} does not still carry the pre-correction figures`, () => {
      // Named explicitly, because a generic "matches the model" check passes the moment someone
      // updates one figure and not the other — which is how this shipped.
      const html = read(page);
      expect(html).not.toContain('$1.02M');
      expect(html).not.toContain('$438k');
    });
  }
});
