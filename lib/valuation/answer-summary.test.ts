import { describe, it, expect } from 'vitest';

import { summariseAnswers, formatRunDate, NOT_GIVEN, type SummaryStep } from '@/lib/valuation/answer-summary';

// The record block on the result page (register P9). The claim under test is not "a block renders"
// but "every question asked appears on it, with the answer given" — the only version that survives
// a thirteenth question.

const money = (n: number) => `$${n.toLocaleString('en-AU')}`;

const STEPS: SummaryStep[] = [
  { id: 'industry', kind: 'industry', record: 'Sector' },
  { id: 'turnover', kind: 'money', record: 'Annual turnover' },
  { id: 'annualProfit', kind: 'money', record: 'Annual profit (SDE)' },
  {
    id: 'ownerDependence',
    kind: 'choice',
    record: 'If you took three months off',
    options: [
      { value: 'i_am_the_business', label: 'It would fall apart' },
      { value: 'mostly_runs', label: 'It would mostly run' },
    ],
  },
  { id: 'tangibleAssets', kind: 'money', record: 'Gear, vehicles and stock' },
  { id: 'businessDebt', kind: 'money', record: 'What the business owes' },
];

const ANSWERS = {
  industry: 'Electrical Contractors',
  turnover: 2_000_000,
  annualProfit: 460_000,
  ownerDependence: 'mostly_runs',
  tangibleAssets: 150_000,
  businessDebt: 380_000,
};

describe('summariseAnswers', () => {
  it('records EVERY question, in the order asked', () => {
    const rows = summariseAnswers(STEPS, ANSWERS, { money });
    expect(rows).toHaveLength(STEPS.length);
    expect(rows.map((r) => r.label)).toEqual([
      'Sector',
      'Annual turnover',
      'Annual profit (SDE)',
      'If you took three months off',
      'Gear, vehicles and stock',
      'What the business owes',
    ]);
  });

  it('prints the money figures as money', () => {
    const rows = summariseAnswers(STEPS, ANSWERS, { money });
    expect(rows.find((r) => r.label === 'Annual turnover')?.value).toBe('$2,000,000');
    expect(rows.find((r) => r.label === 'What the business owes')?.value).toBe('$380,000');
  });

  it('prints the label he picked, not the value stored', () => {
    const rows = summariseAnswers(STEPS, ANSWERS, { money });
    // "mostly_runs" on a document handed to an accountant is our database, not his answer.
    expect(rows.find((r) => r.label === 'If you took three months off')?.value).toBe('It would mostly run');
  });

  // ZERO IS AN ANSWER AND A BLANK IS NOT. The gear question invites 0 ("enter 0 if little applies")
  // and the debt question invites a blank ("leave it blank if you would rather not say"). On a
  // record, collapsing those two into one cell turns a refusal into a claim of no debt.
  it('distinguishes a zero answer from an unanswered question', () => {
    const rows = summariseAnswers(
      STEPS,
      { ...ANSWERS, tangibleAssets: 0, businessDebt: undefined },
      { money },
    );
    expect(rows.find((r) => r.label === 'Gear, vehicles and stock')?.value).toBe('$0');
    expect(rows.find((r) => r.label === 'What the business owes')?.value).toBe(NOT_GIVEN);
  });

  it('treats a NaN money answer as unanswered rather than printing NaN', () => {
    // The money input stores NaN for an emptied field — seeding invalid values has already put
    // "$NaN" on screen once (register P7a).
    const rows = summariseAnswers(STEPS, { ...ANSWERS, turnover: Number.NaN }, { money });
    expect(rows.find((r) => r.label === 'Annual turnover')?.value).toBe(NOT_GIVEN);
  });

  it('carries what he typed beside the sector matched, when they differ', () => {
    const rows = summariseAnswers(STEPS, ANSWERS, { money, typedSector: 'sparky' });
    expect(rows[0]!.value).toBe('Electrical Contractors — from “sparky”');
  });

  it('does not repeat the sector when he typed its name', () => {
    const rows = summariseAnswers(STEPS, ANSWERS, { money, typedSector: 'electrical contractors' });
    expect(rows[0]!.value).toBe('Electrical Contractors');
  });

  it('marks an unanswered choice rather than guessing one', () => {
    const rows = summariseAnswers(STEPS, { ...ANSWERS, ownerDependence: 'not_a_value' }, { money });
    expect(rows.find((r) => r.label === 'If you took three months off')?.value).toBe(NOT_GIVEN);
  });
});

describe('formatRunDate', () => {
  it('writes the month in words, because a slashed date means two days', () => {
    // 8/9/26 is 8 September in Australia and 9 August in the United States, and this page is built
    // to be handed to somebody else.
    expect(formatRunDate(new Date(2026, 7, 9))).toBe('9 August 2026');
  });
});
