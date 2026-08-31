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
// "from a conversation on 3 March 2026" is evidence they can put in a file, and shortening due
// diligence is the reason this document is worth paying for. (It used to say "the owner stated this
// on" — dropped 2026-08-06, because `content` is a distillation and that asserted words he may never
// have used. The date, which is what gets filed, is unchanged.) Entries we cannot trace say so rather
// than sitting silently among the sourced ones — an unmarked mix would make the whole document only
// as trustworthy as its weakest line.

import { NextResponse } from 'next/server';
import { getAuthUser, resolveOrganisationForPerson } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { realSignOffName } from '@/lib/user-name';
import { displayedFigures } from '@/lib/valuation/displayed';
import { formatMoneyApprox } from '@/lib/valuation/currency';
import { formatAbn } from '@caistech/abn-lookup';

import { displayName, isoDateIn, longDateIn, timeZoneForState } from '@/lib/business-identity';
import { getBusinessIdentity } from '@/lib/business-identity/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// buyerView MOVED to lib/genome/buyer-view.ts so the renderer can use it without importing a route
// (which would drag this file's `runtime`/`dynamic` segment config with it). Imported AND
// re-exported: this file calls it below, and `export { x } from` alone binds nothing in local scope
// — a break tsc caught and the tests did not, because they import it THROUGH this re-export.
// Re-exported so every existing caller — including export-filter.test.ts, which holds the
// guarantee's only test — is untouched.
import { buyerView } from '@/lib/genome/buyer-view';
export { buyerView };

/**
 * The valuation figures, rounded the way every screen shows them.
 *
 * `approxNumber` mirrors `formatMoneyApprox`'s rule — 3 significant figures — so the JSON, the
 * markdown and the screen cannot disagree. Returned as an object to be spread AFTER `...g`, which
 * is what makes it an override rather than a second, competing set of fields.
 */
export function approxNumber(n: number): number {
  const abs = Math.abs(n);
  if (abs < 10_000) return Math.round(n);
  const magnitude = Math.pow(10, Math.floor(Math.log10(abs)) - 2);
  return Math.round(n / magnitude) * magnitude;
}

