// lib/kira/start-framing.ts
//
// WHO SENT HIM TO /start, AND THEREFORE WHAT IT SHOULD SAY.
//
// Extracted from the component because it is the part that can be wrong in a way a person notices,
// and `/start` is behind auth — so a browser check needs a real session and does not run in CI. A
// pure function is assertable in a millisecond and cannot drift from the thing that ships, which is
// the same reason `@caistech/elevenlabs-convai` exports `shouldUseTextFallback` rather than burying
// it in the widget.
//
// THE DEFECT THIS ENDS. There was ONE flag, `from=paid`, doing two jobs: choosing the framing AND
// choosing where the back-link goes. The dashboard's recovery route needed the second and not the
// first, so it passed `from=paid` and a man who had been using the product for months, pressing
// "Talk to Kira", was greeted with "Last step — let's set up your Kira. About three minutes."
//
// The two files had drifted into contradicting each other in the tree: `app/start/page.tsx` said
// `from=paid` meant "rather than arriving by a dashboard fallback", and `app/dashboard/page.tsx`
// described its own branch as "the recovery route" while passing exactly that flag.

export interface StartFraming {
  /** He has just paid and is being set up. Only this arrival is told it is the last step. */
  isPaidArrival: boolean;
  /**
   * He came from inside the product, by either route. Drives the back-link: a signed-in owner sent
   * "Back to home" lands on the marketing landing page, which is the shop window he already walked
   * through.
   */
  cameFromApp: boolean;
}

/**
 * Resolve the framing from the `from` query parameter.
 *
 * Unknown and absent values are treated identically and mean "a visitor" — the conservative
 * direction, because the failure it avoids is claiming someone has paid when we do not know that.
 * The opposite default would put "Last step — let's set up your Kira" in front of a stranger.
 */
export function startFraming(from: string | null | undefined): StartFraming {
  const isPaidArrival = from === 'paid';
  return {
    isPaidArrival,
    cameFromApp: isPaidArrival || from === 'app',
  };
}
