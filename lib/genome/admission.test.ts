// The monotonic admission gate, tested where it makes its promises:
//
//   * admission enters the LIVE FACTOR SET — a new required item moves the number
//   * admission is MONOTONIC — a new question lowers an uncovered band honestly, and only a real
//     answer lifts it back
//   * retraction-for-cause is JOURNALED, and the journal is not a read
//   * retirement-for-coverage is NOT removal: the item stays in the coverage denominator and only
//     the live factor score ignores it

import { describe, expect, it } from 'vitest';

import { admittedRowsToItems, itemsForArea, type AdmissionLedgerRow, type ChecklistItem } from './checklist';
import { assessArea, bandFor } from './checklist-bands';
import { computeEvidencedReadiness, evidenceForFactor } from '@/lib/valuation/evidenced-readiness';
import type { AssessedItem, ItemStatus } from './checklist-bands';
import type { FactorKey } from './checklist';

function ledgerRow(over: Partial<AdmissionLedgerRow> = {}): AdmissionLedgerRow {
  return {
    id: 'row-1',
    area_key: 'people',
    item_key: 'adm-succession-plan',
    buyer_item: 'Who can step into the owner’s role without a transition?',
    owner_prompt: 'Who could run this business if you were away for three months?',
    factor: null,
    substance: null,
    status: 'admitted',
    admitted_at: '2026-09-14T00:00:00.000Z',
    no_longer_discriminative: false,
    retracted_at: null,
    ...over,
  };
}

function admittedItem(over: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    key: 'adm-succession-plan',
    area: 'people',
    required: true,
    buyerItem: 'Who can step into the owner’s role without a transition?',
    ownerPrompt: 'Who could run this business if you were away for three months?',
    substance: null,
    factor: null,
    closes: 'fact',
    ...over,
  };
}

const statusesFor = (pairs: [string, ItemStatus][]) => new Map(pairs);
const answeredAll = (area: 'people' | 'assets' | 'customers', extra: ChecklistItem[] = []) =>
  statusesFor(itemsForArea(area, extra).map((i) => [i.key, 'answered' as ItemStatus]));

describe('the ledger read (score time)', () => {
  it('admits a row into checklist shape: required, same question, stable key', () => {
    const [item] = admittedRowsToItems([ledgerRow()]);
    expect(item).toMatchObject({
      key: 'adm-succession-plan',
      area: 'people',
      required: true, // admitted items set the bar
      buyerItem: ledgerRow().buyer_item,
      ownerPrompt: ledgerRow().owner_prompt,
      source: 'admitted',
      ledgerId: 'row-1',
    });
  });

  it('keeps a WATCHLISTED row out of the score entirely', () => {
    expect(admittedRowsToItems([ledgerRow({ status: 'watchlisted' })])).toHaveLength(0);
  });

  it('excludes a retraction-for-cause row — journaled, not read', () => {
    expect(
      admittedRowsToItems([ledgerRow({ retracted_at: '2026-09-14T12:00:00.000Z' })]),
    ).toHaveLength(0);
  });

  it('keeps a retirement-for-coverage row in the read, flagged', () => {
    const [item] = admittedRowsToItems([ledgerRow({ no_longer_discriminative: true })]);
    expect(item.retiredForCoverage).toBe(true);
  });

  it('skips a stranger area key rather than trusting it', () => {
    expect(admittedRowsToItems([ledgerRow({ area_key: 'astrology' })])).toHaveLength(0);
  });

  it('maps a factor-bearing admission into factor-filterable shape', () => {
    const [item] = admittedRowsToItems([
      ledgerRow({ factor: 'growth', area_key: 'demand', item_key: 'adm-lead-time' }),
    ]);
    expect(item.factor).toBe('growth');
  });

  it('carries the authored substance test into the live item', () => {
    const [item] = admittedRowsToItems([
      ledgerRow({
        factor: 'growth',
        substance: {
          tests: ['names the two biggest accounts', 'gives a rough share for each'],
          weakExample: 'We have a couple of big ones.',
          strongExample: 'Two accounts over $100k each; the biggest is 35% of revenue.',
          coaching: 'Name the accounts and their rough shares.',
        },
      }),
    ]);
    expect(item.substance).toEqual({
      tests: ['names the two biggest accounts', 'gives a rough share for each'],
      weakExample: 'We have a couple of big ones.',
      strongExample: 'Two accounts over $100k each; the biggest is 35% of revenue.',
      coaching: 'Name the accounts and their rough shares.',
    });
  });

  it('a factor-bearing item without a substance test stays presence-judged (substance null)', () => {
    const [item] = admittedRowsToItems([ledgerRow({ factor: 'growth' })]);
    expect(item.substance).toBeNull();
  });
});

