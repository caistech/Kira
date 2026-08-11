// The call debrief must ask for the five things, and must file in BOTH places.
//
// THE ASK THIS ANSWERS. Chris, in his own words: *"currently making phone calls without note-taking,
// leading to lost verbal decisions and a knowledge gap"* — the largest single request in
// docs/CAPTURED_ASKS.md, happening several times a day.
//
// WHY IT IS A PROMPT AND NOT A TELEPHONY BUILD. A third-party app cannot access the audio of a
// normally-dialled cellular call on either platform, so "Kira listens in" is not buildable; the real
// build is the call travelling through a bridge, and it carries a telephony vendor, a consent state
// machine, a jurisdictional legal question and a per-minute cost. This answers the question that
// decides whether any of that is worth it — WILL HE DO THE CAPTURE STEP AT ALL — for the price of a
// prompt section. See docs/BRIEF_CALL_CAPTURE_P1_AND_SIZING.md.
//
// A source assertion, in the style of the other prompt guards here: the prompt is a string composed
// at provision time, so what can be checked cheaply is that the load-bearing instructions are in it
// and that it is actually wired into the business prompt rather than merely defined.

import { describe, expect, it } from 'vitest';

import { CALL_DEBRIEF_MARKER, callDebriefSection, getKiraPrompt, type KiraFramework } from './prompts';

describe('the call-debrief section', () => {
  it('asks for all five things, and each is load-bearing', () => {
    // Who — an unresolved name is a dead memory six months later.
    expect(callDebriefSection).toMatch(/lookup_contact/);
    // Which job — "the job" is the difference between a usable note and an unusable one.
    expect(callDebriefSection).toMatch(/Lot 109/);
    // What was decided, what is owed and by whom, and by when.
    expect(callDebriefSection).toMatch(/What was decided/i);
    expect(callDebriefSection).toMatch(/owed, and by whom/i);
    expect(callDebriefSection).toMatch(/By when/i);
  });

  it('files in BOTH places, and says why each is needed', () => {
    // The whole point. Memory alone is remembered and never actioned; a task alone loses the
    // reasoning the moment it is closed.
    expect(callDebriefSection).toMatch(/save_memory/);
    expect(callDebriefSection).toMatch(/dispatch_task with a due date/i);
    expect(callDebriefSection).toMatch(/BOTH places/i);
  });

  it('tells her to ask rather than fill in a gap', () => {
    // The follow-up question is the feature. Without it this is dictation, and dictation with a
    // missing date produces a note rather than something she can carry.
    expect(callDebriefSection).toMatch(/Ask for what is missing\. Do not fill it in\./i);
  });

  it('does not manufacture a task when nothing is owed', () => {
    // Otherwise every "here is what happened" becomes a chore on his list and he stops telling her.
    // `\s+` rather than a literal space: the section is a wrapped template string, so a line break
    // falls wherever the paragraph wraps. Matching the exact spacing would make this a formatting
    // test that goes red on a re-wrap and tells nobody anything.
    expect(callDebriefSection).toMatch(/Do not\s+manufacture a task/i);
  });

  it('says out loud that she was not on the call', () => {
    // Everything filed is second-hand. A commitment recorded wrongly is worse than one not recorded,
    // because he relies on it — the same reason confirmation exists at all.
    expect(callDebriefSection).toMatch(/You were not on the call/i);
    // Tolerant of "read it back" / "gets read back" — the rule is what must survive, not the
    // phrasing. It went red on exactly that during the trim for the prompt budget, which is the
    // test being pedantic about wording rather than about the instruction.
    expect(callDebriefSection).toMatch(/read\s+(it\s+)?back/i);
  });
});

describe('it reaches the prompt an agent is actually built from', () => {
  const framework: KiraFramework = {
    userName: 'Chris Hutchinson',
    firstName: 'Chris',
    location: 'Geraldton, Western Australia',
    journeyType: 'business',
    primaryObjective: 'Stop losing what gets agreed on the phone.',
    keyContext: ['Earthworks and civil'],
  };

  it('is present in the business prompt', () => {
    // Defining a section and forgetting to compose it is a silent no-op — this repo has shipped
    // exactly that before, and a persona upgrade sat unreferenced for six months.
    const { systemPrompt } = getKiraPrompt({ framework });
    expect(systemPrompt).toContain(CALL_DEBRIEF_MARKER);
    expect(systemPrompt).toContain('dispatch_task with a due date');
  });
});
