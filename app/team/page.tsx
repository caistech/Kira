import { getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { TeamSectionClient } from '@/components/TeamSectionClient';

export const metadata = { title: 'Team Â· Kira' };
export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const org = await getCurrentOrganisationContext();
  
  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please sign in to view your team.</p>
      </div>
    );
  }

  if (!['admin', 'superadmin'].includes(org.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">You don't have permission to manage the team.</p>
      </div>
    );
  }

  const svc = createServiceClientV2();

  const { data: memberships } = await svc
    .from('organisation_memberships')
    .select('membership_id, person_id, role, status, can_spend, valid_from, valid_to')
    .eq('organisation_id', org.organisationId)
    .order('created_at', { ascending: true });

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team</h1>
      <TeamSectionClient initialMembers={members} organisationId={org.organisationId} />
    </div>
  );
}
