// The landing prompt has now been wrong in three distinct ways in front of a real visitor, and each
// time the failure was invisible from the code: the prompt read perfectly well, and only a
// transcript showed what she actually said. So the things she must never say are asserted here.
//
// These are deliberately assertions about the PROMPT TEXT, not about her output. They cannot prove
// she obeys — only a transcript does that. What they prove is that the instruction has not been
// quietly dropped by a later edit, which is how the first one came back.

import { describe, expect, it } from 'vitest';

import { LANDING_FIRST_MESSAGE, LANDING_PROMPT } from './landing-agent.mjs';

describe('landing prompt — the three things she said that were wrong', () => {
  it('forbids describing the capture as watching or observing him', () => {
    // SAID LIVE: "I watch what you do and how you decide, and write that down as your operating
    // manual." She does not watch. She hears what he tells her in a conversation and nothing else.
    // For a man being asked to connect his email, his Drive and his accounts, "I watch what you do"
    // is both untrue and the most alarming available phrasing.
    expect(LANDING_PROMPT).toMatch(/NEVER SAY YOU "WATCH" HIM/);
    expect(LANDING_PROMPT).toMatch(/not monitoring his screen/i);
  });

  it('forbids understating the setup to "just sign up and connect your files"', () => {
    // SAID LIVE: "You don't have to do much to start — just sign up and connect your files and
    // accounts." It omits the business identity step, which canSend() makes mandatory: registered
    // name, an 11-digit ABN and a full address, before she can send anything at all.
    expect(LANDING_PROMPT).toMatch(/registered business name, his ABN and his business/);
    expect(LANDING_PROMPT).toMatch(/you must not imply\s+it is/);
  });

  it('forbids describing the product as occasional or not-day-to-day', () => {
    // SAID LIVE: "Not really for every decision… it's about capturing your judgment and routines,
    // not checking in every time." That describes a filing service. Talking to her during the work
    // IS the method.
    expect(LANDING_PROMPT).toMatch(/NEVER TELL HIM THIS IS OCCASIONAL/);
  });
});

describe('landing prompt — the doing has to come before the writing', () => {
  it('opens by naming real tasks, not documentation', () => {
    // The failure this replaced described her as a scribe. Eighteen tools say otherwise, so the
    // first thing a stranger hears has to be a task he recognises from his own week.
    expect(LANDING_FIRST_MESSAGE).toMatch(/drafting quotes/i);
    const doing = LANDING_FIRST_MESSAGE.indexOf('finding documents');
    const writing = LANDING_FIRST_MESSAGE.indexOf('write down');
    expect(doing).toBeGreaterThan(-1);
    expect(writing).toBeGreaterThan(doing);
  });

  it('keeps approval-before-send in the prompt', () => {
    // The one claim on this page that would be expensive to be wrong about in the other direction:
    // she drafts, reads back, and waits. Nothing outbound leaves unapproved.
    expect(LANDING_PROMPT).toMatch(/NOTHING outbound leaves without his approval/);
  });

  it('collects nothing, because the page promises nothing is collected', () => {
    expect(LANDING_PROMPT).toMatch(/Do NOT ask for his name/);
    expect(LANDING_PROMPT).toMatch(/Nothing in this conversation is saved/);
  });
});
