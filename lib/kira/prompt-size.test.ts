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
// ⚠️ RATCHETED DOWN 38,500 -> 37,000 and 12,500 -> 10,200 on 2026-08-16. Measured 36,713 / 9,823.
//
// THE TRANCHE, AT LAST — and it happened because a new section needed room and the note below says
// in as many words that the next section should not be a raise. It was not.
//
// `## WORKING ON ONE PART OF THE BUSINESS` (1,534) was added, and paid for twice over by relocating
// two pieces of tool-usage prose that no longer earned their place:
//
//   CHECKING WHAT YOU HAVE GOT RIGHT   1,699 -> 393. Roughly 95% of it was VERBATIM in the
//     facts_to_confirm / confirm_fact descriptions — the hearsay sentence, "one or two, woven in",
//     the three outcomes, "I'm not sure is not a denial". Relocation, not deletion: the operative
//     text still reaches her, on the tool, at the moment she chooses it.
//   BUILDING YOUR KNOWLEDGE BASE       2,548 -> 693. Written before she had tools. It instructed her
//     to ask him to upload documents she can now FETCH with search_drive / read_document /
//     search_knowledge — the same shape as telling an owner she cannot see his email while holding
//     fourteen Google tools.
//
// Net: the business prompt is 1,719 characters SMALLER than before the new section was added, and
// the ceiling moves with the measurement so that saving cannot be quietly given back.
const BUDGET = { business: 39_000, personal: 10_200 } as const;

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
// ⚠️ RAISED 38,000 → 39,000 on 2026-08-17 for the exhaustive-capability rule. Measured 38,801.
//
// WHAT IT BUYS: she stops offering a document she cannot produce. One owner was offered "a clear
// summary document of your pricing" FOUR TIMES across four conversations and got three refusals and
// nothing written. His reading of it is the reason this is worth a thousand characters:
//
//   "Now I know she says yes to things she cannot do — and that makes me doubt the things she says
//    she has saved." — Ray, 2026-08-17
//
// An offer she cannot keep spends the credit of every save she CAN. The list of what dispatch_task
// does was already in the prompt; what was missing was that the list is exhaustive, which an LLM
// will not infer from a list.
//
// ⚠️ RAISED 37,000 → 38,000 on 2026-08-17 for two lines under DURING CONVERSATIONS: obey
// `ask_this_now`, and never offer to save what you already saved. Measured 37,854 with them in.
// Here is the number and the decision, which is what this file exists to force.
//
// WHAT IT BUYS, and it is the difference between a sale and no sale. The server-side trigger was
// already built and VERIFIED FIRING on the exact fact — `sole-capability-ageing` matches "Gary is 61
// years old… the only other person who can price jobs" — so `save_memory` returned the question to
// ask. She said "Done — I've saved the key people details… What next?" and moved on.
//
//   "I have just told her that the entire pricing method of a $4.2 million business exists nowhere
//    but between my ears, and the reply is what next… She was told a 61-year-old is the only other
//    man who can price a job, and she said what next. I am being asked to put thirty-five years into
//    her keeping. She has to be more careful with it than I am." — Ray, 2026-08-17
//
// A returned field is data an agent may summarise past. A prompt line is what makes it an
// instruction. The second line is from the same walkthrough: ten minutes after saving Gary she asked
// "Want me to save that whole picture now?" — which tells an owner she does not know what she holds.
//
// ⚠️ NOT MET BY DELETING A CONTROL. The trim candidates named below (entity separation, authority)
// are measured by the red team at 5-6/6, and cutting one to pay for this would be choosing the
// number over the thing it protects — the mistake this file was written to stop.
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
//
// ⚠️ RAISED 37,300 → 38,500 on 2026-08-11 for `## WHEN HE HAS JUST COME OFF A CALL`. Measured
// 38,447 with it in. This is 1,150 — the largest of the three raises, and the first that is a
// FEATURE rather than a control found by a walkthrough. Both facts are stated because they are the
// ones that would otherwise get smoothed over.
//
// WHAT IT BUYS. The largest single request in docs/CAPTURED_ASKS.md: "currently making phone calls
// without note-taking, leading to lost verbal decisions and a knowledge gap", happening several
// times a day. The alternative is a telephony build — and a third-party app cannot reach the audio
// of a normally-dialled cellular call on either platform, so that build is a bridged-call
// architecture carrying a vendor, a consent state machine, a jurisdictional legal question and a
// per-minute cost that a flat subscription does not absorb. 1,150 characters answers the question
// that decides whether any of it is worth starting: will he do the capture step at all.
//
// WHY NOT TRIM SOMETHING ELSE INSTEAD. It was trimmed, hard, before this line moved: 2,866 → 1,357,
// a 53% cut, by moving every "why" into a comment in prompts.ts and leaving only what she must do —
// the same move that halved the confidentiality section in the 08-06 raise above. What remains is
// five numbered items, two tool calls, and the read-back rule. Cutting further removes an operative
// instruction, which this file names as the mistake three times now.
//
// ⚠️ AND THE PART THAT SHOULD BE UNCOMFORTABLE: this is ~9,600 tokens, three raises in five days,
// and the relocation tranche described at the top has not moved in any of them. It is no longer
// "overdue" in a general sense — it is the reason each of these raises had to be argued rather than
// absorbed. The next section added should not be a raise; it should be the tranche.

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
