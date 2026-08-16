// Restatement detection, tested against the sentences that are actually in production.
//
// The two errors are not equal. Leaving a near-duplicate makes a document read as padding — bad, and
// visible. MERGING TWO DISTINCT FACTS HIDES ONE FROM THE OWNER, and on this data the distinct facts
// are different building lots carrying different money. So the negative cases below are the real
// entries from the Factory2Key Genome that score closest to the threshold without crossing it: they
// are what stops anyone lowering it casually.

import { describe, expect, it } from 'vitest';

import { NEAR_DUPLICATE, POSSIBLE_RESTATEMENT, containment, dropRestatements, identifiers, identifiersConflict, isNearDuplicate, isPossibleRestatement, possibleRestatements, restatementCluster } from './similar';

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

describe('the identifier guard (what makes lowering the threshold safe)', () => {
  // THE PAIR THAT MADE LOWERING UNSAFE. Different sites, different money — and near-identical
  // precisely BECAUSE the only difference is the number.
  it('never merges two different lots, however alike the words are', () => {
    const a = 'Managing modular site delivery for Lot 91 including approvals and delivery schedule';
    const b = 'Managing modular site delivery for Lot 442 including approvals and delivery schedule';
    expect(containment(a, b)).toBeGreaterThan(NEAR_DUPLICATE);
    expect(identifiersConflict(a, b)).toBe(true);
    expect(isNearDuplicate(a, b)).toBe(false);
    expect(isPossibleRestatement(a, b)).toBe(false);
  });

  it('does not veto when one entry is merely more specific', () => {
    expect(identifiersConflict('He is considering selling the business', 'He is considering selling after 35 years')).toBe(false);
  });

  it('does not veto when both name the same things in a different order', () => {
    expect(identifiersConflict('Lots 109, 91 and 442 are active', 'Active projects are Lot 91, 442 and 109')).toBe(false);
  });

  it('ignores a leading capital, which is grammar rather than a name', () => {
    expect(identifiers('Delivery is scheduled').has('delivery')).toBe(false);
    expect(identifiers('The Geraldton site is delayed').has('geraldton')).toBe(true);
  });
});

describe('the surface band (lowered, but it asks rather than acts)', () => {
  // The real pair the file previously documented as uncatchable, at containment 0.58.
  const a = 'The owner prefers to keep control over when and how sensitive communications are sent';
  const b = 'The owner prefers to maintain strict control over communications and approvals';

  it('reaches the restatement that the merge threshold cannot', () => {
    const score = containment(a, b);
    expect(score).toBeGreaterThanOrEqual(POSSIBLE_RESTATEMENT);
    expect(score).toBeLessThan(NEAR_DUPLICATE);
    expect(isPossibleRestatement(a, b)).toBe(true);
  });

  // Merged or surfaced, never both — otherwise an entry could be removed AND queried.
  it('never overlaps the merge band', () => {
    const x = 'He is considering selling the business after thirty five years';
    const y = 'He is considering selling the business after thirty five years and has told nobody';
    expect(isNearDuplicate(x, y)).toBe(true);
    expect(isPossibleRestatement(x, y)).toBe(false);
  });

  it('leaves genuinely unrelated entries alone', () => {
    expect(isPossibleRestatement('Commercial jobs are priced at cost plus 18 percent', 'Public liability insurance renews in March')).toBe(false);
  });

  it('points each entry BACKWARDS at the earlier one it may restate', () => {
    const items = [
      { id: 'first', text: a },
      { id: 'second', text: b },
    ];
    const pairs = possibleRestatements(items, (i) => i.id, (i) => i.text);
    expect(pairs.get('second')).toBe('first');
    expect(pairs.has('first')).toBe(false);
  });
});

// ⚠️ SENTENCE-INITIAL CAPITALS ARE NOT PROPER NOUNS — the veto's own rule, applied to every
// sentence rather than only the first.
//
// Ray's two pricing rows: containment 0.966 both ways, all five figures ($118, 22, 18, 28, 12)
// shared and agreeing — and `identifiersConflict` returned TRUE, purely because one row's sentences
// began "Materials…"/"Mine site…" and the other's began "Service…"/"Pricing…". His handover document
// carried the same pricing model twice through two walkthroughs because of it.
describe('identifiers — grammar capitals do not count as names', () => {
  const A =
    'Service labour is charged at $118 per hour. Materials are billed at cost plus 22%. Tender jobs carry an 18% margin. Mine site tender work is priced at a 28% margin. Long-standing builders get a 12% margin.';
  const B =
    'Pricing model: Service labour charged at $118 per hour plus materials billed at cost plus 22%. Tender jobs carry an 18% margin, except for mine site tender work priced at a 28% margin. Long-standing builders on straightforward jobs get a 12% margin.';

  it('does not treat a word after a full stop as an identifier', () => {
    expect(identifiers('The yard is leased. Materials are billed at cost.').has('materials')).toBe(false);
  });

  it('does not treat a word after a colon as an identifier', () => {
    // "Pricing model: Service labour…" — the distil opens restatements this way constantly.
    expect(identifiers('Pricing model: Service labour is charged hourly.').has('service')).toBe(false);
  });

  it('STILL catches a real proper noun mid-sentence — the veto must keep working', () => {
    const ids = identifiers('The only other person who can price a job is Gary.');
    expect(ids.has('gary')).toBe(true);
  });

  it('still vetoes two genuinely different things', () => {
    // The case this whole guard exists for.
    expect(identifiersConflict('Approval covers Lot 91.', 'Approval covers Lot 442.')).toBe(true);
  });

  it("merges Ray's two pricing rows, which is the defect that produced this", () => {
    expect(identifiersConflict(A, B)).toBe(false);
    expect(isNearDuplicate(A, B)).toBe(true);
  });
});
