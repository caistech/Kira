// lib/email/redteam-drift.ts
//
// The operator alert when a boundary stops holding — or when nothing is checking whether it does.
//
// Same shape and same reasoning as the unanswered-request alert: something happened that only
// matters if it reaches a person, mailed to whoever can act on it. The difference is what the
// silence costs. An unread build-queue row is a missed feature; an unread breach is Kira being
// talked into acting on an approval that never happened, on a real owner's business, with the
// /admin/trust page still showing a comfortable percentage because nobody opened it.
//
// ONE EMAIL, ALL THE FINDINGS. Four separate mails for one bad morning is how a channel gets
// filtered, and the findings are usually related — a run that died explains an attack that appears
// to have stopped being tested.
//
// FAIL-SOFT is deliberately NOT the posture here. The caller (the cron route) needs to know whether
// the alert actually went out, because a send that failed silently leaves the claim recorded and the
// operator uninformed — the one state worse than not alerting at all is believing you did.

import { createEmailSender } from '@caistech/email-send';

import { adminEmails } from '@/lib/auth';
import type { DriftFinding } from '@/lib/kira/redteam-drift';

import { senderIdentityOrNull, replyToAddress } from './sender';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

/** How urgent each kind reads, in the subject line where it has one line to land. */
const KIND_PREFIX: Record<DriftFinding['kind'], string> = {
  'first-breach': 'BREACH',
  decline: 'Weakening',
  died: 'Run died',
  blind: 'Nothing tested',
  silence: 'Not running',
};

/**
 * Mail the operator about drift. Throws if the send fails — see the header.
 *
 * @returns the addresses it went to, or null when there is nobody configured to tell.
 */
export async function sendRedTeamDriftAlert(findings: DriftFinding[]): Promise<string[] | null> {
  if (findings.length === 0) return null;

  const recipients = adminEmails();
  if (recipients.length === 0) {
    console.warn('[email] ADMIN_EMAILS unset — a red-team drift finding has nobody to go to.');
    return null;
  }

  // The most serious thing first, because a subject line is one line. A breach outranks a suite that
  // tested nothing, which outranks one that has not run at all, which outranks a gradual decline.
  //
  // A Record rather than an array of kinds, which is what this was and which looks equivalent: a kind
  // missing from an array scores -1 from indexOf and therefore sorts FIRST, handing the subject line
  // to whichever finding nobody had thought about. As a Record the compiler demands a rank when a
  // kind is added — which is how `blind` came to be here rather than being discovered in an email.
  const RANK: Record<DriftFinding['kind'], number> = {
    'first-breach': 0,
    died: 1,
    blind: 2,
    silence: 3,
    decline: 4,
  };
  const sorted = [...findings].sort((a, b) => RANK[a.kind] - RANK[b.kind]);
  const lead = sorted[0];

  const subject =
    sorted.length === 1
      ? `Kira red team — ${KIND_PREFIX[lead.kind]}: ${truncate(lead.headline, 70)}`
      : `Kira red team — ${KIND_PREFIX[lead.kind]} and ${sorted.length - 1} other finding${
          sorted.length > 2 ? 's' : ''
        }`;

  const items = sorted
    .map(
      (f) => `
          <tr><td style="padding:0 0 20px 0;">
            <p style="margin:0 0 6px 0;font-size:17px;line-height:1.4;color:#111;font-weight:600;">
              ${escapeHtml(f.headline)}
            </p>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#555;">${escapeHtml(f.detail)}</p>
          </td></tr>`,
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px;">
          <p style="margin:0 0 24px 0;font-size:15px;color:#666;">
            The red team tests whether Kira can be talked past her own boundaries. Something has
            changed that a single run cannot show.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">${items}</table>

          <p style="margin:8px 0 0 0;">
            <a href="${APP_URL}/admin/trust" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
              Open the trust record →
            </a>
          </p>

          <p style="margin:24px 0 0 0;font-size:13px;color:#999;line-height:1.6;">
            You are told once per finding. A problem that persists will not mail again; a problem
            that gets worse will. Nothing here fires on a single flaky breach — the suite is
            non-deterministic by nature, so only a change against an attack's own history counts.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const sender = senderIdentityOrNull();
  await createEmailSender({ sender }).send({
    replyTo: replyToAddress(),
    to: recipients,
    subject,
    html,
    // Our own alerting, about our own product, to our own operators. Identification footer, no
    // unsubscribe — there is nothing here to opt out of that is not just switching off the alarm.
    ...(sender ? { compliance: { transactional: true as const } } : {}),
  });

  return recipients;
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
