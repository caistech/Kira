// The signup snapshot must not reach the system prompt.
//
// On the owner's live agent the snapshot read "How to fix diesel injectors in my van." and
// "Cownsville, Queensland" — a placeholder seeded from the persona's own worked example, captured
// in January and never refreshed. In August she opened with "we were talking about fixing the
// diesel injectors in your van", and he said "why are we talking about diesel injectors?".
//
// A warning was tried first. The previous block stated the objective, then appended a paragraph
// explaining it was stale and must never be asserted as current. It did not work, and it could not:
// the reliable outcome of putting a fact in a prompt is that it gets said. So the test is not
// "is the caveat present" — it is "is the fact absent".

import { describe, expect, it } from 'vitest';
import { getKiraPrompt, type KiraFramework } from './prompts';

const framework = (over: Partial<KiraFramework> = {}): KiraFramework => ({
  userName: 'Dennis McMahon',
  firstName: 'Dennis',
  location: 'Cownsville, Queensland',
  journeyType: 'business',
  primaryObjective: 'How to fix diesel injectors in my van.',
  keyContext: ['Fixing diesel injectors'],
  ...over,
});

describe('the signup snapshot never reaches the prompt', () => {
  for (const journeyType of ['business', 'personal'] as const) {
    it(`omits primaryObjective entirely — ${journeyType} journey`, () => {
      const { systemPrompt } = getKiraPrompt({ framework: framework({ journeyType }) });
      expect(systemPrompt).not.toContain('diesel injectors');
      expect(systemPrompt).not.toContain('How to fix');
    });

    it(`omits keyContext entirely — ${journeyType} journey`, () => {
      const { systemPrompt } = getKiraPrompt({
        framework: framework({ journeyType, keyContext: ['Selling the business in 2027'] }),
      });
      // keyContext is the same snapshot by another name, and its contents are frequently the most
      // sensitive thing on the account.
      expect(systemPrompt).not.toContain('Selling the business in 2027');
    });
  }

  it('still tells her his name and register', () => {
    const { systemPrompt } = getKiraPrompt({ framework: framework() });
    expect(systemPrompt).toContain('Dennis McMahon');
    expect(systemPrompt).toContain('Business (work stuff)');
  });

  it('omits location when it was never captured, rather than printing an empty field', () => {
    const { systemPrompt } = getKiraPrompt({ framework: framework({ location: '   ' }) });
    expect(systemPrompt).not.toContain('**Location:**');
  });

  it('keeps standing constraints, which are rules rather than a stale objective', () => {
    const { systemPrompt } = getKiraPrompt({
      framework: framework({ constraints: ['Never contact a client without approval'] }),
    });
    expect(systemPrompt).toContain('Never contact a client without approval');
  });

  it('tells her to ASK rather than assert what he is working on', () => {
    const { systemPrompt } = getKiraPrompt({ framework: framework() });
    expect(systemPrompt).toContain('never open by telling him what he is working on unless a tool just told you');
  });

  it('the first message asserts no objective', () => {
    // It is baked into the agent at creation and never changes, so anything it claims is frozen.
    const { firstMessage } = getKiraPrompt({ framework: framework() });
    expect(firstMessage).not.toContain('diesel');
    expect(firstMessage).toContain('Dennis');
  });
});
