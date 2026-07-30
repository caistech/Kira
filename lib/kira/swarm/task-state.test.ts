// Two bugs, both of which put a real request on no screen for two days. These tests are written
// against the actual values that did it, not invented ones.

import { describe, expect, it } from 'vitest';

import { asTaskState, TASK_STATES } from './coordinator';
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

describe('spellForSpeech', () => {
  it('spaces the local part so the owner can actually check it', () => {
    expect(spellForSpeech('mcdennis@gmail.com')).toBe('m c d e n n i s, at gmail.com');
  });

  it('leaves a non-address alone rather than mangling it', () => {
    expect(spellForSpeech('nonsense')).toBe('nonsense');
  });
});
