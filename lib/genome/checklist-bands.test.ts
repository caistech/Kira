// The band must be honest in both directions: it cannot go green over a bad answer, and it cannot
// go red over a man who has plainly engaged.

import { describe, expect, it } from 'vitest';

import { assessArea, bandFor, outstandingSplit, type AssessedItem, type ItemStatus } from './checklist-bands';
import { itemsForArea, requiredItemsForArea } from './checklist';

const statusesFor = (pairs: [string, ItemStatus][]) => new Map(pairs);
const answeredAll = (area: 'people' | 'assets' | 'customers') =>
  statusesFor(itemsForArea(area).map((i) => [i.key, 'answered' as ItemStatus]));

describe('the band rule', () => {
  it('is empty when nothing is answered', () => {
    expect(bandFor('people', statusesFor([]))).toBe('empty');
  });

  it('is covered only when EVERY required item is answered', () => {
    expect(bandFor('people', answeredAll('people'))).toBe('covered');

    const required = requiredItemsForArea('people');
    const allButOne = statusesFor([
      ...itemsForArea('people').map((i) => [i.key, 'answered'] as [string, ItemStatus]),
      [required[0].key, 'open'],
    ]);
    expect(bandFor('people', allButOne)).not.toBe('covered');
  });

  it('⚠️ a WEAK answer can never carry a bucket to covered', () => {
    // THE LOAD-BEARING ONE, and the entire reason gate 2 exists. If a weak answer counted, the
    // rubric would be counting again with extra steps — six vague sentences and a green bucket,
    // which is exactly the state this replaces.
    const required = requiredItemsForArea('people');
    const oneWeak = statusesFor([
      ...itemsForArea('people').map((i) => [i.key, 'answered'] as [string, ItemStatus]),
      [required[0].key, 'weak'],
    ]);
    expect(bandFor('people', oneWeak)).not.toBe('covered');
  });

  it('reaches thin on any answered item, including a supporting one', () => {
    // Deliberate. A man who answered three supporting questions has engaged with the area, and
    // showing him red for it is the kind of scoring that makes a person stop talking.
    const supporting = itemsForArea('people').find((i) => !i.required);
    expect(supporting, 'people should have a supporting item').toBeTruthy();
    expect(bandFor('people', statusesFor([[supporting!.key, 'answered']]))).toBe('thin');
  });

  it('cannot reach building on supporting items alone', () => {
    // The other half of the concession above: engagement lifts him off the floor, it does not
    // manufacture progress against the questions a buyer actually asks.
    const supporting = itemsForArea('people').filter((i) => !i.required);
    const band = bandFor(
      'people',
      statusesFor(supporting.map((i) => [i.key, 'answered' as ItemStatus])),
    );
    expect(band).toBe('thin');
  });

  it('reaches building past half the required items', () => {
    const required = requiredItemsForArea('people');
    const half = Math.floor(required.length / 2) + 1;
    const band = bandFor(
      'people',
      statusesFor(required.slice(0, half).map((i) => [i.key, 'answered' as ItemStatus])),
    );
    expect(band).toBe('building');
  });
});

describe('an item the assessor never mentioned', () => {
  it('is open, never silently answered', () => {
    // Same rule as the confirmations: unsure means Kira has something to ask, which is the good
    // outcome. A missing verdict read as "answered" is the lie the document cannot survive.
    const a = assessArea('people', []);
    expect(a.open.length).toBe(itemsForArea('people').length);
    expect(a.band).toBe('empty');
  });
});

describe('the assessment carries the reason, not only the verdict', () => {
  const weak: AssessedItem = {
    itemKey: 'people.successor',
    status: 'weak',
    why: 'You said "my son helps out", which does not say what he can decide without you.',
    evidence: ['entry-1'],
  };

  it('surfaces weak items with their why attached', () => {
    const a = assessArea('people', [weak]);
    const found = a.weak.find((i) => i.key === 'people.successor');
    expect(found?.why).toMatch(/helps out/);
  });

  it('does not count a weak item as answered', () => {
    const a = assessArea('people', [weak]);
    expect(a.answered.map((i) => i.key)).not.toContain('people.successor');
  });
});

describe('what moves the number versus what completes the document', () => {
  it('splits the outstanding items', () => {
    const a = assessArea('assets', []);
    const split = outstandingSplit(a);
    // Assets evidences no valuation factor at all — every item completes the document. If this ever
    // reports a non-zero movesNumber, something has mapped assets to a factor and the "walk-away
    // figure, never the multiple" decision has been quietly reversed.
    expect(split.movesNumber).toBe(0);
    expect(split.completesDocument).toBe(itemsForArea('assets').length);
  });

  it('counts a weak item as outstanding, because it is', () => {
    const a = assessArea('people', [
      { itemKey: 'people.successor', status: 'weak', why: 'thin', evidence: [] },
    ]);
    const split = outstandingSplit(a);
    // people.successor maps to ownerDependence, the heaviest factor in the model.
    expect(split.movesNumber).toBeGreaterThan(0);
  });

  it('an area with everything answered has nothing outstanding', () => {
    const a = assessArea(
      'customers',
      itemsForArea('customers').map((i) => ({
        itemKey: i.key,
        status: 'answered' as ItemStatus,
        why: null,
        evidence: [],
      })),
    );
    expect(outstandingSplit(a)).toEqual({ movesNumber: 0, completesDocument: 0 });
    expect(a.band).toBe('covered');
  });
});
