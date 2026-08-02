import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { formatMoneyApprox, DEFAULT_CURRENCY } from '@/lib/valuation/currency';

export const metadata = { title: 'Manage Exec user · Admin' };
export const dynamic = 'force-dynamic';

export default async function ExecUserManagePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const sb = createServiceClient();

  const { data: user } = await sb
    .from('users')
    .select('id, email, first_name, subscription_status, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (!user) notFound();

  const [{ data: val }, { data: agents }, { data: docs }, { data: memory }] = await Promise.all([
    sb.from('business_valuations').select('gap, worth_today, worth_potential, readiness, currency, industry').eq('user_id', userId).maybeSingle(),
    sb.from('kira_agents').select('id, agent_name, elevenlabs_agent_id, status, journey_type, total_conversations, last_conversation_at').eq('user_id', userId).neq('status', 'deleted').order('last_conversation_at', { ascending: false, nullsFirst: false }),
    sb.from('kira_knowledge').select('id, title, url, file_name, source_type, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    sb.from('kira_memory').select('id, content, memory_type, importance, created_at').eq('user_id', userId).eq('active', true).order('importance', { ascending: false }).order('created_at', { ascending: false }),
  ]);

  const currency = val?.currency || DEFAULT_CURRENCY;
  // Approximate, like every other surface showing a valuation.
  const money = (n: number | null | undefined) => (n == null ? '—' : formatMoneyApprox(n, currency));

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/exec" className="text-sm text-violet-700 hover:underline">← Kira Exec</Link>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{user.first_name || user.email}</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
        {val && (
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-700">Value gap: <strong className="text-violet-700">{money(val.gap)}</strong></span>
            <span className="text-gray-500">{money(val.worth_today)} → {money(val.worth_potential)}</span>
            {val.readiness != null && <span className="text-gray-500">Transferability {Math.round(val.readiness * 100)}/100</span>}
            {val.industry && <span className="text-gray-400">{val.industry}</span>}
          </div>
        )}
      </header>

      <Section title={`Agents (${(agents ?? []).length})`}>
        {(agents ?? []).length === 0 ? <Empty>No agents.</Empty> : (
          <ul className="divide-y divide-gray-100">
            {(agents ?? []).map((a: any) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{a.agent_name}</p>
                  <p className="text-xs text-gray-500">
                    {a.journey_type} · {a.status} · {a.total_conversations ?? 0} conversations
                    {a.last_conversation_at ? ` · last ${new Date(a.last_conversation_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                  </p>
                </div>
                {a.elevenlabs_agent_id && a.status === 'active' && (
                  <Link href={`/chat/${a.elevenlabs_agent_id}`} className="flex-shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">Open</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Documents (${(docs ?? []).length})`}>
        {(docs ?? []).length === 0 ? <Empty>No documents or links shared.</Empty> : (
          <ul className="divide-y divide-gray-100">
            {(docs ?? []).map((d: any) => (
              <li key={d.id} className="py-3">
                <p className="truncate text-sm font-medium text-gray-900">{d.title || d.file_name || d.url}</p>
                <p className="text-xs text-gray-500">{d.source_type} · {d.status} · {new Date(d.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Memory (${(memory ?? []).length} facts)`}>
        {(memory ?? []).length === 0 ? <Empty>No memory yet.</Empty> : (
          <ul className="divide-y divide-gray-100">
            {(memory ?? []).map((m: any) => (
              <li key={m.id} className="py-3">
                <p className="text-sm text-gray-800">{m.content}</p>
                <p className="text-xs text-gray-400">{m.memory_type} · importance {m.importance} · {new Date(m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-gray-500">{children}</p>;
}
