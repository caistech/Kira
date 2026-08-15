import { replyToAddress } from './sender';
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

import { assertNotHalted } from '@/lib/kill-switch';
import { senderIdentityOrNull as senderIdentity } from '@/lib/email/sender';
import type { ConsentBasis } from '@caistech/email-compliance';
import { suppressionStore, unsubscribeUrl } from '@/lib/email/suppressions';

export interface CommercialEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /**
   * The consent basis STATED TO THE READER in the footer. Defaults to `express`.
   *
   * ⚠️ `express` IS NOT TRUE FOR EVERY COMMERCIAL SEND, and it was hard-coded here until a beta
   * invitation needed sending. The justification below — "everyone with an account ticked the terms
   * box at signup" — is sound for people who HAVE an account, and it is exactly wrong for the one
   * case where we write to someone who does not: an invitation. That reader ticked nothing.
   *
   * For a cold-but-legitimate invitation the basis is `inferred`: a conspicuously-published business
   * address, messaged about the function it is published for. That is a real basis under the Spam
   * Act and it is a different sentence in the footer, so telling the reader the wrong one is not a
   * technicality — it is a claim about how we got his address, made to the person who would know.
   */
  reason?: ConsentBasis;
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
  // The kill switch, checked before anything leaves. Commercial email is the one path where the
  // damage is unrecoverable and scales — one bad template times every recipient, under our ABN, at
  // whatever hour the cron runs. Refusing to send is always recoverable; an unsend does not exist.
  // Throws rather than returning quietly: a caller in a loop must stop, not skip one and continue.
  await assertNotHalted('outbound_email');

  const sender = senderIdentity();
  const sendEmail = createEmailSender({ sender, suppressions: suppressionStore() });

  return sendEmail.send({
    replyTo: replyToAddress(),
    to: params.to,
    subject: params.subject,
    html: params.html,
    ...(params.text ? { text: params.text } : {}),
    compliance: {
      unsubscribeUrl: await unsubscribeUrl(params.to),
      reason: params.reason ?? 'express',
      ...(sender ? { sender } : {}),
    },
  });
}
