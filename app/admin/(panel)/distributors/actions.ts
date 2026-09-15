'use server';

// app/admin/(panel)/distributors/actions.ts
//
// Operator actions for the Tier 2 distributor surface: grant a person a portfolio over a client
// organisation, suspend or revive a portfolio entry, or archive it.
//
// Every action re-checks isCurrentUserAdmin() itself. Same rule as the introducer actions: a server
// action is a callable endpoint, reachable by anyone who can construct the request, not only by
// someone who rendered the page. Guarding only the page would leave these open.

import { revalidatePath } from 'next/cache';

import { isCurrentUserAdmin } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function assertAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error('Not authorised');
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

/**
 * Grant a person a portfolio over one client organisation.
 *
 * If the person doesn't exist yet, a provisional persons row is created (status 'active', no
 * auth_credentials) — same pattern as the E1.0 identity bootstrap. Their portfolio access
 * activates the moment they sign in and the canonical auth chain resolves.
 */
export async function addDistributor(formData: FormData): Promise<ActionResult> {
  await assertAdmin();

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const firstName = String(formData.get('first_name') || '').trim();
  const lastName = String(formData.get('last_name') || '').trim();
  const organisationId = String(formData.get('organisation_id') || '');

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  if (!organisationId) {
    return { ok: false, message: 'Choose a client organisation.' };
  }

  const supabase = createServiceClientV2();

  // Resolve (or provisionally create) the person.
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
        ok: false,
        message: `Could not create the person record: ${personError?.message ?? 'unknown error'}`,
      };
    }
    personId = newPerson.person_id;
  }

  // Verify the target organisation exists.
  const { data: org } = await supabase
    .from('organisations')
    .select('legal_name')
    .eq('organisation_id', organisationId)
    .maybeSingle();

  if (!org) {
    return { ok: false, message: 'That client organisation does not exist.' };
  }

  const { data: existingEntry } = await supabase
    .from('distributor_portfolio')
    .select('status')
    .eq('distributor_person_id', personId)
    .eq('client_organisation_id', organisationId)
    .maybeSingle();

  if (existingEntry) {
    if (existingEntry.status === 'archived' || existingEntry.status === 'suspended') {
      const { error: reviveError } = await supabase
        .from('distributor_portfolio')
        .update({ status: 'active', removed_at: null, updated_at: new Date().toISOString() })
        .eq('distributor_person_id', personId)
        .eq('client_organisation_id', organisationId);
      if (reviveError) {
        return { ok: false, message: `Could not reactivate: ${reviveError.message}` };
      }
      revalidatePath('/admin/distributors');
      return { ok: true, message: `Reactivated ${email} over ${org.legal_name}.` };
    }
    return { ok: false, message: `${email} already oversees ${org.legal_name}.` };
  }

  const { error: portfolioError } = await supabase.from('distributor_portfolio').insert({
    distributor_person_id: personId,
    client_organisation_id: organisationId,
    status: 'active',
  });

  if (portfolioError) {
    return { ok: false, message: `Could not grant access: ${portfolioError.message}` };
  }

  revalidatePath('/admin/distributors');
  return { ok: true, message: `Granted ${email} access over ${org.legal_name}.` };
}

/** Suspend or revive a portfolio entry. Suspension cuts the distributor's access to that org immediately. */
export async function setPortfolioStatus(formData: FormData): Promise<ActionResult> {
  await assertAdmin();

  const entryId = String(formData.get('entry_id') || '');
  const suspend = formData.get('suspend') === 'true';

  if (!entryId) return { ok: false, message: 'Missing portfolio entry.' };

  const supabase = createServiceClientV2();
  const { error } = await supabase
    .from('distributor_portfolio')
    .update({
      status: suspend ? 'suspended' : 'active',
      removed_at: suspend ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId);

  if (error) {
    return { ok: false, message: `Could not update: ${error.message}` };
  }

  revalidatePath('/admin/distributors');
  return { ok: true, message: suspend ? 'Access suspended.' : 'Access restored.' };
}

/** Permanently remove a portfolio entry (soft-delete: row is kept, status 'archived', removed_at set). */
export async function archivePortfolioEntry(formData: FormData): Promise<ActionResult> {
  await assertAdmin();

  const entryId = String(formData.get('entry_id') || '');
  if (!entryId) return { ok: false, message: 'Missing portfolio entry.' };

  const supabase = createServiceClientV2();
  const { error } = await supabase
    .from('distributor_portfolio')
    .update({
      status: 'archived',
      removed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId);

  if (error) {
    return { ok: false, message: `Could not archive: ${error.message}` };
  }

  revalidatePath('/admin/distributors');
  return { ok: true, message: 'Portfolio entry archived.' };
}