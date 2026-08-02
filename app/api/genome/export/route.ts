// GET /api/genome/export?format=md|json — the export the FAQ and the privacy policy already promise.
//
// Both documents told owners their Genome was "exportable at any time" while no export existed. That
// is a broken commitment rather than a missing feature, and for an audience whose defining anxiety is
// losing control of their own information it is the worst possible one to break.
//
// Two artefacts, deliberately:
//   md   — the handover document a buyer's accountant or solicitor can read cold. This is the thing
//          that shortens due diligence, and the reason the subscription is worth paying for.
//   json — everything we hold, in a form another system can read. If he stops paying us, he keeps it.
//
// The gaps are exported TOO. A handover document that silently omits what is still only in the
// owner's head would misrepresent the business to a buyer, which is precisely the harm this product
// exists to prevent.
//
// EVERY LINE CARRIES ITS SOURCE. "The pricing rule is X" is a claim a buyer's accountant discounts;
// "the owner stated this on 3 March 2026" is evidence they can put in a file, and shortening due
// diligence is the reason this document is worth paying for. Entries we cannot trace say so rather
// than sitting silently among the sourced ones — an unmarked mix would make the whole document only
// as trustworthy as its weakest line.

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { deriveOwnerGenome } from '@/lib/genome/derive';

import { displayName } from '@/lib/business-identity';
import { getBusinessIdentity } from '@/lib/business-identity/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Everything in the Genome that may travel in the buyer's document.
 *
 * EXPORTED AND PURE so the guarantee can be tested rather than trusted. `export.test.ts` asserts
 * that nothing carrying a `privateReason` survives this, across BOTH collections — which is the
 * assertion that was missing when the leak happened.
 */
export function buyerView<E extends { privateReason: unknown }, S extends { entries: E[] }>(g: {
  sections: S[];
  unsorted: E[];
}): { sections: S[]; unsorted: E[] } {
  const exportable = (e: E) => !e.privateReason;
  return {
    sections: g.sections.map((s) => ({ ...s, entries: s.entries.filter(exportable) })),
    unsorted: g.unsorted.filter(exportable),
  };
}

