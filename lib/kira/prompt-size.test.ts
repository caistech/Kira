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
const BUDGET = { business: 36_000, personal: 12_500 } as const;

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
