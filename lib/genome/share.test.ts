// The rules that decide who receives a man's business document. Each one is a way it could go
// wrong that he would not find out about until after it had.

import { describe, expect, it } from 'vitest';

import {
  MAX_RECIPIENTS_PER_SHARE,
  defaultShareMessage,
  normaliseRecipients,
  shareBlocker,
} from './share';

describe('who actually receives it', () => {
  it('keeps the three fields separate', () => {
    const { recipients } = normaliseRecipients({
      to: ['broker@example.com'],
      cc: ['accountant@example.com'],
      bcc: ['me@example.com'],
    });
    expect(recipients).toEqual({
      to: ['broker@example.com'],
      cc: ['accountant@example.com'],
      bcc: ['me@example.com'],
    });
  });

  it('never promotes a bcc recipient into a visible field', () => {
    // THE ONE THAT MATTERS. An address in both To and Bcc must be de-duplicated — and the survivor
    // must be the MORE visible one, because the alternative is that our de-duplication decides to
    // hide a recipient the owner chose to show. He can only ever make someone more visible by his
    // own action, never by ours.
    const { recipients, problems } = normaliseRecipients({
      to: ['buyer@example.com'],
      cc: [],
      bcc: ['buyer@example.com'],
    });
    expect(recipients.to).toEqual(['buyer@example.com']);
    expect(recipients.bcc).toEqual([]);
    expect(problems).toContainEqual({ field: 'bcc', value: 'buyer@example.com', reason: 'duplicate' });
  });

  it('de-duplicates case-insensitively, so nobody gets two copies', () => {
    const { recipients, total } = normaliseRecipients({
      to: ['Broker@Example.com'],
      cc: ['broker@example.com'],
      bcc: [],
    });
    expect(total).toBe(1);
    expect(recipients.cc).toEqual([]);
  });

  it('reports a bad address against the field it was typed in', () => {
    // So the form can point at it. "One of your addresses is invalid" on a screen with three fields
    // is a puzzle, not an error message.
    const { problems } = normaliseRecipients({ to: ['not-an-email'], cc: [], bcc: [] });
    expect(problems).toEqual([{ field: 'to', value: 'not-an-email', reason: 'invalid' }]);
  });

  it('drops blanks silently rather than calling them invalid', () => {
    // Empty rows are how a form looks mid-typing, not a mistake to shout about.
    const { recipients, problems } = normaliseRecipients({ to: ['a@b.co', '  ', ''], cc: [], bcc: [] });
    expect(recipients.to).toEqual(['a@b.co']);
    expect(problems).toEqual([]);
  });
});

describe('what stops a share going out', () => {
  const ok = { to: ['broker@example.com'], cc: [], bcc: [] };

  it('lets a normal share through', () => {
    expect(shareBlocker({ recipients: ok, total: 1, subject: 'How the business runs', hasDocument: true })).toBeNull();
  });

  it('refuses when there is nothing to send', () => {
    expect(
      shareBlocker({ recipients: ok, total: 1, subject: 's', hasDocument: false }),
    ).toMatch(/nothing in your Operating Manual/i);
  });

  it('refuses with no To recipient, even if cc and bcc are populated', () => {
    // A message with only Bcc recipients arrives looking like spam and reads as though it was not
    // meant for whoever opened it.
    const blocker = shareBlocker({
      recipients: { to: [], cc: ['a@b.co'], bcc: ['c@d.co'] },
      total: 2,
      subject: 's',
      hasDocument: true,
    });
    expect(blocker).toMatch(/To field/i);
  });

  it('caps the recipient count and says the number back to him', () => {
    const blocker = shareBlocker({ recipients: ok, total: MAX_RECIPIENTS_PER_SHARE + 1, subject: 's', hasDocument: true });
    expect(blocker).toContain(String(MAX_RECIPIENTS_PER_SHARE + 1));
    expect(blocker).toContain(String(MAX_RECIPIENTS_PER_SHARE));
  });

  it('requires a subject', () => {
    expect(shareBlocker({ recipients: ok, total: 1, subject: '   ', hasDocument: true })).toMatch(/subject/i);
  });

  it('does NOT require a complete business identity', () => {
    // Deliberate: gating a man's ability to email his own document to his own accountant on whether
    // he has an 11-digit ABN would rebuild the door that trapped a real customer in August. His
    // identity improves the footer; its absence must not stop him sharing what is his.
    expect(shareBlocker({ recipients: ok, total: 1, subject: 's', hasDocument: true })).toBeNull();
  });
});

describe('the default message', () => {
  it('is written in his voice, not ours', () => {
    const { body } = defaultShareMessage({ businessName: 'Hartley Plumbing', ownerName: 'Ray' });
    expect(body).toMatch(/^Hello,/);
    expect(body).toContain('I have put together');
    expect(body.trimEnd().endsWith('Ray')).toBe(true);
    // Never our name, never "Kira has prepared" — an accountant deleting an email from a company he
    // has never heard of is the failure mode.
    expect(body).not.toMatch(/\bKira\b/);
  });

  it('works with nothing known about him', () => {
    const { subject, body } = defaultShareMessage({ businessName: null, ownerName: null });
    expect(subject.trim()).not.toBe('');
    expect(body).toContain('the business');
    // No dangling empty signature line.
    expect(body.endsWith('\n')).toBe(false);
  });
});
