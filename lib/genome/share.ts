// lib/genome/share.ts
//
// SHARING THE GENOME — the owner sends his own document to his broker, accountant, a buyer, a
// funder. He decides who; we decide what leaves.
//
// ⚠️ THE FILTER IS THE FEATURE. Every share renders through `buyerView`, which strips any entry
// carrying a `privateReason`. That is not a nicety on this product: the single most sensitive thing
// in a Kira account is that the owner is considering selling and has not told his staff or his
// family, and the person he most wants to send this to is precisely the person that must not reach
// by accident. `export.test.ts` already asserts nothing private appears anywhere in the rendered
// output; a share path that reached around it would defeat the one guarantee the document makes.
//
// ⚠️ IT CANNOT BE SENT FROM HIS ADDRESS, AND THE PRODUCT MUST NOT PRETEND OTHERWISE. We send from
// the one Resend-verified subdomain; his own domain is not verified with us and never will be for
// most owners. So the message goes out from our sender with REPLY-TO set to him, is written in the
// first person as him, and says plainly that Kira sent it on his behalf. Putting his address in the
// From header would be a forgery that fails SPF/DKIM at the recipient anyway — the accountant's mail
// server would either bin it or flag it, which is worse than being honest.
//
// ⚠️ IT IS TRANSACTIONAL, NOT COMMERCIAL. He is sending his own business document to a professional
// he chose, at the moment he chose. That is not a commercial electronic message and giving it an
// unsubscribe link would be misleading about what the link does. It still carries the identification
// footer, which is right — the recipient is entitled to know who sent it. Same shape as
// `introducer-invite.ts`.

/** Where an address came from, so a bad one can be reported against the right field. */
export type RecipientField = 'to' | 'cc' | 'bcc';

export interface ShareRecipients {
  to: string[];
  cc: string[];
  bcc: string[];
}

export interface RecipientProblem {
  field: RecipientField;
  value: string;
  reason: 'invalid' | 'duplicate';
}

/**
 * The most addresses one share may carry, across all three fields.
 *
 * ⚠️ THIS IS AN ABUSE CONTROL, not a UX preference. An authenticated owner can otherwise send mail
 * to arbitrary addresses through our infrastructure and under our sending domain — which is a spam
 * vector whose cost lands on the portfolio's deliverability, not on him. Ten covers every real case
 * (a broker, an accountant, a lawyer, two partners, a couple of buyers) and makes a list import
 * pointless.
 *
 * ⚠️ A PER-DAY LIMIT IS NOT IMPLEMENTED AND IS NOT PRETENDED. It would need a durable table: the
 * last in-memory throttle in this codebase turned out to be per-serverless-instance and therefore
 * inert, and the operator's inbox showed three "deduped" alerts four minutes apart. A limiter that
 * looks like protection and is not would be worse than this cap plus a logged record of every send.
 */
export const MAX_RECIPIENTS_PER_SHARE = 10;

/** Deliberately permissive — this rejects nonsense, not unusual-but-valid addresses. */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/**
 * Normalise and check the three fields together.
 *
 * ⚠️ DE-DUPLICATED ACROSS FIELDS, not within them, and the direction matters: an address in both To
 * and Bcc must not receive two copies, and — worse — must not be silently promoted out of Bcc. The
 * first field it appears in wins, in To/Cc/Bcc order, so an address can only ever become MORE
 * visible by the owner's own action, never by ours.
 */
export function normaliseRecipients(raw: Partial<ShareRecipients>): {
  recipients: ShareRecipients;
  problems: RecipientProblem[];
  total: number;
} {
  const problems: RecipientProblem[] = [];
  const seen = new Set<string>();
  const out: ShareRecipients = { to: [], cc: [], bcc: [] };

  for (const field of ['to', 'cc', 'bcc'] as const) {
    for (const entry of raw[field] ?? []) {
      const value = String(entry ?? '').trim();
      if (!value) continue;
      const key = value.toLowerCase();

      if (!LOOKS_LIKE_EMAIL.test(value)) {
        problems.push({ field, value, reason: 'invalid' });
        continue;
      }
      if (seen.has(key)) {
        problems.push({ field, value, reason: 'duplicate' });
        continue;
      }
      seen.add(key);
      out[field].push(value);
    }
  }

  return { recipients: out, problems, total: out.to.length + out.cc.length + out.bcc.length };
}

/**
 * Is this share sendable — and if not, the sentence to show him.
 *
 * ⚠️ IT DOES NOT REQUIRE `canSend`. That is the sender's ABN-and-Australian-state check, and gating
 * a man's ability to email his own document to his own accountant on whether he has filled in an
 * Australian business number would rebuild the door that trapped a real customer in August. His
 * identity improves the footer; its absence must not stop him sharing what is his.
 */
export function shareBlocker(args: {
  recipients: ShareRecipients;
  total: number;
  subject: string;
  hasDocument: boolean;
}): string | null {
  if (!args.hasDocument) {
    return 'There is nothing in your Genome to share yet. Have a conversation with Kira first.';
  }
  if (args.recipients.to.length === 0) {
    return 'Add at least one address in the To field.';
  }
  if (args.total > MAX_RECIPIENTS_PER_SHARE) {
    return `That is ${args.total} recipients. One share can go to ${MAX_RECIPIENTS_PER_SHARE} at most — send a second if you need to.`;
  }
  if (!args.subject.trim()) {
    return 'Give it a subject so they know what it is.';
  }
  return null;
}

/**
 * The default subject and body, in HIS voice.
 *
 * ⚠️ FIRST PERSON, AND EDITABLE. He is the sender; a message written in our voice arriving from a
 * name his accountant does not recognise is the shape that gets deleted. Everything here is a
 * starting point he can rewrite before it goes — the whole point of the fields is that he controls
 * what is said, not just who it reaches.
 */
export function defaultShareMessage(args: { businessName?: string | null; ownerName?: string | null }): {
  subject: string;
  body: string;
} {
  const business = args.businessName?.trim();
  const owner = args.ownerName?.trim();

  return {
    subject: business ? `${business} — how the business runs` : 'How the business runs',
    body: [
      'Hello,',
      '',
      business
        ? `I have put together a record of how ${business} actually runs — where the work comes from, how it is priced, who does what, and the parts that still depend on me.`
        : 'I have put together a record of how the business actually runs — where the work comes from, how it is priced, who does what, and the parts that still depend on me.',
      '',
      'It is attached below. Happy to talk through any of it.',
      '',
      owner ? owner : '',
    ]
      .join('\n')
      .trimEnd(),
  };
}
