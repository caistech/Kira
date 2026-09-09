import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { HEADLINE_NUMBERS } from './headline-numbers';
import { stripComments } from '@/lib/source-scan';

// Register P8. "WALK AWAY $220k / TODAY $684k / CAPTURED $879k, with nothing saying what walk away
// means. Walk away from what? From the sale? From the business?"
//
// The definitions already existed, word-perfect, on the valuation intro — a screen reached only by
// people already persuaded. So this is a single-statement test as much as a copy one: FOUR surfaces
// print these three labels, and a definition in four places drifts in four directions. That class
// has three confirmed instances in this product already (K15).
//
// ⚠️ Comments are stripped. This file's own header quotes the labels, and so do the source comments
// on the pages — the sibling scans learned that punishing an honest explanation teaches people to
// delete the explanation.

const SURFACES = [
  'components/landing/LandingClassic.tsx',
  'components/landing/LandingNew.tsx',
  'components/landing/LandingConsultant.tsx',
  'app/business-valuation/page.tsx',
];

const read = (p: string) => stripComments(fs.readFileSync(path.join(process.cwd(), p), 'utf8'));

describe('the three headline numbers are defined once', () => {
  it('defines all three, each with a meaning that answers "from what?"', () => {
    expect(HEADLINE_NUMBERS.map((h) => h.key)).toEqual(['walkAway', 'today', 'captured']);
    for (const h of HEADLINE_NUMBERS) {
      // A meaning that is shorter than its own label is a placeholder, not an explanation.
      expect(h.meaning.length).toBeGreaterThan(h.shortLabel.length);
      expect(h.meaning.trim()).not.toBe('');
    }
  });

  it('answers the question he actually asked — walk away FROM WHAT', () => {
    // "From the sale? From the business?" It is the business, today, without selling it to anybody.
    const walkAway = HEADLINE_NUMBERS[0]!;
    expect(walkAway.meaning.toLowerCase()).toMatch(/closed the doors|shut/);
  });

  for (const surface of SURFACES) {
    it(`${surface} reads the definitions rather than restating them`, () => {
      // The mechanism, not the copy: if a surface stops importing this it has grown its own
      // description again, which is precisely how the landing and the intro diverged.
      expect(read(surface)).toContain('headline-numbers');
      expect(read(surface)).toContain('HEADLINE_NUMBERS');
    });
  }

  for (const surface of SURFACES.slice(0, 2)) {
    it(`${surface} no longer prints a bare label with no meaning beside it`, () => {
      // The defect itself: three labels, three figures, nothing saying what they are. Asserting the
      // meaning string is PRESENT in the rendered source is what makes this a check rather than a
      // note — a surface that imports the constant and never renders `meaning` would otherwise pass.
      expect(read(surface)).toContain('.meaning');
    });
  }
});
