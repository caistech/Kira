// lib/valuation/exit-timing.ts
//
// "THE ENTIRE PRODUCT IS AIMED AT A MAN IN HIS SIXTIES AND NEVER ONCE ASKS HOW LONG HE'S GOT."
// (Register P7.) His point in full: "Two years and eight years are completely different advice."
//
// He is right, and the two answers really do invert the advice. Inside two years, owner-dependence
// is the only lever that moves a multiple in the time available, and the work has to be FINISHED and
// visible to a buyer rather than under way. Beyond five, the argument for capturing is barely about
// the sale at all — it is about not being trapped in the business in the meantime, and about having
// the option when it comes.
//
// ⚠️ THIS ANSWER NEVER LEAVES THE DEVICE, AND THAT IS A RULE RATHER THAN A PRECAUTION.
//
// `H3` is do-not-infer-exit: Kira must never conclude from anything that an owner is selling. Asking
// is fine — he answered a direct, optional, clearly-labelled question — but the moment "he wants out
// in two years" travels to the account it becomes a fact ABOUT HIM sitting in a database that an
// agent can read and repeat. This ICP is defined by having told nobody: not his staff, often not his
// family. The one sentence of this product that must never be said out loud is a sentence he did not
// authorise being said.
//
// So the timeframe is held in the questionnaire's device-local progress only, is stripped from the
// payload that travels to signup (`lib/valuation/share.ts` `forSharing`, pinned by a test), and the
// question says so on screen. Telling him it stays here is also the most persuasive thing the screen
// can say to a man deciding whether to answer honestly.
//
// ⚠️ IT CHANGES NO NUMBER. It selects which paragraph he reads. Anything else would make the
// valuation depend on his intentions rather than on his business.

export type ExitTimeframe = 'within_2' | 'two_to_five' | 'beyond_5' | 'undecided';

export const EXIT_TIMEFRAME_OPTIONS: ReadonlyArray<{ value: ExitTimeframe; label: string; sub: string }> = [
  { value: 'within_2', label: 'Within two years', sub: 'Sooner rather than later' },
  { value: 'two_to_five', label: 'Two to five years', sub: 'There is time, but it is in sight' },
  { value: 'beyond_5', label: 'More than five years away', sub: 'Not yet, but one day' },
  // NOT "no plans to sell" as a throwaway. It is the honest answer for a large share of this
  // audience and it must not read as the "wrong" box: the advice for it is real advice, not a shrug.
  { value: 'undecided', label: 'I have not decided', sub: 'Or I am not planning to sell at all' },
];

export interface ExitAdvice {
  heading: string;
  paragraphs: string[];
}

/**
 * The paragraph that follows from his answer.
 *
 * Returns `null` when he did not answer — the block then does not render at all, rather than
 * defaulting to one of the four. A default here would be the product telling a man who declined to
 * say when he is leaving what to do about leaving.
 */
export function exitAdvice(timeframe: ExitTimeframe | undefined | null): ExitAdvice | null {
  switch (timeframe) {
    case 'within_2':
      return {
        heading: 'If you want to be out inside two years',
        paragraphs: [
          // The honest constraint first. Two years will not turn a 2.2× business into a 4× one —
          // that needs a manager and a contracted revenue book, which is a different business rather
          // than a documented one. Saying so is the difference between advice and a sales pitch.
          'Two years is enough to move some of this and not all of it. Recurring revenue and client spread take years to change, because they are changes to the business rather than to what is written down about it. What does move in the time you have is how much of the business is visible to a buyer, and that is the part a buyer discounts hardest for.',
          'The timing matters more than usual at this end. A buyer wants the systems in place and running before he arrives, not a folder of documents dated the month you listed — work that is obviously done for the sale gets read as staging. If you are serious about two years, the capturing wants to start now and be finished and unremarkable by the time anyone looks at it.',
          'Worth saying to your accountant early rather than late: a buyer will want two or three years of clean, consistent figures, and that is not something that can be arranged afterwards.',
        ],
      };
    case 'two_to_five':
      return {
        heading: 'If you are looking at two to five years',
        paragraphs: [
          'This is the window where the whole range is genuinely available to you. There is time to change the business rather than only the record of it — someone running the day-to-day who is not you, more of the revenue on contracts or repeat accounts, the biggest client made less pivotal. Those are the answers above that carry the most weight, and they are the ones that need years rather than months.',
          'The capturing is what makes those changes stick rather than an extra task beside them. You cannot hand the day-to-day to somebody else while the way it is done exists only in your head — that is the same problem a buyer has, arriving earlier and with your name on it.',
        ],
      };
    case 'beyond_5':
      return {
        heading: 'If a sale is more than five years off',
        paragraphs: [
          'Then the number above is a starting point rather than a target, and most of what is useful here has nothing to do with selling. A business that runs without you is one you can take a proper holiday from, be ill in, and hand a job to somebody else without it coming back to you rewritten.',
          'The sale argument still holds and it holds better with time: the value in the gap is real, it compounds, and having the option to leave in good order is worth something whether or not you take it. But nothing here needs to be done to a deadline.',
        ],
      };
    case 'undecided':
      return {
        heading: 'You have not decided, and nothing here assumes you have',
        paragraphs: [
          // ⚠️ THE FIRST SENTENCE IS THE POINT. He ticked the box that says he is not necessarily
          // selling, and the product's next move must not be to sell him an exit anyway.
          'That is the most common answer, and it does not weaken any of the above. The gap is what your business is worth to somebody who is not you — which is the same thing as what it would be worth to you if you stopped being the person holding it together.',
          'The useful version of this, if a sale is not on the table, is simple: everything in the list above is a thing the business currently cannot do without you. Whether you ever sell is a separate question from whether that is a good position to be in.',
        ],
      };
    default:
      return null;
  }
}
