import Link from 'next/link';
import { getCurrentAppUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const metadata = { title: 'My Kiras · Kira' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentAppUser();
  const svc = createServiceClient();

  const { data: agents } = user
    ? await svc
        .from('kira_agents')
        .select('id, agent_name, elevenlabs_agent_id, journey_type, status, total_conversations, last_conversation_at')
        .eq('user_id', user.id)
        .neq('status', 'deleted')
        .order('last_conversation_at', { ascending: false, nullsFirst: false })
    : { data: [] as Array<Record<string, unknown>> };

  const list = agents ?? [];

  const { data: profile } = user
    ? await svc
        .from('client_profiles')
        .select('completeness, discovery_complete, sessions_count')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null as { completeness: number; discovery_complete: boolean; sessions_count: number } | null };

  const pct = Math.round((profile?.completeness ?? 0) * 100);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Kiras</h1>
        <p className="mt-1 text-base text-gray-600">
          Your personal AI assistants. Each one remembers your context and continues where you left off.
          Open one to talk, or start a new Kira for a different goal.
        </p>
      </header>

      {/* Discovery gate — Kira learns you before she can be an effective assistant. */}
      <div
        className={`mb-6 rounded-2xl border p-5 ${
          profile?.discovery_complete ? 'border-teal-200 bg-teal-50' : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {profile?.discovery_complete
                ? 'Discovery complete — Kira knows you'
                : 'Discovery: help Kira understand you'}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {profile?.discovery_complete
                ? `${pct}% briefed across ${profile?.sessions_count ?? 0} session${(profile?.sessions_count ?? 0) === 1 ? '' : 's'}. You can always go deeper.`
                : 'A short coaching conversation so Kira learns your business, goals, people and how you work. Deepens each session.'}
            </p>
            {!profile?.discovery_complete && (
              <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
          <Link
            href="/discovery"
            className={`inline-block whitespace-nowrap rounded-lg px-5 py-3 text-base font-semibold text-white ${
              profile?.discovery_complete ? 'bg-teal-600 hover:bg-teal-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {profile?.discovery_complete ? 'Continue discovery' : profile?.sessions_count ? 'Continue discovery' : 'Start discovery'}
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-base text-gray-600">You don&apos;t have a Kira yet.</p>
          <Link
            href="/setup"
            className="mt-4 inline-block rounded-lg bg-teal-600 px-5 py-3 text-base font-semibold text-white hover:bg-teal-700"
          >
            Set up your first Kira
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {list.map((a: Record<string, unknown>) => (
            <Link
              key={String(a.id)}
              href={`/chat/${a.elevenlabs_agent_id}`}
              className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-teal-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{String(a.agent_name ?? 'Kira')}</h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600">
                  {String(a.journey_type ?? '')}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {Number(a.total_conversations ?? 0)} conversation{Number(a.total_conversations ?? 0) === 1 ? '' : 's'}
                {a.last_conversation_at ? ` · last ${new Date(String(a.last_conversation_at)).toLocaleDateString()}` : ''}
              </p>
            </Link>
          ))}
          <Link
            href="/setup"
            className="flex items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-base font-medium text-teal-700 hover:border-teal-300"
          >
            + New Kira
          </Link>
        </div>
      )}
    </div>
  );
}
