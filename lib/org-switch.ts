'use server';

// lib/org-switch.ts
// Server action for the "which org am I working in" switcher in the authenticated portal.
//
// Security model — this is the load-bearing part:
//   The client passes an organisation_id, and we can NEVER trust it blindly.
//   Before persisting the selection we re-derive the caller's person_id from the
//   session (auth_user_id -> auth_credentials.person_id) and require an ACTIVE
//   membership for the requested org. A caller who is not a member of the org
//   simply gets their selection left untouched — you cannot switch into an org
//   you do not belong to, and you cannot forge another person's selection.

import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export async function switchOrganisation(organisationId: string) {
  const authUser = await getAuthUser();
  if (!authUser) return { ok: false, error: 'Not signed in.' };

  if (!organisationId || typeof organisationId !== 'string') {
    return { ok: false, error: 'Invalid organisation.' };
  }

  const svc = createServiceClientV2();

  // 1. Session -> person (canonical auth_credentials bridge).
  const { data: credential, error: credError } = await svc
    .from('auth_credentials')
    .select('auth_credential_id, person_id')
    .eq('auth_user_id', authUser.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (credError || !credential) return { ok: false, error: 'No identity found.' };

  // 2. Verify the person has an ACTIVE membership for the requested org.
  const { data: membership, error: memError } = await svc
    .from('organisation_memberships')
    .select('membership_id')
    .eq('person_id', credential.person_id)
    .eq('organisation_id', organisationId)
    .eq('status', 'active')
    .or('valid_to.is.null,valid_to.gt.now()')
    .maybeSingle();

  if (memError || !membership) {
    // Not a member of the requested org — do NOT change anything.
    return { ok: false, error: 'You are not a member of that organisation.' };
  }

  // 3. Persist the selection on auth_credentials.
  const { error: updateError } = await svc
    .from('auth_credentials')
    .update({ selected_org_id: organisationId, updated_at: new Date().toISOString() })
    .eq('auth_credential_id', credential.auth_credential_id);

  if (updateError) {
    console.error('[org-switch] failed to persist selection:', updateError);
    return { ok: false, error: 'Could not switch organisation.' };
  }

  // Refresh the current surface (and its chrome) so the new org's context applies.
  revalidatePath('/', 'layout');
  return { ok: true };
}
