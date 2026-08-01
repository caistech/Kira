// Trust — the two halves of one claim, on one page.
//
// Kira asks a 66-year-old to hand an agent his Drive, his contacts and his mail, usually before he
// has told his staff he is selling. The claim that earns that access is "she holds a boundary." Two
// tables already record whether she does, and until this page nothing read either of them:
//
//   kira_refusals       what she declined for a REAL owner, with his words and her reason.
//   kira_redteam_runs   what she withstood when someone deliberately tried to talk her past it.
//
// They belong together because neither is sufficient alone. The refusal log says the boundary holds
// in ordinary use, which is where it matters and where nobody is trying. The red team says it holds
// under pressure, which is the only interesting case, but against a synthetic owner on invented
// data. Shown side by side they answer "does it hold, and does it hold when pushed."
//
// THE HEADLINE IS THE PASS RATE, NOT THE LAST RESULT. The suite is non-deterministic — the Felix con
// held, breached, then held six times with nothing changed between runs. A single green run is
// therefore close to meaningless, and the failure worth catching is a rate drifting DOWN over
// weeks, which no individual run can show. This page is built around that rate and refuses to
// dress up a small sample as a trend.
//
// OPERATOR-ONLY, like the rest of /admin. The red-team rows are about the PRODUCT and are not
// owner-readable by design (the migration declines to scope them to a user for exactly that
// reason). The refusal rows ARE an owner's, and an owner sees his own on his own surface — this
// view is across all accounts, which is an operator's question, not his.

import { createServiceClient } from '@/lib/supabase/server';

export const metadata = { title: 'Trust · Kira Admin' };
export const dynamic = 'force-dynamic';

/**
 * Runs needed before this page will describe a direction of travel.
 *
 * Below it there is no trend to report and saying so is the honest output. Two runs both green look
 * exactly like a suite that always passes and exactly like one about to fail — the whole reason the
 * history table exists is that the difference only appears with volume. A page that drew a
 * confident line through two points would be lying in the one place it must not.
 */
const MIN_RUNS_FOR_TREND = 6;

type Result = {
  id: string;
  attack: string;
  held: boolean;
  detail: string | null;
  created_at: string;
};
type Run = {
  id: string;
  trigger: string;
  commit_sha: string | null;
  attacks_run: number;
  attacks_breached: number;
  started_at: string;
  finished_at: string | null;
};
type Refusal = {
  id: string;
  source: string;
  asked: string;
  reason: string | null;
  created_at: string;
  declined_because: string | null;
  users: { email: string | null } | null;
  agent: { agent_name: string | null } | null;
};

/**
 * The four kinds of refusal, in the owner's language rather than the enum's.
 *
 * Shown per row because the classification is what keeps this log worth reading: a refusal that
 * cannot say WHICH kind it is is usually a tool failure wearing a refusal's clothes, which is the
 * one thing that erodes the record. Rows written before 2026-08-01 carry no classification and are
 * labelled as such rather than quietly rendered as though they had one.
 */
const DECLINED_LABEL: Record<string, string> = {
  no_approval: 'not approved',
  not_asked_to_keep: 'not asked to keep it',
  unverified: 'not verified',
  outside_scope: 'not something she does',
};

/**
 * A refusal produced by the red team is not evidence about the product's behaviour with owners —
 * it is the suite's own output, landing in the same table. Both belong here (a refusal is a refusal)
 * but counting them together would let four synthetic conversations read as "she has protected four
 * real businesses", which is the exact overclaim this page exists to avoid making.
 *
 * Detected from the agent NAME rather than an env var, because the naming is in the data and works
 * in production where the QA credentials deliberately are not. If an agent is ever renamed the label
 * silently stops appearing — survivable, since the account email is shown beside it either way.
 */
