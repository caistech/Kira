// The demo's data — the same plumbing business as `/genome`, shown at two points in time.
//
// THE AXIS IS ELAPSED TIME, NOT STEPS. ExecutorAI's demo is a ten-step walkthrough because its flow
// is linear and finite: organise, die, open, probate, done. Kira's never completes — the Genome
// fills in and the score moves. A step-based walkthrough would tell an owner that Kira is a form he
// finishes, which is the opposite of the product.
//
// So the demo runs week one against month six, with coverage climbing and the "still only in your
// head" list shrinking. That list shrinking IS the product working.
//
// ONE BUSINESS ACROSS EVERY SURFACE. Reuses `lib/genome/example.ts` deliberately: the landing hero
// numbers, /genome, the ICP demo and the advisor section all describe the same 31-year-old plumbing
// business. ExecutorAI does the same thing between /demo and /sample, and the reason is that two
// artifacts describing two different fictional businesses read as marketing, while one that follows
// a single business through time reads as a record.

import { EXAMPLE_GENOME, overallCoverage } from './example';

export interface Beat {
  /** Where we are in the owner's life with Kira. */
  when: string;
  /** Kira's narration, in her voice — this is what gets generated as audio. */
  narration: string;
  /** Caption shown regardless of sound, and used as the audio's transcript. */
  caption: string;
  /** Which genome section to highlight, if any. */
  section?: string;
  /** Coverage to display at this beat (0-100). */
  coverage?: number;
  /** Gaps still open at this beat — the honest half, shrinking. */
  stillOpen?: string[];
}

/** Coverage at week one — before Kira has had more than a couple of conversations. */
export const WEEK_ONE_COVERAGE = 12;
export const MONTH_SIX_COVERAGE = overallCoverage();

/**
 * The ICP demo. Auto-advancing, so it is written to be WATCHED rather than driven.
 *
 * It opens on what Kira cannot do. That is deliberate and it is the evidence, not a hunch: the only
 * two things that moved the ICP tester toward trusting this were admissions — the Genome being
 * honest about its own gaps, and privacy mode being labelled unbuilt. Leading with the limits is
 * what buys the right to make a claim afterwards.
 */
export const ICP_BEATS: Beat[] = [
  {
    when: 'Before anything',
    narration:
      "Before I show you anything — a few things I can't do yet. I can't sit in the background and " +
      "listen; you have to open a conversation and press the button. I don't read your email. And " +
      "nobody at our end reads what you tell me. I'd rather you heard that from me than found it out.",
    caption:
      "What Kira can't do yet: no background listening, no reading your email, and nobody at our end reads your conversations.",
  },
  {
    when: 'Week one',
    narration:
      "This is a plumbing business. Thirty-one years old, nine staff, and it runs on one man. " +
      "Here's what I know about it after a week — almost nothing. Twelve percent of how this " +
      "business works is written down anywhere. The rest is in his head.",
    caption: 'Week one: 12% of the business is documented. The rest is in the owner\'s head.',
    coverage: WEEK_ONE_COVERAGE,
    stillOpen: [
      'How work is priced — including the discount his biggest builder gets',
      'Why the crews are allocated the way they are each morning',
      'Which customers pay, and which need chasing',
    ],
  },
  {
    when: 'A Tuesday, in the ute',
    narration:
      "He talks to me between jobs. Not a form, not homework — the same way he'd tell an offsider. " +
      "Today he mentioned that Hartley gets about twelve percent off list and forty-five day terms, " +
      "and that it's been that way since a job in two thousand and four that went badly and got " +
      "fixed at his own cost. He's never written that down. Now it exists.",
    caption:
      'He mentions the builder discount in passing. It has never been written down anywhere. Now it exists.',
    section: 'pricing',
  },
  {
    when: 'Month six',
    narration:
      "Six months on. Sixty-one percent of the business is on the page — how work comes in, how it's " +
      "priced, who the relationships belong to, what must not lapse. And the part that still only " +
      "lives in his head is named, not hidden, because that's the part a buyer discounts him for.",
    caption: 'Month six: 61% documented — and what remains is named rather than hidden.',
    coverage: MONTH_SIX_COVERAGE,
    stillOpen: [
      'When to walk away from a job — he has a clear instinct and has never put it into words',
      'What he would tell a buyer never to change',
    ],
  },
  {
    when: 'What he ends up with',
    narration:
      "This is what he owns at the end of it. One document a buyer's accountant can read cold, and a " +
      "copy of everything, exportable whenever he likes. If he stops paying us, he keeps it. That's " +
      "the difference between selling a job and selling a business.",
    caption:
      "A handover document a buyer's accountant can read, and a copy of everything — exportable, and yours if you leave.",
  },
];

/**
 * The advisor section. Prev/next, because an advisor is EVALUATING and will want to go back and
 * re-read the commission terms — where the owner watches, the advisor interrogates.
 *
 * Framed on the visibility boundary, because that is what makes an introduction possible at all: an
 * advisor who could read their client's conversations could not, professionally, refer anyone.
 */
export const ADVISOR_BEATS: Beat[] = [
  {
    when: 'The client you already have',
    narration:
      "You know the ones. Thirty years in, genuinely profitable, and everything that matters routes " +
      "through one person. You'd list them tomorrow if the owner weren't the product.",
    caption: 'The client: 30+ years in, profitable, and the business runs on the owner.',
  },
  {
    when: 'What your client experiences',
    narration:
      "They talk to me between jobs. I ask the questions a buyer's advisor would ask them anyway, and " +
      "what comes out gets written down — pricing, relationships, who does what when they're not there.",
    caption:
      "Your client talks; the answers a buyer would demand get documented as they go.",
    coverage: MONTH_SIX_COVERAGE,
  },
  {
    when: 'What you see — and what you never see',
    narration:
      "You see that they signed up, and you see their readiness moving. You never see their " +
      "conversations, and you never see the contents of their Genome. That boundary is the reason you " +
      "can introduce someone at all — if you could read your client's private business, you couldn't.",
    caption:
      'You see signup and score movement. You never see their conversations or the contents of their Genome.',
  },
  {
    when: 'What you list afterwards',
    narration:
      "When it's time, they hand a buyer a documented business instead of a shrug. Due diligence gets " +
      "shorter, the multiple argument gets easier, and the listing is an asset rather than a job.",
    caption: 'At sale: a documented business, shorter due diligence, an easier multiple conversation.',
  },
  {
    when: 'What you get paid',
    narration:
      "Ten percent of what they pay us, every month, for as long as they keep paying — on funds " +
      "actually collected. First touch is yours and cannot be quietly reassigned. And you tell them " +
      "you're paid a commission; we give you the wording.",
    caption:
      '10% monthly on collected funds, for the life of the subscription. First-touch attribution. You disclose the commission — we supply the wording.',
  },
  {
    when: 'What is not built yet',
    narration:
      "One thing you should know before you put your name on an introduction. Privacy mode — where I " +
      "sit in the background and only wake when I'm called — isn't built. Today your client has to " +
      "open a conversation. I'd rather you heard that from us than had to ask.",
    caption: 'Not built yet: background listening / privacy mode. Your client opens a conversation deliberately.',
  },
];
