// lib/email/unanswered-request.ts
//
// The operator alert when an owner asks Kira for something she cannot do.
//
// Same shape as a SayFix report: something a real person hit, in their own words, mailed to whoever
// can act on it, the moment it happens. The `unsupported` rows were already being written and read
// by nobody — a build queue you have to remember to visit is a build queue that goes stale, and the
// whole value of the signal is that it is fresh. One ask is noise; the same ask three times in a
// week is a decision, and you only notice the pattern if each one reaches you.
//
// TO THE OPERATOR, NEVER THE OWNER. He is not told that his request became a ticket; he was already
// told, in the conversation, that Kira could not do it and had noted it. Mailing him again would
// turn a graceful refusal into a paper trail of the product's gaps.
//
// FAIL-SOFT, ALWAYS. This is called from inside a live voice call. An SMTP hiccup must never break
// a conversation an owner is having — the alert is the least important thing happening at that
// moment. Every failure is logged and swallowed.

import { createEmailSender } from '@caistech/email-send';

import { adminEmails } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

import { senderIdentityOrNull, replyToAddress } from './sender';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

export interface UnansweredRequestAlert {
  /** What the owner actually said. The phrasing is the specification. */
  utterance: string;
  /** The classifier's stated reason, when it gave one. */
  reason?: string | null;
  /** The owner's user id. Resolved to a name/email here — a UUID in an alert tells you nothing. */
  ownerUserId?: string | null;
  /** 'unsupported' (we never could) or 'failed' (we should have and didn't). */
  status: 'unsupported' | 'failed';
}

const STATUS_LINE: Record<UnansweredRequestAlert['status'], string> = {
  unsupported: 'Kira could not do this — it is outside what her team can reach today.',
  failed: 'Kira tried this and it failed. She should have been able to do it, so this is a bug.',
};

/**
 * THROTTLE. Added 2026-08-03 after this alert exhausted the portfolio's shared Resend daily quota
 * and took auth email down for EVERY product on the account — nobody could sign up, reset a
 * password or receive an invite, and the symptom was a bare HTTP 500 "unexpected_failure".
 *
 * The trigger was a CI probe submitting text to Kira's public ask endpoint: fifteen runs in half
 * an hour, three recipients each. But the probe only did accidentally what anyone could do
 * deliberately — `/api/kira/ask` is PUBLIC and UNAUTHENTICATED, and it mailed every admin on every
 * call with no dedupe and no cap. That is a denial-of-service on the shared mail quota, reachable
 * by a stranger with curl, and the blast radius is every other product's ability to log a user in.
 *
 * Two limits, both deliberately in-memory:
 *
 *   DEDUPE   the same utterance within the window is one alert, not many. "One ask is noise; the
 *            same ask three times in a week is a decision" — but three times in a MINUTE is a loop.
 *   CEILING  a hard cap per window regardless of content, so novel-but-automated traffic cannot
 *            walk past the dedupe by varying its text.
 *
 * In-memory means per serverless instance, so the real ceiling is higher than MAX_PER_WINDOW under
 * fan-out. That is accepted: this is a blast-radius reducer, not an access control. The access
 * control this really wants is auth on the endpoint, which is a product decision — the endpoint
 * exists precisely so someone WITHOUT an account can ask.
 */
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
const recentUtterances = new Map<string, number>();
let windowStart = 0;
let sentInWindow = 0;

function throttled(utterance: string): string | null {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    sentInWindow = 0;
    recentUtterances.clear();
  }
  const key = utterance.trim().toLowerCase().slice(0, 200);
  const seen = recentUtterances.get(key);
  if (seen && now - seen < WINDOW_MS) return 'duplicate within the window';
  if (sentInWindow >= MAX_PER_WINDOW) return `ceiling of ${MAX_PER_WINDOW} per ${WINDOW_MS / 60000}m reached`;
  recentUtterances.set(key, now);
  sentInWindow += 1;
  return null;
}

