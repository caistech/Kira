// @no-voice-route: operator console — Kira is the OWNER-facing product, and these are the
// screens the operator uses to look at owners. A "talk to Kira" control here would offer the
// operator a conversation with a tenant agent that is not his, on a page about other people's
// businesses. §6 is a promise to the owner about his own product, not to every signed-in user.
// (/admin/exec is the deliberate exception and keeps its voice surface: it is the operator
// looking at ONE owner, where hearing what she says is the point of the screen.)
import { createServiceClient } from '@/lib/supabase/server';

export const metadata = { title: 'LOIs · Kira Admin' };
export const dynamic = 'force-dynamic';

type Loi = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  business_name: string | null;
  role: string | null;
  commitment_level: string;
  commitment_detail: string | null;
  monthly_intent: number | null;
  refer_count: number | null;
  source: string | null;
};

const LEVEL_LABEL: Record<string, string> = {
  start_paid: 'Start paid',
  paid_pilot: 'Paid pilot',
  refer: 'Refer',
  interested: 'Interested',
};

const LEVEL_CLASS: Record<string, string> = {
  start_paid: 'bg-green-100 text-green-700',
  paid_pilot: 'bg-amber-100 text-amber-700',
  refer: 'bg-violet-100 text-violet-700',
  interested: 'bg-gray-100 text-gray-600',
};

export default async function AdminLoiPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from('loi_commitments')
    .select(
      'id, created_at, name, email, business_name, role, commitment_level, commitment_detail, monthly_intent, refer_count, source',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Loi[];

  const total = rows.length;
  const byLevel = (lvl: string) => rows.filter((r) => r.commitment_level === lvl).length;
  const monthlyPipeline = rows.reduce((s, r) => s + (Number(r.monthly_intent) || 0), 0);
  const referrals = rows.reduce((s, r) => s + (Number(r.refer_count) || 0), 0);

  const stats = [
    { label: 'Total LOIs', value: String(total) },
    { label: 'Start paid', value: String(byLevel('start_paid')) },
    { label: 'Paid pilot', value: String(byLevel('paid_pilot')) },
    { label: 'Committed / mo', value: `$${monthlyPipeline.toLocaleString()}` },
    { label: 'Referrals pledged', value: String(referrals) },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LOIs</h1>
        <p className="mt-1 text-base text-gray-600">
          Letters of intent captured from <span className="font-medium">/commit</span>. These are the
          validation + financing evidence — the signed, timestamped commitments prospects make after a
          Kira session.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">All commitments</h2>
        {total === 0 ? (
          <p className="py-8 text-center text-gray-500">
            No LOIs yet. Send a prospect the <span className="font-medium">/commit</span> link after a
            Kira demo, and their commitment shows up here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-2 pr-3 font-medium">Who</th>
                  <th className="py-2 pr-3 font-medium">Commitment</th>
                  <th className="py-2 pr-3 font-medium">$/mo</th>
                  <th className="py-2 pr-3 font-medium">Refer</th>
                  <th className="py-2 pr-3 font-medium">In their words</th>
                  <th className="py-2 pr-3 font-medium">Source</th>
                  <th className="py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-gray-800">{r.name}</div>
                      <div className="text-gray-500">{r.email}</div>
                      {(r.business_name || r.role) && (
                        <div className="text-xs text-gray-400">
                          {[r.business_name, r.role].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          LEVEL_CLASS[r.commitment_level] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {LEVEL_LABEL[r.commitment_level] ?? r.commitment_level}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-800">
                      {r.monthly_intent ? `$${Number(r.monthly_intent).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{r.refer_count ?? '—'}</td>
                    <td className="max-w-xs py-2 pr-3 text-gray-600">
                      <span title={r.commitment_detail ?? ''}>
                        {r.commitment_detail
                          ? r.commitment_detail.length > 90
                            ? `${r.commitment_detail.slice(0, 90)}…`
                            : r.commitment_detail
                          : '—'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-400">{r.source ?? '—'}</td>
                    <td className="py-2 whitespace-nowrap text-gray-500">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
