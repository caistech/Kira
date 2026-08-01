// app/api/valuation/claim/route.ts
//
// Attaches a valuation run before signup to the account that just signed up.
//
// WHY THIS EXISTS. A naive-tester ran the valuation, saw a $332,006 gap, signed up — and the
// dashboard knew nothing about it. The figures only ever reached an account through
// /api/onboarding/complete, which reads them out of Stripe checkout metadata. Any signup that does
// not pass through paid checkout — a plain email signup, a magic link — left the valuation parked
// in sessionStorage until the tab closed.
//
// Two things were lost, and the second is the one nobody would have noticed for months:
//   1. The owner loses the exact thing that made them sign up.
//   2. The introducer board's "valuation movement" column has nothing to move. There is no
//      baseline, so a broker watching their referral progress sees permanent blanks — the feature
//      is inert rather than broken, which is worse, because it looks like it is working.
//
// THE INPUTS ARE RESENT; THE OUTPUTS ARE NOT TRUSTED. The client posts the answers it collected and
// the server recomputes with computeValuation(). A gap is a number this product will later show to
// a third party (the introducer) and defend to a buyer, so it must be produced by our model at a
// known MODEL_VERSION, not accepted from a browser. Recomputing is also free: the model is
// deterministic and pure.
//
// FIRST VALUATION WINS. If the account already has one, this does nothing. The paid path may have
// written it seconds earlier, and overwriting would silently reset the owner's baseline — which is
// the origin every future movement is measured from.

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAppUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { computeValuation, type ValuationInputs } from '@/lib/valuation/model';
import { recordValuationSnapshot } from '@/lib/valuation/snapshots';
import { DEFAULT_CURRENCY } from '@/lib/valuation/currency';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Enough of a shape check to refuse junk before it reaches the model. */
function isUsableInputs(value: unknown): value is ValuationInputs {
  const i = value as ValuationInputs | null;
  return Boolean(
    i &&
      typeof i.industry === 'string' &&
      typeof i.annualProfit === 'number' &&
      Number.isFinite(i.annualProfit) &&
      typeof i.ownerDependence === 'string' &&
      typeof i.systems === 'string',
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentAppUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: { inputs?: unknown; currency?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!isUsableInputs(body.inputs)) {
    return NextResponse.json({ error: 'Invalid valuation inputs' }, { status: 400 });
  }

  // HE HAS TO SAY IT IS HIS.
  //
  // The handoff persists on the DEVICE for seven days, not per-tab (lib/valuation/persist.ts) — a
  // deliberate trade so a closed tab does not cost him the baseline. The consequence is that on a
  // shared machine the next person to sign in would inherit someone else's turnover, profit and sale
  // plans as their own permanent starting point. A naive tester walked exactly that and called it
  // out; his bookkeeper sits eight feet from his desk.
  //
  // Enforced here as well as in the UI, so a cached or stale client cannot go on claiming silently
  // after this shipped. Not an error — the client asks, then calls back with the answer.
  if ((body as { confirmed?: unknown }).confirmed !== true) {
    return NextResponse.json({ claimed: false, reason: 'needs_confirmation' });
  }

  // DEFAULT_CURRENCY, not a seventh hand-written 'USD'. The default was spelled out in six separate
  // places and this was the seventh; that duplication is exactly why "the currency is wrong" was
  // raised three times and fixed three times without ever being fixed.
  const currency = typeof body.currency === 'string' && body.currency ? body.currency : DEFAULT_CURRENCY;
  const svc = createServiceClient();

  // HIS NAME, ON THE FREE PATH TOO.
  //
  // The paid path takes it through Stripe metadata (app/api/onboarding/complete). Someone who signs
  // up by email or magic link never goes through checkout, so without this his account keeps
  // whatever the signup inferred — which for one real owner was "shhahhussain", straight off the
  // local part of his email address, and is then baked into her prompt at provision and used
  // forever.
  //
  // Only ever FILLS A GAP: it will not overwrite a name he has set in Settings, and it will not
  // overwrite a real-looking existing name. A valuation is claimed once, silently, on first
  // authenticated load, and silently renaming someone is not a repair.
  const askedName = String((body as { firstName?: unknown }).firstName ?? '').trim().slice(0, 40);
  if (askedName) {
    const { data: current } = await svc.from('users').select('first_name').eq('id', user.id).maybeSingle();
    const existingName = String(current?.first_name ?? '').trim();
    const looksInferred = !existingName || /[@+._]/.test(existingName);
    if (looksInferred) {
      await svc.from('users').update({ first_name: askedName.split(' ')[0] }).eq('id', user.id);
    }
  }

  // First valuation wins — see the header note.
  const { data: existing } = await svc
    .from('business_valuations')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ claimed: false, reason: 'already_present' });
  }

  // Recomputed here, from the answers, by our model. Never taken from the client.
  const result = computeValuation(body.inputs);

  const { error: writeError } = await svc.from('business_valuations').upsert(
    {
      user_id: user.id,
      inputs: body.inputs,
      currency,
      gap: result.gap,
      worth_today: result.today,
      worth_potential: result.potential,
      walk_away: result.walkAway,
      sde_multiple: result.sdeMultiple,
      readiness: result.readiness,
      industry: body.inputs.industry,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (writeError) {
    console.error('[api/valuation/claim] write failed:', writeError.message);
    return NextResponse.json({ error: 'Could not save valuation' }, { status: 500 });
  }

  // The baseline point. Without this the introducer board has a current figure and no origin —
  // which is the state that made "valuation movement" a claim the data could not support.
  await recordValuationSnapshot({
    userId: user.id,
    inputs: body.inputs,
    source: 'onboarding',
    currency,
    gap: result.gap,
    worthToday: result.today,
    worthPotential: result.potential,
    walkAway: result.walkAway,
    sdeMultiple: result.sdeMultiple,
    readiness: result.readiness,
    readinessPotential: result.readinessPotential,
    reason: 'Your starting position, from the valuation you ran before signing up.',
  });

  return NextResponse.json({ claimed: true, gap: result.gap });
}
