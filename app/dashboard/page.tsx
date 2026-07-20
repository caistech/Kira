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

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Kiras</h1>
        <p className="mt-1 text-base text-gray-600">
          Your personal AI assistants. Each one remembers your context and continues where you left off.
          Open one to talk, or start a new Kira for a different goal.
        </p>
      </header>

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
