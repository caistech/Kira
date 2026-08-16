// The document that leaves us. Two things here must never regress: the private filter and the
// escaping. Everything else is layout.

import { describe, expect, it } from 'vitest';
import { escapeHtml, renderAreas, renderSingleFile, type ManualMeta } from './render';
import type { OwnerGenome, OwnerEntry, OwnerSection } from './derive';

const entry = (over: Partial<OwnerEntry> = {}): OwnerEntry => ({
  id: 'e1',
  headline: null,
  content: 'Commercial jobs are priced at cost plus 18%.',
  capturedAt: '2026-03-03T00:00:00Z',
  importance: 8,
  section: 'pricing',
  source: { conversationId: 'c1', spokenOn: '2026-03-03T00:00:00Z' },
  confirmedOn: null,
  privateReason: null,
  possibleRestatementOf: null,
  ...over,
});

const section = (over: Partial<OwnerSection> = {}): OwnerSection =>
  ({
    key: 'pricing',
    title: 'Pricing',
    question: 'How is anything priced?',
    ownerQuestion: 'How do you price things?',
    entries: [entry()],
    ...over,
  }) as OwnerSection;

const genome = (over: Partial<OwnerGenome> = {}): OwnerGenome =>
  ({
    sections: [section()],
    unsorted: [],
    totalCaptured: 1,
    documents: 0,
    readiness: null,
    gap: null,
    worthToday: null,
    empty: false,
    otherHeld: [],
    sourced: 1,
    confirmed: 0,
    stillInYourHead: [],
    notYetLocated: [],
    ...over,
  }) as OwnerGenome;

const meta: ManualMeta = {
  businessName: 'Factory2Key',
  abn: '54 672 395 685',
  generatedAt: new Date('2026-08-05T00:00:00Z'),
  timeZone: 'Australia/Perth',
};

describe('the private filter', () => {
  it('keeps a private entry out of the BUYER document', () => {
    const g = genome({ sections: [section({ entries: [entry({ content: 'He is selling and has told nobody.', privateReason: 'exit-intent' })] })] });
    expect(renderSingleFile(g, 'buyer', meta)).not.toContain('told nobody');
  });

  it('keeps a private entry out of the buyer document when it is UNFILED', () => {
    // Both collections are rendered. Filtering only the sections leaks everything unfiled — the
    // exact shape of a bug nobody notices until someone reads the document.
    const g = genome({ sections: [], unsorted: [entry({ content: 'He would accept 2.4 million.', privateReason: 'negotiating-position' })] });
    expect(renderSingleFile(g, 'buyer', meta)).not.toContain('2.4 million');
  });

  it('SHOWS it in the owner document — it is his own record', () => {
    const g = genome({ sections: [section({ entries: [entry({ content: 'He is selling and has told nobody.', privateReason: 'exit-intent' })] })] });
    expect(renderSingleFile(g, 'owner', meta)).toContain('told nobody');
  });

  it('tells the owner which document he is holding', () => {
    // He is about to hand a version of this to someone. The split has already failed once in this
    // product, in the direction of disclosure.
    expect(renderSingleFile(genome(), 'owner', meta)).toContain('This is your copy');
    expect(renderSingleFile(genome(), 'buyer', meta)).not.toContain('This is your copy');
  });
});