function isSyntheticIdentity(r: Refusal): boolean {
  return (r.agent?.agent_name ?? '').includes('Synthetic');
}

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function age(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** Per-attack history, oldest first, so the dot strip reads left-to-right like a timeline. */
function byAttack(results: Result[]): { attack: string; outcomes: Result[]; held: number }[] {
  const groups = new Map<string, Result[]>();
  for (const r of results) {
    const list = groups.get(r.attack) ?? [];
    list.push(r);
    groups.set(r.attack, list);
  }
  return [...groups.entries()]
    .map(([attack, rows]) => {
      const outcomes = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
      return { attack, outcomes, held: outcomes.filter((o) => o.held).length };
    })
    // Weakest first. The attack most often talked past is the one to read, and it should not be
    // somewhere down an alphabetical list.
    .sort((a, b) => a.held / a.outcomes.length - b.held / b.outcomes.length);
}

function pct(held: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((held / total) * 100)}%`;
}

function Dots({ outcomes }: { outcomes: Result[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden="true">
      {outcomes.map((o) => (
        <span
          key={o.id}
          title={`${when(o.created_at)} — ${o.held ? 'held' : 'BREACHED'}${o.detail ? `: ${o.detail}` : ''}`}
          className={`h-3 w-3 rounded-full ${o.held ? 'bg-emerald-500' : 'bg-red-500'}`}
        />
      ))}
    </div>
  );
}

export default async function TrustPage() {
  const svc = createServiceClient();

  const [{ data: resultRows }, { data: runRows }, { data: refusalRows }] = await Promise.all([
    svc
      .from('kira_redteam_results')
      .select('id, attack, held, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    svc
      .from('kira_redteam_runs')
      .select('id, trigger, commit_sha, attacks_run, attacks_breached, started_at, finished_at')
      .order('started_at', { ascending: false })
      .limit(25),
    svc
      .from('kira_refusals')
      .select(
        'id, source, asked, reason, created_at, declined_because, users:user_id (email), agent:kira_agent_id (agent_name)',
      )
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const results = (resultRows ?? []) as unknown as Result[];
  const runs = (runRows ?? []) as Run[];
  const refusals = (refusalRows ?? []) as unknown as Refusal[];

  const attacks = byAttack(results);
  const totalHeld = results.filter((r) => r.held).length;
  const breaches = results.filter((r) => !r.held);
  const enoughForTrend = runs.length >= MIN_RUNS_FOR_TREND;

  const ownerRefusals = refusals.filter((r) => !isSyntheticIdentity(r));
  const syntheticRefusals = refusals.length - ownerRefusals.length;
  // Three sources now, and they must be counted separately rather than as "server" and "everything
  // else". `observed` rows are read back out of the transcript at distil, because record_refusal
  // measured 0/6 and then 1/6 across three attempts to fix it with prose — so lumping them in with
  // "she recorded it herself" would credit her with the one thing she reliably does not do.
  const byServer = ownerRefusals.filter((r) => r.source === 'approval').length;
  const byHer = ownerRefusals.filter((r) => r.source === 'agent').length;
  const byTranscript = ownerRefusals.filter((r) => r.source === 'observed').length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Trust</h1>
        <p className="mt-2 max-w-prose text-base text-gray-600">
          Whether Kira&apos;s boundaries actually hold — what she declined for real owners, and what
          she withstood when the red team deliberately tried to talk her past them. Read the pass
          rate over time, not the last run: the suite is non-deterministic, so a single green result
          proves very little and a rate drifting down is a guard quietly degrading.
        </p>
      </header>

      {/* ── The red team ─────────────────────────────────────────────────────────────────── */}

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900">Under attack</h2>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          Every red-team execution against the synthetic owner. Runs fire automatically after a
          re-provision or a capability patch — the two things that change her behaviour — and on
          demand before a demo.
        </p>

        {results.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
            No runs recorded yet. This is genuinely empty, not broken — the history only starts at
            the first run after the table was created.
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-sm font-medium text-gray-500">Attacks held</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {pct(totalHeld, results.length)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {totalHeld} of {results.length} across {runs.length}{' '}
                  {runs.length === 1 ? 'run' : 'runs'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-sm font-medium text-gray-500">Breaches</p>
                <p
                  className={`mt-1 text-3xl font-bold ${breaches.length ? 'text-red-600' : 'text-gray-900'}`}
                >
                  {breaches.length}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {breaches.length ? 'Read the detail below' : 'Nothing has been talked past yet'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-sm font-medium text-gray-500">Distinct attacks</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{attacks.length}</p>
                <p className="mt-1 text-xs text-gray-500">Each one a boundary someone tried</p>
              </div>
            </div>

            {/* The sample-size caveat is a first-class element, not a footnote. Someone shown this
                page will read a percentage as a fact about the product; below the threshold it is
                a fact about four conversations. */}
            {!enoughForTrend && (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-5">
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">Too few runs to show a trend.</span>{' '}
                  {runs.length} {runs.length === 1 ? 'run' : 'runs'} recorded; a direction of travel
                  needs at least {MIN_RUNS_FOR_TREND}. Until then these percentages describe a
                  handful of conversations, not the product — and because the suite is
                  non-deterministic, all-green here is not yet evidence that anything holds
                  reliably.
                </p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              {attacks.map((a) => {
                const rate = a.held / a.outcomes.length;
                return (
                  <div key={a.attack} className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-base font-medium text-gray-900">{a.attack}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                          rate === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : rate >= 0.5
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {pct(a.held, a.outcomes.length)} held
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {a.held} of {a.outcomes.length} · oldest first · last{' '}
                      {age(a.outcomes[a.outcomes.length - 1].created_at)}
                    </p>
                    <div className="mt-3">
                      <Dots outcomes={a.outcomes} />
                    </div>
                  </div>
                );
              })}
            </div>

            {breaches.length > 0 && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                <h3 className="text-base font-semibold text-red-800">
                  Breaches — what she was talked into
                </h3>
                <ul className="mt-3 space-y-3">
                  {breaches.map((b) => (
                    <li key={b.id} className="text-sm">
                      <p className="font-medium text-red-900">{b.attack}</p>
                      {b.detail && <p className="mt-0.5 text-red-800">{b.detail}</p>}
                      <p className="mt-0.5 text-xs text-red-600">{when(b.created_at)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-base font-semibold text-gray-900">Recent runs</h3>
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="text-gray-500">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Trigger</th>
                    <th className="py-2 pr-3 font-medium">Build</th>
                    <th className="py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="py-2 pr-3 text-gray-800">{when(r.started_at)}</td>
                      <td className="py-2 pr-3 text-gray-600">{r.trigger}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-500">
                        {r.commit_sha ? r.commit_sha.slice(0, 7) : '—'}
                      </td>
                      <td className="py-2">
                        {r.finished_at === null ? (
                          <span className="text-gray-500">did not finish</span>
                        ) : r.attacks_breached > 0 ? (
                          <span className="font-semibold text-red-600">
                            {r.attacks_breached} of {r.attacks_run} breached
                          </span>
                        ) : (
                          <span className="text-emerald-700">all {r.attacks_run} held</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* A run row with no finish is not a pass. It is a suite that died partway, and
                  reading it as green is how an unattended breach stays invisible. */}
            </div>
          </>
        )}
      </section>

      {/* ── The refusal log ──────────────────────────────────────────────────────────────── */}

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900">What she declined</h2>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          Every refusal recorded, across every account. Three sources:{' '}
          <span className="font-medium">approval</span> is server-observed and requires nothing of
          the model, <span className="font-medium">agent</span> is one she recorded herself in
          conversation, and <span className="font-medium">observed</span> is one read back out of
          the transcript when the session ended. The third exists because the second is the least
          reliable thing here — she declines out loud and does not call the tool, and three attempts
          to fix that with wording moved it from 0 in 6 to 1 in 6. Rows produced by the red
          team&apos;s synthetic identity are marked as such — they are the suite&apos;s own output
          and are not evidence about real owners.
        </p>
        <p className="mt-2 max-w-prose text-sm text-gray-600">
          Refusals only — a decision <em>not</em> to act. A row here describing a tool that failed
          (&ldquo;Drive isn&apos;t connected&rdquo;) is a defect, not a refusal: it is the noise that
          kills an audit log, and it is worth deleting the row and fixing what wrote it.
        </p>

        {refusals.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
            Nothing recorded. Early on this is expected; sustained emptiness while owners are active
            means a guard has stopped firing, not that nobody pushed her.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-gray-500">
              <span className="font-medium text-gray-700">
                {ownerRefusals.length} from real owners
              </span>{' '}
              ({byServer} server-observed, {byHer} recorded by her, {byTranscript} read back from the
              transcript) · {syntheticRefusals} from the red team
            </p>
            {/* Stated whenever it is true, not just when it is zero. "She has refused six times"
                is the sentence a distributor will repeat, and it must not be sourced from the
                suite attacking an owner who does not exist. */}
            {ownerRefusals.length === 0 && (
              <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
                <span className="font-semibold">No real-owner refusals yet.</span> Everything below
                came from the red team. This is not yet the artifact worth showing a buyer — that
                needs a refusal that happened in a real conversation about a real business.
              </div>
            )}
            <ul className="mt-3 space-y-3">
              {refusals.map((r) => (
                <li key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        r.source === 'approval'
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {r.source}
                    </span>
                    {isSyntheticIdentity(r) && (
                      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">
                        red team
                      </span>
                    )}
                    {r.declined_because ? (
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {DECLINED_LABEL[r.declined_because] ?? r.declined_because}
                      </span>
                    ) : (
                      /* Not decoration. An unclassified row predates the guard, and the reason the
                         guard exists is that some of them are tool failures rather than refusals —
                         so they are marked, not blended in. */
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500">
                        unclassified
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{age(r.created_at)}</span>
                  </div>
                  {/* His words first, exactly as on the Asked-for page — the phrasing is what makes
                      a refusal legible to anyone reading the log later. */}
                  <p className="mt-2 text-base text-gray-900">&ldquo;{r.asked}&rdquo;</p>
                  {r.reason && <p className="mt-2 text-sm text-gray-600">{r.reason}</p>}
                  <p className="mt-3 text-xs text-gray-400">
                    {when(r.created_at)}
                    {r.users?.email ? ` · ${r.users.email}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="max-w-prose text-sm text-gray-500">
        Both records are append-only and written by the service role. Nothing on this page can be
        edited by the owner it concerns or by the agent that produced it — a record its subject can
        rewrite is not a record.
      </p>
    </div>
  );
}
