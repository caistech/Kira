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

  for (const s of g.sections) {
    lines.push(`## ${s.title}`, '', `*${s.question}*`, '');
    if (s.entries.length === 0) {
      // Stated, not omitted — see the note at the top of this file.
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

  if (g.unsorted.length > 0) {
    lines.push('## Recorded, not yet filed', '', ...g.unsorted.map((e) => `- ${e.content}`), '');
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
    `Every entry above carries its provenance. ${g.sourced} of ${g.totalCaptured} are dated to the ` +
      'conversation in which the owner stated them; any marked "source not recorded" were captured ' +
      'without a conversation reference and are worth raising with the owner directly.',
    '',
    g.confirmed > 0
      ? `${g.confirmed} of them go further: they were read back to the owner in a later conversation ` +
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
