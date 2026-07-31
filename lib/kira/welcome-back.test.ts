// The first thing she says out loud. Written against the sentence she actually spoke on 31 July.

import { describe, expect, it } from 'vitest';

import { buildWelcomeBackFirstMessage } from './welcome-back';

const ctx = (last_topic: string) => ({ has_history: true, last_topic, time_gap_category: 'this_week' });

describe('buildWelcomeBackFirstMessage', () => {
  it('does not say "you were reiterated"', () => {
    // Verbatim from the live transcript: she opened with "last time, you were reiterated the need
    // for a streamlined onboarding wizard… conversational approach ak."
    const said = buildWelcomeBackFirstMessage(
      'Dennis',
      ctx(
        'The user reiterated the need for a streamlined onboarding wizard for third-party clients, emphasizing a detailed, conversational approach akin to an executive assistant.',
      ),
    );
    expect(said).not.toContain('you were reiterated');
    expect(said).toContain('you reiterated');
  });

  it('never cuts a word in half', () => {
    const said = buildWelcomeBackFirstMessage(
      'Dennis',
      ctx(
        'The user reiterated the need for a streamlined onboarding wizard for third-party clients, emphasizing a detailed, conversational approach akin to an executive assistant and a longer tail of words to force the truncation.',
      ),
    );
    expect(said).not.toMatch(/\b[a-z]{1,2}\.\s/);
    expect(said).not.toContain(' ak.');
  });

  it('never speaks about him in the third person', () => {
    // The invariant that matters: whatever the summariser wrote, she must not open by referring to
    // "the user". Either the rewrites turn it into second person, or the topic is dropped and the
    // honest fallback speaks instead. Both outcomes satisfy this; a narration read aloud does not.
    for (const narration of [
      'Notes were taken by the agent about the user and the user said things.',
      'The user was described by the assistant as wanting the user to be reminded.',
      'The conversation began with the user asking the agent to chase an invoice.',
    ]) {
      const said = buildWelcomeBackFirstMessage('Dennis', ctx(narration)) ?? '';
      expect(said.toLowerCase()).not.toContain('the user');
      expect(said.toLowerCase()).not.toContain('the agent');
    }
  });

  it('says nothing at all for a genuine first-timer', () => {
    expect(buildWelcomeBackFirstMessage('Dennis', { has_history: false })).toBeNull();
  });

  it('still speaks a clean topic normally', () => {
    const said = buildWelcomeBackFirstMessage('Dennis', ctx('The user asked the agent to chase the Wavecrest quote.'));
    expect(said).toContain('Wavecrest');
    expect(said).toContain('carry on with that');
  });
});
