// lib/billing/beta-codes.ts
//
// Beta access codes — minting, normalising and claiming.
//
// The judgement lives in the two pure functions at the top so it can be tested without a database.
// `claimBetaCode` is the only part that touches the database, and it does exactly one interesting
// thing: claims the row atomically.
//
// PERSISTENCE PATH. The four DB operations (peek, claim, link, release) now route through the
// Orchestrator rather than reaching for the service-role key directly. The Orchestrator holds the
// Kira Supabase credential and enforces caller identity; Kira stays unprivileged. The exported
// interface is unchanged — callers do not know the persistence path moved.

import { SUPPORT_EMAIL } from '@/lib/contact';

const ORCH_URL = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
const ORCH_SECRET = process.env.ORCHESTRATOR_PUBLIC_SECRET || '';

/**
 * Single outbound call to the Orchestrator's beta-codes boundary. All four operations share the
 * same shape: POST with JSON body, receive JSON back, throw on non-200. Error details are logged
 * server-side; the caller sees a thrown Error whose message carries the status code.
 */
async function callKiraBetaCode(
  action: 'peek' | 'claim' | 'link' | 'release',
  code: string,
  userId?: string,
): Promise<Record<string, unknown>> {
  if (!ORCH_URL || !ORCH_SECRET) {
    throw new Error('ORCHESTRATOR_URL / ORCHESTRATOR_PUBLIC_SECRET not configured');
  }
  const res = await fetch(`${ORCH_URL}/api/v1/kira/beta-codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-orchestrator-secret': ORCH_SECRET,
    },
    body: JSON.stringify({ action, code, ...(userId !== undefined ? { userId } : {}) }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error');
    throw new Error(`Orchestrator beta-codes call failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

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

  const body = await callKiraBetaCode('peek', code);
  if (!body.ok) return { ok: false, reason: body.reason as BetaCodeRejection };
  return { ok: true, email: String(body.email) };
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
  const body = await callKiraBetaCode('claim', code);
  if (!body.ok) return { ok: false, reason: body.reason as BetaCodeRejection };
  return { ok: true, email: String(body.email) };
}

/** Attach the account to the code after the fact, for the operator's record. Never throws. */
export async function linkBetaCodeToUser(raw: string, userId: string): Promise<void> {
  try {
    await callKiraBetaCode('link', normaliseBetaCode(raw), userId);
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
    await callKiraBetaCode('release', normaliseBetaCode(raw));
  } catch (error) {
    console.error('[beta-codes] could not release code after a failed redemption:', error);
  }
}