describe('admission enters the live factor set', () => {
  const assessedMap = (pairs: [string, string][]) =>
    new Map<string, AssessedItem>(pairs.map(([itemKey, status]) => [itemKey, {
      itemKey,
      status: status as ItemStatus,
      why: null,
      evidence: [],
    }]));

  it('adds the required item to the factor denominator', () => {
    const before = evidenceForFactor('growth', assessedMap([]));
    const admitted = admittedItem({ factor: 'growth', area: 'demand', key: 'adm-lead-time' });
    const after = evidenceForFactor('growth', assessedMap([]), [admitted]);
    expect(after.total).toBe(before.total + 1);
    expect(after.answered).toBe(before.answered);
  });

  it('pays the number only for a real answer, never for a plan', () => {
    const admitted = admittedItem({ factor: 'ownerDependence', area: 'people', key: 'adm-succession' });
    const unAnswered = evidenceForFactor('ownerDependence', assessedMap([]), [admitted]);
    const answered = evidenceForFactor(
      'ownerDependence',
      assessedMap([['adm-succession', 'answered']]),
      [admitted],
    );
    expect(unAnswered.answered).toBe(0);
    expect(answered.answered).toBe(unAnswered.answered + 1);
  });

  it('composes readiness — the number moves when an admitted item is answered', () => {
    const baseline: Record<FactorKey, number> = {
      ownerDependence: 0.50,
      systems: 0.50,
      recurringRevenue: 0.50,
      clientConcentration: 0.50,
      growth: 0.50,
    };
    const admitted = admittedItem({ factor: 'growth', area: 'demand', key: 'adm-lead-time' });
    // No verdict anywhere → evidenced sub-scores stay null and nothing is claimed. This is the
    // degrade-don't-fake rule at the scoring layer.
    const none = computeEvidencedReadiness(baseline, [], [admitted]);
    expect(none.unassessed).toBe(true);

    const answered = computeEvidencedReadiness(
      baseline,
      [{ itemKey: 'adm-lead-time', status: 'answered', why: null, evidence: [] }],
      [admitted],
    );
    expect(answered.unassessed).toBe(false);
    const growth0 = none.factors.find((f) => f.factor === 'growth')!;
    const growth1 = answered.factors.find((f) => f.factor === 'growth')!;
    expect(growth1.evidencedScore ?? 0).toBeGreaterThan(growth0.evidencedScore ?? 0);
    expect(answered.readinessNow).toBeGreaterThan(none.readinessNow ?? 0);
  });
});

describe('monotonic admission in the band (the honesty guarantee)', () => {
  it('drops a covered area the moment a new question is admitted, and only answers lift it', () => {
    const staticAnswered = statusesFor(itemsForArea('people').map((i) => [i.key, 'answered' as ItemStatus]));
    expect(bandFor('people', staticAnswered)).toBe('covered');

    const admitted = admittedItem();
    // The new question is on the factor set but not yet answered: covered → NOT covered, honestly.
    // This is the monotonic surprise nobody is warned about by a rising line — a bought-in number
    // is only ever a snapshot of the questions being asked that day.
    const unsettled = bandFor('people', staticAnswered, [admitted]);
    expect(unsettled).not.toBe('covered');

    const settled = bandFor('people', answeredAll('people', [admitted]), [admitted]);
    expect(settled).toBe('covered');
  });

  it('surfaces the admitted question as the panel’s next open item', () => {
    const admitted = admittedItem();
    const result = assessArea('people', [], [admitted]);
    expect(result.open.some((i) => i.key === 'adm-succession-plan')).toBe(true);
    expect(result.band).not.toBe('covered');
  });

  it("never lets a weak answer carry an admitted item to covered", () => {
    const admitted = admittedItem();
    const statuses = new Map(
      itemsForArea('people', [admitted]).map((i) => [
        i.key,
        i.key === 'adm-succession-plan' ? ('weak' as ItemStatus) : ('answered' as ItemStatus),
      ]),
    );
    expect(bandFor('people', statuses, [admitted])).not.toBe('covered');
  });
});