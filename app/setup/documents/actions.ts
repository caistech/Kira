'use server';

// "My documents are somewhere else."
//
// WHY THIS IS A FIRST-CLASS OPTION AND NOT A DEAD END. A large slice of this ICP is on bigpond or
// optusnet with their quotes on a desktop, a USB stick, Dropbox, or a shared drive in the office.
// Before this existed, /setup/drive assumed Google and those owners had no path at all — they simply
// left, and we learned nothing.
//
// It is also the demand-capture mechanism `docs/CONNECTOR_POLICY.md` §A asks for. The gate there is
// that a connector ships only when it "appears in a captured ask — a real owner asked for it, in his
// own words, and we have the row", and the policy calls refusals "measured demand with a timestamp
// … the highest-quality backlog we have". This is how Dropbox earns its place in the queue instead of
// being guessed at.
//
// It reuses `sendUnansweredRequestAlert` rather than inventing a store: same shape (a real person hit
// something we cannot do, in their own words, mailed to whoever can act on it), already throttled by
// utterance, already fail-soft. A new table would be a second backlog nobody visits.

import { getCurrentAppUser } from '@/lib/auth';
import { sendUnansweredRequestAlert } from '@/lib/email/unanswered-request';

export interface OtherProviderState {
  ok?: boolean;
  error?: string;
}

export async function recordOtherProvider(
  _prev: OtherProviderState | null,
  formData: FormData,
): Promise<OtherProviderState> {
  const user = await getCurrentAppUser();
  if (!user?.id) return { error: 'You are not signed in.' };

  const where = String(formData.get('where') || '').trim();
  if (!where) return { error: 'Tell us where your documents live and we will look into it.' };
  if (where.length > 500) return { error: 'That is longer than we need — a sentence is plenty.' };

  // Fail-soft, like every other caller: the alert is the least important thing happening to this
  // owner right now, and a mail hiccup must not turn "thanks, noted" into an error he cannot act on.
  // He is told it is noted either way, because it IS noted — the failure would be ours to chase.
  await sendUnansweredRequestAlert({
    // His words verbatim. The phrasing is the specification, and it is what makes three of these in a
    // week legible as one decision rather than three anecdotes.
    utterance: `Documents are not in Google Drive or OneDrive: ${where}`,
    reason: 'Owner chose "somewhere else" at /setup/documents',
    ownerUserId: user.id as string,
    status: 'unsupported',
  });

  return { ok: true };
}
