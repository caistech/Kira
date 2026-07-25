'use server';

// app/admin/(panel)/introducers/actions.ts
//
// Operator actions for the introducer channel: add a broker, send them their links, suspend or
// restore access.
//
// Every action re-checks isCurrentUserAdmin() itself. The layout and middleware already gate
// /admin, but a server action is a callable endpoint — it is reachable by anyone who can construct
// the request, not only by someone who rendered the page. Guarding only the page would leave these
// open.

import { randomBytes } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { isCurrentUserAdmin } from '@/lib/auth';
import { sendIntroducerInvite } from '@/lib/email/introducer-invite';
import { issueMagicLink } from '@/lib/introducer';
import { createServiceClient } from '@/lib/supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function assertAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error('Not authorised');
}

/** A short, unambiguous referral token. No 0/O/1/l — brokers read these aloud and retype them. */
function referralToken(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

/**
 * Add an introducer and send them their links in one step.
 *
 * One step on purpose: an introducer row with no invite sent is a broker who thinks they're set up
 * and isn't. If the email fails, the row is still created and the operator is told to re-send —
 * losing the record because a mail server was down would be worse.
 */
export async function addIntroducer(formData: FormData): Promise<ActionResult> {
  await assertAdmin();

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const name = String(formData.get('name') || '').trim();
  const orgName = String(formData.get('org_name') || '').trim();
  const orgAbn = String(formData.get('org_abn') || '').trim();
  const payeeType = String(formData.get('payee_type') || 'individual');
  const role = String(formData.get('role') || 'introducer');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('introducers')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return { ok: false, message: 'That email is already an introducer — use Re-send instead.' };
  }

  const token = referralToken();
  const { data: introducer, error } = await supabase
    .from('introducers')
    .insert({
      email,
      name: name || null,
      org_name: orgName || null,
      org_abn: orgAbn || null,
      payee_type: payeeType === 'entity' ? 'entity' : 'individual',
      // The payee defaults to whichever party was named; the operator can refine it later.
      payee_name: (payeeType === 'entity' ? orgName : name) || null,
      role: role === 'broker' ? 'broker' : 'introducer',
      referral_token: token,
    })
    .select('id, email, name, referral_token')
    .single();

  if (error || !introducer) {
    return { ok: false, message: `Could not add them: ${error?.message ?? 'unknown error'}` };
  }

  revalidatePath('/admin/introducers');

  try {
    const { url } = await issueMagicLink(introducer.id);
    await sendIntroducerInvite({
      introducerEmail: introducer.email,
      introducerName: introducer.name,
      signInUrl: url,
      referralUrl: `${APP_URL}/r/${introducer.referral_token}`,
    });
  } catch (sendError) {
    console.error('[admin/introducers] invite not sent:', sendError);
    return {
      ok: false,
      message: `${email} was added, but the invite email failed to send. Use Re-send once email is working.`,
    };
  }

  return { ok: true, message: `Added ${email} and sent their links.` };
}

/** Issue a fresh sign-in link. Existing links stay valid until they expire on their own. */
export async function resendInvite(formData: FormData): Promise<ActionResult> {
  await assertAdmin();

  const introducerId = String(formData.get('introducer_id') || '');
  if (!introducerId) return { ok: false, message: 'Missing introducer.' };

  const supabase = createServiceClient();
  const { data: introducer } = await supabase
    .from('introducers')
    .select('id, email, name, referral_token, status')
    .eq('id', introducerId)
    .maybeSingle();

  if (!introducer) return { ok: false, message: 'Introducer not found.' };
  if (introducer.status === 'suspended') {
    // Sending a working link to a suspended account would quietly undo the suspension.
    return { ok: false, message: 'They are suspended — restore access first.' };
  }

  try {
    const { url } = await issueMagicLink(introducer.id);
    await sendIntroducerInvite({
      introducerEmail: introducer.email,
      introducerName: introducer.name,
      signInUrl: url,
      referralUrl: `${APP_URL}/r/${introducer.referral_token}`,
      resend: true,
    });
  } catch (sendError) {
    console.error('[admin/introducers] resend failed:', sendError);
    return { ok: false, message: 'Could not send the email. Check the email configuration.' };
  }

  revalidatePath('/admin/introducers');
  return { ok: true, message: `Sent a fresh link to ${introducer.email}.` };
}

/**
 * Suspend or restore an introducer.
 *
 * Suspending revokes their live sign-in links immediately — leaving them valid would mean access
 * continues until they happen to expire. It does NOT touch attribution: introductions they already
 * made remain theirs, because whether someone still has portal access is a separate question from
 * whether they earned a commission.
 */
export async function setIntroducerStatus(formData: FormData): Promise<ActionResult> {
  await assertAdmin();

  const introducerId = String(formData.get('introducer_id') || '');
  const suspend = String(formData.get('suspend') || '') === 'true';
  if (!introducerId) return { ok: false, message: 'Missing introducer.' };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('introducers')
    .update({ status: suspend ? 'suspended' : 'active', updated_at: new Date().toISOString() })
    .eq('id', introducerId);

  if (error) return { ok: false, message: `Could not update: ${error.message}` };

  if (suspend) {
    await supabase
      .from('introducer_magic_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('introducer_id', introducerId)
      .is('revoked_at', null);
  }

  revalidatePath('/admin/introducers');
  return { ok: true, message: suspend ? 'Access suspended.' : 'Access restored.' };
}
