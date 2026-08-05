import { replyToAddress } from './sender';
// lib/email/trial-ending.ts
//
// The notice that goes out three days before each charge.
//
// Kira captures a card at signup and bills in ARREARS — the month is owed from day one and invoiced
// when the period closes (lib/billing/arrears.ts). Charging someone who has forgotten they signed up
// is how a subscription earns a chargeback and a bad review — so we tell them first, in plain terms,
// with the amount, the date, and a one-click way to cancel. This email is the reason card-on-file is
// a fair thing to do.
//
// It is NOT a trial-ending email. It once was, when the first month was free; the wording below was
// rewritten with the billing model rather than left describing a trial that no longer exists.
//
// Sending goes through @caistech/email-send (verified sender + Spam Act identification footer);
// the template stays here, because the voice is Kira's.

import { createEmailSender } from '@caistech/email-send';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

/**
 * Sender identity for the footer. Absent env, we send without the footer rather than fail a
 * billing notice the customer needs — but log it, because it is a compliance gap to close.
 */
function senderIdentity() {
  const name = process.env.EMAIL_SENDER_NAME;
  const email = process.env.EMAIL_SENDER_EMAIL;
  if (!name || !email) {
    console.warn(
      '[email] EMAIL_SENDER_NAME / EMAIL_SENDER_EMAIL unset — sending without the identification footer.',
    );
    return undefined;
  }
  return {
    name,
    email,
    abn: process.env.EMAIL_SENDER_ABN,
    postal: process.env.EMAIL_SENDER_POSTAL,
    phone: process.env.EMAIL_SENDER_PHONE,
  };
}

export interface TrialEndingEmailParams {
  userEmail: string;
  userName: string;
  /** Monthly amount in major units (e.g. 499 for $499). */
  monthlyAmount: number;
  currencyCode: string;
  /** When this period's payment will be taken — the day the period closes. */
  chargeDate: Date;
}

function formatAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${Math.round(amount)}`;
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export async function sendTrialEndingEmail({
  userEmail,
  userName,
  monthlyAmount,
  currencyCode,
  chargeDate,
}: TrialEndingEmailParams) {
  const firstName = (userName || '').split(' ')[0] || 'there';
  const amount = formatAmount(monthlyAmount, currencyCode);
  const when = formatDate(chargeDate);
  const settingsUrl = `${APP_URL}/settings`;

  const subject = `Your Kira payment of ${amount} is due ${when}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your next Kira payment</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">

          <tr>
            <td style="padding: 40px 40px 24px 40px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 24px 0;">Hi ${firstName},</p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px 0;">
                Your month with Kira finishes on <strong>${when}</strong>. On that day we'll take
                <strong>${amount}</strong> from the card you added when you signed up — that covers the
                month just gone, not the one ahead.
              </p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px 0;">
                Nothing changes on your side — Kira keeps everything she's learned about your business
                and carries straight on.
              </p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 32px 0;">
                If Kira isn't for you, cancel before ${when} and the month you're in is on us — no
                payment, no proration, nothing to argue about. It takes one click.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${settingsUrl}" style="display: inline-block; background: linear-gradient(135deg, #E8998D 0%, #D4847C 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 17px; font-weight: 600;">
                      Manage or cancel →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; color: #888; line-height: 1.6; margin: 32px 0 0 0;">
                Questions about the amount or the date? Just reply to this email — a person reads it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const sender = senderIdentity();

  return createEmailSender({ sender }).send({
    replyTo: replyToAddress(),
    to: userEmail,
    subject,
    html,
    // Transactional: this is a billing notice about a subscription they started, so it carries the
    // identification footer but no unsubscribe (you can't opt out of being told you're about to
    // be charged — you opt out by cancelling).
    ...(sender ? { compliance: { transactional: true as const } } : {}),
  });
}
