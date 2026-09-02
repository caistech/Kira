import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export async function GET() {
  const org = await getCurrentOrganisationContext();
  if (!org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = createServiceClientV2();

  const { data: memberships, error: memErr } = await svc
    .from('organisation_memberships')
    .select('membership_id, person_id, role, status, can_spend, valid_from, valid_to')
    .eq('organisation_id', org.organisationId)
    .order('created_at', { ascending: true });

  if (memErr) {
    return NextResponse.json({ error: 'Could not load members' }, { status: 500 });
  }

  const personIds = [...new Set((memberships ?? []).map((m) => m.person_id).filter(Boolean))] as string[];

  const { data: persons } = personIds.length
    ? await svc
        .from('persons')
        .select('person_id, email, first_name, last_name')
        .in('person_id', personIds)
    : { data: [] };

  const personMap = new Map((persons ?? []).map((p) => [p.person_id, p]));

  const members = (memberships ?? []).map((m) => {
    const p = personMap.get(m.person_id);
    return {
      membershipId: m.membership_id,
      personId: m.person_id,
      email: p?.email ?? '',
      firstName: p?.first_name ?? '',
      lastName: p?.last_name ?? '',
      role: m.role,
      canSpend: m.can_spend ?? true,
      status: m.status,
      validFrom: m.valid_from,
      validTo: m.valid_to,
    };
  });

  return NextResponse.json({ members });
}
