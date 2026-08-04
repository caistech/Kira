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
const BUDGET = { business: 41_000, personal: 15_000 } as const;

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
