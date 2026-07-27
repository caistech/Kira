// GET /api/billing/mode — is billing live?
//
// The checkout page is a client component and the flag is server-only, so the mode has to cross that
// boundary somehow. This route exists so it crosses ONCE, from the same `stripeMode()` the payment
// path itself uses.
//
// Deliberately NOT a NEXT_PUBLIC_STRIPE_LIVE_MODE. A second copy of the flag is a second thing to
// flip, and the day someone flips one and not the other, the page and the payment disagree — either
// promising a charge that will not happen, or claiming to be in beta while taking real cards. The
// whole point of stripe-mode.ts is one switch.
//
// Returns only a boolean. No keys, no mode names beyond live/test — nothing here is a secret, and
// nothing here should grow into one.

import { NextResponse } from 'next/server';
import { isLiveMode } from '@/lib/billing/stripe-mode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ live: isLiveMode() });
}
