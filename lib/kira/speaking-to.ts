// lib/kira/speaking-to.ts
// The consequence half of the disclosure gate — see lib/kira/speaking-to-def.mjs for why it exists.
//
// One helper, called at the top of every route on the disclosure surface, so the rule has ONE
// implementation. The alternative — each route deciding for itself — is how a boundary ends up
// enforced on four tools out of five, with the fifth being the one somebody uses.

import { SOMEONE_ELSE, SPEAKING_TO_PARAM } from '@/lib/kira/speaking-to-def.mjs';

/**
 * What she says when the person at the keyboard is not the owner.
 *
 * Deliberately shaped as the ok:false contract she already follows everywhere else ("say the message
 * it returns, as written"), so no new behaviour has to be taught for her to handle it — and so she
 * cannot report it as "nothing found", which would tell a stranger the business has no open work.
 */
const REFUSAL_MESSAGE =
  'Not shown — you are not speaking with the account holder. Say that you can only go through this ' +
  'with him directly, and that he can pick it up whenever he is back. Do not describe what is in ' +
  'here, and do not say it is empty.';

/**
 * Should this disclosure be refused?
 *
 * Absent or unrecognised values mean the account holder, deliberately. The expensive error here is
 * the false positive: refusing the real owner his own outstanding work — because a path forgot to
 * pass the parameter, or the model answered with something unexpected — makes her useless at the
 * moment he needs her, and he is not the sort to complain about it. He closes the tab.
 *
 * @param body the parsed tool-call body
 */
export function refuseThirdPartyDisclosure(body: unknown): Response | null {
  const value = String((body as Record<string, unknown> | null)?.[SPEAKING_TO_PARAM] ?? '').trim();
  if (value !== SOMEONE_ELSE) return null;

  // 200, not 403. The tool did not error — it declined, and she needs to read the message and say
  // it. A non-2xx here would surface to her as a broken tool, and "something went wrong" is exactly
  // the wrong thing to tell someone who has just claimed to be the owner's colleague.
  return Response.json({ ok: false, message: REFUSAL_MESSAGE }, { status: 200 });
}
