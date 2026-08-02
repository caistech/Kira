// app/api/valuation/mine/route.ts
//
// The signed-in owner's own valuation inputs, so a client page can price from the ACCOUNT rather
// than from whatever happens to be in this browser.
//
// WHY THIS EXISTS. `/plan` read `readStoredValuation()` — the DEVICE store — and nothing else. A
// tester finished the eleven questions from a button on his own dashboard, was sent to /plan by the
// result page, and was told: "Let's find your number first. Take the 3-minute valuation and it'll
// bring you right back here." He had just done it. The only two links on the page sent him back to
// the valuation, so it was a closed loop — while /dashboard displayed his completed figures
// perfectly well, three clicks away.
//
// The valuation was living in two places at once and the sales page was reading the wrong one.
//
// Returns the INPUTS, not the computed figures: the client recomputes with the same pure model, at a
// known MODEL_VERSION, exactly as /api/valuation/claim does on the way in. Sending the stored
// outputs would let a stale row and a current model disagree on one screen.

import { NextResponse } from 'next/server';

import { getCurrentAppUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { DEFAULT_CURRENCY } from '@/lib/valuation/currency';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentAppUser();
  // Not an error. This route is called speculatively by a PUBLIC page, and a signed-out visitor is
  // its normal case — 401 here would put a red line in the console of every anonymous pricing view.
  if (!user?.id) return NextResponse.json({ valuation: null });

  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from('business_valuations')
      .select('inputs, currency')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data?.inputs) return NextResponse.json({ valuation: null });

    return NextResponse.json({
      valuation: { inputs: data.inputs, currency: data.currency || DEFAULT_CURRENCY },
    });
  } catch (error) {
    console.error('[api/valuation/mine] lookup failed:', error);
    // Degrade to "no account valuation" rather than 500. The caller still has the device store to
    // fall back on, and a pricing page that errors is worse than one that asks him to run the
    // numbers.
    return NextResponse.json({ valuation: null });
  }
}
