// Two bugs, both of which put a real request on no screen for two days. These tests are written
// against the actual values that did it, not invented ones.

import { describe, expect, it } from 'vitest';

import { asTaskState, TASK_STATES } from './coordinator';
import { days, spokenLine, type OpenTaskSummary } from './open-tasks';
import { recipientConcern, recipientFrom, spellForSpeech } from './recipient';

describe('asTaskState', () => {
  it('accepts every state Kira defines', () => {
    for (const s of TASK_STATES) expect(asTaskState(s)).toBe(s);
  });

  it('rejects the TaskStatus object that was written into the status column', () => {
    // Verbatim shape of what sat in kira_tasks.status for three tasks, including a $60,000 quote.
    const live = {
      taskGroupId: '73a94806-6a1b-4f2d-89e9-11d9281afcc2',
      status: 'queued',
      draft: { kind: 'quote', summary: 'Quote for AI platform development', preview: '…', artifact: {} },
      message: 'Drafted — say the word and I will send it.',
    };
    expect(asTaskState(live)).toBeNull();
    // And the correct read of the same object still works.
    expect(asTaskState(live.status)).toBe('queued');
  });

  it('rejects a JSON string of that object — the form it reached the database as', () => {
    expect(asTaskState(JSON.stringify({ status: 'queued' }))).toBeNull();
  });

  it('rejects near-misses and empties rather than coercing them', () => {
    for (const v of ['Queued', 'sent', 'cancelled', '', ' queued', null, undefined, 0, {}, []]) {
      expect(asTaskState(v)).toBeNull();
    }
  });
});

describe('recipientFrom', () => {
  it('reads the orchestrator shape, which Kira used to ignore', () => {
    expect(recipientFrom({ recipients: ['mcdennis@gmail.com'] })).toBe('mcdennis@gmail.com');
  });

  it('reads the local stub shape', () => {
    expect(recipientFrom({ recipient_email: 'dave@example.com' })).toBe('dave@example.com');
  });

  it('prefers the explicit field when both are present', () => {
    expect(recipientFrom({ recipient_email: 'a@b.com', recipients: ['c@d.com'] })).toBe('a@b.com');
  });

  it('returns null for an empty artifact rather than a blank string', () => {
    expect(recipientFrom({})).toBeNull();
    expect(recipientFrom({ recipients: [] })).toBeNull();
    expect(recipientFrom(null)).toBeNull();
  });
});

describe('recipientConcern', () => {
  it('catches an address that was spelled out loud and transcribed literally', () => {
    expect(recipientConcern('m-c-m-d-e-n-n-i-s@gmail.com')).toBe('spelled_out');
    expect(recipientConcern('d.e.n.n.i.s@gmail.com')).toBe('spelled_out');
  });

  it('does not flag ordinary hyphenated or dotted addresses', () => {
    for (const ok of ['mary-jane@example.com', 'first.last@example.com', 'a-b@example.com', 'x.y@e.com']) {
      expect(recipientConcern(ok)).toBeNull();
    }
  });

  it('flags malformed addresses and missing ones separately', () => {
    expect(recipientConcern('not-an-address')).toBe('malformed');
    expect(recipientConcern('two@@at.com')).toBe('malformed');
    expect(recipientConcern('')).toBe('missing');
    expect(recipientConcern(null)).toBe('missing');
  });

  it('passes the one-letter-wrong address — which is exactly why a read-back is required', () => {
    // The real failure: plausible to every machine check, and not his address.
    expect(recipientConcern('mcdennis@gmail.com')).toBeNull();
    expect(recipientConcern('mcmdennis@gmail.com')).toBeNull();
  });
});

describe('days', () => {
  // Built from LOCAL components on purpose: `days` counts the owner's calendar days, so a test
  // written in UTC passes or fails depending on which side of midnight the runner's zone sits.
  const local = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h);

  it('counts calendar days, so Tuesday evening is two days ago on Thursday evening', () => {
    // The real case: the live ledger called a task raised on the 28th "1 day ago" on the 30th,
    // because 38 elapsed hours divided by 24 and floored is 1.
    expect(days(local(2026, 7, 28, 20).toISOString(), local(2026, 7, 30, 18))).toBe(2);
  });

  it('is 0 earlier the same day, and never negative for a future timestamp', () => {
    expect(days(local(2026, 7, 30, 9).toISOString(), local(2026, 7, 30, 23))).toBe(0);
    expect(days(local(2026, 7, 31, 9).toISOString(), local(2026, 7, 30, 23))).toBe(0);
  });
});

describe('spokenLine', () => {
  const task = (over: Partial<OpenTaskSummary>): OpenTaskSummary => ({
    id: 'x',
    kind: 'email',
    status: 'queued',
    state: 'accepted and not finished',
    summary: 'something',
    requested: '2026-07-28T12:00:00Z',
    ageDays: 2,
    ...over,
  });

  it('leads with the quote, not the oldest throwaway — the live regression', () => {
    const line = spokenLine([
      task({ summary: 'Forwarding a test message to myself', ageDays: 3 }),
      task({ summary: 'Test email to Kira', ageDays: 3 }),
      task({ kind: 'quote', summary: 'Quote for $60,000 for Trinh', ageDays: 2 }),
    ]);
    expect(line).toContain('Quote for $60,000 for Trinh');
    expect(line).toContain('from 2 days ago');
    expect(line).toContain('are 2 others');
  });

  it('falls back to the longest-waiting item when nothing is a quote', () => {
    const line = spokenLine([task({ summary: 'newer', ageDays: 1 }), task({ summary: 'older', ageDays: 5 })]);
    expect(line).toContain('older');
    expect(line).toContain('is 1 other');
  });

  it('says nothing at all when nothing is open', () => {
    expect(spokenLine([])).toBe('');
  });

  it('omits the age for something raised today', () => {
    expect(spokenLine([task({ ageDays: 0 })])).not.toContain('day');
  });
});

describe('spellForSpeech', () => {
  it('spaces the local part so the owner can actually check it', () => {
    expect(spellForSpeech('mcdennis@gmail.com')).toBe('m c d e n n i s, at gmail.com');
  });

  it('leaves a non-address alone rather than mangling it', () => {
    expect(spellForSpeech('nonsense')).toBe('nonsense');
  });
});
