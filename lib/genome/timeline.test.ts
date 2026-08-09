import { describe, expect, it } from 'vitest';

import { ICP_BEATS, ICP_BEATS_DEMO } from './timeline';

// Register P16. The landing demo plays a SELECTION of the authored beats, and the two ways that
// goes wrong are both silent: a selection that quietly drops a beat looks exactly like a demo that
// was meant to be shorter, and a selection that edits narration loses that beat's AUDIO with no
// error — `DemoPlayer` finds a recording by hashing `beat.narration`, so one changed word means the
// lookup misses and the beat plays "No audio for this step yet".

describe('the landing demo selection', () => {
  it('plays six beats', () => {
    expect(ICP_BEATS_DEMO).toHaveLength(6);
  });

  it('keeps all thirteen authored beats available', () => {
    // The selection must not be achieved by DELETING beats — their audio is recorded and their
    // narration is the only copy of it.
    expect(ICP_BEATS.length).toBeGreaterThanOrEqual(13);
  });

  it('carries every beat VERBATIM from the authored set', () => {
    // The load-bearing one. A beat here that is not identical to its authored original has had its
    // narration edited, and its recording is now unreachable.
    for (const beat of ICP_BEATS_DEMO) {
      const authored = ICP_BEATS.find((b) => b.when === beat.when);
      expect(authored, `no authored beat titled "${beat.when}"`).toBeDefined();
      expect(beat.narration).toBe(authored!.narration);
      expect(beat).toBe(authored);
    }
  });

  it('plays them in authored order', () => {
    const order = ICP_BEATS_DEMO.map((b) => ICP_BEATS.indexOf(b));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('opens on the hook and closes on the ask', () => {
    // The arc has to survive the cut: the first beat is the one that earns the next ninety seconds,
    // and the last is the only one carrying a CTA. A selection that lost either would still be six
    // beats long and would not be a demo.
    expect(ICP_BEATS_DEMO[0]!.when).toBe('The conversation you have had with yourself');
    expect(ICP_BEATS_DEMO[ICP_BEATS_DEMO.length - 1]!.cta).toBeDefined();
  });

  it('still shows movement — at least one progress figure survives', () => {
    // Two of the three progress markers were dropped. Dropping all three would remove the only
    // evidence in the demo that anything changes over time.
    expect(ICP_BEATS_DEMO.some((b) => typeof b.coverage === 'number')).toBe(true);
  });
});
