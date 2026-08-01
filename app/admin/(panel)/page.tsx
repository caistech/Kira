import { isLiveMode } from '@/lib/billing';
import { createServiceClient } from '@/lib/supabase/server';

export const metadata = { title: 'Admin · Kira' };
export const dynamic = 'force-dynamic';

async function count(table: string): Promise<number> {
  const svc = createServiceClient();
  const { count } = await svc.from(table).select('id', { count: 'exact', head: true });
  return count ?? 0;
}

export default async function AdminOverviewPage() {
  const svc = createServiceClient();
  const [users, agents, conversations] = await Promise.all([
    count('users'),
    count('kira_agents'),
    count('conversations'),
  ]);

  const { data: recentUsers } = await svc
    .from('users')
    .select('email, first_name, created_at, auth_user_id, subscription_status')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: recentAgents } = await svc
    .from('kira_agents')
    .select('agent_name, journey_type, total_conversations, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const liveBilling = isLiveMode();

  const stats = [
    { label: 'Users', value: users },
    { label: 'Kira agents', value: agents },
    { label: 'Conversations', value: conversations },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-base text-gray-600">
          {/* "Platform" was the one piece of startup vocabulary a tester found in our own copy, and
              he was reading an operator console at the time. Cheap to say plainly. */}
          Operator view of Kira. Accounts, agents, and conversation volume across every account.
        </p>
      </header>

      {/* Which Stripe mode is in force. Stated plainly and always, because "were we live at the
          time?" is the first question asked when anything about billing looks wrong — and it
          should never be answered by inspecting environment variables. */}
      <div
        className={`mb-8 flex flex-wrap items-center gap-3 rounded-2xl border p-5 ${
          liveBilling ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
        }`}
      >
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
            liveBilling ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          {liveBilling ? 'LIVE billing' : 'TEST billing'}
        </span>
        <p className="text-sm text-gray-700">
          {liveBilling
            ? 'Real cards are being charged. Stripe is running on the live key.'
            : 'No real money moves. Stripe is on test keys — flip STRIPE_LIVE_MODE to true and redeploy to go live.'}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Linked</th>
                  <th className="py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {(recentUsers ?? []).map((u: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-2 pr-3 text-gray-800">{String(u.email ?? '')}</td>
                    <td className="py-2 pr-3">{u.auth_user_id ? '✓' : '—'}</td>
                    <td className="py-2 text-gray-500">
                      {u.created_at ? new Date(String(u.created_at)).toLocaleDateString() : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent agents</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 font-medium">Convos</th>
                </tr>
              </thead>
              <tbody>
                {(recentAgents ?? []).map((a: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-2 pr-3 text-gray-800">{String(a.agent_name ?? 'Kira')}</td>
                    <td className="py-2 pr-3 capitalize text-gray-600">{String(a.journey_type ?? '')}</td>
                    <td className="py-2 text-gray-500">{Number(a.total_conversations ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
