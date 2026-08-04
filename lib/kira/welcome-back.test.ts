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

  it('does not open on a dangling article — the 4 August sentence, verbatim', () => {
    // What she actually said: "Right Dennis — last time, you, Dennis, opting to continue
    // discussing the." Traced: the 140-char cut landed inside the quoted title, leaving one
    // unbalanced quote, and the dangling-quote rule then removed everything from that quote to the
    // end — taking the object of the sentence with it. The old gate rejects a trailing word of one
    // or two letters, and "the" is three.
    const said = buildWelcomeBackFirstMessage(
      'Dennis',
      ctx(
        'The conversation began with the user, Dennis, opting to continue discussing the "Orchestrator Handover — Lot 442 Earthworks & Services Packet." Dennis then requested the agent locate specific documents.',
      ),
    ) ?? '';
    expect(said).not.toContain('discussing the.');
    expect(said).not.toMatch(/\b(the|a|an|of|to|with|and|for)\.\s*$/i);
    // The honest fallback is the correct outcome here, not a repaired sentence.
    expect(said).toContain('What are we picking up?');
  });

  it('never opens by describing its own missing data', () => {
    // "I don't have a clean summary of where we left off" was the first sentence of a real call. It
    // is honest about the wrong thing — the owner did not ask about our storage, and an assistant
    // apologising for her own filing before he has spoken is the same leak we removed from the
    // Genome, arriving by voice.
    for (const unusable of [
      'The user was described by the assistant as wanting the user to be reminded.',
      'The conversation began with the user, Dennis, opting to continue discussing the "Thing."',
    ]) {
      const said = buildWelcomeBackFirstMessage('Dennis', ctx(unusable)) ?? '';
      expect(said.toLowerCase()).not.toContain('summary');
      expect(said.toLowerCase()).not.toContain("don't have");
    }
  });

  it('keeps a short topic that legitimately ends on a content word', () => {
    // The guard must test grammar, not length: an article at the end means something was cut off,
    // but a genuinely brief summary ending in a noun has to survive.
    const said = buildWelcomeBackFirstMessage('Dennis', ctx('The user asked the agent about the earthworks packet.')) ?? '';
    expect(said).toContain('earthworks packet');
    expect(said).toContain('carry on with that');
  });
});
