// The substance-test contract, end to end without a model:
//
//   ledger row (substance jsonb) → admittedRowsToItems → itemsForArea → the assessor's prompt.
//
// This is Task-2's guarantee in tests: an admitted factor-bearing question that the operator has
// given a substance test is JUDGED AGAINST THAT TEST ("tests (ALL must hold)…") — never by presence
// — and a weak verdict without its own reason falls back to the authored coaching.

import { describe, expect, it } from 'vitest';

import { admittedRowsToItems, itemsForArea, type AdmissionLedgerRow } from './checklist';
import { itemPromptBlock, promptFor } from './checklist-assess';
import type { AssessableEntry } from './checklist-assess';

function ledgerRow(over: Partial<AdmissionLedgerRow> = {}): AdmissionLedgerRow {
  return {
    id: 'row-1',
    area_key: 'demand',
    item_key: 'adm-lead-response-time',
    buyer_item: 'How quickly does the business respond to new enquiries?',
    owner_prompt: 'How quickly do you get back to new enquiries?',
    factor: 'growth',
    substance: null,
    status: 'admitted',
    admitted_at: '2026-09-14T00:00:00.000Z',
    no_longer_discriminative: false,
    retracted_at: null,
    ...over,
  };
}

const entry: AssessableEntry = {
  id: 'mem-1',
  headline: 'Enquiries',
  content: 'We reply to most enquiries within a day.',
};

describe('an admitted item with an authored substance test is judged against the test', () => {
  it('the prompt carries the tests AND the exemplars for the admitted item', () => {
    const admitted = admittedRowsToItems([
      ledgerRow({
        substance: {
          tests: [
            'answers for the response time specifically, with a figure',
            'states the day/period, not a feel',
          ],
          weakExample: 'We are pretty quick.',
          strongExample: 'Every enquiry before close of business the same day.',
          coaching: 'Give a figure — "pretty quick" is not a number a buyer can model.',
        },
      }),
    ]);
    const items = itemsForArea('demand', admitted);
    const prompt = promptFor('demand', items, [entry]);

    expect(items.some((i) => i.key === 'adm-lead-response-time')).toBe(true);
    expect(prompt).toContain('tests (ALL must hold)');
    expect(prompt).toContain('answers for the response time specifically, with a figure');
    expect(prompt).toContain('a weak answer sounds like: "We are pretty quick."');
    expect(prompt).toContain('a substantive one sounds like: "Every enquiry before close of business the same day."');
  });

  it('the authored coaching is the reason-fallback when the model returns a weak verdict with no why', () => {
    const admitted = admittedRowsToItems([
      ledgerRow({ substance: { tests: ['gives a figure'], weakExample: 'x', strongExample: 'y', coaching: 'Name the accounts and their rough shares.' } }),
    ]);
    const item = itemsForArea('demand', admitted).find((i) => i.key === 'adm-lead-response-time');
    expect(item?.substance?.coaching).toBe('Name the accounts and their rough shares.');
  });
});

describe('an admitted item without a substance test stays explicitly presence-judged', () => {
  it('a required item with no test is told "a relevant fact on the record is enough"', () => {
    const admitted = admittedRowsToItems([ledgerRow({ factor: null, substance: null })]);
    const [item] = itemsForArea('demand', admitted).filter((i) => i.key === 'adm-lead-response-time');
    expect(item).toBeDefined();
    expect(itemPromptBlock(item)).toContain('(no substance test — a relevant fact on the record is enough)');
    expect(itemPromptBlock(item)).not.toContain('tests (ALL must hold)');
  });
});

describe('itemPromptBlock (pure)', () => {
  it('keeps the static supporting-item wording for non-required items without a test', () => {
    const item = itemsForArea('demand', []).find((i) => !i.required && !i.substance);
    expect(item).toBeDefined();
    if (item) {
      expect(itemPromptBlock(item)).toContain('(supporting item — presence of a relevant fact is enough)');
    }
  });
});