// The two errors this filter can make are not equal, and the tests are weighted accordingly.
//
// A business fact wrongly withheld costs the owner a line he can paste back by hand. A private fact
// wrongly released is read by a buyer, cannot be recalled, and is worth money to the person reading
// it. So the recall cases below use the ACTUAL sentences sitting in production, and the precision
// cases use the business language most likely to collide with them — "sells", "sales", "health and
// safety" — because a filter that swallows the revenue section would be quietly abandoned.

import { describe, expect, it } from 'vitest';

import { isOwnerPrivate, ownerPrivateReason, PRIVATE_REASON_LABEL } from './private';

describe('what must never reach the buyer', () => {
  // Verbatim from the synthetic account's export on 2 August 2026 — the sentence that was rendering
  // into a file labelled "the handover document". If this test ever goes green-by-deletion, the
  // defect is back.
  it('withholds the sentence that started this', () => {
    expect(
      ownerPrivateReason(
        'The owner is considering selling the business after running it for 35 years but has not told anyone about this plan yet.',
      ),
    ).toBe('exit-intent');
  });

  it.each([
    ['is thinking about selling the business next year', 'exit-intent'],
    ['plans to sell up once the yard lease ends', 'exit-intent'],
    ['wants to retire within two years', 'exit-intent'],
    ['has started a succession plan with his accountant', 'exit-intent'],
    ['is stepping back from day-to-day work', 'exit-intent'],
    ['has not told his staff about the sale', 'not-yet-told'],
    ['nobody on the team knows yet', 'not-yet-told'],
    ['wants to keep it quiet until the numbers are in', 'not-yet-told'],
    ['is going through a divorce and needs the cash', 'personal-circumstances'],
    ['a health scare was the reason he started thinking about it', 'personal-circumstances'],
    ['has personally guaranteed the equipment finance', 'personal-circumstances'],
    ['would accept around $2m if it came to it', 'negotiating-position'],
    ['his walk-away number is 1.8', 'negotiating-position'],
    ['is completely burnt out', 'how-he-feels'],
    ['has had enough of chasing invoices', 'how-he-feels'],
  ])('withholds %j', (content, reason) => {
    expect(ownerPrivateReason(content)).toBe(reason);
  });
});

describe('what the buyer is paying to read, and must still get', () => {
  // The collision that matters. "Sell", "sales" and "sold" are how a trading business is described,
  // and an exit-intent rule that fires on them would strip the revenue section — the single part of
  // the Genome a buyer most wants — while looking like it was working.
  it.each([
    'The business sells fencing to builders across the northern suburbs.',
    'Sales are up 12% on last year.',
    'Annual sales sit around $3.4m.',
    'Sold 40 units to Hartley last quarter.',
    'Three builders supply roughly 60% of turnover.',
    'The sales team is two people plus the owner.',
    'Commercial jobs are priced at cost plus 18%.',
    'Health and safety inductions are run by the site foreman.',
    'The health-safety file is audited annually.',
    'Fixtures are sold at cost plus 22%.',
    'He decides which jobs to walk away from based on access.',
    'Payment terms are 30 days from invoice.',
  ])('releases %j', (content) => {
    expect(ownerPrivateReason(content)).toBeNull();
  });
});

describe('the shape the render paths depend on', () => {
  it('every reason has words the owner would recognise', () => {
    for (const reason of Object.keys(PRIVATE_REASON_LABEL)) {
      expect(PRIVATE_REASON_LABEL[reason as keyof typeof PRIVATE_REASON_LABEL]).toMatch(/\w/);
    }
    // A reason with no label would render an empty explanation next to a withheld entry, which is
    // worse than no marker: he would see something was held back and not be told what.
    const reasons = new Set(
      [
        'is thinking about selling the business',
        'has not told his staff',
        'is going through a divorce',
        'his walk-away number is 1.8',
        'is completely burnt out',
      ].map(ownerPrivateReason),
    );
    for (const r of reasons) expect(PRIVATE_REASON_LABEL[r!]).toBeTruthy();
  });

  it('treats empty and whitespace as nothing to withhold rather than throwing', () => {
    expect(isOwnerPrivate('')).toBe(false);
    expect(isOwnerPrivate('   ')).toBe(false);
    expect(ownerPrivateReason(null as unknown as string)).toBeNull();
  });
});
