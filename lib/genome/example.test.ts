// lib/genome/example.test.ts
//
// The public example is the ONLY place a prospect sees what he is buying before he pays. It showed
// SIX areas after the model moved to NINE — so the page that exists to prove the deliverable
// asserted a shape the product had abandoned, and the three it omitted (people, assets, systems)
// are the ones a due-diligence list opens with.
//
// It fell behind silently because `areas.test.ts` pinned GENOME_AREAS at nine and nothing pinned
// THIS file to GENOME_AREAS. That is the gap these close: the example is now checked against the
// real model rather than against a number somebody remembered to update.

import { describe, expect, it } from 'vitest';

import { AREA_KEYS, GENOME_AREAS } from './areas';
import { EXAMPLE_GENOME } from './example';

describe('the public example matches the real area model', () => {
  it('covers every area, in the model’s own order', () => {
    const exampleKeys = EXAMPLE_GENOME.map((s) => s.key);
    // Sorted comparison first: it fails with a readable diff naming the missing key, where a length
    // assertion would only say 6 !== 9 and leave you hunting.
    expect([...exampleKeys].sort()).toEqual([...AREA_KEYS].sort());
    expect(exampleKeys).toHaveLength(GENOME_AREAS.length);
  });

  it('uses no key the model does not define', () => {
    for (const s of EXAMPLE_GENOME) {
      expect(AREA_KEYS).toContain(s.key);
    }
  });

  it('gives every area something to show — an empty area on the sales page proves nothing', () => {
    for (const s of EXAMPLE_GENOME) {
      expect(s.entries.length, `area '${s.key}' has no entries`).toBeGreaterThan(0);
      expect(s.title.trim()).not.toBe('');
      expect(s.question.trim()).not.toBe('');
    }
  });

  /**
   * The honest half is the persuasive half. An example where everything is captured and nothing is
   * still in his head describes a business that does not need the product.
   */
  it('still admits to gaps somewhere', () => {
    const gaps = EXAMPLE_GENOME.flatMap((s) => s.stillOnlyInYourHead);
    expect(gaps.length).toBeGreaterThan(0);
  });
});
