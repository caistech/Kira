import { getSuperadminContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const metadata = { title: 'Kira · Manage' };
export const dynamic = 'force-dynamic';

export default async function ManageKiraPage() {
  const ctx = await getSuperadminContext();
  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Superadmin access required.</p>
      </div>
    );
  }

  const svc = createServiceClientV2();
  const { data: agents } = await svc
    .from('kira_agents')
    .select(
      'id, agent_name, journey_type, status, voice_id, elevenlabs_agent_id, total_conversations, total_minutes',
    )
    .eq('organisation_id', ctx.organisationId)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Kira agents</h1>
        <p className="mt-1 text-sm text-stone-500">
          The Kira agent(s) provisioned for your organisation.
        </p>
      </header>

      {!agents?.length ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-stone-900">No Kira agent yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            Kira is provisioned for your organisation. Provisioning a Kira agent
            is the next step once setup completes.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Agent</th>
                <th className="px-6 py-3 font-semibold">Journey</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Conversations</th>
                <th className="px-6 py-3 font-semibold">Minutes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td className="px-6 py-4 font-medium text-stone-900">
                    {agent.agent_name || 'Kira agent'}
                  </td>
                  <td className="px-6 py-4 text-stone-600">
                    {agent.journey_type || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        agent.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {agent.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-stone-600">
                    {agent.total_conversations ?? 0}
                  </td>
                  <td className="px-6 py-4 text-stone-600">
                    {agent.total_minutes ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
