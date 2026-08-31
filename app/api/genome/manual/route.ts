// GET /api/genome/manual?audience=owner|buyer — the operating manual as one self-contained file.
//
// THE FLOOR ADAPTER, and it is built first on purpose. The whole write-back rests on a promise: the
// manual is HIS, and he keeps it whether or not he keeps paying us. Every other destination — Drive,
// OneDrive, a push API — needs a vendor, a token and a consent screen, and each is a way that
// promise can quietly become untrue. This one needs nothing: no account, no network, no us.
//
// It is also the artefact a buyer's advisor can actually be given. He will not be handed a login.
//
// Distinct from /api/genome/export, which is markdown for reading and JSON for porting. This is the
// document — laid out, dated per line, ready to print or attach.

import { NextResponse } from 'next/server';
import { formatAbn } from '@caistech/abn-lookup';

import { getAuthUser, resolveOrganisationForPerson } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { renderSingleFile, type Audience } from '@/lib/genome/render';
import { displayName, isoDateIn, timeZoneForState } from '@/lib/business-identity';
import { getBusinessIdentity } from '@/lib/business-identity/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * NO DEFAULT AUDIENCE, DELIBERATELY.
 *
 * Whichever way a default falls it is wrong in a way that matters. Default to `owner` and a man who
 * meant to send the buyer's copy attaches one carrying his position and his plans — irreversible,
 * and he will not know. Default to `buyer` and he believes his own record is thinner than it is.
 *
 * So the choice is required. This is the consequence-clarity rule applied to the one action in this
 * product that cannot be taken back: an outward-facing artefact names what it is before it exists.
 */
export function parseAudience(value: string | null): Audience | null {
  return value === 'owner' || value === 'buyer' ? value : null;
}

/**
 * The filename is the last line of defence, so it shouts.
 *
 * By the time he is attaching this to an email the banner inside is not on screen — a filename in a
 * Downloads folder is. Two files an hour apart, one safe to send and one not, must not be
 * distinguishable only by their timestamp.
 */
export function filenameFor(business: string, audience: Audience, stamp: string): string {
  const slug = business.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'business';
  return `${slug}-operating-manual-${audience === 'owner' ? 'YOUR-COPY-private' : 'for-buyer'}-${stamp}.html`;
}

export async function GET(request: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  const audience = parseAudience(new URL(request.url).searchParams.get('audience'));
  if (!audience) {
    return NextResponse.json(
      {
        error:
          'Say which copy you want: audience=owner for your own record, or audience=buyer for the ' +
          'version that leaves out your position and your plans.',
      },
      { status: 400 },
    );
  }

  const orgContext = await resolveOrganisationForPerson(authUser.id);
  if (!orgContext) return NextResponse.json({ error: 'No organisation context' }, { status: 403 });
  const genome = await deriveOwnerGenome(orgContext);

  // Titled to the BUSINESS, not the person — the whole argument of this product is that the value
  // should stop being attached to him, and the document meant to prove it must not be named after
  // him. Falls back to his name only when no identity is set, the one case where naming the entity
  // would mean inventing it.
  let identity = null;
  try {
    identity = await getBusinessIdentity(appUser.id);
  } catch (error) {
    // Never fatal. A manual titled with his name is a lesser document; no manual is a broken promise.
    console.error('[genome-manual] business identity unavailable:', error);
  }
  // ⚠️ NEVER TITLE A HANDOVER DOCUMENT WITH A PERSON'S NAME.
  //
  // The fallback chain used to end `trading name → HIS OWN NAME → "This business"`, and the middle
  // rung is the one that reached a real document. Ray had not entered business details, so the file
  // he was about to send his broker was titled **"Ray"**. His words: "A broker receives a document
  // called Ray. It should be titled with the trading name, with my name under it as the source."
  //
  // The old comment here said "a manual titled with his name is a lesser document; no manual is a
  // broken promise" — the trade is real and the conclusion was wrong. A document titled with a first
  // name does not read as a lesser handover, it reads as an unfinished one, and it is going to the
  // person already looking for reasons to discount him. "This business" is plain and costs nothing;
  // his identity is carried by the prepared-by line and the ABN, where it belongs.
  // ⚠️ THE MIDDLE RUNG IS WHAT HE ACTUALLY ANSWERED, and until 2026-08-16 there was no middle rung.
  //
  // The chain is: business identity (set when he wires up sending) → the name he gave at setup →
  // the placeholder. Ray reached the placeholder because nothing in the product had ever asked, and
  // was about to send his broker a document headed "This business" about an unnamed company. Setup
  // now asks (kira_drafts.business_name), so the placeholder is a genuine last resort rather than
  // the normal case.
  //
  // ⚠️ THE PLACEHOLDER ITSELF STAYS. An earlier fallback ended at his own first name and titled a
  // real handover document "Ray". A document named after a person reads as unfinished to the one
  // reader already looking for reasons to discount him.
  // ⚠️ VIA THE AGENT, BECAUSE `kira_drafts` HAS NO `user_id`. The obvious query —
  // `.eq('user_id', appUser.id)` on the drafts table — compiles, typechecks, and errors at runtime
  // into the catch below, leaving the name silently empty forever. That is the same shape as the
  // `ended_at` column nothing writes: a fix that ships, reads correctly, and does nothing. The link
  // is `kira_agents.draft_id`, which is the only thing joining an owner to the draft he approved.
  let draftedName = '';
  try {
    const { data: agents } = await svc
      .from('kira_agents')
      .select('draft_id')
      .eq('organisation_id', orgContext.organisationId)
      .not('draft_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);
    const draftIds = (agents ?? []).map((a) => String(a.draft_id)).filter(Boolean);
    if (draftIds.length > 0) {
      const { data: draft } = await svc
        .from('kira_drafts')
        .select('business_name, created_at')
        .in('id', draftIds)
        .not('business_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      draftedName = String(draft?.business_name ?? '').trim();
    }
  } catch (error) {
    // Never fatal — a placeholder title is a lesser document; no document is a broken promise.
    console.error('[genome-manual] draft business name unavailable:', error);
  }

  const businessName = (identity ? displayName(identity) : '') || draftedName || 'This business';

  // HIS clock, not the server's. On Vercel the server is UTC, which for a third of every day
  // dated an Australian handover a day behind — in the one document whose value is that its dates
  // are evidence a buyer's accountant can check.
  const timeZone = timeZoneForState(identity?.state);
  const stamp = isoDateIn(timeZone);
  const html = renderSingleFile(genome, audience, {
    businessName,
    abn: identity?.abn ? formatAbn(identity.abn) : null,
    generatedAt: new Date(),
    timeZone,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // ATTACHMENT, not inline. The content is escaped — that is the real control and it is tested —
      // but serving a document built from user text inline on our own origin is a category of risk
      // worth simply not being in.
      'Content-Disposition': `attachment; filename="${filenameFor(businessName, audience, stamp)}"`,
      'X-Content-Type-Options': 'nosniff',
      // His own record, freshly derived. A cached copy is a stale copy of the thing whose entire
      // value is being current.
      'Cache-Control': 'no-store',
    },
  });
}
