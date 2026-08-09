import { describe, expect, it } from 'vitest';

import { exitAdvice, EXIT_TIMEFRAME_OPTIONS, type ExitTimeframe } from './exit-timing';

// Register P7: "two years and eight years are completely different advice". The tests below are
// mostly about what the copy must NOT do, because the risks here are all in that direction.

const ALL: ExitTimeframe[] = ['within_2', 'two_to_five', 'beyond_5', 'undecided'];

describe('exitAdvice', () => {
  it('has advice for every option offered, and offers every option it has advice for', () => {
    // The two lists drifting apart is how a visible radio button leads to a blank block.
    expect(EXIT_TIMEFRAME_OPTIONS.map((o) => o.value).sort()).toEqual([...ALL].sort());
    for (const t of ALL) expect(exitAdvice(t)).not.toBeNull();
  });

  it('says nothing at all when he did not answer', () => {
    // NOT a default branch. Defaulting would be the product telling a man who declined to say when
    // he is leaving what to do about leaving.
    expect(exitAdvice(undefined)).toBeNull();
    expect(exitAdvice(null)).toBeNull();
    expect(exitAdvice('nonsense' as ExitTimeframe)).toBeNull();
  });

  it('gives genuinely different advice at two years and at eight', () => {
    const soon = exitAdvice('within_2')!;
    const later = exitAdvice('beyond_5')!;
    expect(soon.heading).not.toBe(later.heading);
    expect(soon.paragraphs.join(' ')).not.toBe(later.paragraphs.join(' '));
  });

  // THE HONESTY CONSTRAINT. Two years cannot move recurring revenue or client concentration —
  // those are changes to the business, not to the record of it. Advice that implied the whole gap
  // was available in two years would contradict the model on the same page.
  it('does not promise the whole gap inside two years', () => {
    const soon = exitAdvice('within_2')!.paragraphs.join(' ').toLowerCase();
    expect(soon).toMatch(/some of this and not all of it|not all of it/);
    expect(soon).not.toMatch(/all of (it|this) is achievable|close the (whole|entire) gap/);
  });

  // ⚠️ H3, in the copy as well as in the storage. The man who ticked "I have not decided" must not
  // be told what to do about his sale as though he had said he was having one.
  it('does not assume a sale from the undecided answer', () => {
    const undecided = exitAdvice('undecided')!;
    expect(undecided.paragraphs.join(' ')).toMatch(/does not (weaken|assume)|separate question/i);
    expect(undecided.heading.toLowerCase()).toContain('not decided');
  });

  it('offers "not planning to sell" as a real answer rather than a shrug', () => {
    const undecided = EXIT_TIMEFRAME_OPTIONS.find((o) => o.value === 'undecided')!;
    expect(undecided.sub.toLowerCase()).toContain('not planning to sell');
    // And it earns a real paragraph, not one line dismissing it.
    expect(exitAdvice('undecided')!.paragraphs.length).toBeGreaterThanOrEqual(2);
  });

  it('never states a figure — this answer changes no number', () => {
    // A dollar sign or a multiple in here would mean the valuation had started depending on his
    // intentions rather than on his business.
    for (const t of ALL) {
      const text = exitAdvice(t)!.paragraphs.join(' ') + exitAdvice(t)!.heading;
      expect(text).not.toMatch(/\$[\d]/);
      expect(text).not.toMatch(/\d+(\.\d+)?×/);
    }
  });
});