/**
 * Is this our own CI probe rather than a person?
 *
 * `portfolio-gate-audit-input-response` really submits, twenty times a run (R20), against whatever
 * `PORTFOLIO_GATE_PREVIEW_URL` names — which for this repo is `kira-rho.vercel.app`, an alias of
 * PRODUCTION. So every gate run drives the landing page's box and every submission mails three
 * operators. The inbox evidence: fourteen identical alerts between 6 Aug 20:20 and 7 Aug 11:55,
 * including three four minutes apart, which the 3 August throttle should have collapsed and did not
 * — its state is a module-level Map, so it is per serverless instance, and on a low-traffic public
 * endpoint almost every request lands on a fresh one with an empty map.
 *
 * ⚠️ POINTING THE GATE AT A PREVIEW DOES NOT FIX THIS, which was my first suggestion and it was
 * wrong: `RESEND_API_KEY` and `ADMIN_EMAILS` are set on preview as well as production, so a preview
 * deployment sends exactly the same mail. The fault is the alert, not the URL.
 *
 * MATCHED TIGHT, ON THE TOOL'S OWN NAME, and the asymmetry is the reason. A missed probe costs one
 * email. A matched HUMAN costs the question itself — public asks are recorded nowhere (see the route;
 * `kira_tasks.user_id` is NOT NULL so an anonymous ask has no row to go in), which means the email IS
 * the record and suppressing it wrongly loses a visitor's words for good. So this requires the
 * literal string `portfolio-gate`, which no owner will ever type, rather than anything that tries to
 * be clever about what automated traffic looks like.
 */
function isAutomatedProbe(utterance: string): boolean {
  return /portfolio-gate/i.test(utterance);
}

export async function sendUnansweredRequestAlert(alert: UnansweredRequestAlert): Promise<void> {
  if (isAutomatedProbe(alert.utterance)) {
    console.info('[email] unanswered-request alert suppressed (our own CI probe):', alert.utterance.slice(0, 80));
    return;
  }

  const skip = throttled(alert.utterance);
  if (skip) {
    // Logged, never silent: an alert nobody receives and nobody knows was dropped is the same
    // failure in the other direction. The row is still written by the caller either way.
    console.warn(`[email] unanswered-request alert suppressed (${skip}):`, alert.utterance.slice(0, 80));
    return;
  }

  const recipients = adminEmails();
  if (recipients.length === 0) {
    console.warn('[email] ADMIN_EMAILS unset — no one to alert about an unanswered request.');
    return;
  }

  // A raw UUID in an alert is useless: knowing WHO asked is half of deciding whether to build it.
  // Fail-soft — an unidentified request is still worth mailing.
  let owner: string | null = null;
  if (alert.ownerUserId) {
    try {
      const { data } = await createServiceClient()
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', alert.ownerUserId)
        .maybeSingle();
      if (data) {
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        owner = name ? `${name} (${data.email})` : (data.email as string);
      }
    } catch {
      /* not worth failing an alert over */
    }
  }

  const sender = senderIdentityOrNull();
  const subject =
    alert.status === 'failed'
      ? `Kira task FAILED: “${truncate(alert.utterance, 60)}”`
      : `Kira was asked for something new: “${truncate(alert.utterance, 60)}”`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px 32px;">
          <p style="margin:0 0 20px 0;font-size:15px;color:#666;">${STATUS_LINE[alert.status]}</p>

          <!-- Their words, prominent and unedited. Everything else on this page is context. -->
          <p style="margin:0 0 20px 0;font-size:19px;line-height:1.5;color:#111;border-left:3px solid #E8998D;padding-left:16px;">
            “${escapeHtml(alert.utterance)}”
          </p>

          ${alert.reason ? `<p style="margin:0 0 12px 0;font-size:15px;color:#555;"><strong>Why it didn't happen:</strong> ${escapeHtml(alert.reason)}</p>` : ''}
          ${owner ? `<p style="margin:0 0 12px 0;font-size:14px;color:#888;">Asked by ${escapeHtml(owner)}</p>` : ''}

          <p style="margin:24px 0 0 0;">
            <a href="${APP_URL}/admin/asked-for" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
              See the build queue →
            </a>
          </p>

          <p style="margin:24px 0 0 0;font-size:13px;color:#999;line-height:1.6;">
            The owner has already been told, in the conversation, that Kira couldn't do this and has
            noted it. Nothing was promised to them beyond that.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    await createEmailSender({ sender }).send({
      replyTo: replyToAddress(),
      to: recipients,
      subject,
      html,
      // Operational, recipient-initiated in the sense that matters: it is our own alerting about our
      // own product, to our own operators. Identification footer, no unsubscribe.
      ...(sender ? { compliance: { transactional: true as const } } : {}),
    });
  } catch (error) {
    console.error('[email] unanswered-request alert failed (ignored):', error);
  }
}

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length <= n ? clean : `${clean.slice(0, n - 1)}…`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
