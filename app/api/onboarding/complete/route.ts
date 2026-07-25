// app/api/onboarding/complete/route.ts
//
// Finishes the post-payment onboarding. The owner has paid; we create their account already
// confirmed (no email round-trip after a purchase), link it to the users bridge, and persist their
// valuation. The trusted valuation + payment status come from the Stripe session, never the client.
// The client then signs in with the password they just set.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ATTRIBUTION_COOKIE, attachFirstTouch, attribution } from '@/lib/introducer';
import { createServiceClient } from '@/lib/supabase/server';

// Lazily construct Stripe at request time (module-load construction throws during `next build`
// when STRIPE_SECRET_KEY isn't in the build env, e.g. CI).
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});
  return _stripe;
}

export async function POST(request: NextRequest) {
  try {
    const { session_id, password } = await request.json();
    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: 'Payment not complete' }, { status: 402 });
    }

    const email = session.customer_details?.email?.toLowerCase();
    if (!email) return NextResponse.json({ error: 'No email on session' }, { status: 400 });

    const m = session.metadata || {};
    const firstName = (session.customer_details?.name || email.split('@')[0]).split(' ')[0];
    const svc = createServiceClient();

    // Create the account already confirmed. If it already exists, set the password they chose.
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName },
    });

    if (createErr) {
      const already = /already|registered|exists/i.test(createErr.message);
      if (!already) {
        console.error('[api/onboarding/complete] createUser failed:', createErr);
        return NextResponse.json({ error: 'Could not create account' }, { status: 500 });
      }
      // Existing account: find it and set the chosen password so they can sign in.
      const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (existing) {
        await svc.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
      }
    }

    // The auth trigger (handle_new_auth_user) links/creates the public.users row by email.
    const { data: appUser } = await svc.from('users').select('id').eq('email', email).maybeSingle();
    if (!appUser) {
      return NextResponse.json({ error: 'Account link not ready, please sign in' }, { status: 500 });
    }

    let inputs: unknown = {};
    try {
      inputs = m.val_inputs ? JSON.parse(m.val_inputs) : {};
    } catch {
      inputs = {};
    }

    await svc.from('business_valuations').upsert(
      {
        user_id: appUser.id,
        inputs,
        currency: m.val_currency || 'USD',
        gap: Number(m.val_gap || 0),
        worth_today: Number(m.val_today || 0),
        worth_potential: Number(m.val_potential || 0),
        walk_away: Number(m.val_walk_away || 0),
        sde_multiple: m.val_sde_multiple ? Number(m.val_sde_multiple) : null,
        readiness: m.val_readiness ? Number(m.val_readiness) : null,
        industry: m.val_industry || null,
        quoted_monthly: m.quoted_monthly ? Number(m.quoted_monthly) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    await svc
      .from('users')
      .update({
        journey_type: 'business',
        stripe_customer_id: (session.customer as string) || null,
        stripe_subscription_id: (session.subscription as string) || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appUser.id);

    // Attribution: if this owner arrived through an introducer's link, the signed first-touch
    // cookie is still on the request. This is the moment it becomes permanent — the database makes
    // referrer_id immutable from here, so it is written once and never reassigned.
    //
    // Deliberately AFTER the account is fully set up and never allowed to fail the request: a paid
    // signup must not be lost because attribution had a bad day. A missing commission is recoverable
    // from the cookie and the introductions row; a lost paying customer is not.
    try {
      const touch = attribution.parse(request.cookies.get(ATTRIBUTION_COOKIE)?.value);
      if (touch) {
        await attachFirstTouch({
          userId: appUser.id,
          userEmail: email,
          introducerId: touch.referrerId,
          firstTouchAt: touch.firstTouchAt,
        });
      }
    } catch (attributionError) {
      console.error('[api/onboarding/complete] attribution not recorded:', attributionError);
    }

    return NextResponse.json({ ok: true, email });
  } catch (error) {
    console.error('[api/onboarding/complete] error:', error);
    return NextResponse.json({ error: 'Onboarding failed' }, { status: 500 });
  }
}
