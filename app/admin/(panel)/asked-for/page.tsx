// The build queue: what owners asked Kira for that she could not do, and what she tried and failed.
//
// WHY THIS PAGE EXISTS. Kira records an `unsupported` row every time a request falls outside what
// her team can do, and until now nothing read it — three failed tasks and a recorded refusal had
// been sitting in the table unseen. The orchestrator spec is blunt about what that table is for:
// "it tells you what to build next." It can only do that if somebody looks.
//
// DELIBERATELY OPERATOR-ONLY. This never appears on an owner's dashboard. His surfaces are two
// states — waiting on you, and what I've done — and a third column listing everything Kira couldn't
// manage would make her look less capable every week, on the screen he is paying for. The failures
// are our problem to read, not his to watch.
//
// The two statuses mean OPPOSITE things and are shown apart for that reason:
//   unsupported — we never could. A capability gap, and a vote for building it.
//   failed      — we should have been able to and didn't. A bug.
// Ranking them together would bury the bugs among the feature requests.
//
// NO CLUSTERING YET, on purpose. With a handful of rows, grouping by an inferred capability label
// would be decoration — invented structure over data too thin to have any. The requests are listed
// with the owner's own words, which is what a person actually reads to decide what to build. When
// volume makes clusters real, they can be derived here from the same rows.

import { createServiceClient } from '@/lib/supabase/server';

export const metadata = { title: 'Asked for · Kira Admin' };
export const dynamic = 'force-dynamic';

type Task = {
  id: string;
  created_at: string;
  status: string;
  kind: string | null;
  utterance: string | null;
  summary: string | null;
  handled_by: string | null;
  artifact: { classify?: { reason_if_unsupported?: string | null } } | null;
  result: { error?: string | null } | null;
};

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function Section({
  title,
  blurb,
  rows,
  tone,
  detail,
}: {
  title: string;
  blurb: string;
  rows: Task[];
  tone: string;
  detail: (t: Task) => string | null;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${tone}`}>{rows.length}</span>
      </div>
      <p className="mt-1 max-w-prose text-sm text-gray-600">{blurb}</p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
          Nothing here — which is the good outcome, not a missing feature.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((t) => {
            const because = detail(t);
            return (
              <li key={t.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                {/* Their own words first. The phrasing IS the spec — "check the Xero balance" and
                    "am I going to make payroll" want the same connector and different answers. */}
                <p className="text-base text-gray-900">
                  {t.utterance ? `“${t.utterance}”` : <span className="text-gray-400">no wording recorded</span>}
                </p>
                {because && <p className="mt-2 text-sm text-gray-600">{because}</p>}
                <p className="mt-3 text-xs text-gray-400">
                  {when(t.created_at)}
                  {t.handled_by ? ` · handled by ${t.handled_by}` : ''}
                  {t.kind && t.kind !== 'unsupported' ? ` · ${t.kind}` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default async function AskedForPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from('kira_tasks')
    .select('id, created_at, status, kind, utterance, summary, handled_by, artifact, result')
    .in('status', ['unsupported', 'failed'])
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (data ?? []) as Task[];
  const unsupported = rows.filter((r) => r.status === 'unsupported');
  const failed = rows.filter((r) => r.status === 'failed');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Asked for</h1>
        <p className="mt-2 max-w-prose text-base text-gray-600">
          What owners asked Kira to do that she couldn&apos;t, and what she tried and failed. This is
          the build queue — the only evidence of which capability is worth adding next, in the words
          the owners actually used. Owners never see this page.
        </p>
      </header>

      <Section
        title="Couldn't do it"
        blurb="Outside what her team can reach today. Each one is a vote for a capability — one ask is noise, the same ask five times is a decision."
        rows={unsupported}
        tone="bg-amber-100 text-amber-800"
        detail={(t) => t.artifact?.classify?.reason_if_unsupported || t.summary || null}
      />

      <Section
        title="Tried and failed"
        blurb="She should have been able to do these. Every row here is a bug, not a feature request — which is why they are not mixed in above."
        rows={failed}
        tone="bg-red-100 text-red-700"
        detail={(t) => t.result?.error || t.summary || null}
      />

      <p className="max-w-prose text-sm text-gray-500">
        Requests only land here because Kira dispatches them even when she knows she can&apos;t help —
        she tells the owner plainly, then notes it. A refusal she handles in conversation alone
        teaches nothing and disappears.
      </p>
    </div>
  );
}
