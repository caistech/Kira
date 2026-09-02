'use server';

// Self-serve sign-in link for an introducer whose link has lapsed.
//
// Why this exists: introducer links last seven days, so an advisor who checks in fortnightly is
// locked out every other visit. The only recovery was "email a human", which meant waiting on an
// operator to see their OWN dashboard — and /advisors sells them a status board they can check
// whenever they like. A channel that needs a person in the loop to open a page isn't that.
//
// Two things this must not become:
//
//  1. AN EMAIL ORACLE. The response is identical whether the address belongs to an introducer, to a
//     suspended one, or to nobody at all. Introducers are named brokers with a commercial
//     relationship to their own clients; "is X signed up with Kira" is not ours to confirm to
//     whoever types an address. Same reason resolveMagicLink() collapses every failure to null.
//
//  2. A MAILBOMB. Anyone can post any address here, and each accepted post sends mail to someone
//     who did not ask. The cooldown is per-address so a repeat submission is a no-op rather than
//     another email in a stranger's inbox.

import { randomInt } from 'node:crypto';

import { sendIntroducerInvite } from '@/lib/email/introducer-invite';
import { issueMagicLink } from '@/lib/introducer';
import { createServiceClientV2 } from '@/lib/supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

/**
 * How long before the same address can trigger another email.
 *
 * Long enough that a double-click or an impatient second attempt doesn't send twice, short enough
 * that someone who genuinely lost the first mail isn't stuck. The DB row is the authority rather
 * than an in-process Map, because serverless gives no shared memory between instances — an
 * in-memory limiter on Vercel limits one lambda and nothing else.
 */
const RESEND_COOLDOWN_MINUTES = 5;

export interface RequestLinkResult {
  ok: true;
  /** Deliberately the same string on every path. See the oracle note above. */
  message: string;
}

const NEUTRAL: RequestLinkResult = {
  ok: true,
  message:
    "If that address belongs to an introducer account, a fresh sign-in link is on its way. It's good for seven days.",
};

export async function requestIntroducerLink(formData: FormData): Promise<RequestLinkResult> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();

  // Shape check only. A malformed address can't match a row anyway, and rejecting it distinctly
  // would leak that a well-formed one got further.
  if (!email || !email.includes('@') || email.length > 320) return NEUTRAL;

  // Blunt the timing side-channel. Without it, "row found + email sent" takes visibly longer than
  // "no row", which reconstructs the oracle the identical message is there to prevent.
  const jitter = new Promise((resolve) => setTimeout(resolve, randomInt(120, 400)));

  try {
    const supabase = createServiceClientV2();
    const { data: introducer } = await supabase
      .from('introducers')
      .select('id, email, name, referral_token, status, last_link_sent_at')
      .eq('email', email)
      .maybeSingle();

    // Unknown address, or suspended. Suspended gets the same silence as unknown: sending a working
    // link to a suspended account would quietly undo the suspension, and saying "you're suspended"
    // tells an attacker the account exists.
    if (!introducer || introducer.status === 'suspended') {
      await jitter;
      return NEUTRAL;
    }

    const lastSent = introducer.last_link_sent_at ? new Date(introducer.last_link_sent_at) : null;
    const cooledDown =
      !lastSent || Date.now() - lastSent.getTime() > RESEND_COOLDOWN_MINUTES * 60_000;

    if (cooledDown) {
      const { url } = await issueMagicLink(introducer.id);
      await sendIntroducerInvite({
        introducerEmail: introducer.email,
        introducerName: introducer.name,
        signInUrl: url,
        referralUrl: `${APP_URL}/r/${introducer.referral_token}`,
        resend: true,
      });
      await supabase
        .from('introducers')
        .update({ last_link_sent_at: new Date().toISOString() })
        .eq('id', introducer.id);
    }
  } catch (error) {
    // Log it, but still answer neutrally: a distinct error page here would separate "known address
    // that failed to send" from "unknown address", which is the oracle again. The operator sees the
    // failure in logs; the visitor sees the one message.
    console.error('[introducer/request-link] failed:', error);
  }

  await jitter;
  return NEUTRAL;
}
