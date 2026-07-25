// lib/cron-auth.ts
//
// One authorization check for every cron endpoint.
//
// FAIL CLOSED. The previous shape — `if (CRON_SECRET && header !== ...)` — meant that with the
// variable unset the check silently evaporated and the endpoint was open to anyone who knew the
// URL. That is exactly what happened: CRON_SECRET was set in no environment, so both cron routes
// were publicly callable, and anyone could have triggered a mail run at will.
//
// An unset secret is now a 503 (the endpoint is misconfigured, not unauthorized) rather than a
// waved-through request. Same posture as the webhook routes, which refuse to run without their
// signing secrets.
//
// Vercel supplies `Authorization: Bearer $CRON_SECRET` on its own cron invocations automatically
// once the variable exists, so nothing extra is needed to keep the schedules working.

import { NextResponse, type NextRequest } from 'next/server';

/** Returns a response to send back when the call is not an authorised cron invocation, else null. */
export function rejectUnauthorisedCron(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('[cron] CRON_SECRET is not set — refusing to run rather than run unauthenticated.');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
