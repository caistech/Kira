// lib/billing/beta-codes.ts
//
// Beta access codes — minting, normalising and claiming.
//
// A beta code is bound to both:
//   1. the invited email address; and
//   2. the canonical Organisation the new account is being created for.
//
// This is deliberate. Beta redemption happens PRE-authentication, so there is no authenticated
// Person from whom organisation context can safely be resolved. The beta code therefore carries
// the organisation context explicitly from the invitation stage.
//
// `user_id` / `redeemed_user_id` remains contextual account/person linkage only. It is NOT used as
// the organisational anchor.
//
// The judgement lives in the pure functions above a note on persistence so it can be tested without
// a database. `claimBetaCode` does exactly one interesting thing: claims the row atomically.
//
// PERSISTENCE PATH. These four DB operations run against Kira's own Supabase project with Kira's
// own service-role client — the same client every other admin route in this app uses. They were
// briefly proxied through the Orchestrator (which held the credential on Kira's behalf), but a
// 2026-09 production outage showed that path adds a deployment dependency without buying security:
// Kira already holds SUPABASE_SECRET_KEY and uses createServiceClientV2() across the app, so the
// proxy did not make Kira less privileged, it only made pre-auth onboarding wait on a separate
// service's health. Beta redemption runs PRE-authentication by definition — the code creates the
// account — so RLS cannot authorise it and a service-role path is required regardless. The atomic
// claim lives in the guarded UPDATE below; the network hop does not add to it.
//

import { createServiceClientV2 } from '@/lib/supabase/server';
import { SUPPORT_EMAIL } from '@/lib/contact';

/**
 * THE ONE SENTENCE EVERY REJECTED CODE GETS, on every route.
 *
 * ⚠️ IT LIVES HERE BECAUSE IT WAS FIXED IN ONE PLACE AND LEFT BROKEN IN THE OTHER. `/redeem` had it
 * rewritten after Ray hit a dead end — the old wording said "check it against the email we sent you,
 * or reply to it and we will send a new one", which assumes a channel that is often not there, since
 * codes get handed over in person, by text, or by a broker:
 *
 *   "There is no email. I don't have one to reply to… For an invited beta user that's a full stop
 *    with nowhere to go."
 *
 * `/peek` kept the old sentence, and `/peek` is the route a tester actually reaches: BetaRedeem calls
 * it the moment a code is entered or arrives in the URL, and only ever calls `/redeem` after it has
 * already passed. So the repaired message was on the path nearly nobody walks and the dead end was on
 * the path everybody walks — which is indistinguishable, from outside, from never having fixed it.
 * One exported constant is the only shape that cannot drift apart again.
 *
 * The reason for the rejection is still withheld deliberately (see `checkBetaCode`) — naming
 * "already redeemed" confirms which codes exist. This sentence resolves all three causes without
 * disclosing which applies: a used code means an account exists, so "sign in" fixes it; a mistyped or
 * unknown one needs a human, and the address given is monitored.
 */
export const BETA_CODE_REJECTION_MESSAGE =
  'That code did not work. If you have used it before, your account already exists — sign in ' +
  `instead. Otherwise check the code and try again, or email ${SUPPORT_EMAIL} and we ` +
  'will sort it out.';

/**
 * What a code looks like on the wire vs in the table.
 *
 * ON THE WIRE it is grouped and hyphenated — `KIRA-7H2K-9QLM` — because a person reads it off a
 * screen, out of an email, or down a phone, and unbroken strings get mis-typed. IN THE TABLE it is
 * upper case alphanumerics only.
 *
 * ⚠️ NORMALISE ON EVERY LOOKUP. The audience is business owners in their sixties; a code that fails
 * because it was typed in lower case, or because a mail client turned the hyphens into en-dashes, or
 * because the paste carried a trailing space, is indistinguishable from a code that does not work.
 * That is precisely the failure mode the whole codes-not-links decision exists to avoid, so getting
 * it back through a strict comparison would be an own goal.
 *
 * Strips EVERY non-alphanumeric rather than hyphens specifically, so an en-dash, a non-breaking
 * space or a stray full stop all come out the same.
 */
