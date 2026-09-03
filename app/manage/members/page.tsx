import { getSuperadminContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const metadata = { title: 'Members · Manage' };
export const dynamic = 'force-dynamic';

export default async function ManageMembersPage() {
  const ctx = await getSuperadminContext();
  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Superadmin access required.</p>
      </div>
    );
  }

  const svc = createServiceClientV2();

  const { data: memberships } = await svc
    .from('organisation_memberships')
    .select(
      'membership_id, person_id, role, portal_access, status, can_spend, valid_from, valid_to, appointed_by',
    )
    .eq('organisation_id', ctx.organisationId)
    .order('created_at', { ascending: true });

  const personIds = [
    ...new Set((memberships ?? []).map((m) => m.person_id).filter(Boolean)),
  ] as string[];

  const { data: persons } = personIds.length
    ? await svc
        .from('persons')
        .select('person_id, email, first_name, last_name')
        .in('person_id', personIds)
    : { data: [] };

  const personMap = new Map((persons ?? []).map((p) => [p.person_id, p]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Members</h1>
        <p className="mt-1 text-sm text-stone-500">
          People the superadmin has appointed to the organisation, and their
          portal access.
        </p>
      </header>

      {!memberships?.length ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-stone-900">No members yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            You will be the first. Members are appointed by the superadmin and
            enter through their own portal.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Email</th>
                <th className="px-6 py-3 font-semibold">Role</th>
                <th className="px-6 py-3 font-semibold">Portal</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {memberships.map((m) => {
                const person = personMap.get(m.person_id);
                return (
                  <tr key={m.membership_id}>
                    <td className="px-6 py-4 font-medium text-stone-900">
                      {[person?.first_name, person?.last_name]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </td>
                    <td className="px-6 py-4 text-stone-600">
                      {person?.email || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-stone-600">
                      {m.portal_access ?? 'user'}
                    </td>
                    <td className="px-6 py-4 text-stone-600">
                      {m.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
