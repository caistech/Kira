// app/api/track/route.ts
//
// The first-party marketing-events writer — Phase 0 of the funnel build
// (docs/KIRA_FUNNEL_SCOPE.md §15, §6). Public, unauthenticated: this is called from the anonymous
// readiness-check flow, long before an account exists.
//
// WHY A NEW ENDPOINT RATHER THAN REUSING /api/kira/ask. That route is deliberately NOT an answering
// endpoint and exists to hand an anonymous visitor's question to a human — a different job. This one
// never touches a person and never costs anything beyond a database write, so it carries none of that
// route's anti-abuse apparatus (honeypot, time-trap): the worst a flood of junk calls here does is
// fill a table, not send email or burn a paid API call.
//
// THIS IS ALSO THE ATTRIBUTION FIX. Until now the signed first-touch cookie was only ever read at
// signup (attachFirstTouch, called from app/api/onboarding/complete and app/api/beta/redeem) — so a
// partner's referral was lost the moment a valuation and its eventual signup happened in different
// browser sessions. Reading the same cookie here, at valuation-start, closes that gap without
// touching the signup path at all.
//
// @machine-callable

import { NextRequest, NextResponse } from 'next/server';

import { ATTRIBUTION_COOKIE, attribution } from '@/lib/introducer';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Narrow on purpose — widen only when a real new surface starts emitting a new type. See the
 *  migration's own comment; this list and the DB CHECK constraint must stay in step. */
const EVENT_TYPES = new Set(['valuation_started', 'valuation_completed']);

const MAX_METADATA_BYTES = 4_000;

export async function POST(request: NextRequest) {
  let body: {
    event_type?: unknown;
    session_id?: unknown;
    utm_source?: unknown;
    utm_medium?: unknown;
    utm_campaign?: unknown;
    path?: unknown;
    metadata?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const eventType = String(body.event_type ?? '');
  const sessionId = String(body.session_id ?? '').trim();

  if (!EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: 'Unknown event_type' }, { status: 400 });
  }
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  // Never a required field, and a malformed value is silently dropped rather than rejected — a
  // tracking call must never fail the flow it is only trying to observe.
  const metadataRaw = body.metadata;
  const metadata =
    metadataRaw && typeof metadataRaw === 'object' && JSON.stringify(metadataRaw).length <= MAX_METADATA_BYTES
      ? metadataRaw
      : null;

  // Same cookie, same parse call attachFirstTouch's own call site uses — just read earlier than
  // signup. A missing or invalid cookie is a normal, unattributed visit, not an error.
  let referrerId: string | null = null;
  try {
    const touch = attribution.parse(request.cookies.get(ATTRIBUTION_COOKIE)?.value);
    referrerId = touch?.referrerId ?? null;
  } catch {
    referrerId = null;
  }

  const supabase = createServiceClientV2();
  const { error } = await supabase.from('marketing_events').insert({
    event_type: eventType,
    session_id: sessionId,
    referrer_id: referrerId,
    utm_source: body.utm_source ? String(body.utm_source).slice(0, 200) : null,
    utm_medium: body.utm_medium ? String(body.utm_medium).slice(0, 200) : null,
    utm_campaign: body.utm_campaign ? String(body.utm_campaign).slice(0, 200) : null,
    path: body.path ? String(body.path).slice(0, 500) : null,
    metadata,
  });

  if (error) {
    // Logged, not surfaced — the caller is fire-and-forget and a tracking failure must never read
    // as a broken product to a visitor who never sees this response.
    console.error('[api/track] write failed:', error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
