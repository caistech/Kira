// The prompt may not name a tool the agent does not have.
//
// Measured on the live fleet 2026-08-04: the prompt named `start_research_session`, `save_finding`
// and `search_web`, none of which were attached, alongside a whole COLLABORATIVE RESEARCH flow built
// on them. The agent reaches for a tool that is not there, the call fails, and she reports it to the
// owner as something she "can't access" — which reads as a broken product rather than an unbuilt one.
//
// This is a RECURRENCE. The bug knowledge carries it from 2026-07-25 with the lesson already
// written: "the prompt's tool list must be GENERATED from the attached tool set, never hand-written."
// It stayed hand-written, because a lesson is not a mechanism. This test is the mechanism.

import { describe, expect, it } from 'vitest';
import { toolDefsFor, toolsSection } from './tool-manifest.mjs';
import { getKiraPrompt, type KiraFramework, type JourneyType } from './prompts';

const framework = (journeyType: JourneyType): KiraFramework => ({
  userName: 'Dennis McMahon',
  firstName: 'Dennis',
  location: 'Geraldton, WA',
  journeyType,
  primaryObjective: 'ignored',
  keyContext: [],
});

const attachedNames = (journey: JourneyType): string[] =>
  (toolDefsFor(journey, 'https://example.test') as { name?: string }[])
    .map((t) => t.name)
    .filter((n): n is string => Boolean(n));

/**
 * Every `**name**` the prompt presents as a tool. Matches the rendering both the generated section
 * and the hand-written usage notes use, so a tool named in prose is caught as readily as one in the
 * list — which matters, since prose is where the three phantom tools actually lived.
 */
function toolNamesMentioned(prompt: string): string[] {
  const found = new Set<string>();
  for (const m of prompt.matchAll(/\*\*([a-z][a-z0-9_]{3,})\*\*/g)) found.add(m[1]);
  return [...found];
}

describe('the prompt cannot name a tool that is not attached', () => {
  for (const journey of ['business', 'personal'] as const) {
    it(`every tool named in the ${journey} prompt is actually attached`, () => {
      const { systemPrompt } = getKiraPrompt({ framework: framework(journey) });
      const attached = new Set(attachedNames(journey));
      const phantom = toolNamesMentioned(systemPrompt).filter((n) => !attached.has(n));
      expect(phantom).toEqual([]);
    });

    it(`every attached ${journey} tool is named to her`, () => {
      // The inverse gap is quieter and just as real: a tool she holds but was never told about is
      // one she will not call. recall_memory is the live example of what that costs.
      const { systemPrompt } = getKiraPrompt({ framework: framework(journey) });
      const missing = attachedNames(journey).filter((n) => !systemPrompt.includes(n));
      expect(missing).toEqual([]);
    });

    it(`does NOT restate tool descriptions in the ${journey} prompt`, () => {
      // The descriptions are already sent as the tool schema. Restating them cost 15,562 chars —
      // 39.5% of the prompt — and created a second wording that could silently disagree with the
      // first. A regression here is the whole 4 August measurement coming back.
      const section = toolsSection(journey) as string;
      const longest = Math.max(
        ...(toolDefsFor(journey, 'https://example.test') as { description?: string }[])
          .map((t) => String(t.description ?? '').length),
      );
      expect(longest).toBeGreaterThan(200); // the descriptions are genuinely long...
      expect(section.length).toBeLessThan(1_200); // ...and the section does not carry them.
    });
  }

  it('names the three phantom tools nowhere', () => {
    for (const journey of ['business', 'personal'] as const) {
      const { systemPrompt } = getKiraPrompt({ framework: framework(journey) });
      for (const phantom of ['start_research_session', 'save_finding', 'search_web']) {
        expect(systemPrompt).not.toContain(phantom);
      }
    }
  });

  it('gives recall_memory an observable trigger, not a judgement call', () => {
    // "Use this when you need to remember something" requires her to first NOTICE she does not know,
    // and a model holding ten confident facts never notices. Every tool she reliably calls names a
    // trigger she can pattern-match instead.
    const recall = (toolDefsFor('business', 'https://example.test') as { name?: string; description?: string }[])
      .find((t) => t.name === 'recall_memory');
    expect(recall?.description).toMatch(/whenever the owner refers to/i);
    expect(recall?.description).not.toMatch(/when you need to remember/i);
    // The trigger lives ON THE TOOL and only there. It is read at the moment she chooses a tool,
    // which is the point — three mentions buried in a 775-line prompt did not make her call it.
    expect(toolsSection('business')).not.toContain(recall?.description);
    expect(toolsSection('business')).toContain('recall_memory');
  });

  it('the business journey attaches strictly more than personal', () => {
    const business = new Set(attachedNames('business'));
    for (const n of attachedNames('personal')) expect(business.has(n)).toBe(true);
    expect(business.size).toBeGreaterThan(attachedNames('personal').length);
  });
});

describe('server-side bookkeeping stays off her menu', () => {
  // `createConversationTools` returns five; two of them are the ROUTE's filing, not her decisions,
  // and they are dropped in toolDefsFor. Pinned because the exclusion is a filter over a package
  // array — a convai bump that renames or re-adds them would put them silently back on the menu,
  // and the symptom (a small model picking the wrong tool on a long call) is invisible from here.
  for (const journey of ['business', 'personal'] as const) {
    it(`does not attach save_message or update_conversation_topic (${journey})`, () => {
      const names = (toolDefsFor(journey, 'https://example.test') as { name?: string }[]).map((t) => t.name);
      expect(names).not.toContain('save_message');
      expect(names).not.toContain('update_conversation_topic');
    });
  }

  it('KEEPS get_conversation_context — voice has no native history replay', () => {
    // The asymmetry with text-tools.ts, which excludes all three. A typed conversation replays its
    // own history; a voice call must pull at turn zero, so dropping this one would cost her the
    // continuity the whole memory loop exists for.
    const names = (toolDefsFor('business', 'https://example.test') as { name?: string }[]).map((t) => t.name);
    expect(names).toContain('get_conversation_context');
  });

  it('the prompt inventory says exactly what is attached', () => {
    // The one that matters on a live agent: 10 of 11 deployed prompts asserted "These are the tools
    // you have, and there are no others: …" including both dropped names. A prompt naming a tool she
    // lacks is how she reaches for it, fails, and tells the owner she "can't access" something.
    const section = toolsSection('business', 'https://example.test');
    expect(section).not.toContain('save_message');
    expect(section).not.toContain('update_conversation_topic');
    for (const name of (toolDefsFor('business', 'https://example.test') as { name?: string }[])) {
      expect(section).toContain(name.name);
    }
  });
});
