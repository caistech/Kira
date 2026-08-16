// Gate 4's honesty, tested from the direction it would fail.
//
// Almost every assertion here is that something does NOT count. That is the point: a pathway is the
// one place in this product where an owner is asked for months of real work, and the temptation to
// reward him for agreeing to it is enormous and completely wrong.

import { describe, expect, it } from 'vitest';

import { CHECKLIST, itemByKey } from './checklist';
import {
  evidencedItemKeys,
  nextMilestone,
  pathwayAvailableFor,
  pathwayState,
  pathwayWorthShare,
  type Pathway,
  type PathwayMilestone,
} from './pathway';

const milestone = (over: Partial<PathwayMilestone> & { key: string; sequence: number }): PathwayMilestone => ({
  description: 'do the thing',
  evidenceKind: 'he says it happened and names when',
  agreedAt: '2026-08-15',
  evidencedAt: null,
  ...over,
});

const pathway = (over: Partial<Pathway> = {}): Pathway => ({
  itemKey: 'people.successor',
  intent: 'Mark can run a Tuesday without me',
  milestones: [
    milestone({ key: 'name', sequence: 1 }),
    milestone({ key: 'handover', sequence: 2 }),
    milestone({ key: 'stop-checking', sequence: 3 }),
  ],
  startedAt: '2026-08-15',
  abandonedAt: null,
  abandonedReason: null,
  ...over,
});

describe('⚠️ the hard rule — a plan is not progress', () => {
  it('an agreed pathway with nothing evidenced reaches the scorer as nothing', () => {
    // THE LOAD-BEARING ASSERTION OF THE WHOLE FEATURE. Every milestone agreed, none observed.
    expect(evidencedItemKeys([pathway()])).toEqual([]);
  });

  it('partial progress reaches the scorer as nothing', () => {
    // Half a successor is not half a business that runs without him. Either someone can run a
    // Tuesday or they cannot, and a buyer will not pay for three of six steps.
    const p = pathway();
    p.milestones[0].evidencedAt = '2026-09-01';
    p.milestones[1].evidencedAt = '2026-10-01';
    expect(pathwayState(p)).toBe('in-progress');
    expect(evidencedItemKeys([p])).toEqual([]);
  });

  it('a fully evidenced pathway does reach the scorer', () => {
    const p = pathway();
    p.milestones.forEach((m) => (m.evidencedAt = '2026-11-01'));
    expect(pathwayState(p)).toBe('complete');
    expect(evidencedItemKeys([p])).toEqual(['people.successor']);
  });

  it('agreedAt alone never counts, however long ago it was', () => {
    // The specific way this would rot: a pathway agreed in March, still nothing observed in
    // November, and a score that has quietly been carrying it the whole time.
    const p = pathway();
    p.milestones.forEach((m) => (m.agreedAt = '2026-03-01'));
    expect(evidencedItemKeys([p])).toEqual([]);
  });

  it('an abandoned pathway is never complete, even if milestones were evidenced', () => {
    const p = pathway({ abandonedAt: '2026-10-01', abandonedReason: 'Mark left' });
    p.milestones.forEach((m) => (m.evidencedAt = '2026-09-01'));
    expect(pathwayState(p)).toBe('abandoned');
    expect(evidencedItemKeys([p])).toEqual([]);
  });
});

describe('the next thing to do', () => {
  it('is the earliest unevidenced milestone by SEQUENCE, not array order', () => {
    // These arrive from a database. A forgotten ORDER BY is exactly how a man gets told to do step 4
    // before step 1, and he would follow it, because she said so.
    const p = pathway({
      milestones: [
        milestone({ key: 'c', sequence: 3 }),
        milestone({ key: 'a', sequence: 1 }),
        milestone({ key: 'b', sequence: 2 }),
      ],
    });
    expect(nextMilestone(p)?.key).toBe('a');
  });

  it('skips what is already evidenced', () => {
    const p = pathway();
    p.milestones[0].evidencedAt = '2026-09-01';
    expect(nextMilestone(p)?.key).toBe('handover');
  });

  it('is null when everything is done', () => {
    const p = pathway();
    p.milestones.forEach((m) => (m.evidencedAt = '2026-11-01'));
    expect(nextMilestone(p)).toBeNull();
  });

  it('does not mutate the caller\'s array while sorting', () => {
    const p = pathway({
      milestones: [milestone({ key: 'c', sequence: 3 }), milestone({ key: 'a', sequence: 1 })],
    });
    nextMilestone(p);
    expect(p.milestones[0].key).toBe('c');
  });
});

describe('what a pathway may be offered for', () => {
  it('only items that genuinely need the business to change', () => {
    expect(pathwayAvailableFor('people.successor')).toBe(true);
  });

  it('never for something he could answer in a sentence', () => {
    // Asking an owner for months of work to fix a thing he could have said in ten seconds is the
    // fastest way to make him stop trusting the panel.
    expect(itemByKey('people.roster')?.closes).toBe('fact');
    expect(pathwayAvailableFor('people.roster')).toBe(false);
  });

  it('never for an item key that does not exist', () => {
    expect(pathwayAvailableFor('people.invented')).toBe(false);
  });
});

describe('what closing it is worth', () => {
  it('is a share of the score, never a dollar figure', () => {
    // Turning it into money needs his SDE and his sector's spread, which belong to the caller that
    // has his row. A dollar amount computed from a share of a score is a precise-looking number on
    // a guess, which is the thing the whole coverage design refuses to print.
    const item = itemByKey('people.successor')!;
    const share = pathwayWorthShare(item, 4);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
  });

  it('is null for an item that moves nothing', () => {
    const item = itemByKey('assets.owned')!;
    expect(pathwayWorthShare(item, 4)).toBeNull();
  });

  it('is larger for owner-dependence than for a lighter factor', () => {
    // ownerDependence is 3.0 of 10 — the heaviest thing in the model. If this ever inverts, the
    // panel would be steering owners toward the least valuable work.
    const heavy = pathwayWorthShare(itemByKey('people.successor')!, 4)!;
    const light = pathwayWorthShare(
      CHECKLIST.find((i) => i.factor === 'clientConcentration')!,
      4,
    )!;
    expect(heavy).toBeGreaterThan(light);
  });

  it('does not divide by zero when a factor has no required items', () => {
    expect(pathwayWorthShare(itemByKey('people.successor')!, 0)).toBeNull();
  });
});
