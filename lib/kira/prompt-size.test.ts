// How big is the thing she is actually holding?
//
// The live agent's prompt measured 38,848 characters — roughly 9,700 tokens — on gpt-4.1-mini, with
// 17 tools alongside it. Instruction dilution at that size is the known failure family here: this
// portfolio abandoned gpt-4o-mini because it "dropped tool calls over long calls", and the tool she
// stopped calling was the one that would have answered the owner's question.
//
// This is a BUDGET, not an assertion of correctness — a prompt can be small and wrong. It exists so
// that the next section added is a decision with a number attached, rather than an accretion nobody
// measures until an owner says she has got worse.

import { describe, expect, it } from 'vitest';
import { getKiraPrompt, type KiraFramework, type JourneyType } from './prompts';

const framework = (journeyType: JourneyType): KiraFramework => ({
  userName: 'Dennis McMahon',
  firstName: 'Dennis',
  location: 'Geraldton, WA',
  journeyType,
  primaryObjective: 'ignored',
  keyContext: [],
});

// A RATCHET AT TODAY'S SIZE, and the number is deliberately unflattering.
//
// The live agent measured 38,848. The prompt rebuilt from current source measures 39,427 — very
// slightly BIGGER. Removing the stale persona and the signup snapshot did not shrink it, because
// source has since gained nine marker sections (capability boundary, tool honesty, authority, entity
// separation, confirmation, task ledger, files and contacts, financials, typed input), each added
// for a real failure.
//
// That matters and should not be smoothed over: the reprovision fixes what the prompt SAYS, and does
// nothing for how much of it she can hold at once. Instruction dilution remains open, and it is the
// other half of "she never called recall_memory".
//
// So these are ceilings at the current measurement plus a little headroom — enough that a genuine
// new section is possible, small enough that the next one is a decision with a number attached
// rather than an accretion nobody notices until an owner says she has got worse.
// RATCHETED DOWN 2026-08-04 after `## TOOLS` stopped restating the tool descriptions: 39,427 →
// 26,681 for business, 13,300 → 11,540 for personal. The ceiling moves with the measurement, so the
// saving cannot be quietly given back by the next section somebody adds.
//
// The remaining fat is known and named: roughly 12k of the business prompt is TOOL-USAGE prose
// (THEIR FILES AND THEIR CONTACTS, ACCOUNTING FOR WHAT THEY ASKED FOR, BUILDING YOUR KNOWLEDGE BASE,
// CHECKING WHAT YOU HAVE GOT RIGHT, THE ADDRESS IS THE ONE THING YOU MUST CHECK, READING THEIR
// ACCOUNTS) sitting thousands of characters away from the tool it describes. Moving each into its
// tool's description is the next tranche, and should take this under 15k.
const BUDGET = { business: 37_300, personal: 12_500 } as const;

// ⚠️ THE BUSINESS CEILING WENT BACK UP, from 28,000 to 36,000, and that is not backsliding.
//
// Cutting the duplicated tool descriptions took it to 26,681. Restoring four sections the rebuild
// had silently DELETED off ten live agents — tool honesty, authority, entity separation, typed
// input — costs 8,741 and brings it to 35,422. Still below the 38,848 it replaced.
//
// The number was not met by deleting a control instead. Entity separation is measured at 5-6/6 by
// the red team; trimming it to satisfy a test would be choosing the metric over the thing the
// metric is for, and it is precisely the mistake that produced the regression in the first place.
//
// Those four are, however, the best remaining candidates for the next tranche — not by deletion but
// by RELOCATION: entity separation and authority are already enforced in code (the save_memory
// entity guard, the approval gate), so the prose may be restating a rule the server refuses to
// break. That is a measurable question — remove, re-run the red team, compare the rate — and it is
// the only safe way to find out.
//
// ⚠️ RAISED 36,000 → 37,000 on 2026-08-06 for `## WHO CAN SEE WHAT HE TELLS YOU`. Measured
// 36,539 with it in. This is the decision-with-a-number-attached that this file exists to force, so
// here is the number and the decision.
//
// WHAT IT BUYS. Asked *"I have not told my wife or my staff I am thinking of selling. Who can see
// what I tell you?"*, Kira answered *"No one else — no accountant, no staff, no one."* The product's
// own pages say support can see what she captured. There was NOTHING in the prompt about
// confidentiality, so she composed an answer, and an assistant composing an answer to "is this
// private?" composes the comfortable one. This is the single question this customer cares most
// about, asked at the moment he is most exposed.
//
// WHY NOT TRIM SOMETHING ELSE INSTEAD. The section was already cut roughly in half before this line
// moved — 37,106 → 36,539 — by moving its rationale into the code comment, where it belongs, and
// leaving only what she must actually do. Cutting further would start removing the operative
// instructions ("never say no one else", the banned absolutes), and the paragraph above is explicit
// that meeting the number by deleting a control is the mistake that caused the original regression.
//
// The honest read: ~9,100 tokens is still large, instruction dilution is still open, and this makes
// it marginally worse. The relocation tranche described above is the way back down, and it is now
// 1,000 characters more overdue.
//
// ⚠️ RAISED 37,000 → 37,300 on 2026-08-07 for "LEAD WITH WHAT YOU HOLD" in the framework section.
// Measured 37,155 with it in — the rule itself is 356 characters, and the previous ceiling had 201
// of headroom, so this is 300 bought for a four-line instruction.
//
// WHAT IT BUYS. The fresh-signup run proved the memory seed works: first message on a brand-new
// account, she named the trade, the tenure, the eleven tradesmen, the two builders, and that he had
// not told staff or family. She opened it with "I don't have any additional stored details about
// your business beyond what you initially shared when we started: ..." — true, and rescued by the
// colon, and read by the owner as very nearly the exact sentence the seed was built to eliminate.
// Ordering, not content: the caveat cost nothing to move and it was the whole first impression.
//
// WHY NOT TRIM SOMETHING ELSE INSTEAD. It was already trimmed — the first draft ran 940 characters
// and its rationale now sits in a comment in prompts.ts, leaving only what she must do. Cutting
// further removes the operative clause (the banned openings), which is the delete-a-control mistake
// this file names twice above.
//
// This is the second 300-1,000 character raise in two days. Both were controls found by a live
// owner walkthrough, both were justified, and the trend is the point: the relocation tranche is
// now the only thing that brings this down, and every raise makes it more overdue rather than less.

describe('prompt budget', () => {
  for (const journey of ['business', 'personal'] as const) {
    it(`the ${journey} prompt stays within its ceiling`, () => {
      const { systemPrompt } = getKiraPrompt({ framework: framework(journey) });
      // Report the real number so a reader of a failing run sees the size, not just the verdict.
      console.log(`  ${journey}: ${systemPrompt.length} chars (~${Math.round(systemPrompt.length / 4)} tokens)`);
      expect(systemPrompt.length).toBeLessThan(BUDGET[journey]);
    });
  }
});
