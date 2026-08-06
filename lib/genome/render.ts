// The Genome as documents — the artefact that leaves us.
//
// WHY THIS EXISTS. Kira is sold as a project that finishes, and her extraction job is to make
// herself redundant. That only means anything if the knowledge lands somewhere the business keeps.
// Until now every path terminated in our database: `search_drive` and `read_document` READ, and
// `keep_document` files into ElevenLabs' knowledge base for Kira's benefit. The product did half of
// what it said.
//
// PURE ON PURPOSE. Genome in, documents out. No database, no network, no `server-only`. The
// filtering guarantee and the escaping are the two things that must never regress, and both are
// only testable if this module can be called with a literal object.
//
// TWO SHAPES FROM ONE SOURCE:
//   renderAreas()      one document per area — the right shape for a destination like Drive, where
//                      each area is separately editable and separately maintainable
//   renderSingleFile() one self-contained file — the right shape for a download. A 66-year-old and
//                      his accountant want something that opens, prints, and attaches to an email;
//                      nine files in a zip is a worse artefact for exactly that reader.
//
// SELF-CONTAINED IS THE ANTI-LOCK-IN GUARANTEE MADE LITERAL. Inline CSS, no webfonts, no images, no
// scripts. It opens with no network, on a machine that has never heard of us, in ten years. If he
// stops paying, he keeps a document that still works — which is the promise the whole product rests
// on, and a promise that depends on a CDN is not one.

import { buyerView } from './buyer-view';
import { longDateIn } from '@/lib/business-identity';
import type { OwnerGenome, OwnerEntry, OwnerSection } from './derive';

/** Who the document is for. The difference is not cosmetic — see `renderAreas`. */
export type Audience = 'owner' | 'buyer';

export interface RenderedDocument {
  /** Area key, or 'unfiled'. Stable — it is the idempotency handle a destination stores against. */
  key: string;
  title: string;
  /** A complete `<section>`, not a page. `renderSingleFile` composes these. */
  html: string;
  /** How many entries it carries. A destination may skip an empty one; the single file does not. */
  entries: number;
}

export interface ManualMeta {
  /** Trading name if there is one, else the registered entity — what he calls his own business. */
  businessName: string;
  /** Formatted, or null. A handover naming an entity without its ABN is weaker evidence. */
  abn: string | null;
  /** When the document was produced. Passed in rather than read from the clock, so output is testable. */
  generatedAt: Date;
  /**
   * The owner's own clock, from his state — see `timeZoneForState`.
   *
   * REQUIRED rather than defaulted, because the default that was there implicitly was the server's,
   * and on Vercel that is UTC. For a third of every day that put every date in an Australian
   * handover a day behind — in the one document whose value is that its dates are evidence.
   */
  timeZone: string;
}

/**
 * Escape text destined for HTML.
 *
 * THIS IS A SECURITY CONTROL, not tidiness. Every string below is the OWNER'S OWN FREE TEXT,
 * transcribed from speech or typed, and the document is one he hands to an advisor or files in a
 * shared drive. An apostrophe in "O'Brien" is the harmless case; a stray angle bracket that swallows
 * the rest of the section is the quiet one, and anything script-shaped in a file someone else opens
 * is the serious one.
 *
 * Applied at every interpolation without exception. A single unescaped site is the whole control.
 */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/**
 * The provenance line under an entry.
 *
 * THIS IS WHY THE DOCUMENT IS WORTH PAYING FOR. "The pricing rule is X" is a claim a buyer's
 * accountant discounts. "From a conversation on 3 March 2026, read back to the owner and confirmed
 * on the 9th" is evidence they can put in a file, and shortening due diligence is the product.
 *
 * Untraceable entries SAY SO rather than sitting silently among the sourced ones — an unmarked mix
 * makes the whole document only as trustworthy as its weakest line. There is deliberately no
 * "unconfirmed" marker on the others: labelling every remaining line would read as a disclaimer over
 * the document rather than a distinction within it.
 *
 * ⚠️ THE FIRST HALF USED TO READ "stated <date>", AND IT OVERCLAIMED IN THE ONE ARTEFACT WHERE THAT
 * MATTERS MOST. `content` is a DISTILLATION of a conversation, not a quotation, so "the owner stated
 * this" asserts words he may never have used — and when the distiller wrote down its own state
 * instead of his business, the document asserted them anyway. Matches the screen fix in
 * `app/my-genome/page.tsx`; the two must never diverge, because the whole point is that the filed
 * document says what the owner was shown.
 *
 * The evidentiary value is UNCHANGED: the date is what an accountant files against, and it survives
 * word for word. What is dropped is a claim about authorship we were never in a position to make.
 * The strong claim still exists and is still made — `confirmedOn`, and only when true.
 */