export async function GET(request: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  const svc = createServiceClient();
  const { data: appUser } = await svc
    .from('users')
    .select('id, first_name, last_name')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (!appUser) return NextResponse.json({ error: 'No account record' }, { status: 404 });

  const g = await deriveOwnerGenome(appUser.id);
  const format = new URL(request.url).searchParams.get('format') === 'json' ? 'json' : 'md';
  const stamp = new Date().toISOString().slice(0, 10);
  const owner = [appUser.first_name, appUser.last_name].filter(Boolean).join(' ') || 'the owner';

  // THE DOCUMENT IS ABOUT THE BUSINESS, SO IT IS TITLED TO THE BUSINESS.
  //
  // It read "Business Genome — Ray Whitfield". The whole argument of this product is that the value
  // should stop being attached to the person, and the artifact meant to prove it was named after
  // him — the one document destined for a buyer's accountant, asserting the opposite of the thing
  // being sold. The owner is still recorded, one line down, because who stated these facts is what
  // makes them evidence.
  //
  // Falls back to the person's name only when no business identity has been set, which is the one
  // case where naming the entity would mean inventing it.
  let identity = null;
  try {
    identity = await getBusinessIdentity(appUser.id);
  } catch (error) {
    console.error('[genome-export] business identity unavailable:', error);
  }
  const subject = identity ? displayName(identity) : owner;

  if (format === 'json') {
    return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), owner, ...g }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="business-genome-${stamp}.json"`,
      },
    });
  }

  const lines: string[] = [
    `# Business Genome — ${subject}`,
    '',
    identity?.abn ? `${identity.legal_name} · ABN ${identity.abn}` : '',
    `Recorded by ${owner}. Exported ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
    '',
    'This document records how this business actually runs, organised by the questions a buyer&rsquo;s'.replace('&rsquo;', "'") +
      ' advisor asks in due diligence. It was built from ordinary conversations with the owner.',
    '',
    // Stated in the document itself, not only in the code. A reader who cannot tell the difference
    // between "the owner told us nothing about his plans" and "this document is about the business,
    // not about the owner" will read the absence as evasion. One sentence removes that reading, and
    // it commits us in writing to a boundary the owner is relying on.
    'It covers the business. It deliberately does not cover the owner&rsquo;s own position — his plans, '.replace('&rsquo;', "'") +
      'his circumstances, or what he would accept — which are his to raise, not ours to disclose.',
    '',
  ];

  if (g.readiness != null) {
    lines.push(
      '## Where the business stands',
      '',
      `- Transferability: ${Math.round(g.readiness * 100)} out of 100`,
      g.worthToday != null ? `- Indicative value today: $${Math.round(g.worthToday).toLocaleString('en-AU')}` : '',
      g.gap != null ? `- Value still tied to the owner: $${Math.round(g.gap).toLocaleString('en-AU')}` : '',
      '',
      'These are indicative figures from a self-reported valuation, not a formal appraisal.',
      '',
    );
  }

  // THE OWNER'S POSITION DOES NOT TRAVEL. See lib/genome/private.ts for the line and the reasoning;
  // in short, this file calls itself a handover document, and until 2 August it would render "the
  // owner is considering selling and has not told anyone" straight into it. Filtered here rather
  // than in `deriveOwnerGenome`, because the owner's own page must keep showing him everything —
  // the difference between the two renderings is the whole point, and a filter applied upstream
  // would silently take his own facts away from him too.
  //
  // `privateReason` is the UNION of the deterministic matcher and the classifier's stored verdict,
  // merged once in deriveOwnerGenome. Read here, never re-derived — a second opinion computed at
  // this call site is the one that ends up disagreeing with the marker the owner was shown on his
  // own page, and then he cannot audit what he was promised he could.
  // ⚠️ APPLIED TO EVERY COLLECTION, ONCE — not per-section.
  //
  // This filtered `sections` and nothing else, and `unsorted` is also written into the document
  // further down. That was survivable while unsorted was a rare leftover. It stopped being
  // survivable the moment the nine-area model renamed the section keys: every row still carrying a
  // legacy key (`only-you`, `work-in`, `delivery`…) now resolves to `unsorted`, so the collection
  // that bypassed the filter became the collection holding most of the Genome — and "the owner is
  // considering selling and has not told anyone" walked back into the handover document, carrying
  // `privateReason: 'exit-intent'` the whole way.
  //
  // The filter was never wrong. It was attached to one collection instead of to the document, which
  // is the same shape as the chrome fix that was attached to /chat while sign-in moved to /talk.
  // `exportable` is now the single gate, and `export.test.ts` asserts that NOTHING carrying a
  // privateReason appears anywhere in the rendered output — so the next new collection cannot
  // reintroduce this by simply not being thought about.
  const { sections: publicSections, unsorted: publicUnsorted } = buyerView(g);

  // Counted over what the document ACTUALLY SHOWS, not over everything held. Reporting "6 of 6
  // traceable" under a document displaying two entries is the kind of number that is technically
  // sourced from something real and still tells the reader a false thing.
  const shown = publicSections.flatMap((s) => s.entries);
  const shownSourced = shown.filter((e) => e.source).length;
  const shownConfirmed = shown.filter((e) => e.confirmedOn).length;

  for (const s of publicSections) {
    lines.push(`## ${s.title}`, '', `*${s.question}*`, '');
    if (s.entries.length === 0) {
      // Stated, not omitted — see the note at the top of this file. Also the honest line for a
      // section whose every entry was the owner's own: the buyer learns nothing about that area,
      // and "still carried by the owner alone" is exactly why.
      lines.push('> Nothing recorded here yet. This is still carried by the owner alone.', '');
    } else {
      for (const e of s.entries) {
        const said = e.source
          ? `stated ${new Date(e.source.spokenOn).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`
          : 'source not recorded';
        // The confirmation is the line a buyer's advisor is actually looking for, so it is stated
        // per entry rather than only totalled at the bottom — a total tells them how much of the
        // document to trust, this tells them WHICH parts. Absent where it did not happen; there is
        // no "unconfirmed" marker, because labelling every other line would read as a disclaimer
        // over the whole document rather than a distinction within it.
        const confirmed = e.confirmedOn
          ? `; read back to the owner and confirmed ${new Date(e.confirmedOn).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`
          : '';
        lines.push(`- ${e.content} *(${said}${confirmed})*`);
      }
      lines.push('');
    }
  }

  if (publicUnsorted.length > 0) {
    lines.push('## Recorded, not yet filed', '', ...publicUnsorted.map((e) => `- ${e.content}`), '');
  }

  lines.push(
    '---',
    '',
    'Prepared with Kira. Figures are indicative and self-reported; a buyer should verify them ' +
      'independently. Sections marked as carried by the owner alone are the parts of the business ' +
      'that are not yet transferable.',
    '',
    // THREE STATES, NAMED, because a reader who cannot tell them apart discounts all of it to the
    // weakest. Reworded when the confirmation count was added: the old closing line ended "should
    // be confirmed with the owner directly", which used "confirmed" in the loose sense right where
    // the document had just started using it as a specific, dated, recorded claim. One word meaning
    // two things is how a provenance note stops being worth reading.
    `Every entry above carries its provenance. ${shownSourced} of ${shown.length} are dated to the ` +
      'conversation in which the owner stated them; any marked "source not recorded" were captured ' +
      'without a conversation reference and are worth raising with the owner directly.',
    '',
    shownConfirmed > 0
      ? `${shownConfirmed} of them go further: they were read back to the owner in a later conversation ` +
        'and he agreed they were correct, with the date recorded above. Those are the entries that ' +
        'do not rest on a single recollection.'
      : 'None have yet been read back to the owner for confirmation — that process began on ' +
        '2 August 2026 and applies only to conversations from that point, so an older entry is ' +
        'recorded as it was stated rather than as it was re-checked. Nothing here has been marked ' +
        'confirmed retrospectively.',
    '',
  );

  return new NextResponse(lines.filter((l) => l !== '').join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="business-genome-${stamp}.md"`,
    },
  });
}
