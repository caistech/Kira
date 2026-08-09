import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

// WHY THIS FILE EXISTS.
//
// The valuation page explains the model in prose. On 2026-08-08 the band was sector-scaled in
// `lib/valuation/model.ts` — and the page that explains the band was not re-read, so for a day it
// described the model that had just been replaced:
//
//   "Where the range comes from. Not a dataset — ... The bottom is 1.5×. ... The top is 5×."
//   "Sector figures inform the commentary, not the number."
//
// Both were true of the universal band (08-04 → 08-08) and false the moment sector scaling landed.
// The second one directly contradicted a line 300px above it — "This sets the multiple, so if it is
// wrong the number is too" — on the one screen whose whole credibility rests on being checkable.
//
// Nothing catches this class. It is not a bug, a type error, a redirect or a blank page: the code
// is correct and the paragraph beside it is a claim about the code that has quietly gone stale.
// K15's unbuilt `single-statement` check is the general version; this is the specific one, and it
// is cheap because the page is a file and the claim is a string.
//
// ⚠️ Comments are stripped, because this file's own header quotes the retired sentences.

const PAGE = stripComments(readFileSync(join(__dirname, 'page.tsx'), 'utf8'));

describe('the valuation page does not describe a model it no longer runs', () => {
  it('finds the page at all (a scan matching nothing reads as green forever)', () => {
    expect(PAGE.length).toBeGreaterThan(10_000);
    expect(PAGE).toContain('Where your range comes from');
  });

  it('does not still say sector figures inform only the commentary', () => {
    // The sector median IS the centre of the band. Saying otherwise contradicts both the model and
    // the "this sets the multiple" line on the same screen.
    expect(PAGE).not.toMatch(/inform the commentary, not the number/i);
  });

  it('does not present 1.5× and 5× as THE band', () => {
    // They are outer guards that hold whatever the sector says. Presenting them as the band tells a
    // sparky his range is 1.5–5.0 when the model gave him 2.2–4.2.
    expect(PAGE).not.toMatch(/The bottom is 1\.5×/);
    expect(PAGE).not.toMatch(/The top is 5×/);
  });

  it('states the sector multiple and his own band on screen (P4)', () => {
    // The withheld figure is the whole item: the page referenced the sector average four times and
    // printed it zero times. Asserted through the RENDERED expressions, so deleting the sentence
    // fails here rather than passing quietly.
    expect(PAGE).toContain('sector.sentence');
    expect(PAGE).toContain('result.floorMultiple.toFixed(1)');
    expect(PAGE).toContain('result.ceilingMultiple.toFixed(1)');
    expect(PAGE).toContain('MULTIPLE_SOURCE');
  });

  it('does not assert a direction against the sector in hand-written prose', () => {
    // The direction is derived (sector-context.ts) precisely because it is reachably false. A
    // hand-written "below your sector's average" is the defect returning.
    expect(PAGE).not.toMatch(/below your sector'?s average/i);
    expect(PAGE).not.toMatch(/near the top of what your sector commands/i);
  });
});