function provenance(entry: OwnerEntry, timeZone: string): string {
  const said = entry.source
    ? `from a conversation on ${longDateIn(timeZone, entry.source.spokenOn)}`
    : 'source not recorded';
  const confirmed = entry.confirmedOn
    ? `; read back to the owner and confirmed ${longDateIn(timeZone, entry.confirmedOn)}`
    : '';
  return escapeHtml(`${said}${confirmed}`);
}

/**
 * BLOCK ELEMENTS, NOT STYLED SPANS — and this was found by reading the filed document, not the code.
 *
 * These were two `<span>`s carrying `display: block` in the stylesheet. That renders correctly in a
 * browser and is destroyed the moment the file is converted: Google Docs imports a span as an inline
 * run and drops the CSS, so every fact ran straight into its own provenance —
 *
 *   "…Lot 109 in Geraldton.stated 31 July 2026"
 *
 * — in the document a buyer's accountant actually opens. A `<div>` survives the conversion because
 * the block-ness is in the ELEMENT rather than in a stylesheet the destination is free to discard.
 *
 * The general rule for anything written into someone else's system: presentation that depends on our
 * CSS is presentation we do not control.
 */
function entryHtml(entry: OwnerEntry, timeZone: string): string {
  return `      <li><div class="fact">${escapeHtml(entry.content)}</div><div class="src">${provenance(entry, timeZone)}</div></li>`;
}

/**
 * One document per area.
 *
 * THE AUDIENCE ARGUMENT IS THE WHOLE THING. For `buyer` this filters through `buyerView` — the same
 * function the markdown export uses, with the test that was missing when the leak happened. It is
 * NOT re-implemented here: a second copy of a privacy filter is a second thing that can be wrong,
 * and the first one already cost a handover document that carried the owner's negotiating posture.
 *
 * EMPTY AREAS ARE RENDERED, NOT DROPPED. The gaps are the most valuable thing in the document: a
 * manual that shows only what it holds lets an owner believe he is finished, and misrepresents the
 * business to a buyer by omission. "Still carried by the owner alone" is the honest line and it is
 * also the sales argument.
 */
export function renderAreas(genome: OwnerGenome, audience: Audience, timeZone: string): RenderedDocument[] {
  const view =
    audience === 'buyer'
      ? buyerView<OwnerEntry, OwnerSection>({ sections: genome.sections, unsorted: genome.unsorted })
      : { sections: genome.sections, unsorted: genome.unsorted };

  const docs: RenderedDocument[] = view.sections.map((section) => ({
    key: section.key,
    title: section.title,
    entries: section.entries.length,
    html: [
      `    <section class="area" id="${escapeHtml(section.key)}">`,
      `      <h2>${escapeHtml(section.title)}</h2>`,
      `      <p class="q">${escapeHtml(audience === 'owner' ? section.ownerQuestion : section.question)}</p>`,
      section.entries.length === 0
        ? '      <p class="gap">Nothing recorded here yet. This is still carried by the owner alone.</p>'
        : `      <ul>\n${section.entries.map((e) => entryHtml(e, timeZone)).join('\n')}\n      </ul>`,
      '    </section>',
    ].join('\n'),
  }));

  if (view.unsorted.length > 0) {
    docs.push({
      key: 'unfiled',
      title: 'Recorded, not yet filed',
      entries: view.unsorted.length,
      html: [
        '    <section class="area" id="unfiled">',
        '      <h2>Recorded, not yet filed</h2>',
        '      <p class="q">Said, kept, and not yet placed in an area.</p>',
        `      <ul>\n${view.unsorted.map((e) => entryHtml(e, timeZone)).join('\n')}\n      </ul>`,
        '    </section>',
      ].join('\n'),
    });
  }

  return docs;
}