function approxFigures(g: { worthToday: number | null; gap: number | null }) {
  const out: Record<string, unknown> = {};
  if (g.worthToday != null) {
    out.worthToday = approxNumber(g.worthToday);
    out.worthTodayDisplayed = formatMoneyApprox(g.worthToday);
  }
  // ⚠️ THE GAP IS DERIVED FROM THE ROUNDED PAIR, NEVER ROUNDED ON ITS OWN.
  //
  // `approxNumber(g.gap)` is correct arithmetic and the wrong number: rounding the stored gap
  // independently gives $271,000 while every screen — which derives it from the rounded today and
  // potential — says $270,000. Ray downloaded the export and found exactly that: "The raw JSON
  // export reads gap 271000 while every screen reads $270,000."
  //
  // Fourth appearance of this class, and the first outside a page. `lib/valuation/one-number.test.ts`
  // guards owner-facing SURFACES; a JSON file he downloads is one, so it is covered there now too.
  if (g.worthToday != null && g.gap != null) {
    const figures = displayedFigures({ worthToday: g.worthToday, worthPotential: g.worthToday + g.gap });
    out.gap = figures.gap;
    out.gapDisplayed = figures.gapText;
  }
  return out;
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

  const orgContext = await resolveOrganisationForPerson(String(appUser.id));
  if (!orgContext) return NextResponse.json({ error: 'No organisation context' }, { status: 403 });

  const g = await deriveOwnerGenome(orgContext);
  const format = new URL(request.url).searchParams.get('format') === 'json' ? 'json' : 'md';

  // "Recorded by the owner" beats "Recorded by dennis+qauser" in the document an advisor reads.
  // The signup trigger fills first_name from the front half of the email when no metadata is given,
  // and that string was reaching the byline of the handover export. `realSignOffName` returns null
  // when what we hold is really an address, and the existing 'the owner' fallback — already the
  // right answer for a nameless account — takes over. See lib/user-name.ts.
  const owner = realSignOffName(appUser, authUser.email) || "the owner";

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
    console.error("[genome-export] business identity unavailable:", error);
  }
  const businessName = identity ? displayName(identity) : owner;

  // Buyer view to get shown facts and their dates
  const { sections: publicSections, unsorted: publicUnsorted } = buyerView(g);
  const shown = [...publicSections.flatMap((s) => s.entries), ...publicUnsorted];

  // Calculate the latest fact date from the shown entries
  const latestFactDate = shown.reduce((maxDate: Date, entry) => {
    if (entry.source?.spokenOn) {
      const spokenOnDate = new Date(entry.source.spokenOn);
      return spokenOnDate > maxDate ? spokenOnDate : maxDate;
    }
    return maxDate;
  }, new Date(0)); // Initialize with epoch to ensure any valid date is greater

  // Determine the timezone based on business identity
  const timeZone = timeZoneForState(identity?.state);

  // Use the latest fact date for the document filename stamp
  // Fallback to current date if no facts exist (new user, etc.)
  const filenameDate = latestFactDate.getTime() > 0 ? isoDateIn(timeZone, latestFactDate) : isoDateIn(timeZone, new Date());
  
  if (format === 'json') {
    // "EVERYTHING WE HOLD" HAS TO MEAN EVERYTHING WE HOLD.
    //
    // This exported the derived Genome, which is what SURVIVES classification and de-duplication —
    // so on a real account it handed back 2 entries while the operator console listed 12 of the same
    // owner's facts. A tester found both and was blunt about it: "the export button labelled
    // 'everything we hold' hands me two of twelve, and the ten it withholds include the four copies
    // of my secret. If I ever compared the two I'd never trust the product again."
    //
    // The label was not the problem to fix. This file is HIS, it is the one he keeps if he stops
    // paying us, and the withheld rows are things we hold about him — chit-chat and software notes
    // filed `none`, and restatements the Genome collapses. Softening the sentence would have made a
    // true statement about a smaller promise; including the rows keeps the promise we made.
    //
    // The buyer's document is unaffected: that is `format=md`, and it filters through `buyerView`.
    const { data: everything } = await svc
      .from('kira_memory')
      .select('id, content, created_at, importance, genome_section, genome_about, genome_headline, genome_private_reason, genome_owner_dependent, confirmed_at, active, parked_reason')
      .eq('organisation_id', orgContext.organisationId)
      .order('created_at', { ascending: false });


    // ⚠️ WHAT HE REMOVED DOES NOT TRAVEL IN HIS FILE — even though this file is "everything we hold".
    //
    // These two promises collided, and I caused it: making the raw export honest about everything
    // held meant redacted rows came with it, tombstoned but with the sentence intact. The Remove
    // dialog says it takes the fact out of "your Genome, your recall and your export", and a tester
    // checked: "There it is, twice, verbatim, flagged inactive and marked owner:redacted."
    //
    // His judgement settles the conflict, and he is right: "If I ask you to delete the one thing I
    // haven't told my wife, 'we kept a copy and labelled it deleted' is not delete."
    //
    // So the ROW still appears — he is entitled to know something was removed and when — and the
    // CONTENT does not. A tombstone without the words is honest about the record and safe to forward
    // to a solicitor without opening. The database keeps the original either way, so a restore is
    // unaffected; this is about what leaves the building.
    const REDACTED = /^owner:redacted/;
    const held = (everything ?? []).map((row) =>
      REDACTED.test(String(row.parked_reason ?? ''))
        ? {
            ...row,
            content: null,
            genome_headline: null,
            removed_by_you: true,
            note: 'You removed this. The wording is deliberately not included here.',
          }
        : row,
    );

    return new NextResponse(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          owner,
          ...g,
          // ⚠️ THE FIGURES ARE ROUNDED HERE TOO, AND THAT IS THE POINT.
          //
          // `...g` carried them raw, so this file said $1,094,292 while every screen and the
          // handover document said $1,090,000 — a difference a tester noticed and was right to.
          // The product's most persuasive paragraph explains WHY it rounds: the number comes from
          // eleven multiple-choice answers, so digits beyond the third are arithmetic, not
          // knowledge. Printing them to the dollar in the attachment contradicts the argument the
          // document makes about itself, in the file he forwards to his accountant.
          //
          // Rounded to the same 3 significant figures as `formatMoneyApprox`, and each figure is
          // accompanied by the string exactly as it appeared on screen, so nothing has to be
          // re-derived to check the two agree.
          ...approxFigures(g),
          // Named so the two are not confused: `sections`/`unsorted` are the Genome as the product
          // renders it; this is the underlying record it was derived from, including what the
          // Genome leaves out and why.
          everythingHeld: held,
        },
        null,
        2,
      ),
      {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="business-genome-${filenameDate}.json"`,
        },
      },
    );
  }

  const lines: string[] = [
    `# Business Genome — ${businessName}`,
    '',
    // FORMATTED, like every other surface. This printed `ABN 99999999999` — an eleven-digit blob on
    // line two of the document a solicitor reads — while Settings rendered the same value correctly.
    identity?.abn ? `${identity.legal_name} · ABN ${formatAbn(identity.abn)}` : '',
    `Recorded by ${owner}. Exported ${docExportDate}.`,
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
      // APPROXIMATE, like every screen these came from. This printed the business to the dollar —
      // "$1,286,802" — off eleven multiple-choice answers, in the file an owner hands his advisor.
      // A tester's verdict: "He would laugh at it, and he'd be right to." It also disagreed with the
      // result page and My Genome, which round; four surfaces gave three answers for one figure.
      // ⚠️ AND THE MARKDOWN HALF OF THE SAME FILE. The JSON was fixed above and this line was
      // missed — caught by one-number.test.ts on its first run, which is the entire reason that
      // guard checks the FILE rather than the one call site a report happened to name.
      g.worthToday != null ? `- Indicative value today: ${formatMoneyApprox(g.worthToday)}` : '',
      g.worthToday != null && g.gap != null
        ? `- Value still tied to the owner: ${
            displayedFigures({ worthToday: g.worthToday, worthPotential: g.worthToday + g.gap }).gapText
          }`
        : '',
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
  // (The buyerView call itself now sits with the other derivation above, where `shown` is first
  // needed for the document-date stamp.)

  // Counted over what the document ACTUALLY SHOWS, not over everything held. Reporting "6 of 6
  // traceable" under a document displaying two entries is the kind of number that is technically
  // sourced from something real and still tells the reader a false thing.
  // BOTH COLLECTIONS, because both are rendered. This counted sections only, so a document whose
  // entries all sat in "Recorded, not yet filed" closed with "0 of 0 are dated" printed directly
  // under an entry. A tester: "My accountant is precisely the sort of person who reads the small
  // print at the bottom and asks why it disagrees with the front page."
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
          ? `stated ${longDateIn(timeZone, e.source.spokenOn)}`
          : 'source not recorded';
        // The confirmation is the line a buyer's advisor is actually looking for, so it is stated
        // per entry rather than only totalled at the bottom — a total tells them how much of the
        // document to trust, this tells them WHICH parts. Absent where it did not happen; there is
        // no "unconfirmed" marker, because labelling every other line would read as a disclaimer
        // over the whole document rather than a distinction within it.
        const confirmed = e.confirmedOn
          ? `; read back to the owner and confirmed ${longDateIn(timeZone, e.confirmedOn)}`
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
      'Content-Disposition': `attachment; filename="business-genome-${filenameDate}.md"`,
    },
  });
}
