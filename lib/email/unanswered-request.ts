// lib/email/unanswered-request.ts
//
// The operator alert when an owner asks Kira for something she cannot do.
//
// Same shape as a SayFix report: something a real person hit, in their own words, mailed to whoever
// can act on it, the moment it happens. The `unsupported` rows were already being written and read
// by nobody - a build queue you have to remember to visit is a build queue that goes stale, and the
// whole value of the signal is that it is fresh. One ask is noise; the same ask three times in a
// week is a decision, and you only notice the pattern if each one reaches you.
//
// TO THE OPERATOR, NEVER THE OWNER. He is not told that his request became a ticket; he was already
// told, in the conversation, that Kira could not do it and had noted it. Mailing him again would
// turn a graceful refusal into a paper trail of the product's gaps.
//
// FAIL-SOFT, ALWAYS. This is called from inside a live voice call. An SMTP hiccup must never break
// a conversation an owner is having - the alert is the least important thing happening at that
// moment. Every failure is logged and swallowed.
//
// PERSISTENCE PATH. The durable throttle and owner enrichment now proxy through Orchestrator rather
// than reaching for the service-role key directly. The in-memory fallback remains in Kira for
// resilience. The exported interface is unchanged — callers do not know the persistence path moved.

import { createHash } from 'node:crypto';

import { createEmailSender } from '@caistech/email-send';

import { adminEmails } from '@/lib/auth';
import { senderIdentityOrNull, replyToAddress } from './sender';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';
const ORCH_URL = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
const ORCH_SECRET = process.env.ORCHESTRATOR_WEBHOOK_SECRET || '';

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
const RETENTION_MS = 24 * 60 * 60_000;
const recentUtterances = new Map<string, number>();
let windowStart = 0;
let sentInWindow = 0;

export interface UnansweredRequestAlert {
  /** What the owner actually said. The phrasing is the specification. */
  utterance: string;
  /** The classifier's stated reason, when it gave one. */
  reason?: string | null;
  /** The owner's user id. Resolved to a name/email here - a UUID in an alert tells you nothing. */
  ownerUserId?: string | null;
  /** 'unsupported' (we never could) or 'failed' (we should have and didn't). */
  status: 'unsupported' | 'failed';
}

const STATUS_LINE: Record<UnansweredRequestAlert['status'], string> = {
  unsupported: 'Kira could not do this - it is outside what her team can reach today.',
  failed: 'Kira tried this and it failed. She should have been able to do it, so this is a bug.',
};

/** Normalised, hashed. The raw text is already stored on the task row; this table only needs identity. */
function utteranceKey(utterance: string): string {
  return createHash('sha256').update(utterance.trim().toLowerCase().slice(0, 500)).digest('hex');
}

/**
 * In-memory fallback throttle (degraded mode when Orchestrator is unavailable).
 * Per-instance, so it resets on cold start. Accepted: blast-radius reducer, not access control.
 */
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
 * Call Orchestrator's authoritative throttle.
 * Returns a skip reason when throttled, null when allowed to send.
 * Throws only on config/transport errors so the caller falls back to the in-memory limiter.
 */
async function claimThrottleDurable(utterance: string): Promise<string | null> {
  if (!ORCH_URL || !ORCH_SECRET) {
    throw new Error('ORCHESTRATOR_URL / ORCHESTRATOR_WEBHOOK_SECRET not configured');
  }
  const res = await fetch(`${ORCH_URL}/api/v1/kira/email/alert-throttle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-orchestrator-secret': ORCH_SECRET,
    },
    body: JSON.stringify({ utterance }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error');
    throw new Error(`Orchestrator throttle claim failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const result = await res.json();
  return result.allowed ? null : (result.reason ?? 'throttled');
}

/**
 * Call Orchestrator for owner enrichment.
 * Fail-soft: returns null on any error (missing user, DB down, etc.).
 */
async function resolveOwnerDurable(userId: string): Promise<string | null> {
  if (!ORCH_URL || !ORCH_SECRET) return null;
  try {
    const res = await fetch(`${ORCH_URL}/api/v1/kira/email/alert-owner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-orchestrator-secret': ORCH_SECRET,
      },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const result = await res.json();
    return result.owner ?? null;
  } catch {
    return null;
  }
}

/** Is this our own CI probe rather than a person? */
export function isAutomatedProbe(utterance: string): boolean {
  return /portfolio-gate/i.test(utterance);
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendUnansweredRequestAlert(alert: UnansweredRequestAlert): Promise<void> {
  if (isAutomatedProbe(alert.utterance)) {
    console.info('[email] unanswered-request alert suppressed (our own CI probe):', alert.utterance.slice(0, 80));
    return;
  }

  // Durable first, in-memory only if Orchestrator cannot answer.
  let skip: string | null;
  try {
    skip = await claimThrottleDurable(alert.utterance);
  } catch (error) {
    console.warn('[email] durable throttle unavailable, falling back to in-memory:', error);
    skip = throttled(alert.utterance);
  }
  if (skip) {
    console.warn(`[email] unanswered-request alert suppressed (${skip}):`, alert.utterance.slice(0, 80));
    return;
  }

  const recipients = adminEmails();
  if (recipients.length === 0) {
    console.warn('[email] ADMIN_EMAILS unset - no one to alert about an unanswered request.');
    return;
  }

  // A raw UUID in an alert is useless: knowing WHO asked is half of deciding whether to build it.
  // Fail-soft - an unidentified request is still worth mailing.
  let owner: string | null = null;
  if (alert.ownerUserId) {
    owner = await resolveOwnerDurable(alert.ownerUserId);
  }

  const sender = senderIdentityOrNull();
  const subject =
    alert.status === 'failed'
      ? `Kira task FAILED: "${truncate(alert.utterance, 60)}"`
      : `Kira was asked for something new: "${truncate(alert.utterance, 60)}"`;

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
            "${escapeHtml(alert.utterance)}"
          </p>

          ${alert.reason ? `<p style="margin:0 0 12px 0;font-size:15px;color:#555;"><strong>Why it didn't happen:</strong> ${escapeHtml(alert.reason)}</p>` : ''}
          ${owner ? `<p style="margin:0 0 12px 0;font-size:14px;color:#888;">Asked by ${escapeHtml(owner)}</p>` : ''}

          <p style="margin:24px 0 0 0;">
            <a href="${APP_URL}/admin/asked-for" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
              See the build queue 
            </a>
          </p>

          <p style="margin:24px 0 0 0;font-size:13px;color:#999;line-height:1.6;">
            The owner has already been told, in the conversation, that Kira could not do this.
            This email is for the operator only - please do not forward it to the owner.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  try {
    await createEmailSender({ sender }).send({
      to: recipients,
      subject,
      html,
      replyTo: replyToAddress(),
      // Operational, recipient-initiated in the sense that matters: our own alerting about our
      // own product, to our own operators. Identification footer, no unsubscribe.
      ...(sender ? { compliance: { transactional: true as const } } : {}),
    });
  } catch (error) {
    console.error('[email] unanswered-request alert failed (ignored):', error);
  }
}