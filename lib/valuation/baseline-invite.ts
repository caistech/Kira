// lib/valuation/baseline-invite.ts
//
// Should this account be invited to set a valuation baseline?
//
// Pulled out of the dashboard because it looks like a one-line condition and is actually two
// decisions, either of which reads as tidy-uppable to the next person: a personal-journey owner must
// NOT be asked, and a brand-new account with nothing on it MUST be.

/** Only the field the decision turns on — so a caller passes rows it already has. */
export interface JourneyBearing {
  journey_type?: unknown;
}

/**
 * @param agents the account's Kira agents (any status the caller considers live)
 *
 * WHY A PERSONAL-JOURNEY OWNER IS EXCLUDED. He came for a thinking partner. Asking him what his
 * business turns over is not merely irrelevant — it is a confident question about something that may
 * not exist, which is the specific way a product tells someone it has not been listening.
 *
 * WHY AN EMPTY ACCOUNT IS INCLUDED. That is the case this whole path exists for: someone who signed
 * up on a broker's word without ever running the eleven questions has no valuation AND no agent yet.
 * Excluding "no agents" as unknown-intent would silently skip exactly the person being rescued.
 */
export function shouldInviteBaseline(agents: readonly JourneyBearing[]): boolean {
  if (agents.length === 0) return true;
  return agents.some((a) => a.journey_type === 'business');
}
