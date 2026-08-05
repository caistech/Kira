import { replyToAddress } from './sender';
// lib/email/introducer-invite.ts
//
// The email that opens the channel: a broker's sign-in link plus the referral link they send to
// owners.
//
// Written to be forwarded and acted on in a minute — a broker skims this between meetings. Both
// links are in the body as text as well as buttons, because a broker will paste the referral link
// into their own email to a client rather than use anything we build for them.
//
// Sends through @caistech/email-send (verified sender + Spam Act identification footer). This is
// transactional: they asked to join the channel, so it carries identification but no unsubscribe.

import { createEmailSender } from '@caistech/email-send';

import { COMMISSION_RATE_PCT, commissionRange } from '@/lib/introducer/disclosure';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

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

export interface IntroducerInviteParams {
  introducerEmail: string;
  introducerName: string | null;
  /** One-time sign-in URL from issueMagicLink(). Good for 7 days. */
  signInUrl: string;
  /** The permanent /r/<token> link they send to owners. */
  referralUrl: string;
  /** True when this is a re-send rather than a first invitation. */
  resend?: boolean;
}

export async function sendIntroducerInvite({
  introducerEmail,
  introducerName,
  signInUrl,
  referralUrl,
  resend = false,
}: IntroducerInviteParams) {
  const firstName = (introducerName || '').split(' ')[0] || 'there';
  const subject = resend ? 'Your Kira sign-in link' : 'Your Kira introducer link';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 24px 0;">Hi ${firstName},</p>

              ${
                resend
                  ? `<p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px 0;">
                       Here's a fresh sign-in link for your Kira introducer dashboard. It works for
                       seven days.
                     </p>`
                  : `<p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px 0;">
                       You're set up as an introducer for Kira. Two links below: one to send owners,
                       one to see how they're getting on.
                     </p>`
              }

              <h2 style="font-size: 16px; color: #333; margin: 32px 0 8px 0;">Your link to send owners</h2>
              <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 12px 0;">
                Paste this into your own email or message. Anyone who opens it is recorded as your
                introduction — and stays yours, even if they come back weeks later through a
                different route.
              </p>
              <p style="margin: 0 0 28px 0; padding: 14px 16px; background: #f6f7f9; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; color: #333; word-break: break-all;">
                ${referralUrl}
              </p>

              <h2 style="font-size: 16px; color: #333; margin: 0 0 8px 0;">What you're paid, and what you tell them</h2>
              <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 12px 0;">
                ${COMMISSION_RATE_PCT}% of what an owner pays, every month, for as long as they stay
                — currently ${commissionRange().text} a month depending on their price band. Nothing
                is paid during their free month.
              </p>
              <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 28px 0;">
                You need to tell the owner that in writing when you introduce us. We've written the
                wording for you — it's on your dashboard, next to your link. If you audit or review
                an owner, we can't pay you for introducing them; tell us and we'll switch the fee off.
              </p>

              <h2 style="font-size: 16px; color: #333; margin: 0 0 8px 0;">Your dashboard</h2>
              <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 16px 0;">
                See who's opened your link, who's signed up, and how their business valuation is
                moving. You'll see their progress — never their conversations with Kira.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${signInUrl}" style="display: inline-block; background: linear-gradient(135deg, #E8998D 0%, #D4847C 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 17px; font-weight: 600;">
                      Open your dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #888; line-height: 1.6; margin: 28px 0 0 0; word-break: break-all;">
                If the button doesn't work, paste this into your browser — it's good for seven days:<br>
                ${signInUrl}
              </p>

              <p style="font-size: 14px; color: #888; line-height: 1.6; margin: 24px 0 0 0;">
                Questions about how the arrangement works? Just reply — a person reads it.
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
    to: introducerEmail,
    subject,
    html,
    ...(sender ? { compliance: { transactional: true as const } } : {}),
  });
}
