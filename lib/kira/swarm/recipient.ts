// lib/kira/swarm/recipient.ts
// Who a drafted send is actually addressed to — and whether that address can be trusted.
//
// WHY THIS EXISTS. Two of the owner's three requests on 28 July were addressed to nobody:
//
//   m-c-m-d-e-n-n-i-s@gmail.com   — he spelled his address out loud and it was transcribed literally
//   mcdennis@gmail.com            — one letter short of his real address, on a $60,000 quote
//
// Neither is a bug in the classifier: it was explicitly told never to invent an address, and it
// didn't — it used exactly what it heard. A speech interface will mis-hear an address, because an
// address is the one thing in a conversation with no redundancy. Every other mistake gets caught by
// the owner hearing the draft read back; a wrong letter in an email address does not.
//
// So there are two jobs here. Reject what is provably not an address (the spelled-out case, which is
// mechanically detectable), and mark every send for READ-BACK, because the near-miss case can only be
// caught by the owner hearing it. A silent bad send is worse than an extra question.

/** The shapes a recipient arrives in: Kira's own field, and the orchestrator's `recipients` array. */
export interface RecipientBearingArtifact {
  recipient_email?: unknown;
  recipients?: unknown;
  to?: unknown;
}

/**
 * Pull the recipient out of a draft artifact, whichever side wrote it.
 *
 * The local stub writes `recipient_email`; the orchestrator writes `recipients: [address]`. Kira
 * previously only looked at the first, so an orchestrator-drafted send with a perfectly good address
 * still reported `needs_recipient_email: true` and the agent asked the owner for an address it
 * already held.
 */
export function recipientFrom(artifact: RecipientBearingArtifact | null | undefined): string | null {
  if (!artifact) return null;
  const candidates: unknown[] = [
    artifact.recipient_email,
    Array.isArray(artifact.recipients) ? artifact.recipients[0] : undefined,
    artifact.to,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

/** Deliberately loose: this rejects nonsense, it does not adjudicate RFC 5322. */
const EMAIL_SHAPE = /^[^\s@,;]+@[^\s@,;.]+\.[^\s@,;]+$/;

/**
 * A local part that is a string of single letters joined by hyphens or dots — the signature of an
 * address dictated aloud and transcribed character by character. Three groups is enough to be sure:
 * real addresses like `a-b@x.com` exist, `m-c-m-d-e-n@x.com` does not.
 */
const SPELLED_OUT = /^(?:[a-z0-9][-.]){3,}[a-z0-9]?$/i;

export type RecipientConcern = 'missing' | 'malformed' | 'spelled_out';

/**
 * What is wrong with this address, if anything.
 *
 * `null` means it is *plausible* — NOT that it is right. `mcdennis@gmail.com` returns null and was
 * still the wrong person. That is what the read-back is for.
 */
export function recipientConcern(email: string | null | undefined): RecipientConcern | null {
  const value = (email ?? '').trim();
  if (!value) return 'missing';
  if (!EMAIL_SHAPE.test(value)) return 'malformed';
  if (SPELLED_OUT.test(value.slice(0, value.indexOf('@')))) return 'spelled_out';
  return null;
}

/** True when this address must not be sent to as-is. */
export function isUnusableRecipient(email: string | null | undefined): boolean {
  return recipientConcern(email) !== null;
}

/**
 * What Kira should say about the address before anything leaves. Spoken text, so it is written to be
 * read aloud — including the address spaced out, since "read it back" only works if she says it in a
 * form he can check.
 */
export function recipientPrompt(
  email: string | null,
  concern: RecipientConcern | null,
  /** Where the address came from. 'contacts' means we looked it up; he never said it aloud. */
  source?: 'contacts' | null,
): string {
  switch (concern) {
    case 'missing':
      return "I don't have an email address for that one — what should I use?";
    case 'spelled_out':
    case 'malformed':
      return `The address I have is "${email}", which doesn't look like a real one — can you give it to me again?`;
    default:
      // An address he never spoke has to be introduced as one, or the read-back is a question he
      // does not know he is being asked — he hears his own words repeated and says yes to a lookup
      // he was never told about. Saying where it came from is what makes the yes worth anything.
      return source === 'contacts'
        ? `I found that address in your contacts: ${spellForSpeech(email ?? '')}. Is that the right one?`
        : `Before I send it, let me check the address: ${spellForSpeech(email ?? '')}. Is that right?`;
  }
}

/**
 * Render an address so it survives being spoken: the local part letter by letter, then the domain as
 * a word. A voice agent reading "mcdennis@gmail.com" aloud at speed is exactly how one missing letter
 * goes unnoticed by the person who is meant to be checking it.
 */
export function spellForSpeech(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return email;
  const local = email.slice(0, at).split('').join(' ');
  return `${local}, at ${email.slice(at + 1)}`;
}
