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

    it(`${page} says the example is the WIDEST case, not a typical one`, () => {
      // P5. "The marketing example is nearly twice as flattering as what the calculator gave me."
      // Both figures are the model's; the difference is how much was left to capture. Unlabelled,
      // the extreme reads as typical and a reader's own smaller number reads as a bait-and-switch.
      // ⚠️ WHITESPACE-TOLERANT ON PURPOSE. JSX prose wraps across source lines, so a literal-string
      // match fails on formatting rather than on meaning — it did, on LandingClassic, where the
      // phrase breaks between "widest" and "the". A check that reds on a line wrap gets deleted.
      const html = read(page);
      expect(html).toMatch(/widest\s+the\s+gap\s+gets/);
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

// ---------------------------------------------------------------------------------------------
// P5 — the qualifier above is a CLAIM ABOUT THE MODEL, so it is checked against the model.
//
// "An owner who has already documented half of it sees roughly half as much." If that stops being
// true the landing is overclaiming again, in the subtler way: correct figures, wrong impression.
// A copy string nobody checks is exactly how the 2.25× overstatement survived, and asserting the
// sentence exists (above) without asserting it is TRUE would repeat that with extra steps.
// ---------------------------------------------------------------------------------------------

/** The same plumber, having already done roughly half the work himself. */
const HALF_DONE: ValuationInputs = {
  ...EXAMPLE,
  ownerDependence: 'heavily_involved',
  systems: 'some',
  recurringRevenue: 'some',
  clientConcentration: 'moderate',
};

describe('the landing example is the widest case, and says so truthfully', () => {
  const worst = computeValuation(EXAMPLE);
  const halfDone = computeValuation(HALF_DONE);
  const upliftPct = (v: { today: number; potential: number }) => (v.potential / v.today - 1) * 100;

  it('is the maximum-headroom business — essentially nothing captured', () => {
    // Every capturable factor at its worst. If someone "improves" the example to a more relatable
    // business, the qualifier stops being true and this fails rather than the page quietly lying.
    expect(worst.readiness).toBeLessThan(0.15);
    expect(EXAMPLE.ownerDependence).toBe('i_am_the_business');
    expect(EXAMPLE.systems).toBe('in_my_head');
    expect(EXAMPLE.recurringRevenue).toBe('none');
  });

  it('quotes an owner who has done half the work roughly half the gain', () => {
    // Measured 2026-08-09: 28.5% against 14.5%. "Roughly half" is generous to us in neither
    // direction, so the band is wide enough to survive calibration but narrow enough to catch a
    // model change that decouples the claim from what is left to capture.
    const ratio = upliftPct(halfDone) / upliftPct(worst);
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
  });

  it('gives the owner who has already done the work a SMALLER gap, never a larger one', () => {
    // The property the sentence rests on: the claim is proportional to what is left to capture.
    // This is the load-bearing one — the two bounds above are calibration, this is the direction.
    expect(halfDone.gap).toBeLessThan(worst.gap);
    expect(halfDone.today).toBeGreaterThan(worst.today);
  });
});
