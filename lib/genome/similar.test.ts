// Restatement detection, tested against the sentences that are actually in production.
//
// The two errors are not equal. Leaving a near-duplicate makes a document read as padding — bad, and
// visible. MERGING TWO DISTINCT FACTS HIDES ONE FROM THE OWNER, and on this data the distinct facts
// are different building lots carrying different money. So the negative cases below are the real
// entries from the Factory2Key Genome that score closest to the threshold without crossing it: they
// are what stops anyone lowering it casually.

import { describe, expect, it } from 'vitest';

import { containment, dropRestatements, isNearDuplicate, restatementCluster, NEAR_DUPLICATE } from './similar';

// Verbatim from the QA account — the three that made the export carry six entries for two facts.
const SELLING_A = 'The owner is considering selling the business after running it for 35 years but has not told anyone yet.';
const SELLING_B =
  'The business owner has been running their business for 35 years and is considering selling it but has not disclosed this intention to anyone yet.';
const SELLING_C =
  'The owner is considering selling the business after running it for 35 years but has not told anyone about this plan yet.';

// Verbatim from the real Genome. Different lots, different money, similar words.
const LOTS_A = 'Factory to Key is managing multiple modular site deliveries including Lot 109, Lot 91, and Lot 442.';
const LOTS_B = 'Active projects under Factory to Key include Lot 91, Lot 442, and Lot 109 in Geraldton.';

describe('restatements of one fact', () => {
  it.each([
    [SELLING_A, SELLING_B],
    [SELLING_A, SELLING_C],
    [SELLING_B, SELLING_C],
  ])('recognises a rewording of the same sentence', (a, b) => {
    expect(isNearDuplicate(a, b)).toBe(true);
  });

  it('collapses the three to one, keeping the first', () => {
    const kept = dropRestatements([SELLING_A, SELLING_B, SELLING_C], (s) => s);
    expect(kept).toEqual([SELLING_A]);
  });
});

describe('distinct facts stay distinct', () => {
  it('does not merge the two lot summaries, which is the closest real call', () => {
    // Measured at 0.60. They arguably describe the same thing, and they still both survive — the
    // safe direction when the alternative is a fact vanishing from the owner's page.
    expect(containment(LOTS_A, LOTS_B)).toBeLessThan(NEAR_DUPLICATE);
    expect(isNearDuplicate(LOTS_A, LOTS_B)).toBe(false);
  });

  it.each([
    ['Commercial jobs are priced at cost plus 18%.', 'Fixtures are sold at cost plus 22%.'],
    ['The Lot 91 building approval issue is being resolved with certifiers and council.', 'An RFQ is to be sent to Roger at Quantum Surveys for contour surveys at Lot 109.'],
    ['Uwe Jacobs holds the governance gate for developer-position decisions.', 'Equity partners are planned to secure about 40% equity for new site developments.'],
  ])('keeps both of %j / %j', (a, b) => {
    expect(isNearDuplicate(a, b)).toBe(false);
  });

  it('does not merge on shared vocabulary alone', () => {
    // Same nouns, opposite meaning. A measure that ignored this would merge a fact with its negation.
    expect(isNearDuplicate('Lot 91 has building approval.', 'Lot 442 has building approval.')).toBe(false);
  });
});

describe('the cluster a redaction has to reach', () => {
  it('follows restatements transitively', () => {
    // The redaction case: he clicks A, and C must go too even if A does not reach C directly —
    // otherwise a sentence saying the thing he just took back is left on the page.
    const others = [SELLING_B, SELLING_C, 'Commercial jobs are priced at cost plus 18%.'];
    const cluster = restatementCluster(SELLING_A, others, (s) => s);
    expect(cluster).toContain(SELLING_B);
    expect(cluster).toContain(SELLING_C);
    expect(cluster).not.toContain('Commercial jobs are priced at cost plus 18%.');
  });

  it('returns nothing when the fact stands alone', () => {
    expect(restatementCluster('Payment terms are 30 days from invoice.', [LOTS_A, LOTS_B], (s) => s)).toEqual([]);
  });

  it('terminates rather than looping on mutual matches', () => {
    // Every item restates every other; a naive walk revisits forever.
    const all = [SELLING_A, SELLING_B, SELLING_C];
    expect(restatementCluster(SELLING_A, all, (s) => s)).toHaveLength(3);
  });
});

describe('degenerate input cannot merge anything', () => {
  it.each([['', ''], ['   ', 'Lot 91 has approval.'], ['the and of to', 'Lot 91 has approval.']])(
    'scores %j against %j as zero',
    (a, b) => {
      expect(containment(a, b)).toBe(0);
      expect(isNearDuplicate(a, b)).toBe(false);
    },
  );
});
