'use server';

// The acceptance write.
//
// Identity comes from the SESSION COOKIE, resolved server-side — never from anything the form
// submits. A server action is a callable endpoint, so an introducer id in the payload would let
// anyone record an acceptance against anyone.

import { cookies } from 'next/headers';

import { INTRODUCER_SESSION_COOKIE, acceptUndertaking, getIntroducerFromSession } from '@/lib/introducer';

export interface AcceptResult {
  ok: boolean;
  message: string;
}

export async function accept(formData: FormData): Promise<AcceptResult> {
  // The checkbox is the acceptance. Without it there is nothing to record — and no partial
  // "they clicked through" state, which would be worse than no record at all.
  if (formData.get('confirmed') !== 'on') {
    return { ok: false, message: 'Tick the box to continue.' };
  }

  const token = (await cookies()).get(INTRODUCER_SESSION_COOKIE)?.value;
  const introducer = await getIntroducerFromSession(token);
  if (!introducer) {
    return { ok: false, message: 'Your sign-in link has expired. Ask for a fresh one.' };
  }

  // Who we pay, captured on the same screen as the acceptance. The ABN is only ever the one the
  // ABR lookup returned; anything else is dropped rather than stored as if it were verified.
  const payeeType = formData.get('payee_type') === 'entity' ? 'entity' : 'individual';
  const orgName = String(formData.get('org_name') || '').trim();
  const abnDigits = String(formData.get('org_abn') || '').replace(/\D/g, '');

  if (payeeType === 'entity' && !orgName) {
    return { ok: false, message: 'Add the firm we should pay, or choose to be paid personally.' };
  }

  try {
    await acceptUndertaking(introducer.id, {
      payeeType,
      orgName: orgName || undefined,
      orgAbn: /^\d{11}$/.test(abnDigits) ? abnDigits : undefined,
    });
    return { ok: true, message: 'Thanks — you’re all set.' };
  } catch (error) {
    console.error('[introducer/terms] acceptance not recorded:', error);
    // Do NOT let them through on a failed write: an unrecorded acceptance is the exact thing this
    // page exists to prevent.
    return { ok: false, message: 'Could not save that. Try again in a moment.' };
  }
}
