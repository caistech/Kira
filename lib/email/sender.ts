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

export type { SenderIdentity };
