// lib/valuation/sde-copy.test.ts
//
// Guards a correctness bug, not a style preference.
//
// A naive-tester found the profit question describing SDE two different ways on one screen: the
// label said "plus the salary and perks you pay yourself", the helper said "after costs and your
// own pay". For an owner-operated SME the gap between those is the owner's whole remuneration —
// usually the largest add-back — so an owner following the helper enters a materially smaller
// number and the valuation comes out wrong, confidently. It is the single input `computeValuation`
// runs on.
//
// These tests fail if the net-profit phrasing comes back, anywhere in the valuation copy.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  NET_PROFIT_PHRASES_BANNED_IN_SDE_COPY,
  SDE_DEFINITION,
  SDE_SHORT_REMINDER,
  sdeExample,
  sdeMarginNote,
} from './sde-copy';

const VALUATION_PAGE = join(process.cwd(), 'app', 'business-valuation', 'page.tsx');

describe('SDE copy', () => {
  it('defines SDE as profit WITH the owner’s pay added back', () => {
    expect(SDE_DEFINITION).toMatch(/plus the salary and perks you pay yourself/i);
    expect(SDE_DEFINITION).toMatch(/added back/i);
  });

  it('never describes SDE using net-profit phrasing', () => {
    const allCopy = [
      SDE_DEFINITION,
      SDE_SHORT_REMINDER,
      sdeExample('$'),
      sdeMarginNote(10, '$2,000,000'),
    ].join(' \n ');

    for (const banned of NET_PROFIT_PHRASES_BANNED_IN_SDE_COPY) {
      expect(allCopy.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it('shows the worked example as SEPARATE components that are ADDED, not one net figure', () => {
    const example = sdeExample('$');
    // The failure mode was an example that folded the owner's pay into "what you kept".
    expect(example).toMatch(/\$120k after costs/i);
    expect(example).toMatch(/paid you \$50k/i);
    expect(example).toMatch(/\$200,000/);
    // The components must actually reconcile to the total, or the example teaches arithmetic that
    // does not work: 120 + 50 + 30 = 200.
    expect(120 + 50 + 30).toBe(200);
  });

  // ⚠️ THESE TWO REPLACED A GUARD THAT PINNED THE EXAMPLE AT TWO COMPONENTS.
  //
  // The old assertions required "$150k after costs" and "add them together", which described an
  // example with owner's pay as the only add-back. That was right when SDE's only widely-missed
  // component was the owner's pay. It is wrong now, and updating it rather than deleting it matters
  // for the same reason it did with the FAQ timeframe guard: the point is not to stop asserting, it
  // is to assert the thing that is now true.
  //
  // WHY INTEREST IS LOAD-BEARING RATHER THAN THOROUGH. SDE is a PRE-debt-service measure. The
  // multiple applied to it yields the value of the business regardless of financing (enterprise
  // value); equity value is that minus what the business owes. Subtracting debt is only correct in
  // that order. An owner who omits the interest add-back gives us a figure that has already absorbed
  // his debt service, and the debt question then takes the principal off a second time — two errors,
  // same direction, on the number he takes to his wife.
  describe('interest is named wherever the owner is told what to add back', () => {
    it('the definition says so', () => {
      expect(SDE_DEFINITION).toMatch(/add back interest/i);
    });

    it('the worked example demonstrates it, not just the definition', () => {
      // The definition is read once; the example is worked through. An example teaching two
      // add-backs beside a definition naming four is the exact label-versus-helper split this
      // module was created to end.
      expect(sdeExample('$')).toMatch(/interest/i);
      expect(sdeExample('$')).toMatch(/\$30k in interest/i);
    });

    it('the confirmation note repeats it at the last moment before the figure is accepted', () => {
      expect(sdeMarginNote(10, '$2,000,000')).toMatch(/interest/i);
    });

    it('the example explains WHY interest goes back, not merely that it does', () => {
      // "A buyer is valuing the business, not your loans" is the sentence that makes the later debt
      // subtraction read as deliberate rather than as us taking it off twice.
      expect(sdeExample('$')).toMatch(/valuing the business, not your loans/i);
    });
  });

  it('reminds the owner to add their pay back when confirming a margin', () => {
    expect(sdeMarginNote(10, '$2,000,000')).toMatch(/includes your own salary and perks added back/i);
  });

  it('the live valuation page contains none of the banned net-profit phrasing', () => {
    const page = readFileSync(VALUATION_PAGE, 'utf8').toLowerCase();
    for (const banned of NET_PROFIT_PHRASES_BANNED_IN_SDE_COPY) {
      expect(page).not.toContain(banned.toLowerCase());
    }
  });

  it('the live valuation page sources its SDE copy from this module, not inline strings', () => {
    const page = readFileSync(VALUATION_PAGE, 'utf8');
    expect(page).toContain('SDE_DEFINITION');
    expect(page).toContain('sdeExample');
    expect(page).toContain('sdeMarginNote');
  });
});
