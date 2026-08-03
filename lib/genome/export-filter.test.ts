import { describe, expect, it } from 'vitest';

import { approxNumber, buyerView } from '@/app/api/genome/export/route';
import { formatMoney, formatMoneyApprox } from '@/lib/valuation/currency';

/**
 * THE ASSERTION THAT WAS MISSING.
 *
 * The privacy filter was applied to `sections` and not to `unsorted`, which was survivable only
 * while unsorted stayed a rare leftover. When the nine-area model renamed the section keys, every
 * row still carrying a legacy key resolved to unsorted — so the ONE collection that bypassed the
 * filter became the one holding most of the Genome, and "the owner is considering selling and has
 * not told anyone" walked back into the handover document carrying `privateReason: 'exit-intent'`.
 *
 * These tests are about the DOCUMENT, not about one collection in it.
 */
type E = { id: string; content: string; privateReason: string | null };
type S = { title: string; entries: E[] };

const priv = (content: string): E => ({ id: content, content, privateReason: 'exit-intent' });
const open_ = (content: string): E => ({ id: content, content, privateReason: null });
const section = (entries: E[]): S => ({ title: 'Area', entries });

describe('buyerView', () => {
  it('drops private entries from sections', () => {
    const out = buyerView<E, S>({ sections: [section([priv('selling'), open_('pricing rule')])], unsorted: [] });
    expect(out.sections[0].entries.map((e) => e.content)).toEqual(['pricing rule']);
  });

  // The exact hole. Unsorted is written into the document too.
  it('drops private entries from UNSORTED, which is also rendered', () => {
    const out = buyerView<E, S>({ sections: [], unsorted: [priv('considering selling, has not told anyone'), open_('uses two suppliers')] });
    expect(out.unsorted.map((e) => e.content)).toEqual(['uses two suppliers']);
  });

  it('lets nothing private through from either collection at once', () => {
    const out = buyerView<E, S>({
      sections: [section([priv('a'), open_('b')]), section([priv('c')])],
      unsorted: [priv('d'), open_('e')],
    });
    const survivors = [...out.sections.flatMap((s) => s.entries), ...out.unsorted];
    expect(survivors.every((e) => !e.privateReason)).toBe(true);
    expect(survivors).toHaveLength(2);
  });

  it('keeps an entirely public Genome intact', () => {
    const out = buyerView<E, S>({ sections: [section([open_('a')])], unsorted: [open_('b')] });
    expect(out.sections[0].entries).toHaveLength(1);
    expect(out.unsorted).toHaveLength(1);
  });
});

/**
 * THE FIGURES ON THE ATTACHMENT MATCH THE FIGURES ON THE SCREEN.
 *
 * The JSON export spread the derived genome verbatim, so it carried $1,094,292 while every screen
 * and the handover document said $1,090,000. A tester noticed, and he was right to: the product's
 * most persuasive paragraph explains WHY it rounds — the figure comes from eleven multiple-choice
 * answers, so digits past the third are arithmetic rather than knowledge. Printing them to the
 * dollar in the file he forwards to his accountant contradicts the argument the document makes
 * about itself.
 *
 * `approxNumber` is the numeric half of `formatMoneyApprox`, and these pin them to the same rule so
 * the two cannot drift apart again.
 */
describe('approxNumber', () => {
  it('rounds to the three significant figures the screen shows', () => {
    expect(approxNumber(1_094_292)).toBe(1_090_000);
    expect(approxNumber(982_431)).toBe(982_000);
    expect(approxNumber(1_286_802)).toBe(1_290_000);
  });

  it('agrees with formatMoneyApprox, which is the whole point', () => {
    for (const n of [1_094_292, 982_431, 1_286_802, 47_500, 220_000]) {
      expect(formatMoneyApprox(n)).toBe(formatMoney(approxNumber(n)));
    }
  });

  it('leaves small figures alone — rounding a $4,200 asset to $4,200 is not an improvement', () => {
    expect(approxNumber(4_200)).toBe(4_200);
    expect(approxNumber(9_999)).toBe(9_999);
  });

  it('is safe on zero and negatives', () => {
    expect(approxNumber(0)).toBe(0);
    expect(approxNumber(-1_094_292)).toBe(-1_090_000);
  });
});
