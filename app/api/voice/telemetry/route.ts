// app/api/voice/telemetry/route.ts
//
// Records one voice-connection outcome. The server half of lib/voice/connect-telemetry.ts.
//
// ⚠️ DELIBERATELY UNAUTHENTICATED, AND THAT IS WHY IT TRUSTS NOTHING IN THE BODY. The landing and
// valuation widgets run before sign-in, and an anonymous visitor who cannot connect is exactly the
// person worth hearing about — gating this would blind it to the group least likely to complain.
// So the caller supplies WHAT HAPPENED and never WHO IT WAS: the user is derived from the session
// cookie via getCurrentAppUser, and is simply null when there isn't one.
//
// ⚠️ IT ALWAYS ANSWERS 204, INCLUDING ON ITS OWN FAILURES. The client calls this immediately after
// a voice session already failed. An error here would be a second failure stacked on the first, on
// a path where the browser can do nothing useful with it, and a telemetry endpoint that makes a bad
// moment worse is not worth having. Failures are logged server-side, where someone can act on them.

import { NextRequest, NextResponse } from 'next/server';

import { createServiceClientV2 } from '@/lib/supabase/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { redactVoiceDetail } from '@/lib/voice/connect-telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Closed sets, so one typo in a caller cannot quietly create a new category nobody queries. */
const SURFACES = new Set([
  'dashboard',
  'my-genome',
  'drafts',
  'requests',
  'knowledge',
  'start',
  'chat',
  'landing',
  'valuation',
  'pubguard',
]);
const OUTCOMES = new Set(['connected', 'signed_url_failed', 'error', 'stalled']);

const NO_CONTENT = new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NO_CONTENT;

    const surface = String((body as Record<string, unknown>).surface ?? '');
    const outcome = String((body as Record<string, unknown>).outcome ?? '');
    if (!SURFACES.has(surface) || !OUTCOMES.has(outcome)) {
      // Dropped rather than rejected: a stale client deploying against a newer route should not
      // produce browser errors, and an unrecognised category is worth nothing in the table.
      console.warn(`[api/voice/telemetry] ignored unknown surface/outcome: ${surface}/${outcome}`);
      return NO_CONTENT;
    }

    const rawReachable = (body as Record<string, unknown>).reachable;
    const reachable = typeof rawReachable === 'boolean' ? rawReachable : null;

    // Redacted AGAIN here, not only in the browser. The client-side pass is a convenience for the
    // honest caller; this one is the guarantee, because anything can POST to this route and the
    // column must never hold a conversation signature regardless of who wrote the body.
    const detail = redactVoiceDetail((body as Record<string, unknown>).detail);

    // P2.2: Canonical identity resolution. Session is optional — unauthenticated visitors
    // are a valid telemetry source (see file-level comment). Falls back to null gracefully.
    const ctx = await getCurrentOrganisationContext().catch(() => null);

    const { error } = await createServiceClientV2()
      .from('voice_connect_events')
      .insert({
        user_id: ctx?.personId ?? null,
        // Canonical organisation context, never an invented id. Anonymous callers (landing /
        // valuation pre-signin) have no organisation — null is correct and the column accepts it.
        organisation_id: ctx?.organisationId ?? null,
        surface,
        outcome,
        detail,
        reachable,
        // Truncated: the column is for "which browser roughly", not a forensic record.
        user_agent: (request.headers.get('user-agent') ?? '').slice(0, 300) || null,
      });

    if (error) {
      // Logged loudly because a silently-failing telemetry table is worse than none: it looks like
      // "no failures are happening" when it means "nothing is being written".
      console.error('[api/voice/telemetry] insert failed:', error.message);
    }
  } catch (error) {
    console.error('[api/voice/telemetry] unexpected:', error);
  }

  return NO_CONTENT;
}
