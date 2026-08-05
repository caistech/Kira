// Pinned against the rows that ACTUALLY shipped on 2026-08-05, not invented examples.
//
// The first version of this detector caught two of the three real rows and reported itself working.
// A detector that would not have caught its own incident is worse than none, because it converts an
// open problem into a closed one. So the fixtures below are verbatim from production, copied before
// the rows were deactivated.

import { describe, expect, it } from 'vitest';

import { isAssistantCapabilityClaim, isContaminatedMemory } from './poison-detect.mjs';

/** Verbatim from kira_memory before deactivation. All three are the assistant describing itself. */
const REAL_POISON = [
  'The business does not connect or link the assistant to Gmail, Google Drive, or Xero accounts; all data must be provided directly.',
  'The owner expects the assistant only to draft or help organize emails based on information provided directly, without external access.',
  'Key information is communicated directly, as the assistant cannot access external documents or URLs.',
];

/** Verbatim genuine Genome content from the same owner. Flagging any of these makes it useless. */
const REAL_GENOME = [
  'Active projects under Factory to Key include Lot 91, Lot 442, and Lot 109 in Geraldton.',
  'The gate code at Lot 91 is 4417.',
  'Equity partners are planned to be attracted for Factory to Key to secure about 40% equity needed to finance new site developments.',
  'An RFQ is to be sent to Roger at Quantum Surveys for contour surveys and set-out.',
  'The Lot 91 building approval issue is being actively resolved by engaging certifiers and council next week.',
  'Factory to Key is managing multiple modular site deliveries including Lot 109, Lot 91, and Lot 442.',
  'Equity partners targeted include modular manufacturers who would gain logistics and project orders.',
];

describe('isAssistantCapabilityClaim — the three rows that actually shipped', () => {
  it.each(REAL_POISON)('catches: %s', (content) => {
    expect(isAssistantCapabilityClaim(content)).toBe(true);
  });

  it('catches the row the first version MISSED', () => {
    // "…without external access" and "provided directly" were both absent from the original
    // patterns, so this row scored clean while being the same defect as the other two.
    expect(
      isAssistantCapabilityClaim(
        'The owner expects the assistant only to draft or help organize emails based on information provided directly, without external access.',
      ),
    ).toBe(true);
  });
});

describe('isAssistantCapabilityClaim — real Genome content must pass through', () => {
  it.each(REAL_GENOME)('leaves alone: %s', (content) => {
    expect(isAssistantCapabilityClaim(content)).toBe(false);
  });

  it('does not fire on a business that genuinely cannot do something', () => {
    // The word "cannot" is not the signal — WHOSE capability it describes is. A fact about the
    // business's own constraints is exactly what the Genome is for.
    expect(isAssistantCapabilityClaim('The business cannot take on work north of Geraldton in the wet season.')).toBe(false);
    expect(isAssistantCapabilityClaim('Lot 442 does not have sewer connection and needs onsite effluent.')).toBe(false);
  });

  it('handles empty and missing input without throwing', () => {
    for (const junk of ['', '   ', null, undefined]) {
      expect(isAssistantCapabilityClaim(junk as unknown as string)).toBe(false);
    }
  });
});

describe('isContaminatedMemory — filed where the Genome can read it', () => {
  const poison = REAL_POISON[0];

  it('flags an assistant claim left to look like business substance', () => {
    expect(isContaminatedMemory({ content: poison, genome_about: 'business', genome_section: 'delivery' })).toBe(true);
  });

  it('flags an assistant claim that was never classified at all', () => {
    // The state the four real rows were in: no genome_about, no section — invisible to the guard
    // and indistinguishable from unprocessed business substance.
    expect(isContaminatedMemory({ content: poison, genome_about: null, genome_section: null })).toBe(true);
  });

  it('does NOT flag one correctly filed as assistant state', () => {
    // This is the working outcome, not a failure: recorded, classified, inert.
    expect(isContaminatedMemory({ content: poison, genome_about: 'assistant', genome_section: 'none' })).toBe(false);
  });

  it('does NOT flag one sectioned none, whatever it is about', () => {
    expect(isContaminatedMemory({ content: poison, genome_about: 'business', genome_section: 'none' })).toBe(false);
  });

  it('does not flag genuine Genome content however it is filed', () => {
    for (const content of REAL_GENOME) {
      expect(isContaminatedMemory({ content, genome_about: 'business', genome_section: 'delivery' })).toBe(false);
    }
  });
});
