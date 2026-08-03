import Link from 'next/link';
import { getExecUsers } from '@/lib/admin/exec';
import { formatMoneyApprox } from '@/lib/valuation/currency';

export const metadata = { title: 'Kira Exec · Admin' };
export const dynamic = 'force-dynamic';

export default async function ExecAdminPage() {
  const rows = await getExecUsers();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kira Exec</h1>
        <p className="mt-1 text-base text-gray-600">
          The owner-operators who came through the valuation channel — your real Kira Exec cohort, with
          their value gap, engagement, documents and memory. Our own accounts are excluded: the QA
          identities and the operator admins. Personal Kiras never enter this list, because it is
          built from valuation, LOI and paid signals. Open a user&apos;s Kira, or manage what she holds
          for them.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-base text-gray-600">No Kira Exec users yet.</p>
          <p className="mt-1 text-sm text-gray-500">
            A user appears here once they complete the Business Value Gap valuation, sign an LOI, or start a paid plan.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            // Approximate, like every other surface showing a valuation. The operator reading a
            // figure to the dollar here would quote it to an owner who is shown a rounded one.
            const money = (n: number | null) => (n == null ? '—' : formatMoneyApprox(n, r.currency));
            const primaryAgent =
              r.agents.find((a) => a.journeyType === 'business' && a.status === 'active') ?? r.agents[0];
            const totalConvos = r.agents.reduce((s, a) => s + a.totalConversations, 0);
            return (
              <section key={r.userId} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* identity + valuation */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-gray-900">
                        {r.firstName || r.email}
                      </h2>
                      {r.subscriptionStatus && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600">
                          {r.subscriptionStatus}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-gray-500">{r.email}</p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span className="text-gray-700">
                        Value gap: <strong className="text-violet-700">{money(r.gap)}</strong>
                      </span>
                      <span className="text-gray-500">
                        {money(r.worthToday)} → {money(r.worthPotential)}
                      </span>
                      {r.readiness != null && (
                        <span className="text-gray-500">Transferability {Math.round(r.readiness * 100)}/100</span>
                      )}
                      {r.industry && <span className="text-gray-400">{r.industry}</span>}
                    </div>
                  </div>

                  {/* actions */}
                  <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:items-end">
                    {primaryAgent?.elevenlabsAgentId ? (
                      <Link
                        href={`/chat/${primaryAgent.elevenlabsAgentId}`}
                        className="rounded-lg bg-violet-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-violet-700"
                      >
                        Open their Kira
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">No agent yet</span>
                    )}
                    <Link
                      href={`/admin/exec/${r.userId}`}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Manage
                    </Link>
                  </div>
                </div>

                {/* engagement stats */}
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-5">
                  <Stat label="Conversations" value={totalConvos} />
                  <Stat label="Agents" value={r.agents.length} />
                  <Stat label="Documents" value={r.docsCount} />
                  <Stat label="Memory facts" value={r.memoryCount} />
                  <Stat
                    label="Discovery"
                    value={r.discoveryCompleteness > 0 ? `${Math.round(r.discoveryCompleteness * 100)}%` : '—'}
                  />
                </div>
                {primaryAgent && (
                  <p className="mt-3 text-xs text-gray-400">
                    {primaryAgent.agentName}
                    {primaryAgent.lastConversationAt
                      ? ` · last active ${new Date(primaryAgent.lastConversationAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : ' · no conversations yet'}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
