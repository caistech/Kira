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

import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { renderSingleFile, type Audience } from '@/lib/genome/render';
import { displayName } from '@/lib/business-identity';
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

  const svc = createServiceClient();
  const { data: appUser } = await svc
    .from('users')
    .select('id, first_name, last_name')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (!appUser) return NextResponse.json({ error: 'No account record' }, { status: 404 });

  const genome = await deriveOwnerGenome(appUser.id);

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
  const businessName =
    (identity ? displayName(identity) : '') ||
    [appUser.first_name, appUser.last_name].filter(Boolean).join(' ') ||
    'This business';

  const stamp = new Date().toISOString().slice(0, 10);
  const html = renderSingleFile(genome, audience, {
    businessName,
    abn: identity?.abn ? formatAbn(identity.abn) : null,
    generatedAt: new Date(),
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
