import { describe, expect, it } from 'vitest';

import { buyerView } from '@/app/api/genome/export/route';

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