describe('escaping', () => {
  it('escapes owner content, which is free text he dictated', () => {
    const g = genome({ sections: [section({ entries: [entry({ content: '<script>alert(1)</script> O\'Brien & Sons' })] })] });
    const html = renderSingleFile(g, 'owner', meta);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('O&#39;Brien &amp; Sons');
  });

  it('escapes the business name and the ABN', () => {
    const html = renderSingleFile(genome(), 'buyer', { ...meta, businessName: 'Smith <b>&</b> Co' });
    expect(html).not.toContain('<b>&</b>');
    expect(html).toContain('Smith &lt;b&gt;&amp;&lt;/b&gt; Co');
  });

  it('escapes the section title and the area key used as an id', () => {
    const g = genome({ sections: [section({ key: 'a"onload="x', title: 'Pricing <em>' })] });
    const html = renderSingleFile(g, 'buyer', meta);
    expect(html).not.toContain('onload="x"');
    expect(html).not.toContain('<em>');
  });

  it('escapeHtml covers all five, including the quote forms', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});

describe('the gaps', () => {
  it('renders an empty area rather than dropping it', () => {
    // A manual showing only what it holds lets an owner believe he is finished, and misrepresents
    // the business to a buyer by omission.
    const g = genome({ sections: [section({ entries: [] })] });
    const html = renderSingleFile(g, 'buyer', meta);
    expect(html).toContain('still carried by the owner alone');
  });

  it('counts filled areas honestly when one is empty', () => {
    const g = genome({ sections: [section(), section({ key: 'cash', title: 'Cash', entries: [] })] });
    expect(renderSingleFile(g, 'buyer', meta)).toContain('<strong>1</strong> of <strong>2</strong> areas');
  });
});

describe('provenance', () => {
  it('dates each entry, and says so when it cannot', () => {
    const g = genome({ sections: [section({ entries: [entry(), entry({ id: 'e2', content: 'Untraceable.', source: null })] })] });
    const html = renderSingleFile(g, 'buyer', meta);
    expect(html).toContain('from a conversation on 3 March 2026');
    // WORDING CHANGED TWICE, RULE UNCHANGED — so the assertion is now on the RULE.
    //
    // An untraceable entry must stay DISTINGUISHABLE from a sourced one: an unmarked mix makes the
    // whole document only as trustworthy as its weakest line. What it must not do is admit to having
    // no date at all. "Not tied to a specific conversation" did both — and it landed on the pricing,
    // the single most valuable line in Ray's document, under a landing page promising "every line in
    // it is dated to the day you said it."
    //
    // A null source means the CONVERSATION could not be resolved, not that the date is unknown, so
    // the fallback now states when it was recorded. Two different claims, two different phrasings, a
    // date on both.
    expect(html).toContain('recorded on');
    expect(html).not.toContain('not tied to a specific conversation');
    // Still tells them apart — the reason this rule exists at all.
    expect(html).toContain('from a conversation on');
  });

  it('never claims the owner SAID it — the content is a distillation, not a quotation', () => {
    // The document used to read "the owner stated this on 3 March 2026". `content` is written by the
    // post-call distil, so that asserts words he may never have used — and when the distiller wrote
    // down ITS OWN state instead of his business, the document asserted them anyway. Ray, 6 August
    // 2026, on an entry about Xero he had never mentioned: "I didn't say that. Nobody said that."
    //
    // Reported by four separate walkthroughs before it was believed, because the line reads as
    // provenance rather than as a claim. This test exists so the stronger wording cannot come back
    // as a confidence improvement — the confidence WAS the defect.
    const g = genome({ sections: [section({ entries: [entry()] })] });
    const html = renderSingleFile(g, 'buyer', meta);
    expect(html).not.toContain('stated 3 March');
    expect(html).not.toMatch(/\bowner stated\b/);
    expect(html).not.toMatch(/\bYou said this\b/);
  });

  it('still makes the STRONG claim where it is earned — that split is the whole point', () => {
    // Dropping "stated" is only honest if confirmation still says something stronger. Ray asked for
    // exactly this on 31 July: "your example distinguishes 'You confirmed this' from 'Captured — not
    // yet confirmed'." Unconfirmed entries get the weak line; confirmed ones get both.
    const weak = renderSingleFile(genome({ sections: [section({ entries: [entry()] })] }), 'buyer', meta);
    const strong = renderSingleFile(
      genome({ sections: [section({ entries: [entry({ confirmedOn: '2026-03-09T00:00:00Z' })] })] }),
      'buyer',
      meta,
    );
    expect(weak).not.toContain('read back to the owner');
    expect(strong).toContain('read back to the owner and confirmed 9 March 2026');
  });

  it('states a confirmation, which is the line an advisor looks for', () => {
    const g = genome({ sections: [section({ entries: [entry({ confirmedOn: '2026-03-09T00:00:00Z' })] })] });
    expect(renderSingleFile(g, 'buyer', meta)).toContain('confirmed 9 March 2026');
  });
});

describe('survives conversion into someone else\'s system', () => {
  it('uses BLOCK elements for the fact and its provenance, not styled spans', () => {
    // Found by reading the document after it was filed, not by reading the code. These were spans
    // with `display: block` in the stylesheet — correct in a browser, destroyed on import, because
    // Google Docs turns a span into an inline run and drops the CSS. Every fact then ran into its
    // own date: "…Lot 109 in Geraldton.stated 31 July 2026", in the document a buyer opens.
    const html = renderSingleFile(genome(), 'buyer', meta);
    expect(html).toContain('<div class="fact">');
    expect(html).toContain('<div class="src">');
    expect(html).not.toContain('<span class="fact">');
    expect(html).not.toContain('<span class="src">');
  });

  it('never puts a fact and its provenance in the same inline run', () => {
    // The assertion in the shape of the defect: fact and source adjacent with no block boundary.
    const html = renderSingleFile(genome(), 'buyer', meta);
    expect(html).not.toMatch(/cost plus 18%\.<\/span>/);
    expect(html).toMatch(/cost plus 18%\.<\/div><div class="src">/);
  });
});

describe('self-contained', () => {
  it('references nothing external — it must open with no network, without us', () => {
    const html = renderSingleFile(genome(), 'buyer', meta);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link[^>]+href/i);
    expect(html).not.toMatch(/https?:\/\//);
  });
});

describe('renderAreas', () => {
  it('returns one document per area, keyed for idempotency', () => {
    const docs = renderAreas(genome({ sections: [section(), section({ key: 'cash', title: 'Cash', entries: [] })] }), 'buyer', 'Australia/Perth');
    expect(docs.map((d) => d.key)).toEqual(['pricing', 'cash']);
    expect(docs.map((d) => d.entries)).toEqual([1, 0]);
  });

  it('uses the owner-facing question on his copy and the buyer wording on theirs', () => {
    expect(renderAreas(genome(), 'owner', 'Australia/Perth')[0].html).toContain('How do you price things?');
    expect(renderAreas(genome(), 'buyer', 'Australia/Perth')[0].html).toContain('How is anything priced?');
  });
});