export function normaliseBetaCode(raw: string): string {
  return String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Group a normalised code for display: KIRA7H2K9QLM -> KIRA-7H2K-9QLM. */
export function formatBetaCode(normalised: string): string {
  return (normalised.match(/.{1,4}/g) ?? []).join('-');
}

/**
 * The alphabet, minus the characters people mis-read.
 *
 * No O/0, no I/1, no S/5. This costs ~0.3 bits per character and buys back every support
 * conversation that starts "it says my code is wrong". L is KEPT — it is only confusable with 1 and
 * I, and both are gone. With 12 characters from 30 symbols the code carries ~59 bits, far past
 * guessable, which is why there is no rate limiter (see the migration).
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';

/**
 * Mint a code. Not exported to the app — used by scripts/mint-beta-code.mjs.
 *
 * `crypto.getRandomValues`, not `Math.random`: this is an access credential, and a predictable one
 * would make the email binding the only control left.
 */
export function generateBetaCode(length = 12): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);

  let out = '';

  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }

  return out;
}

export type BetaCodeRejection = 'unknown' | 'redeemed' | 'revoked' | 'expired';

export interface BetaCodeRow {
  code: string;
  email: string;

  /**
   * Canonical organisational anchor for the invitation.
   *
   * This is deliberately present on the beta code because redemption occurs before authentication.
   * It means the eventual account can be attached to the correct Organisation without deriving
   * organisational ownership from a user/auth identity that does not yet exist.
   */
  organisation_id: string;

  expires_at: string;
  redeemed_at: string | null;
  revoked_at: string | null;
}

/**
 * Is this row usable right now — and if not, WHY.
 *
 * ⚠️ THE REASON IS FOR US, NOT FOR THE VISITOR. The endpoint deliberately answers a single
 * indistinguishable message for every rejection: telling an anonymous caller the difference between
 * "no such code" and "that code was already used" confirms which codes exist, which is the one
 * thing a guesser learns from. The distinction is logged, so an operator helping a real tester on
 * the phone can see it.
 *
 * Pure and separately exported so the four branches can be tested without minting anything.
 */
export function checkBetaCode(row: BetaCodeRow | null, now: Date): BetaCodeRejection | null {
  if (!row) return 'unknown';
  if (row.revoked_at) return 'revoked';
  if (row.redeemed_at) return 'redeemed';
  if (new Date(row.expires_at).getTime() <= now.getTime()) return 'expired';

  return null;
}

/**
 * Look a code up without consuming it, for the `?code=` landing.
 *
 * Returns BOTH:
 *   - the bound email; and
 *   - the canonical organisation_id bound to the invitation.
 *
 * The tester never types his own address or organisation. Both come from the invitation code.
 *
 * This is intentional: beta redemption is pre-authentication, so there is no authenticated
 * Person/session from which organisational context can safely be derived.
 *
 * `organisation_id` is therefore the canonical organisational anchor at the onboarding boundary.
 * The later authenticated identity is linked to that Organisation through the canonical identity
 * model; the auth user does not become the Organisation.
 */
export async function peekBetaCode(
  raw: string,
): Promise<
  | { ok: true; email: string; organisation_id: string }
  | { ok: false; reason: BetaCodeRejection }
> {
  const code = normaliseBetaCode(raw);

  if (!code) {
    return { ok: false, reason: 'unknown' };
  }

  const svc = createServiceClientV2();

  const { data, error } = await svc
    .from('beta_codes')
    .select('code, email, organisation_id, expires_at, redeemed_at, revoked_at')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    throw new Error(`beta_codes read failed: ${error.message}`);
  }

  const row = (data as BetaCodeRow | null) ?? null;
  const rejection = checkBetaCode(row, new Date());

  if (rejection) {
    return { ok: false, reason: rejection };
  }

  return {
    ok: true,
    email: String(row!.email).toLowerCase(),
    organisation_id: String(row!.organisation_id),
  };
}

/**
 * Resolve the server-minted organisation bound to a code, if any.
 *
 * Unlike `peekBetaCode`, this deliberately works for REDEEMED codes too (the
 * state a code is in when its owner is already signed in). It is used by the
 * identity boundary to answer one question: "does this invitation name an
 * organisation, and if so which one?" — so `/plan` can present that org as a
 * read-only joining notice instead of asking for a business name.
 *
 * The organisation was set BY THE OPERATOR at mint, never by the client, so
 * there are no ab tests to reject here. A `null` organisation_id simply means
 * this is a free-form code and the normal new-organisation path applies.
 */
