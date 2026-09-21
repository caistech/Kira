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
 * Verify the caller holds at least one active distributor portfolio entry,
 * OR is a member of a distributor-lane organisation.
 *
 * Mirrors lib/auth.ts currentUserIsDistributor() — see its comment. Without
 * the membership fallback, a brand-new partner with zero clients yet could
 * never pass this check, and this action is the ONLY way to create their
 * first client (which is what would otherwise earn them a portfolio row).
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
  if ((count ?? 0) > 0) return true;

  const { data: memberships, error: membershipError } = await svc
    .from('organisation_memberships')
    .select('organisation_id, organisations(org_type)')
    .eq('person_id', personId)
    .eq('status', 'active');

  if (membershipError) {
    console.error('[distributor/actions] membership check failed:', membershipError);
    return false;
  }

  return (memberships ?? []).some((m) => {
    const org = Array.isArray(m.organisations) ? m.organisations[0] : m.organisations;
    return (org as { org_type?: string } | undefined)?.org_type === 'distributor';
  });
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
    .insert({ legal_name: legalName, org_type: 'client_org', status: 'active' })
    .select('organisation_id')
    .single();

  if (orgError || !org) {
    console.error('[distributor/actions] org creation failed:', orgError);
    return { ok: false, message: `Could not create org: ${orgError?.message ?? 'unknown error'}` };
  }

  // 2. Land a portals row so the client has a canonical /talk URL.
  const talkUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiraexec.com').replace(/\/$/, '') + '/talk';
  await svc.from('portals').upsert(
    {
      organisation_id: org.organisation_id,
      portal_url: `${talkUrl}?journey=business`,
      portal_level: 'client_org',
      journey_type: 'business',
    },
    { onConflict: 'organisation_id' },
  );

  // 3. Auto-grant the caller a portfolio entry over the new org.
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