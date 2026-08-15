// The gate decides what a new owner sees after paying or redeeming. These pin the parts that were
// wrong before it existed, and the one property that makes it structurally safe.

import { describe, expect, it } from 'vitest';

import { nextOnboardingStep, onboardingProgress, type GateState } from './gate';

const state = (over: Partial<GateState> = {}): GateState => ({
  hasBaseline: false,
  hasIdentity: false,
  hasAgent: false,
  ...over,
});

describe('order', () => {
  it('asks for the baseline first', () => {
    // It is why a valuation-first owner came, and it is the origin every later number is measured
    // against — taken late it records where he got to rather than where he started.
    expect(nextOnboardingStep(state())).toBe('baseline');
  });

  it('asks for the business details second', () => {
    expect(nextOnboardingStep(state({ hasBaseline: true }))).toBe('identity');
  });

  it('asks him to meet Kira last', () => {
    // Last because the two above are what she is briefed FROM, and because asking "what is the
    // business called" after a conversation about his business reads as not having listened.
    expect(nextOnboardingStep(state({ hasBaseline: true, hasIdentity: true }))).toBe('agent');
  });

  it('gets out of the way once all three are there', () => {
    expect(nextOnboardingStep(state({ hasBaseline: true, hasIdentity: true, hasAgent: true }))).toBeNull();
  });
});

describe('it never traps anyone', () => {
  it('lets an established owner straight through', () => {
    // THE SCOPING THAT MAKES THIS SAFE. The gate exists to stop an EMPTY account reaching a
    // dashboard that reports on nothing — not to re-onboard people already inside. An owner who ran
    // the questions in July must never be walled behind a newer version of them.
    expect(nextOnboardingStep(state({ hasBaseline: true, hasIdentity: true, hasAgent: true }))).toBeNull();
  });

  it('asks for only ONE thing at a time', () => {
    // Every reachable state returns exactly one step or null — never a set. That is what makes the
    // caller's job "render this" rather than "work out which of these to render", and it is why this
    // cannot produce the thirteen-hop loop its redirect predecessor did.
    for (const b of [true, false]) {
      for (const i of [true, false]) {
        for (const a of [true, false]) {
          const step = nextOnboardingStep(state({ hasBaseline: b, hasIdentity: i, hasAgent: a }));
          expect(step === null || typeof step === 'string').toBe(true);
        }
      }
    }
  });

  it('an owner with an agent but no baseline is still asked for the baseline', () => {
    // The broker channel produces exactly this: a client signs up on his introducer's word, meets
    // Kira, and has no starting figure. He is not "done" — the movement column has nothing to move.
    expect(nextOnboardingStep(state({ hasAgent: true, hasIdentity: true }))).toBe('baseline');
  });
});

describe('progress', () => {
  it('counts what is actually done, from the same state as the step', () => {
    // Derived rather than tracked separately, so "2 of 3" cannot disagree with the step on screen —
    // which is worse than showing no progress at all.
    expect(onboardingProgress(state())).toEqual({ done: 0, total: 3 });
    expect(onboardingProgress(state({ hasBaseline: true }))).toEqual({ done: 1, total: 3 });
    expect(onboardingProgress(state({ hasBaseline: true, hasIdentity: true }))).toEqual({ done: 2, total: 3 });
    expect(onboardingProgress(state({ hasBaseline: true, hasIdentity: true, hasAgent: true }))).toEqual({
      done: 3,
      total: 3,
    });
  });

  it('credits a step done out of order', () => {
    // He usually arrives having already done one — the valuation he ran before signing up — and
    // seeing it credited is the point of showing progress at all.
    expect(onboardingProgress(state({ hasAgent: true })).done).toBe(1);
  });
});
