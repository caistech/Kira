'use server';

import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export interface ActionResult {
  ok: boolean;
  message: string;
  organisationId?: string;
}

/**
 * Resolve the caller's canonical person_id from the session.
 */
async function resolveCallerPersonId(): Promise<string | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const svc = createServiceClientV2();
  const { data: credential } = await svc
    .from('auth_credentials')
    .select('person_id')
    .eq('auth_user_id', authUser.id)
    .eq('status', 'active')
    .maybeSingle();

  return credential?.person_id ?? null;
}

/**
 * Verify the caller holds at least one active distributor portfolio entry.
 */
async function callerIsDistributor(personId: string): Promise<boolean> {
  const svc = createServiceClientV2();
  const { count, error } = await svc
    .from('distributor_portfolio')
    .select('id', { count: 'exact', head: true })
    .eq('distributor_person_id', personId)
    .eq('status', 'active')
    .is('removed_at', null);

  if (error) {
    console.error('[distributor/actions] portfolio check failed:', error);
    return false;
  }
  return (count ?? 0) > 0;
}

/**
 * Provision a new client organisation and automatically grant the caller
 * a distributor portfolio entry over it — the "distributor creates a client
 * org and gets its portal" step of the provisioning chain.
 */
export async function provisionClientOrganisation(formData: FormData): Promise<ActionResult> {
  const legalName = String(formData.get('legal_name') || '').trim();
  if (!legalName) {
    return { ok: false, message: 'Client business name is required' };
  }

  const personId = await resolveCallerPersonId();
  if (!personId) {
    return { ok: false, message: 'Not signed in' };
  }

  if (!(await callerIsDistributor(personId))) {
    return { ok: false, message: 'Not authorised — you are not a distributor' };
  }

  const svc = createServiceClientV2();

  // 1. Create the client organisation.
  const { data: org, error: orgError } = await svc
    .from('organisations')
    .insert({ legal_name: legalName, status: 'active' })
    .select('organisation_id')
    .single();

  if (orgError || !org) {
    console.error('[distributor/actions] org creation failed:', orgError);
    return { ok: false, message: `Could not create org: ${orgError?.message ?? 'unknown error'}` };
  }

  // 2. Auto-grant the caller a portfolio entry over the new org.
  const { error: portfolioError } = await svc
    .from('distributor_portfolio')
    .insert({
      distributor_person_id: personId,
      client_organisation_id: org.organisation_id,
      status: 'active',
    });

  if (portfolioError) {
    console.error('[distributor/actions] portfolio grant failed:', portfolioError);
    return {
      ok: false,
      message: `Org created but portfolio grant failed: ${portfolioError.message}`,
    };
  }

  revalidatePath('/distributor');
  return {
    ok: true,
    message: `Client "${legalName}" provisioned. You now manage it.`,
    organisationId: org.organisation_id,
  };
}