'use server';

// app/admin/(panel)/beta-testers/actions.ts
//
// Operator action for DIRECT beta-tester invites: create a Supabase auth user WITH a generated
// password, establish the canonical identity chain (person → auth_credentials → membership in the
// shared beta tenant org), and send the welcome credential email. The tester then signs in at
// /login (email + password) and lands on /talk, where the business Kira provisions lazily.
//
// This is the SHORT path the beta feedback asked for — no ?code= carousels, no magic-link round
// trip. It is intentionally a different entry than /api/beta/redeem: that path stays for inviter-
// facing beta codes; this one is operator-created, password-credentialed accounts.
//
// Every action re-checks isCurrentUserAdmin() itself — a server action is a callable endpoint.

import { revalidatePath } from 'next/cache';

import { isCurrentUserAdmin } from '@/lib/auth';
import { generateBetaPassword, validateBetaTesterInput } from '@/lib/beta-tester/password';
import { sendBetaTesterInvite } from '@/lib/email/beta-tester-invite';
import { createServiceClientV2 } from '@/lib/supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

/** The shared beta tenant. The seed (20260915140000) created it; testers all land here. */
const BETA_TENANT_LEGAL_NAME = 'Corporate AI Solutions';
const BETA_MEMBER_ROLE = 'member';
const AUTH_PROVIDER = 'email';

async function assertAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error('Not authorised');
}

export interface ActionResult {
  ok: boolean;
  message: string;
  credentials?: { email: string; password: string };
  emailSent?: boolean;
}

export async function inviteBetaTester(formData: FormData): Promise<ActionResult> {
  await assertAdmin();

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const firstName = String(formData.get('first_name') || '').trim();
  const lastName = String(formData.get('last_name') || '').trim();

  const validationError = validateBetaTesterInput({ email, firstName, lastName });
  if (validationError) return { ok: false, message: validationError };

  const password = generateBetaPassword();

  try {
    const supabase = createServiceClientV2();

    // ---------------------------------------------------------------------
    // 1. SUPABASE AUTH USER — with a password, unlike the beta-code path.
    //    email_confirm: true so there is no stuck pre-confirmation state, and
    //    metadata carries the name straight into the signup trigger's legacy
    //    users row.
    // ---------------------------------------------------------------------
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        referral_source: 'beta-direct-invite',
      },
    });

    if (createError) {
      if (createError.code === '23505' || /already registered/i.test(createError.message)) {
        return {
          ok: false,
          message: 'That email already has a Kira account. Use the existing sign-in instead.',
        };
      }
      return { ok: false, message: `Could not create the account: ${createError.message}` };
    }

    const authUserId = createdUser?.user?.id ?? (await findAuthUserId(supabase, email));
    if (!authUserId) {
      return { ok: false, message: 'Account created but its identity could not be resolved.' };
    }

    // ---------------------------------------------------------------------
    // 2. CANONICAL PERSON — reuse if the email is already a known person.
    // ---------------------------------------------------------------------
    const { data: existingPerson } = await supabase
      .from('persons')
      .select('person_id')
      .eq('email', email)
      .maybeSingle();

    let personId = existingPerson?.person_id ?? null;

    if (!personId) {
      const { data: newPerson, error: personError } = await supabase
        .from('persons')
        .insert({
          email,
          first_name: firstName || null,
          last_name: lastName || null,
          status: 'active',
        })
        .select('person_id')
        .single();

      if (personError || !newPerson) {
        return {
          ok: true,
          message:
            'Account and login exist, but the profile record could not be created. ' +
            `Send the login manually: ${personError?.message ?? 'unknown error'}`,
          credentials: { email, password },
          emailSent: false,
        };
      }
      personId = newPerson.person_id;
    }

    // ---------------------------------------------------------------------
    // 3. AUTH → PERSON BRIDGE (the ONLY one, per P0.5)
    // ---------------------------------------------------------------------
    await supabase.from('auth_credentials').upsert(
      {
        person_id: personId,
        auth_provider: AUTH_PROVIDER,
        auth_user_id: authUserId,
        status: 'active',
      },
      { onConflict: 'auth_provider, auth_user_id' },
    );

    // ---------------------------------------------------------------------
    // 4. MEMBERSHIP in the shared beta tenant org
    // ---------------------------------------------------------------------
    const { data: betaOrg } = await supabase
      .from('organisations')
      .select('organisation_id')
      .eq('legal_name', BETA_TENANT_LEGAL_NAME)
      .eq('status', 'active')
      .maybeSingle();

    if (betaOrg) {
      const { data: existingMembership } = await supabase
        .from('organisation_memberships')
        .select('membership_id')
        .eq('organisation_id', betaOrg.organisation_id)
        .eq('person_id', personId)
        .eq('role', BETA_MEMBER_ROLE)
        .maybeSingle();

      if (!existingMembership) {
        await supabase.from('organisation_memberships').insert({
          organisation_id: betaOrg.organisation_id,
          person_id: personId,
          role: BETA_MEMBER_ROLE,
          status: 'active',
          portal_access: 'user',
          can_spend: false,
        });
      }
    }

    // ---------------------------------------------------------------------
    // 5. WELCOME EMAIL — best effort; the credentials are shown on screen too.
    // ---------------------------------------------------------------------
    let emailSent = true;
    try {
      await sendBetaTesterInvite({
        email,
        firstName,
        password,
        loginUrl: `${APP_URL}/login`,
      });
    } catch (error) {
      emailSent = false;
      console.error('[beta-testers] welcome email send failed:', error);
    }

    revalidatePath('/admin/beta-testers');

    return {
      ok: true,
      message: emailSent
        ? `Invited ${firstName}: welcome email sent to ${email}.`
        : `Invited ${firstName}, but the welcome email failed to send. The login below was NOT emailed — pass it on directly.`,
      credentials: { email, password },
      emailSent,
    };
  } catch (error) {
    console.error('[beta-testers] invite failed:', error);
    return { ok: false, message: 'Invite failed. Check the server logs.' };
  }
}

/** Fallback look-up when createUser succeeds but omits the id (defensive). */
async function findAuthUserId(
  supabase: ReturnType<typeof createServiceClientV2>,
  email: string,
): Promise<string | null> {
  const { data } = await supabase.auth.admin.listUsers();
  const match = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}