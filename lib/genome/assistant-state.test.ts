// The distiller marks its own state; the Genome enforces it. These pin BOTH halves, because the
// defect they close is a correct edit on one side silently defeated on the other.
//
// K3, measured 2026-08-04 across 717 active production rows. The existing guard
// (`about=assistant → section='none'`) leaked ZERO rows — it was never wrong, it simply never
// fired, because the classifier had already answered `business` or `systems` on a sentence like
// "There is an unresolved issue to verify access to the Gmail account to locate contacts like
// Chris Newton and Roger." That row sits in the Customers area of the real Factory2Key Genome.

import { describe, expect, it } from 'vitest';
import { ASSISTANT_STATE_TAG, keepMarker } from '@/lib/kira/memory-extract';
import { isAssistantState } from '@/lib/genome/derive';

describe('the marker survives the tag cap', () => {
  it('keeps the marker when a model returns more tags than the cap', () => {
    const tags = keepMarker(['gmail', 'contacts', 'lot-442', 'quantum', 'access', 'email', ASSISTANT_STATE_TAG]);
    // Without this the whole mechanism is defeated by a slice written for tidiness — silently, and
    // in the one direction that publishes to a buyer.
    expect(tags).toContain(ASSISTANT_STATE_TAG);
    expect(tags).toHaveLength(6);
  });

  it('does not invent the marker on an ordinary memory', () => {
    expect(keepMarker(['pricing', 'commercial'])).not.toContain(ASSISTANT_STATE_TAG);
  });

  it('normalises the stored spelling so the enforcing side matches one form', () => {
    // A model writes "Assistant-State" as readily as "assistant-state". Losing a guard to a capital
    // letter is not a distinction worth having.
    expect(keepMarker(['  Assistant-State '])).toEqual([ASSISTANT_STATE_TAG]);
  });

  it('drops empty and whitespace-only tags rather than spending cap on them', () => {
    expect(keepMarker(['a', '   ', '', 'b'])).toEqual(['a', 'b']);
  });
});

describe('isAssistantState', () => {
  it('recognises the marker among other tags', () => {
    expect(isAssistantState(['gmail', ASSISTANT_STATE_TAG])).toBe(true);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(isAssistantState([' ASSISTANT-STATE'])).toBe(true);
  });

  it('treats an unreadable tag column as NOT marked, never as an error', () => {
    // A row that throws here would be deferred forever rather than classified. Unmarked routes it
    // to the classifier exactly as today, which is the safe direction: it may be mis-filed, but it
    // is never stranded.
    expect(isAssistantState(null)).toBe(false);
    expect(isAssistantState(undefined)).toBe(false);
    expect(isAssistantState({})).toBe(false);
    expect(isAssistantState(42)).toBe(false);
    expect(isAssistantState([null, 7])).toBe(false);
  });

  it('accepts a bare string, for a row written before the column was an array', () => {
    expect(isAssistantState(ASSISTANT_STATE_TAG)).toBe(true);
  });

  it('does not match a tag that merely contains the marker', () => {
    // "assistant-state-machine" is somebody's ordinary tag, not this contract.
    expect(isAssistantState(['assistant-state-machine'])).toBe(false);
  });
});

describe('the distiller is actually told the rule', () => {
  it('names the tag and the test in the prompt the model receives', async () => {
    // The prompt is the half a code test cannot otherwise reach, and it is the half that decides
    // whether the tag is ever emitted. Pinning the two load-bearing phrases means deleting them is
    // a failing test rather than a quiet regression to the shipped defect.
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../kira/memory-extract.ts', import.meta.url), 'utf8'),
    );
    expect(source).toContain('THE TEST IS WHOSE LIMITATION IT IS');
    expect(source).toContain('${ASSISTANT_STATE_TAG}');
    // The real measured leaks, kept in the prompt as examples so a future edit cannot quietly drop
    // the class it was written for.
    expect(source).toContain('verify access to the Gmail account');
    // And the near-miss that MUST keep travelling into the buyer's document.
    expect(source).toContain('Bank accounts are not reconciled against Xero');
  });
});