export async function resolveBoundOrganisation(raw: string): Promise<{
  organisationId: string | null;
  betaType: string;
  email: string;
}> {
  const svc = createServiceClientV2();

  const { data, error } = await svc
    .from('beta_codes')
    .select('code, email, organisation_id, beta_type')
    .eq('code', normaliseBetaCode(raw))
    .maybeSingle();

  if (error) {
    throw new Error(`beta_codes bound-organisation lookup failed: ${error.message}`);
  }

  return {
    organisationId: data?.organisation_id ? String(data.organisation_id) : null,
    betaType: data?.beta_type ?? 'user',
    email: String(data?.email ?? '').toLowerCase(),
  };
}

/**
 * Consume a code, atomically.
 *
 * ⚠️ THE UPDATE IS THE LOCK. `WHERE code = ? AND redeemed_at IS NULL` and then checking whether a
 * row came back is what makes two simultaneous redemptions resolve to one winner — the same shape
 * the Stripe webhook uses to claim an event id. A read-then-write would let a double-clicked button
 * create two accounts, and on this path "two accounts" means two agents and a duplicate-owner state
 * that has already cost this product a day.
 *
 * Claimed BEFORE the account is created, so the failure mode is a burnt code rather than a code that
 * can create a second account. An operator can re-mint; there is no undoing an extra account.
 *
 * The organisation_id is returned from the claimed beta-code row and must be carried into the
 * pre-auth account-creation flow. It is the canonical organisation context supplied by the
 * invitation, not something inferred from the new auth user.
 */
export async function claimBetaCode(
  raw: string,
): Promise<
  | { ok: true; email: string; organisation_id: string }
  | { ok: false; reason: BetaCodeRejection }
> {
  const code = normaliseBetaCode(raw);

  const peek = await peekBetaCode(code);

  if (!peek.ok) {
    return peek;
  }

  const svc = createServiceClientV2();

  const { data, error } = await svc
    .from('beta_codes')
    .update({
      redeemed_at: new Date().toISOString(),
    })
    .eq('code', code)
    .is('redeemed_at', null)
    .select('code, email, organisation_id')
    .maybeSingle();

  if (error || !data) {
    // Lost the race, or the row moved between the peek and the claim. Reported as already-redeemed
    // because that is what it is from here.
    if (error) {
      console.error('[beta-codes] claim failed:', error.message);
    }

    return { ok: false, reason: 'redeemed' };
  }

  return {
    ok: true,
    email: String(data.email).toLowerCase(),
    organisation_id: String(data.organisation_id),
  };
}

/**
 * Attach the account to the code after the fact, for the operator's record.
 *
 * `userId` is deliberately retained here as PERSON/AUTH linkage only.
 *
 * It does NOT establish or change organisation ownership. The Organisation was already fixed by
 * `beta_codes.organisation_id` before authentication/account creation.
 *
 * Never throws.
 */
export async function linkBetaCodeToUser(raw: string, userId: string): Promise<void> {
  try {
    const svc = createServiceClientV2();

    await svc
      .from('beta_codes')
      .update({
        redeemed_user_id: userId,
      })
      .eq('code', normaliseBetaCode(raw));
  } catch (error) {
    console.error(
      '[beta-codes] could not link code to user (harmless, record only):',
      error,
    );
  }
}

/**
 * Hand a claimed code back when the redemption could not complete.
 *
 * The claim happens first on purpose (see `claimBetaCode`), which means a genuine failure further
 * down — the auth provider being down, say — would otherwise burn a real tester's only code and
 * leave him unable to retry.
 *
 * This is the deliberate, narrow exception: it is called ONLY when no account was created, so it
 * can never release a code that already produced one.
 *
 * `redeemed_user_id IS NULL` is the additional safety boundary: once the code has been linked to a
 * created account, releaseBetaCode cannot release it.
 */
export async function releaseBetaCode(raw: string): Promise<void> {
  try {
    const svc = createServiceClientV2();

    await svc
      .from('beta_codes')
      .update({
        redeemed_at: null,
      })
      .eq('code', normaliseBetaCode(raw))
      .is('redeemed_user_id', null);
  } catch (error) {
    console.error(
      '[beta-codes] could not release code after a failed redemption:',
      error,
    );
  }
}