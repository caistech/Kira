// lib/capabilities.ts
//
// The single source for what Kira can and cannot do, in the owner's language.
//
// WHY IT IS A MODULE AND NOT A PAGE. This same list exists as docs/WHAT_KIRA_CAN_DO.md for whoever
// is building, and the failure mode of any published capability list is drift: the page keeps saying
// something the code stopped doing, and a page that overstates is worse than no page — it is the
// broken promise, printed. One list, rendered in both places, so a capability landing or leaving
// changes the site by changing the code.
//
// WRITTEN FOR THE OWNER, NOT THE DEVELOPER. He is sixty-six, he runs a plumbing business, and he has
// not told anyone he is selling. "dispatch_task drafts an owned task and holds it for approval" is
// true and useless to him. "She writes it, reads it back, and nothing goes out until you say so" is
// the same fact.
//
// AND THE LIMITS ARE THE SELLING PART. The most persuasive thing on the site, by the ICP's own
// account, is the paragraph admitting privacy mode is not built yet: "you've told me the bad news
// before I asked — that is the paragraph that would get the truth out of me." An owner deciding
// whether to hand over thirty years of undocumented knowledge is not looking for a feature list. He
// is looking for a reason to believe what he is told.

export interface Capability {
  /** What he'd actually say. */
  ask: string;
  /** What happens, in one sentence, no jargon. */
  answer: string;
}

export interface Limit {
  thing: string;
  /** Why not — and whether "yet" is honest. Never say "yet" about something we do not intend. */
  detail: string;
}

/** Things she does today, when asked. */
export const CAN: Capability[] = [
  {
    ask: '“Draft a quote for the Wilson job.”',
    answer: 'She writes it in your voice, reads it back, and nothing goes out until you say so.',
  },
  {
    ask: '“Follow up with Dave about that quote.”',
    answer:
      'She drafts the email and reads it to you. If she does not have his address she asks for it rather than guessing.',
  },
  {
    ask: '“Remind me to chase the council on Tuesday.”',
    answer: 'Set against your own working week, and she raises it with you when it comes around.',
  },
  {
    ask: '“What’s in the bank?”',
    answer:
      'Balance on each account and the total, read out of Xero once you have connected it. She reads only — she cannot move a cent, and she cannot see your bank directly, only what your bookkeeping says.',
  },
  {
    ask: '“Who owes me?” · “What do I owe?”',
    answer:
      'She reads it straight out of your accounting system and tells you — how much is outstanding, how much of it is overdue, and who the oldest ones are. She reads only; she cannot move a cent.',
  },
  {
    ask: '“Did that quote ever go out?” · “Anything waiting on me?”',
    answer:
      'She tells you what she has drafted, what is waiting on your go-ahead, what has already gone, and how long each has been sitting. Keeping that list is her job, not yours.',
  },
  {
    ask: '“What did we agree with the surveyor back in March?”',
    answer:
      'She remembers what you have told her and searches the documents you have given her, and tells you where the answer came from.',
  },
  {
    ask: 'Nothing at all',
    answer:
      'She chases an invoice that has gone past thirty days, follows an unanswered quote, and flags an insurance or licence about to expire — checking each is still true before she acts.',
  },
];

/** Things she cannot do. Each one has no path, not a bad description. */
export const CANNOT: Limit[] = [
  {
    thing: 'Talk you through your profit and loss',
    detail:
      'She can reach the report and currently reads only the income line out of it, which is half an answer and worse than none. Until she can give you the whole picture she will not pretend to.',
  },
  {
    thing: 'Move money',
    detail:
      'No payments, no transfers, no card. She can read your accounts and cannot change them by design — not by a setting we could switch on tomorrow.',
  },
  {
    thing: 'Raise or send an invoice',
    detail: 'She can write the email about one. Creating it in your accounting system is not something she does.',
  },
  {
    // A tester read "reads from your accounting system" next to "no connection to your bank" and
    // could not tell whether she was in the books or not. Xero is now named on both sides, and the
    // bank/bookkeeping distinction is drawn rather than implied — an owner deciding whether to
    // connect his accounts needs to know exactly which door he is opening.
    // UPDATED 2026-07-31 after a tester read this page against the live Settings screen and found
    // it wrong in both directions: it claimed Xero was the ONLY connection while Google Drive was
    // connected with READ AND WRITE and this page never mentioned it. A capability page that
    // understates access is worse than one that overstates it — the owner consented to something he
    // was told did not exist.
    thing: 'Touch your bank, your calendar or your job software',
    detail:
      'She connects to Xero and, if you let her, your Google Drive and contacts — you choose which, and you can see and revoke each one in Settings. She has no link to your bank itself, cannot see your diary, cannot book anything and cannot move a job.',
  },
  {
    thing: 'Order materials or make bookings',
    detail: 'She can draft the message asking someone to. She cannot place the order herself.',
  },
  {
    thing: 'Send anything without you',
    detail:
      'This one is deliberate and it is not adjustable. Everything she writes is read back and waits. A wrong quote that goes out is worse than a slow one.',
  },
  {
    thing: 'Listen in the background',
    detail:
      'She hears you only when you open a conversation and press the button. Waking on her name, with a pause you control, is on the roadmap and is not built — you should know exactly that before you say a word to her.',
  },
  {
    thing: 'Learn a new trick because you asked',
    detail:
      'If you ask for something she cannot do, she says so and writes it down, and that list decides what gets built next. She will not promise to come back to you about it, because nothing yet would.',
  },
];

/**
 * For the advisor. Not a different list — the same one, with the part her compliance officer asks
 * about: what makes a limit a limit rather than a policy we intend to observe.
 */
export const ENFORCEMENT: { claim: string; basis: string }[] = [
  {
    claim: 'She cannot change anything in your client’s accounts.',
    basis:
      'The connection is read-only in the code that carries it, not in a permission that could be widened. Adding a write would mean rewriting that module.',
  },
  {
    claim: 'Nothing is sent without your client’s approval.',
    basis:
      'Drafting and sending are separate steps with separate calls. There is no configuration in which drafting sends.',
  },
  {
    claim: 'You see progress, never their conversations.',
    basis:
      'Your dashboard reads through a database function that cannot select the content columns — a property of what your role can query, not a promise we observe.',
  },
  {
    claim: 'If she cannot do something, your client is told immediately.',
    basis:
      'She states the limit before asking anything else, then records the request. She is instructed never to say she will follow up, because no mechanism would.',
  },
];
