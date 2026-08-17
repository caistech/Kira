// lib/email/sender.ts
//
// Who Kira is, legally, when it contacts someone — resolved once and shared by everything that has
// to state it: the email identification footer (Spam Act pillar 2) and the unsubscribe page.
//
// The values come from EMAIL_SENDER_* (portfolio-manifest.yaml `shared:`, locked 2026-07-26), so
// Kira states the same entity as every other product in the portfolio rather than a local variant.
//
// The field mapping is @caistech/email-compliance's `senderFromEnv`, not a re-listing of the env
// vars. A second copy of that mapping is exactly the fork the @caistech-first rule exists to stop:
// add a field to the canonical identity and a hand-rolled copy silently keeps omitting it.
//
// The one thing we change is the failure mode. `senderFromEnv` THROWS when the vars are unset,
// which is right for a send path — a commercial email without identification is a breach, so it
// should not go out. It is wrong for a page render: refusing to show someone their unsubscribe
// confirmation because an operator forgot an env var punishes the recipient for our mistake. So
// callers that render take the soft form and lose a footer line; callers that send keep the throw.

import { senderFromEnv, type SenderIdentity } from '@caistech/email-compliance';

/**
 * The sender identity, or `undefined` if it isn't configured.
 *
 * Use where a missing identity should degrade the output, not fail the request. Warns loudly so
 * the gap is visible in logs rather than silently absent from every footer.
 */
export function senderIdentityOrNull(): SenderIdentity | undefined {
  try {
    return senderFromEnv();
  } catch {
    console.warn(
      '[email] EMAIL_SENDER_NAME / EMAIL_SENDER_EMAIL unset — rendering without the identification footer.',
    );
    return undefined;
  }
}

/**
 * Where a reply goes.
 *
 * WHY THIS EXISTS. Kira sends FROM `noreply@updates.corporateaisolutions.com`, because that
 * subdomain is the only one verified in Resend — the bare apex is not, and sending from it fails
 * silently at the provider. That is correct and cannot change without a paid Resend plan.
 *
 * But it means every email Kira sends arrives from an address that cannot receive one, and no
 * Reply-To was ever set — so an owner who replies is talking to nothing, and gets either a bounce
 * or silence. For THIS buyer that is not an edge case: he is sixty-something, he replies to email
 * rather than clicking through, and "yes, go ahead" or "what is this about?" is exactly what he
 * would send. Losing it is worse than losing a click, because he believes he has answered.
 *
 * So the FROM stays on the verified subdomain and the REPLY goes to a mailbox with a human behind
 * it — `EMAIL_SENDER_EMAIL`, the same reply-capable address already named in the Spam Act
 * identification footer. The two are deliberately different addresses doing different jobs;
 * collapsing them into one is what breaks sending.
 *
 * Returns undefined when the identity is unset, so a send degrades to today's behaviour rather
 * than throwing on a missing env var.
 */
export function replyToAddress(): string | undefined {
  return senderIdentityOrNull()?.email;
}

export type { SenderIdentity };

/**
 * Make an owner's business name safe to use as an email display name.
 *
 * ⚠️ THIS IS A HEADER INJECTION BOUNDARY, not a formatting nicety. The value is typed by the owner
 * into his business details and is about to be interpolated into a `From:` header. A carriage return
 * or line feed in it would let him append arbitrary headers — a Bcc to a third party being the
 * obvious one, on the single feature in this product that sends his business to another human.
 *
 * So: control characters removed outright, and the characters that carry meaning inside a header —
 * quotes, angle brackets, commas, semicolons and colons — removed rather than escaped. Escaping
 * would be correct RFC 5322 and one parser away from wrong; a business name does not need them.
 *
 * Returns an empty string when nothing usable survives, so the caller falls back to the plain
 * address rather than sending `" " <noreply@…>`.
 */
export function sanitiseDisplayName(raw: string): string {
  return String(raw ?? '')
    // Control characters, including CR and LF. This is the line that matters.
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    // ⚠️ WRITTEN WITH AN EDITOR. Appended through a shell heredoc, the backslash before the closing
    // bracket was eaten and this became an unterminated regex — caught by tsc, unlike the backspace
    // variant of the same mistake, which compiles and matches nothing.
    .replace(/["'<>,;:\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    // Long enough for any real trading name; short enough that the header stays sane.
    .slice(0, 64)
    .trim();
}