/**
 * Deliberately plain, and deliberately not the brand.
 *
 * This document is read by a buyer's accountant or solicitor, printed, and put in a file. It is not
 * a marketing surface. No colour system to go stale, no webfont to fail to load, and a print
 * stylesheet because that is how it will actually be consumed.
 *
 * @design-tokens-ok: a standalone HTML document with its own <style> — there is no Tailwind and no
 * token layer at the far end of it, so `var(--text-body)` would resolve to nothing on the accountant's
 * screen and to nothing again in print. Same exemption class as lib/email/**, and the same reason:
 * CSS custom properties do not survive being mailed or printed. The paragraph above is the design
 * decision; this line is only what makes the checker agree with it.
 */
const STYLE = `
    :root { color-scheme: light; }
    body { font: 16px/1.6 Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #fff;
           max-width: 46em; margin: 0 auto; padding: 3em 1.5em 6em; }
    h1 { font-size: 1.9em; margin: 0 0 .2em; }
    h2 { font-size: 1.25em; margin: 2.2em 0 .3em; border-bottom: 1px solid #ddd; padding-bottom: .25em; }
    .meta { color: #555; font-size: .9em; margin: 0 0 2.5em; }
    .meta strong { color: #1a1a1a; }
    .q { color: #555; font-style: italic; margin: .2em 0 .9em; }
    ul { padding-left: 1.2em; margin: 0; }
    li { margin: 0 0 .85em; }
    .fact { display: block; }  /* redundant on a div, kept so the intent survives a refactor */
    .src { display: block; color: #666; font-size: .82em; margin-top: .15em; }
    .gap { color: #444; background: #f6f6f4; border-left: 3px solid #ccc; padding: .7em .9em; margin: 0; }
    footer { margin-top: 3.5em; padding-top: 1.2em; border-top: 1px solid #ddd; color: #555; font-size: .85em; }
    @media print {
      body { padding: 0; max-width: none; font-size: 11.5pt; }
      h2 { page-break-after: avoid; }
      li, .gap { page-break-inside: avoid; }
    }
`;

/**
 * Every area in one file, ready to open, print or attach.
 *
 * The owner's copy states plainly that it contains things the buyer's copy does not. He is about to
 * hand a version of this to someone; being told which document he is holding is the difference
 * between a safeguard and a trap — and the private/buyer split has already failed once in this
 * product, in the direction of disclosure.
 */
export function renderSingleFile(genome: OwnerGenome, audience: Audience, meta: ManualMeta): string {
  const docs = renderAreas(genome, audience, meta.timeZone);
  const title = audience === 'buyer' ? 'Operating manual' : 'Operating manual — your copy';

  const shown = docs.reduce((n, d) => n + d.entries, 0);
  const filled = docs.filter((d) => d.entries > 0).length;

  const banner =
    audience === 'owner'
      ? '<p class="gap"><strong>This is your copy.</strong> It includes things kept out of the buyer&#39;s ' +
        'version — your plans, your position, and anything you have said you are not ready to share. ' +
        'Use the buyer&#39;s copy when you hand it to anyone.</p>'
      : '<p class="gap">Prepared from what the owner has said, each entry dated. Sections marked as ' +
        'carried by the owner alone are the parts of the business that are not yet transferable.</p>';

  return `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meta.businessName)} — ${escapeHtml(title)}</title>
  <style>${STYLE}  </style>
</head>
<body>
  <h1>${escapeHtml(meta.businessName)}</h1>
  <p class="meta">
    ${escapeHtml(title)}${meta.abn ? ` &middot; ABN ${escapeHtml(meta.abn)}` : ''}<br>
    Prepared ${escapeHtml(longDateIn(meta.timeZone, meta.generatedAt))} &middot;
    <strong>${shown}</strong> entries across <strong>${filled}</strong> of <strong>${docs.length}</strong> areas
  </p>
  ${banner}
${docs.map((d) => d.html).join('\n\n')}
  <footer>
    Prepared with Kira. Figures are indicative and self-reported; a buyer should verify them
    independently. This document is yours — it opens without any account and without us.
  </footer>
</body>
</html>
`;
}
