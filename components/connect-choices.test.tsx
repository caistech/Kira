// The owner is told what he is giving away, not just what he gets.
//
// This is the screen where a business owner decides what an AI may read in his company. Two things
// must hold, and both are easy to lose in a redesign:
//
//   1. EVERY option states its COST as well as its gain. The cost half is the one usually left out,
//      and it is the half he is entitled to. "She can read every file in that Google account" is
//      the sentence that makes the choice a real one.
//   2. The DEFAULTS are the narrowest that still do something. An owner who clicks straight through
//      must grant the least, not the most.
//
// Asserted on the source rather than a render, in the style of this repo's other UI guards: the
// component is a client component with state, and what matters here is the CONTENT of the offer,
// which a snapshot would pin far too tightly.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(path.resolve(__dirname, 'ConnectChoices.tsx'), 'utf8');

describe('every option tells him the cost', () => {
  it('has a cost line for all six choices', () => {
    // Three Drive levels, three Gmail levels. A `gain` with no `cost` is the failure this pins.
    // The `: '` excludes the type declarations (`gain: string;`).
    expect(source.match(/gain: '/g)?.length).toBe(6);
    expect(source.match(/cost: '/g)?.length).toBe(6);
  });

  it('says out loud that read access means reading everything', () => {
    expect(source).toMatch(/read every file in that Google account/);
    expect(source).toMatch(/She can read your email/);
  });

  it('says what she still cannot do, so the limit is visible too', () => {
    // The reassurance is as load-bearing as the warning: an owner who thinks drafting means sending
    // will not grant it at all.
    expect(source).toMatch(/never sends anything from your address/);
    expect(source).toMatch(/cannot change or delete/);
  });
});

describe('the defaults grant the least', () => {
  it('defaults Drive to read-only, not full', () => {
    expect(source).toMatch(/useState<DriveChoice>\('readonly'\)/);
    expect(source).not.toMatch(/useState<DriveChoice>\('full'\)/);
  });

  it('defaults Gmail to drafts, not mailbox reading', () => {
    expect(source).toMatch(/useState<GmailChoice>\('draft'\)/);
    expect(source).not.toMatch(/useState<GmailChoice>\('read'\)/);
  });
});

describe('it offers no level the system will not honour', () => {
  it('never offers to send from his address', () => {
    // `send` is not a level. Outbound goes through the compliant path that carries his identity,
    // the Spam Act footer and the approval gate — offering it here would promise a route around it.
    expect(source).not.toMatch(/GmailChoice = [^;]*'send'/);
  });

  it('matches the levels the orchestrator actually accepts', () => {
    expect(source).toMatch(/GmailChoice = 'none' \| 'draft' \| 'read'/);
    expect(source).toMatch(/DriveChoice = 'picked' \| 'readonly' \| 'full'/);
  });
});

describe('it is reachable by a sixty-year-old on a phone', () => {
  it('gives the whole row a 44px target, not just the radio', () => {
    expect(source).toMatch(/min-h-\[44px\]/);
    // The label wraps the input, so the row is the target rather than the 20px control.
    expect(source).toMatch(/<label[\s\S]{0,400}<input/);
  });

  it('keeps body text at 16px on mobile', () => {
    // text-base first, sm: smaller — never the other way round, which is what triggers iOS zoom.
    expect(source).not.toMatch(/text-sm sm:text-base/);
    expect(source).toMatch(/text-base text-stone-600 sm:text-sm/);
  });
});
