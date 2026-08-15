// lib/onboarding/gate.ts
//
// WHAT THE OWNER STILL OWES US, decided in one place.
//
// THE SHAPE THIS REPLACES. `/dashboard` used to eject an account with no agent and no valuation:
// `if (user && list.length === 0 && !valuation) redirect('/start?journey=business&from=app')`. So a
// brand-new owner — paid or beta — never saw the page he was sent to. He was bounced to a
// differently-styled page mid-onboarding, and both entry paths hard-coded that same destination,
// which meant the ROUTE decided what he saw rather than his STATE.
//
// The operator's specification, twice: "/dashboard gates on state, not on path. No genome → the
// questions. No onboarding → the company/ABN/address step. Both done → the real dashboard."
//
// ⚠️ RENDER IN PLACE, NEVER REDIRECT, and that is the whole structural point. A redirect chain over
// four conditions is how this codebase produced a thirteen-hop loop once already (see the note in
// app/setup/layout.tsx) and a locked door a real customer could not pass (Shah Hussain, 2026-08-06).
// A function that returns WHICH STEP IS OUTSTANDING cannot loop: it is evaluated once per render and
// the caller draws the answer inside the shell it already has. It also fixes the styling complaint
// for free — one destination, one chrome, and the differences are content.
//
// ⚠️ THE GATE IS DELIBERATELY NOT `canSend`. The obvious identity check is the one the sender uses,
// and it requires an 11-digit ABN and an Australian state — which is a door with no key for any
// owner outside Australia, and is exactly the redirect that trapped a real customer in August. The
// gate asks the weaker, answerable question: HAS HE DONE THE STEP AT ALL. Whether what he entered is
// enough to send commercial email is a separate judgement, made by the sender, surfaced on the
// dashboard as a prompt he can read and carry on past.

export type OnboardingStep = 'baseline' | 'identity' | 'agent' | null;

export interface GateState {
  /** A `business_valuations` row exists — the origin every later movement is measured from. */
  hasBaseline: boolean;
  /** A `business_identity` row exists with an entity name on it. NOT "can he send email". */
  hasIdentity: boolean;
  /** At least one live agent. Nothing works before this. */
  hasAgent: boolean;
}

/**
 * The next thing outstanding, or null when he is through.
 *
 * ORDER IS THE OPERATOR'S, and each position earns itself:
 *
 *   1. BASELINE first, because it is why a valuation-first owner came and because it is the origin
 *      every later number is measured against. Taken late it is no longer a baseline — it would
 *      record where he got to rather than where he started.
 *   2. IDENTITY second. It is about Kira SENDING as him, not about the Genome, so it does not gate
 *      the thing he came for. It comes before the agent because the brief is a conversation about
 *      his business and asking "what is the business called" afterwards reads as not having listened.
 *   3. AGENT last, because it is the only step that cannot be done in a form — and because the two
 *      above are what she is briefed FROM.
 *
 * ⚠️ SCOPED TO WHAT IS ABSENT, never to what is out of date. An owner who ran the questions in July
 * has a baseline and must never be walled behind a newer version of them: the gate exists to stop an
 * empty account reaching a dashboard that reports on nothing, not to re-onboard people who are
 * already inside. Adding "…or their answers predate X" here would trap every existing customer.
 */
export function nextOnboardingStep(state: GateState): OnboardingStep {
  if (!state.hasBaseline) return 'baseline';
  if (!state.hasIdentity) return 'identity';
  if (!state.hasAgent) return 'agent';
  return null;
}

/**
 * How far through he is, for the progress line.
 *
 * Derived from the same state rather than counted separately, so the two cannot disagree — a
 * "step 2 of 3" that does not match the step being shown is worse than no progress indicator.
 */
export function onboardingProgress(state: GateState): { done: number; total: number } {
  const done = [state.hasBaseline, state.hasIdentity, state.hasAgent].filter(Boolean).length;
  return { done, total: 3 };
}
