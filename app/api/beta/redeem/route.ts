// app/api/beta/redeem/route.ts
//
// The non-Stripe way in. A beta tester walks the same funnel as everybody else — the same eleven
// questions, the same result, the same /plan — and instead of paying, redeems a code.
//
// DELIBERATELY THE SAME SHAPE AS /api/onboarding/complete, which is the paid twin. Account created
// already confirmed (no email round-trip), the users bridge linked by the auth trigger, attribution
// attached, and then the client signs in and is led into /start. Anything the paid path does that
// this one does not is a difference a beta tester will hit and a paying owner will not, which is the
// opposite of what a beta is for.
//
// ⚠️ THE EMAIL COMES FROM THE CODE, NEVER FROM THE FORM. This is the single most important line in
// the file. Its twin was the site of the worst defect this codebase has carried: the paid path took
// the address out of `session.customer_details.email` — typed into Stripe's form, never verified —
// and, when an account already existed for it, SET THE PASSWORD the caller had just chosen. Enter
// someone else's address, complete a $0 checkout on your own card, and their account and their
// Genome were yours (found and closed 2026-08-08).
//
// Here the address is bound to the code at mint and read out of our own table, so the class of
// attack does not arise. The existing-account branch below still refuses to mutate anything anyway —
// not because it is reachable the same way, but because "we only touch accounts we just created" is
// the rule, and a rule with one carefully-reasoned exception is a rule that gets a second one.

import { NextRequest, NextResponse } from 'next/server';

import { ATTRIBUTION_COOKIE, attachFirstTouch, attribution } from '@/lib/introducer';
import { claimBetaCode, linkBetaCodeToUser, releaseBetaCode } from '@/lib/billing/beta-codes';
import { getBetaGate } from '@/lib/billing';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ONE MESSAGE FOR EVERY REJECTION.
 *
 * "No such code", "already used" and "expired" are different facts, and telling an anonymous caller
 * which one applies confirms whether a code exists — the only thing a guesser can learn here. The
 * real reason is logged, so an operator on the phone to a stuck tester can see it in seconds.
 *
 * It names a way forward, because the person most likely to read it is a real invitee who typed
 * something wrong, not an attacker.
 */
const REJECTION_MESSAGE =
  'That code is not valid. Check it against the email we sent you — or reply to it and we will send a new one.';

export async function POST(request: NextRequest) {
  let body: { code?: unknown; password?: unknown; firstName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const rawCode = typeof body.code === 'string' ? body.code : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!rawCode.trim()) {
    return NextResponse.json({ error: 'Enter your invitation code.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Claimed FIRST, atomically — see claimBetaCode. A burnt code is recoverable by re-minting; a code
  // that could create a second account is not.
  const claim = await claimBetaCode(rawCode);
  if (!claim.ok) {
    console.warn(`[api/beta/redeem] rejected a code: reason=${claim.reason}`);
    return NextResponse.json({ error: REJECTION_MESSAGE }, { status: 400 });
  }

  const email = claim.email;
  const svc = createServiceClient();

  // His own name, asked once on the valuation intro and carried here — the same source the paid path
  // uses. Without it the account keeps whatever the signup inferred, which for one real owner was
  // "shhahhussain" straight off the local part of his address, and which is then baked into the
  // agent's prompt at provision and used forever.
  const askedName = String(body.firstName ?? '').trim().slice(0, 40);
  const firstName = (askedName || email.split('@')[0]).split(' ')[0];

  const { error: createErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });

  if (createErr) {
    const already = /already|registered|exists/i.test(createErr.message);

    if (!already) {
      // A real failure — the provider is down, or the password was refused. NOTHING was created, so
      // the code goes back in the tin. This is the one case where releasing is safe, and it matters:
      // otherwise a provider blip permanently costs a real tester the only code he has.
      await releaseBetaCode(rawCode);
      console.error('[api/beta/redeem] createUser failed, code released:', createErr);
      return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 });
    }

    // THE EMAIL ALREADY HAS AN ACCOUNT. WE CHANGE NOTHING AND STOP.
    //
    // Same rule and same reasoning as the paid path: we do not set a password on an account we did
    // not just create, ever, regardless of how confident we are about who is asking. Here that
    // confidence is genuinely higher — the address came from our own table rather than a form — and
    // the answer is still no, because the value of the rule is that it has no exceptions.
    //
    // The realistic case is a tester who redeemed on his laptop and is now doing it again on his
    // phone. He is not stuck: he signs in, or resets by email. The code is left CONSUMED, because
    // it did its job the first time.
    console.warn(
      `[api/beta/redeem] code redeemed for an address that already has an account — nothing mutated. ` +
        `email=${email}. Expected if they are redeeming twice; if not, the account is safe.`,
    );
    return NextResponse.json({ ok: true, existing: true, email }, { status: 200 });
  }

  // The auth trigger (handle_new_auth_user) links/creates the public.users row by email.
  const { data: appUser } = await svc.from('users').select('id').eq('email', email).maybeSingle();
  if (!appUser) {
    console.error(`[api/beta/redeem] account created but users row not ready for ${email}`);
    return NextResponse.json({ error: 'Account link not ready, please sign in' }, { status: 500 });
  }

  await linkBetaCodeToUser(rawCode, appUser.id);

  await svc
    .from('users')
    .update({ journey_type: 'business', updated_at: new Date().toISOString() })
    .eq('id', appUser.id);

  // THE TRIAL CLOCK STARTS HERE, and it is what makes this a beta account rather than a free one.
  //
  // `derivePlanState` already understands an active trial with no subscription, so nothing
  // downstream needs to know a code was involved — a beta tester and a trialling customer are the
  // same state to every screen that asks. Never throws: a metering failure must not cost someone
  // the account they just created, and an unstarted trial is visible and fixable, whereas a lost
  // signup is neither.
  try {
    await getBetaGate().ensureTrial(appUser.id);
  } catch (trialError) {
    console.error('[api/beta/redeem] trial not started (account IS created):', trialError);
  }

  // Attribution, if they arrived through an introducer's link. Same placement and same failure
  // posture as the paid path: last, and never allowed to fail the request.
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
    console.error('[api/beta/redeem] attribution not recorded:', attributionError);
  }

  // NO VALUATION IS WRITTEN HERE, deliberately — unlike the paid path, which lifts it out of Stripe
  // metadata because that is where checkout parked it. A beta tester's answers are still on his
  // device, and `/api/valuation/claim` already attaches them on the first authenticated load, for
  // exactly this case (any signup that does not pass through checkout). Duplicating that here would
  // be a second writer to the one row the product treats as a fixed origin.
  return NextResponse.json({ ok: true, email });
}
