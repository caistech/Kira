// lib/email/commercial.ts
//
// The send path for COMMERCIAL email — anything the recipient didn't ask for right now: a
// re-engagement nudge, a product update, a campaign.
//
// Everything the Spam Act requires, in one call, so no send site has to remember it:
//   - the identification footer (pillar 2),
//   - a WORKING unsubscribe link + List-Unsubscribe headers (pillar 3),
//   - and a hard skip if the recipient is on the suppression list.
//
// Transactional mail (receipts, password resets, "your card is about to be charged") does NOT come
// through here. You do not opt out of those, and giving them an unsubscribe link would be
// misleading about what happens if you click it.

import { createEmailSender } from '@caistech/email-send';

import { suppressionStore, unsubscribeUrl } from '@/lib/email/suppressions';

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

export interface CommercialEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface CommercialSendResult {
  id: string | null;
  /** True when the send was skipped because the recipient has unsubscribed. */
  suppressed?: boolean;
}

/**
 * Send a commercial email, or skip it if the recipient has opted out.
 *
 * Consent basis is `express`: everyone with an account ticked the terms box at signup, which says
 * in terms that we email them about Kira. That is what makes this defensible — and why the
 * checkbox is required and unticked by default.
 */
export async function sendCommercialEmail(
  params: CommercialEmailParams,
): Promise<CommercialSendResult> {
  const sender = senderIdentity();
  const sendEmail = createEmailSender({ sender, suppressions: suppressionStore() });

  return sendEmail.send({
    to: params.to,
    subject: params.subject,
    html: params.html,
    ...(params.text ? { text: params.text } : {}),
    compliance: {
      unsubscribeUrl: await unsubscribeUrl(params.to),
      reason: 'express',
      ...(sender ? { sender } : {}),
    },
  });
}
