// app/api/billing/usage/route.ts
//
// The in-app usage meter's data source: where the signed-in owner stands against the fair-use
// ceiling on voice spend. Not a billing clock — Kira bills in arrears (lib/billing/arrears.ts), so
// there is no free month to be inside; this is the cost guard, which beta-gate expresses as one.
//
// "Surface usage, don't hard-cut without warning" only works if the usage is actually visible —
// a cap the owner can't see is indistinguishable from the product breaking. This is the read side
// of that promise.

import { NextResponse } from 'next/server';

import {
  getBetaGate,
  FAIR_USE_WINDOW_DAYS,
  USAGE_WARN_AT,
  VOICE_ACTION,
  VOICE_COST_CAP_USD,
} from '@/lib/billing';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getCurrentOrganisationContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    // check(), not gate(): reading the meter must never record a use.
    const usage = await getBetaGate().check(ctx.personId, VOICE_ACTION);

    // P2.2: Resolve subscription status via person identity (legacy users table — P2.4 will migrate).
    const supabase = createServiceClientV2();
    const { data: user } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', ctx.personId)
      .single();

    return NextResponse.json({
      // The fair-use window (not a billing trial — Kira bills in arrears; see lib/billing/arrears.ts)
      trialDays: FAIR_USE_WINDOW_DAYS,
      daysLeft: usage.daysLeft,
      // Fair-use budget
      capUsd: VOICE_COST_CAP_USD,
      usedUsd: Math.round(usage.usedCost * 100) / 100,
      pctUsed: usage.pctUsed,
      warn: usage.warn,
      warnAt: USAGE_WARN_AT,
      // Why they'd be blocked, if they are. `cost_cap` means the fair-use ceiling is reached;
      // `trial_expired` means the month is over and billing has taken over.
      allowed: usage.allowed,
      reason: usage.reason ?? null,
      subscriptionStatus: user?.subscription_status ?? null,
    });
  } catch (error) {
    // Degrade, don't fake: a meter that can't be read says so rather than reporting a cheerful 0%.
    console.error('[api/billing/usage] Failed to read usage:', error);
    return NextResponse.json({ error: 'Could not read usage' }, { status: 503 });
  }
}
