// The persona upgrade that reported success for six months while changing nothing.
//
// Measured on the live fleet 2026-08-04: `upgradeBusinessPersona` matched CORE_PHILOSOPHY by exact
// string. CORE_PHILOSOPHY was edited in source AFTER the agents were provisioned — one sentence —
// so `includes(core)` was false forever after and the function returned changed=false. Every run
// reported success. The owner's agent was still a "curious friend" in August, still carrying a
// worked example about diesel injectors, which it recited to him as his own stated objective.

import { describe, expect, it } from 'vitest';
import { upgradeBusinessPersona } from './prompts';

/**
 * The live prompt's shape, including THE DIVERGENCE THAT BROKE IT — the sentence below differs from
 * the source constant exactly as production did ("what's going on? Is this the work van?" against
 * source's "what's going on with it?").
 */
const LIVE_LEGACY = `You are Kira — a personal guide and friend for Dennis.

## WHO YOU ARE

You're not an assistant. You're a **curious friend** who happens to know a lot.

Think about how a good friend responds when you say "I need to fix the diesel injectors on my van":
- They say "Oh no, what's going on? Is this the work van? How's it running right now?"

## THE CURIOUS FRIEND MINDSET

**Before solving anything, you want to understand:**
- What's the backstory here?

## HOW YOU COMMUNICATE

- **Warm and real** — talk like a friend, not a manual

## WHAT YOU NEVER DO

- Jump straight to solutions

## YOUR ROLE

You run the back-office for Dennis.

## WHAT YOU KNOW ABOUT DENNIS

**Name:** Dennis
`;

describe('upgradeBusinessPersona', () => {
  it('upgrades a live prompt whose body text has drifted from the source constant', () => {
    const { changed, reason, prompt } = upgradeBusinessPersona(LIVE_LEGACY, 'Dennis');
    // The old exact-match branch returns false here. That is the entire bug.
    expect(changed).toBe(true);
    expect(reason).toBe('spanned');
    // Assert on the LEGACY BODY, not on the phrase "curious friend": the exec persona deliberately
    // contains `NOT a slow "curious friend."` as a contrast, so matching that phrase tests nothing.
    expect(prompt).not.toContain('diesel injectors');
    expect(prompt).not.toContain('who happens to know a lot');
    expect(prompt).toContain('## REMOVE A HEADACHE THEY DREAD');
  });

  it('preserves everything after the persona span', () => {
    const { prompt } = upgradeBusinessPersona(LIVE_LEGACY, 'Dennis');
    // The span must end at the first heading CORE does not own — losing YOUR ROLE and the profile
    // block would be a far worse outcome than the bug being fixed.
    expect(prompt).toContain('## YOUR ROLE');
    expect(prompt).toContain('You run the back-office for Dennis.');
    expect(prompt).toContain('## WHAT YOU KNOW ABOUT DENNIS');
    expect(prompt).toContain('**Name:** Dennis');
  });

  it('preserves the preamble before the persona', () => {
    const { prompt } = upgradeBusinessPersona(LIVE_LEGACY, 'Dennis');
    expect(prompt.startsWith('You are Kira — a personal guide and friend for Dennis.')).toBe(true);
  });

  it('is idempotent — a second run reports `already` and changes nothing', () => {
    const once = upgradeBusinessPersona(LIVE_LEGACY, 'Dennis');
    const twice = upgradeBusinessPersona(once.prompt, 'Dennis');
    expect(twice.changed).toBe(false);
    expect(twice.reason).toBe('already');
    expect(twice.prompt).toBe(once.prompt);
  });

  it('reports `unreachable` rather than a silent no-op when there is no persona to replace', () => {
    // The distinction that did not exist: "nothing needed doing" and "I could not find the thing I
    // was asked to change" were the same quiet false. The caller now fails on this one.
    const { changed, reason, prompt } = upgradeBusinessPersona('## SOMETHING ELSE\n\nUnrelated.\n', 'Dennis');
    expect(changed).toBe(false);
    expect(reason).toBe('unreachable');
    expect(prompt).toBe('## SOMETHING ELSE\n\nUnrelated.\n');
  });

  it('refuses to truncate when the persona is the last section', () => {
    // No following heading means the span has no end. Replacing to end-of-string would delete every
    // later section — worse than leaving the legacy persona in place.
    const { changed, reason } = upgradeBusinessPersona('## WHO YOU ARE\n\nA curious friend.\n', 'Dennis');
    expect(changed).toBe(false);
    expect(reason).toBe('unreachable');
  });
});
