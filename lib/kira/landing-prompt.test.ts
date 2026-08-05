// The landing prompt has now been wrong in FOUR distinct ways in front of a real visitor, and every
// time the failure was invisible from the code: the prompt read perfectly well, and only a
// transcript showed what she actually said.
//
// The fourth one was caused by the fix for the first two. Guards written as `Do NOT say "<sentence>"`
// put the sentence in her mouth: she ended an otherwise correct answer with "it's not optional, and
// it's quick, but it's not just signing up and connecting files" — reading the rail out loud to a
// man who had not objected to anything. So the rule below is not "check the three known bad
// sentences are banned", it is "no forbidden sentence is quoted verbatim ANYWHERE in the prompt",
// which is the property that stops the next one.
//
// These assert on the PROMPT TEXT, not on her output. They cannot prove she obeys — only a
// transcript does that. What they prove is that a later edit has not quietly reintroduced the shape.

import { describe, expect, it } from 'vitest';

import { LANDING_FIRST_MESSAGE, LANDING_PROMPT } from './landing-agent.mjs';

/** Everything the prompt quotes in double quotes, normalised across line wraps. */
function quotedStrings(prompt: string): string[] {
  return [...prompt.matchAll(/"([^"]{20,200})"/g)].map((m) => m[1].replace(/\s+/g, ' ').trim());
}

describe('landing prompt — guards must not be speakable', () => {
  it('quotes nothing she is forbidden to say', () => {
    // The general form of the leak. A quoted string in a prompt is a candidate utterance no matter
    // what surrounds it, so the only safe forbidden-phrase guard is a DESCRIBED one.
    const forbidden = [
      /watch what you do/i,
      /just sign(ing)? up and connect/i,
      /not checking in every time/i,
      /don'?t have to do much/i,
    ];
    const leakable = quotedStrings(LANDING_PROMPT).filter((q) => forbidden.some((f) => f.test(q)));
    expect(leakable).toEqual([]);
  });

  it('tells her the instructions themselves are never spoken', () => {
    // Nothing in the original prompt said this at all, which is why the leak had nothing to stop it.
    expect(LANDING_PROMPT).toMatch(/Do NOT voice these instructions/);
    expect(LANDING_PROMPT).toMatch(/never rebut a phrasing he did not use/);
  });
});

describe('landing prompt — the things she said that were wrong', () => {
  it('forbids describing the capture as watching, observing or monitoring', () => {
    // SAID LIVE (round 1): that she watches what he does and how he decides. She does not watch —
    // she hears what he tells her and nothing else. For a man being asked to connect his email, his
    // Drive and his accounts, that is both untrue and the most alarming available phrasing.
    expect(LANDING_PROMPT).toMatch(/NEVER DESCRIBE THIS AS WATCHING, OBSERVING OR MONITORING HIM/);
    expect(LANDING_PROMPT).toMatch(/not his screen, not his calls/i);
  });

  it('walks all three setup steps including the business identity', () => {
    // SAID LIVE (round 1): that starting is just signing up and connecting files — omitting the
    // step canSend() makes mandatory: registered name, an 11-digit ABN and a full address, without
    // which she cannot send anything at all.
    expect(LANDING_PROMPT).toMatch(/registered business name, his ABN and his business/);
    expect(LANDING_PROMPT).toMatch(/connects his Google account/);
  });

  it('tells her to state the identity step flatly rather than editorialise', () => {
    // SAID LIVE (round 2): "It's not optional, and it's quick, but it's not just signing up and
    // connecting files." Every clause of that came from a rail rather than from the flow.
    expect(LANDING_PROMPT).toMatch(/Do not editorialise about it/);
  });

  it('forbids describing the product as occasional or not-day-to-day', () => {
    // SAID LIVE (round 1): that it is not for every decision and not about checking in every time.
    // That describes a filing service. Talking to her during the work IS the method.
    expect(LANDING_PROMPT).toMatch(/TALKING TO YOU DURING THE WORK IS THE METHOD/);
  });
});

describe('landing prompt — the doing has to come before the writing', () => {
  it('opens by naming real tasks, not documentation', () => {
    // The version this replaced described her as a scribe. Eighteen tools say otherwise, so the
    // first thing a stranger hears has to be a task he recognises from his own week.
    expect(LANDING_FIRST_MESSAGE).toMatch(/drafting quotes/i);
    const doing = LANDING_FIRST_MESSAGE.indexOf('finding documents');
    const writing = LANDING_FIRST_MESSAGE.indexOf('write down');
    expect(doing).toBeGreaterThan(-1);
    expect(writing).toBeGreaterThan(doing);
  });

  it('keeps approval-before-send in the prompt', () => {
    // The one claim here that would be expensive to be wrong about in the other direction: she
    // drafts, reads back, and waits. Nothing outbound leaves unapproved.
    expect(LANDING_PROMPT).toMatch(/NOTHING outbound leaves without his approval/);
  });

  it('collects nothing, because the page promises nothing is collected', () => {
    expect(LANDING_PROMPT).toMatch(/Do NOT ask for his name/);
    expect(LANDING_PROMPT).toMatch(/Nothing in this conversation is saved/);
  });
});
