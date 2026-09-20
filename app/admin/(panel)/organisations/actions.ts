'use server';

import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export interface ActionResult {
  ok: boolean;
  message: string;
  organisationId?: string;
}

export async function createOrganisationAction(formData: FormData): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) {
    return { ok: false, message: 'Not authorised' };
  }

  const legalName = String(formData.get('legal_name') || '').trim();
  if (!legalName) {
    return { ok: false, message: 'Business name is required' };
  }

  const supabase = createServiceClientV2();

  const { data: org, error } = await supabase
    .from('organisations')
    .insert({
      legal_name: legalName,
      org_type: 'distributor',
      status: 'active'
    })
    .select('organisation_id')
    .single();

  if (error || !org) {
    console.error('[admin/organisations/actions] creation failed:', error);
    return { ok: false, message: `Creation failed: ${error?.message ?? 'unknown error'}` };
  }

  // Land a portals row so the distributor has a canonical /talk URL for the next lane.
  const talkUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiraexec.com').replace(/\/$/, '') + '/talk';
  await supabase.from('portals').upsert(
    {
      organisation_id: org.organisation_id,
      portal_url: `${talkUrl}?journey=consultant`,
      portal_level: 'distributor',
    },
    { onConflict: 'organisation_id' },
  );

  revalidatePath('/admin/organisations');
  return { 
    ok: true, 
    message: `Organisation "${legalName}" created successfully.`,
    organisationId: org.organisation_id 
  };
}
