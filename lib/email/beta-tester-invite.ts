// lib/email/beta-tester-invite.ts
//
// The email that hands a direct beta tester their login: email, generated password, and the login
// URL. Tx the frustration the ?code= path caused — this is the "your account is ready, go" moment.
//
// Sends through @caistech/email-send (verified sender + Spam Act identification footer). This is
// transactional — the account was created for them by an operator — so it carries identification
// but no unsubscribe. A plaintext password is a deliberate beta-program trade (Dennis approved):
// it gets the tester in with zero extra steps, and the product's forgot-password flow exists if
// they ever want to replace it.

import { createEmailSender } from '@caistech/email-send';

import { replyToAddress } from './sender';

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

export interface BetaTesterInviteParams {
  email: string;
  firstName: string | null;
  /** The generated beta-tester password. Handed over plaintext — beta program. */
  password: string;
  /** Full login URL, typically ${APP_URL}/login. */
  loginUrl: string;
}

export async function sendBetaTesterInvite({
  email,
  firstName,
  password,
  loginUrl,
}: BetaTesterInviteParams) {
  const first = firstName || 'there';
  const subject = 'Your Kira login is ready';

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
              <p style="font-size: 18px; color: #333; margin: 0 0 24px 0;">Hi ${first},</p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px 0;">
                Your Kira account is ready. Sign in below and you'll go straight to your Kira —
                no setup, no code.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="font-size: 13px; color: #888; margin: 0 0 12px 0;">Your sign-in details</p>
                    <p style="font-size: 15px; color: #333; margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
                    <p style="font-size: 15px; color: #333; margin: 0 0 0 0;"><strong>Password:</strong> ${password}</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #E8998D 0%, #D4847C 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 17px; font-weight: 600;">
                      Sign in to Kira →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #888; line-height: 1.6; margin: 28px 0 0 0;">
                If the button doesn't work, copy this into your browser:<br>
                ${loginUrl}
              </p>

              <p style="font-size: 14px; color: #888; line-height: 1.6; margin: 24px 0 0 0;">
                Questions? Just reply — a person reads it.
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
    to: email,
    subject,
    html,
    ...(sender ? { compliance: { transactional: true as const } } : {}),
  });
}