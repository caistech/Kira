// app/api/onboarding/complete/route.ts
//
// Finishes the post-payment onboarding. The owner has paid; we create their account already
// confirmed (no email round-trip after a purchase), link it to the users bridge, and persist their
// valuation. The trusted valuation + payment status come from the Stripe session, never the client.
// The client then signs in with the password they just set.

import { NextRequest, NextResponse } from 'next/server';
import { ATTRIBUTION_COOKIE, attachFirstTouch, attribution } from '@/lib/introducer';
import { getStripe } from '@/lib/billing';
import { createServiceClient } from '@/lib/supabase/server';
import { recordValuationSnapshot } from '@/lib/valuation/snapshots';
import { DEFAULT_CURRENCY } from '@/lib/valuation/currency';


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
    // WHAT HE ASKED TO BE CALLED FIRST, the card second, his email address last.
    //
    // This line used to start at `session.customer_details.name` — the name on the CARD — and fall
    // back to the local part of the email. It is the first and only place the account's name is set,
    // and that name is then baked into the agent's system prompt at provision and never reconciled,
    // so whatever lands here is what she calls him forever.
    //
    // Both fallbacks were producing real damage. The email path gave one owner "shhahhussain" and
    // two synthetic accounts "dennis+qauser" / "dennis+redteam", tag and all. The card path is the
    // quieter and worse one: the cardholder is often not the owner — a wife's card, a company card,
    // an accountant setting it up — and a naive tester was greeted "Hey Andrew" on his first ever
    // screen, which he read, correctly, as "if she's wrong about the one thing she should certainly
    // know, what's she wrong about that I can't check?"
    //
    // So he is now asked, once, on the valuation intro, and that answer arrives here. The card and
    // the email survive only as fallbacks for someone who skipped the question.
    const askedName = String(m.val_first_name ?? '').trim();
    const firstName = (askedName || session.customer_details?.name || email.split('@')[0]).split(' ')[0];
    const svc = createServiceClient();

    // Create the account already confirmed. If it already exists, set the password they chose.
    // TERMS ACCEPTANCE, FROM THE METADATA /plan PUT THERE BEFORE HE PAID.
    //
    // The DB trigger stamps `users.terms_accepted_at` only when `terms_accepted` is truthy in auth
    // metadata, so this is the seam. Until this change the paid path passed only `first_name`, and
    // every paying owner therefore reached a paid account with no recorded acceptance while free
    // signups had one — inverted, for the only group with a contract.
    //
    // ⚠️ IT DEGRADES RATHER THAN REFUSING, and that asymmetry is deliberate. He has ALREADY PAID by
    // the time this runs. A session created before this shipped, or by any other route, carries no
    // acceptance — and refusing to create his account would take his money and leave him with
    // nothing, to fix a record-keeping gap. So a missing value leaves `terms_accepted_at` NULL,
    // exactly as it was, and the gate that can actually stop someone lives on /plan, before the
    // money moves. The beta path CAN refuse, and does, because nothing has been paid there.
    const acceptedTerms = String(m.terms_accepted ?? '') === 'true';
    if (!acceptedTerms) {
      console.warn(
        `[api/onboarding/complete] no terms acceptance in session metadata for ${email} — account ` +
          `created without one rather than refusing a paid customer. session=${session_id}`,
      );
    }

    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        ...(acceptedTerms
          ? { terms_accepted: 'true', terms_version: String(m.terms_version ?? '') || 'unversioned' }
          : {}),
      },
    });

    if (createErr) {
      const already = /already|registered|exists/i.test(createErr.message);
      if (!already) {
        console.error('[api/onboarding/complete] createUser failed:', createErr);
        return NextResponse.json({ error: 'Could not create account' }, { status: 500 });
      }

      // THE EMAIL ALREADY HAS AN ACCOUNT. WE CHANGE NOTHING AND STOP.
      //
      // This branch used to find that account and set the password the caller had just typed. The
      // email comes from `session.customer_details.email` — typed into Stripe's checkout form and
      // never verified as belonging to whoever paid. So the sequence was: start a checkout, enter
      // someone else's address, complete it (arrears means $0 is due today, on your own card),
      // take `session_id` out of the success URL, POST any password. Their account, and their
      // Genome, was then yours.
      //
      // On a product whose whole proposition is that an owner tells it things he has not told his
      // staff or his family, that is the worst defect this codebase can carry. Found 2026-08-08
      // while walking the paid path; the branch was confirmed to execute (against our own account
      // and our own session — never against anyone else's).
      //
      // Nothing else is mutated either, deliberately. The valuation upsert below is keyed on
      // `user_id` with onConflict, so letting an unverified caller through would let them overwrite
      // a real owner's baseline; and writing `stripe_subscription_id` would detach the subscription
      // he is actually paying for. Both are vandalism rather than disclosure, but neither is ours
      // to risk on an unproven identity.
      //
      // The legitimate case this leaves is an existing owner who paid while signed out. He is NOT
      // stuck: he signs in, or resets his password by email — which is the proof of ownership this
      // endpoint cannot obtain and must not fake. His subscription is attached by the Stripe
      // webhook and, failing that, by an operator from the log line below, which is why it carries
      // the session id.
      console.warn(
        `[api/onboarding/complete] existing account for a completed checkout — nothing mutated. ` +
          `session=${session_id} email=${email}. If this is a genuine repeat purchase, attach the ` +
          `subscription by hand; if it is not, it is an attempted takeover and the account is safe.`,
      );
      return NextResponse.json({ ok: true, existing: true, email }, { status: 200 });
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
        currency: m.val_currency || DEFAULT_CURRENCY,
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

    // The first point on their curve. The upsert above keeps the CURRENT figures; this records that
    // these were the figures on this date, under this model — so the introducer board can show
    // movement rather than a number that silently replaces itself. Never throws: the valuation is
    // already computed and paid for, and a history write must not fail a checkout.
    await recordValuationSnapshot({
      userId: appUser.id,
      inputs,
      source: 'onboarding',
      currency: m.val_currency || DEFAULT_CURRENCY,
      gap: Number(m.val_gap || 0),
      worthToday: Number(m.val_today || 0),
      worthPotential: Number(m.val_potential || 0),
      walkAway: Number(m.val_walk_away || 0),
      sdeMultiple: m.val_sde_multiple ? Number(m.val_sde_multiple) : null,
      readiness: m.val_readiness ? Number(m.val_readiness) : null,
      reason: 'Your starting position, from the valuation you just ran.',
    });

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
