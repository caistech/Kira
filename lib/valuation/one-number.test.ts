import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ONE GAP FIGURE, EVERYWHERE — enforced across the codebase rather than screen by screen.
//
// This defect has now been found three times by the same tester: 7 August (which is why
// lib/valuation/displayed.ts exists at all), 16 August on /my-genome, and 16 August again on /plan,
// where the headline said $270,000 and a panel four inches below it said $271,000 — plus a third
// value seeded into his Genome.
//
//   "It's a thousand dollars and it doesn't change anything. That's not the point. The point is I am
//    being asked to pay real money on the strength of a calculation, and the calculation can't hold
//    one number still across two panels of one screen."  — Ray, 2026-08-16
//
// It keeps coming back because each fix went to the screen that was named. The arithmetic is not
// subtle: rounding `today` and `potential` to the nearest $1,000 and rounding the STORED gap
// independently gives two figures that are both correct and differ by up to $1,000. The only
// durable answer is that no owner-facing surface may round a gap itself — `displayedFigures`
// derives it from the rounded pair, so the number shown is true in the numbers beside it.
//
// ⚠️ Scope is OWNER-FACING surfaces. The admin panel prints `money(r.gap)` and is left alone: an
// operator reading a list of accounts is not being asked to reconcile it against a headline, and
// widening this to every file would make it noise that gets deleted.

const OWNER_FACING = [
  'app/plan/page.tsx',
  'app/my-genome/page.tsx',
  'app/dashboard/page.tsx',
  'app/business-valuation/page.tsx',
  'app/api/kira/create/route.ts',
  // ⚠️ A FILE HE DOWNLOADS IS AN OWNER-FACING SURFACE. This list held only pages, so the JSON export
  // rounded the stored gap on its own and shipped $271,000 against $270,000 on every screen — the
  // fourth appearance of this class and the first outside a page.
  'app/api/genome/export/route.ts',
];

/** Formats a raw gap value directly — the thing that produces the second number. */
const ROUNDS_A_GAP_ITSELF =
  /\b(money|formatMoney|formatMoneyApprox|formatPrice)\s*\(\s*[A-Za-z_$][\w.$]*\.?gap\b/;

describe('one gap figure across every owner-facing surface', () => {
  it.each(OWNER_FACING)('%s does not round a gap of its own', (file) => {
    const src = readFileSync(join(process.cwd(), file), 'utf8');
    // Comments quote the defect they fixed, and punishing that teaches people to delete the
    // explanation instead of keeping it. Strip them before scanning for real code.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(ROUNDS_A_GAP_ITSELF.test(code)).toBe(false);
  });

  it('the pattern actually matches the code that caused this, or it is guarding nothing', () => {
    // Mutation check, inline: a guard that matches no realistic defect passes forever and proves
    // nothing. These are the three real call sites, verbatim from the three times it shipped.
    expect(ROUNDS_A_GAP_ITSELF.test('{money(model.result.gap)}')).toBe(true);
    expect(ROUNDS_A_GAP_ITSELF.test('formatMoneyApprox(Number(val.gap) || 0)')).toBe(false); // wrapped in Number()
    expect(ROUNDS_A_GAP_ITSELF.test('formatMoneyApprox(g.gap)')).toBe(true);
  });
});
