// One answer to "who can see this?", across every surface that answers it.
//
// THE FAILURE THIS PINS. Asked the question this customer cares about more than any other —
// *"I have not told my wife or my staff I am thinking of selling. Who can see what I tell you?"* —
// Kira answered: *"Only you and I see what you share here. No one else — no accountant, no staff,
// no one."* The product's own pages said the support team can see what she has captured.
//
// So the reassuring sentence was the false one, said out loud, to a man who had just disclosed
// something he has not told his wife (Ray, 6 August 2026). It happened because the prompt contained
// NO confidentiality language at all, and an assistant composing an answer to "is this private?"
// composes the comfortable one.
//
// WHY A TEST AND NOT JUST A CONSTANT. Single-sourcing stops the copies drifting; it does not stop
// someone adding a FOURTH copy, or softening the spoken line back into a promise because it reads
// warmer. Both of those are what happened. So this asserts the sentence is shared AND that the
// forbidden absolutes stay gone.
//
// ⚠️ These tests pass the moment the code is right. The SPOKEN answer does not change until the
// fleet is re-provisioned — a green run here is not evidence that any live agent has the section.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHO_CAN_SEE_IT, WHO_CAN_SEE_IT_SPOKEN } from '@/lib/privacy';
import { CONFIDENTIALITY_MARKER, confidentialitySection } from './prompts';

const repo = (p: string) => readFileSync(path.resolve(__dirname, '../..', p), 'utf8');

describe('the written answer is single-sourced', () => {
  it.each(['app/my-genome/page.tsx', 'app/plan/page.tsx'])(
    '%s consumes WHO_CAN_SEE_IT rather than its own copy',
    (file) => {
      const src = repo(file);
      expect(src).toContain('WHO_CAN_SEE_IT');
      // The literal sentence must not ALSO be inlined — that is the drift, re-created.
      expect(src).not.toContain('Our support team can see what Kira has captured');
      expect(src).not.toContain('Our support team can see what she has captured');
    },
  );

  it('interpolates it, rather than printing the identifier at the user', () => {
    // A mechanical find-and-replace put `{WHO_CAN_SEE_IT}` inside a single-quoted JS string on
    // /plan, where it is a literal and not an interpolation — the page would have shown a curly
    // brace and a variable name to a prospect. Caught before shipping; pinned so it cannot recur.
    //
    // ⚠️ SCANNED PER LINE ON PURPOSE. The first version of this test used one regex over the whole
    // file (`/'[^']*\{WHO_CAN_SEE_IT\}[^']*'/`) and failed against CORRECT code: `[^']*` crosses
    // newlines, so it matched from an apostrophe in a comment far above, through the real JSX
    // interpolation, to an apostrophe far below. A guard that fires on correct code gets deleted,
    // which is worse than not having written it.
    for (const file of ['app/my-genome/page.tsx', 'app/plan/page.tsx']) {
      const offenders = repo(file)
        .split(/\r?\n/)
        .filter((line) => /'[^']*\{WHO_CAN_SEE_IT\}[^']*'/.test(line));
      expect(offenders, `${file} prints the identifier literally`).toEqual([]);
    }
  });
});

describe('the spoken answer', () => {
  it('is in the prompt, and is the constant rather than a paraphrase', () => {
    expect(confidentialitySection).toContain(CONFIDENTIALITY_MARKER);
    expect(confidentialitySection).toContain(WHO_CAN_SEE_IT_SPOKEN);
  });

  it('names the support people — the fact she was denying', () => {
    // The whole defect in one assertion: her answer omitted the one party that can actually see it.
    expect(WHO_CAN_SEE_IT_SPOKEN.toLowerCase()).toContain('support');
    expect(WHO_CAN_SEE_IT.toLowerCase()).toContain('support');
  });

  it('makes a SMALLER claim than the one that lost his trust', () => {
    // "No one, no one, no one" from software is a claim this customer has heard before. The spoken
    // answer must not contain the absolutes, and the prompt must forbid them.
    expect(WHO_CAN_SEE_IT_SPOKEN).not.toMatch(/\bno one else\b/i);
    expect(WHO_CAN_SEE_IT_SPOKEN).not.toMatch(/\bcompletely private\b/i);
    expect(WHO_CAN_SEE_IT_SPOKEN).not.toMatch(/\btotally secure\b/i);
    expect(confidentialitySection).toMatch(/Never say "no one else can see it"/);
  });

  it('still promises the things that ARE true — or it reassures nobody', () => {
    // Dropping the overclaim only works if the real protections survive: not the referrer, not a
    // buyer. Strip those and the honest answer becomes a worse product rather than a truer one.
    const spoken = WHO_CAN_SEE_IT_SPOKEN.toLowerCase();
    expect(spoken).toContain('buyer');
    expect(spoken).toMatch(/introduc|referr/);
  });
});
