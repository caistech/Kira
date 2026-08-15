// lib/billing/beta-codes.ts
//
// Beta access codes — minting, normalising and claiming.
//
// The judgement lives in the two pure functions at the top so it can be tested without a database.
// `claimBetaCode` is the only part that touches Supabase, and it does exactly one interesting thing:
// claims the row atomically.

import { createServiceClient } from '@/lib/supabase/server';

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
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export type BetaCodeRejection = 'unknown' | 'redeemed' | 'revoked' | 'expired';

export interface BetaCodeRow {
  code: string;
  email: string;
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
 * Returns the bound email so the page can show WHO the invitation is for. The tester never types
 * his own address — it comes from the code — which is both kinder (one less thing to get wrong) and
 * the security property: redemption cannot be pointed at an address we did not choose.
 */
export async function peekBetaCode(
  raw: string,
): Promise<{ ok: true; email: string } | { ok: false; reason: BetaCodeRejection }> {
  const code = normaliseBetaCode(raw);
  if (!code) return { ok: false, reason: 'unknown' };

  const svc = createServiceClient();
  const { data } = await svc
    .from('beta_codes')
    .select('code, email, expires_at, redeemed_at, revoked_at')
    .eq('code', code)
    .maybeSingle();

  const rejection = checkBetaCode((data as BetaCodeRow | null) ?? null, new Date());
  if (rejection) return { ok: false, reason: rejection };
  return { ok: true, email: (data as BetaCodeRow).email.toLowerCase() };
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
 */
export async function claimBetaCode(
  raw: string,
): Promise<{ ok: true; email: string } | { ok: false; reason: BetaCodeRejection }> {
  const code = normaliseBetaCode(raw);
  const peek = await peekBetaCode(code);
  if (!peek.ok) return peek;

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('beta_codes')
    .update({ redeemed_at: new Date().toISOString() })
    .eq('code', code)
    .is('redeemed_at', null)
    .select('code, email')
    .maybeSingle();

  if (error || !data) {
    // Lost the race, or the row moved between the peek and the claim. Reported as already-redeemed
    // because that is what it is from here.
    return { ok: false, reason: 'redeemed' };
  }
  return { ok: true, email: String(data.email).toLowerCase() };
}

/** Attach the account to the code after the fact, for the operator's record. Never throws. */
export async function linkBetaCodeToUser(raw: string, userId: string): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from('beta_codes').update({ redeemed_user_id: userId }).eq('code', normaliseBetaCode(raw));
  } catch (error) {
    console.error('[beta-codes] could not link code to user (harmless, record only):', error);
  }
}

/**
 * Hand a claimed code back when the redemption could not complete.
 *
 * The claim happens first on purpose (see `claimBetaCode`), which means a genuine failure further
 * down — the auth provider being down, say — would otherwise burn a real tester's only code and
 * leave him unable to retry. This is the deliberate, narrow exception: it is called ONLY when no
 * account was created, so it can never release a code that already produced one.
 */
export async function releaseBetaCode(raw: string): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc
      .from('beta_codes')
      .update({ redeemed_at: null })
      .eq('code', normaliseBetaCode(raw))
      .is('redeemed_user_id', null);
  } catch (error) {
    console.error('[beta-codes] could not release code after a failed redemption:', error);
  }
}
