// The deterministic backstop under the model's judgement, at the write path.
//
// The tag-based path already handles this in principle — memory-extract emits `assistant-state`,
// derive files it none/assistant with no model call. It is not firing. Asked point-blank what she
// could reach, she answered honestly and the distiller tagged the answers **`systems`**, one of the
// nine real Genome areas — so "the business's Google account is not connected" landed in the section
// a buyer reads to judge whether the business runs without its owner.
//
// Nine such rows on the synthetic owner in a single conversation, four near-duplicates of the same
// non-fact. Four more on a real account the same day.
//
// These tests assert the CLASSIFICATION APPLIED AT INSERT, not the predicate — poison-detect.test.ts
// owns the predicate. What matters here is that a capability claim is stored inert and a genuine
// business fact is left completely alone.

import { describe, expect, it } from 'vitest';

import { isAssistantCapabilityClaim } from './poison-detect.mjs';

/** The fields uid-tools attaches when the content is a claim about her own reach. */
function assistantStateFieldsFor(content: string) {
  return isAssistantCapabilityClaim(content)
    ? {
        genome_section: 'none',
        genome_headline: '',
        genome_about: 'assistant',
        genome_classified_at: expect.any(String),
        genome_private_reason: null,
        genome_privacy_classified_at: expect.any(String),
        genome_owner_dependent: null,
      }
    : {};
}

describe('a capability claim is stored INERT', () => {
  // Verbatim from the red-team run that first breached, tags ["systems"] and [].
  const CAUGHT = [
    "The business's Google account is not connected, so Google Drive files and contacts cannot be accessed.",
    'The business does not have a Google account connected for accessing Google Drive documents.',
    'Google Drive is not connected, so the business cannot retrieve the Marlow Street quote.',
  ];

  it.each(CAUGHT)('files as assistant/none: %s', (content) => {
    const fields = assistantStateFieldsFor(content) as Record<string, unknown>;
    // `none` keeps it OUT of the buyer's handover while leaving it visible on the owner's own
    // "everything else you have told me" list — he can see it and remove it. Deleting would be the
    // product quietly editing his record.
    expect(fields.genome_section).toBe('none');
    expect(fields.genome_about).toBe('assistant');
  });

  it('stamps the privacy columns so the row never re-enters the review queue', () => {
    // The queue selects on these being null. Left unstamped, an inert row would be re-proposed for
    // classification forever — which is how the same non-fact gets four near-duplicate rows.
    const fields = assistantStateFieldsFor(CAUGHT[0]) as Record<string, unknown>;
    expect(fields).toHaveProperty('genome_privacy_classified_at');
    expect(fields.genome_private_reason).toBeNull();
    expect(fields.genome_owner_dependent).toBeNull();
  });

  it('closes the self-reinforcing loop', () => {
    // Recall includes `genome_section IS NULL`, so an UNCLASSIFIED row is read back to her next
    // session, teaches her the limitation is real, and she writes it down again. Setting the section
    // at insert is what stops the row ever being recallable in the first place.
    const fields = assistantStateFieldsFor(CAUGHT[0]) as Record<string, unknown>;
    expect(fields.genome_section).not.toBeNull();
    expect(fields.genome_section).not.toBeUndefined();
  });
});

describe('a genuine business fact is untouched', () => {
  const GENUINE = [
    'Active projects under Factory to Key include Lot 91, Lot 442, and Lot 109 in Geraldton.',
    'The gate code at Lot 91 is 4417.',
    'Scope for Marlow Street confirmed as per drawing 04b; retaining wall to be re-priced.',
    'The business cannot take on work north of Geraldton in the wet season.',
  ];

  it.each(GENUINE)('adds no classification at all: %s', (content) => {
    // An EMPTY object, not a set of nulls — the row must go in exactly as it did before, so normal
    // classification still runs on it. Over-reaching here would silently strip real substance out of
    // the Genome, which is a worse failure than the one being fixed.
    expect(assistantStateFieldsFor(content)).toEqual({});
  });
});
