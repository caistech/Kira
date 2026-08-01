import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/auth';
import { canSend } from '@/lib/business-identity';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { createServiceClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/valuation/currency';

export const metadata = { title: 'Overview · Kira' };
export const dynamic = 'force-dynamic';

interface Valuation {
  gap: number;
  worth_today: number;
  worth_potential: number;
  readiness: number | null;
  currency: string;
  industry: string | null;
  created_at: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; identity?: string }>;
}) {
  const sp = await searchParams;
  const isWelcome = sp?.welcome === '1';
  const user = await getCurrentAppUser();
  const svc = createServiceClient();

  // WHO IS KIRA WRITING AS — asked once, before the dashboard, because she cannot send anything
  // without it and the alternative is his first request being the one that fails.
  //
  // Gated on the identity being COMPLETE, not on a row existing: the sender refuses a tenant missing
  // any of entity / ABN / address, so "there is a row" is the easier question and answering it is how
  // a screen ends up reassuring someone about a send that will be refused.
  const identity = user?.id ? await getBusinessIdentity(user.id) : null;
  if (user?.id && !canSend(identity)) redirect('/setup/business');

  // Saved here, not held by the system that sends. A real state, and one he must be able to see —
  // he is not trapped in setup over our outage, but he is not told it worked either.
  const identityUnsynced = Boolean(identity && !identity.synced_to_orchestrator_at);

  const { data: agents } = user
    ? await svc
        .from('kira_agents')
        .select('id, agent_name, elevenlabs_agent_id, journey_type, status, total_conversations, last_conversation_at')
        .eq('user_id', user.id)
        .neq('status', 'deleted')
        .order('last_conversation_at', { ascending: false, nullsFirst: false })
    : { data: [] as Array<Record<string, unknown>> };

  const list = agents ?? [];

  const { data: valuation } = user
    ? await svc
        .from('business_valuations')
        .select('gap, worth_today, worth_potential, readiness, currency, industry, created_at')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null as Valuation | null };

  const { data: profile } = user
    ? await svc
        .from('client_profiles')
        .select('completeness, discovery_complete, sessions_count')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null as { completeness: number; discovery_complete: boolean; sessions_count: number } | null };

  const pct = Math.round((profile?.completeness ?? 0) * 100);

  // The always-on entry point: their first active business Kira, else the create flow.
  const businessAgent = list.find((a) => a.journey_type === 'business' && a.status === 'active') ?? list[0];
  const talkHref = businessAgent ? `/chat/${businessAgent.elevenlabs_agent_id}` : '/start?journey=business';

  const val = valuation as Valuation | null;
  const money = (n: number) => formatMoney(n, val?.currency || 'USD');

  return (
    <div>
      {identityUnsynced && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-base font-semibold text-stone-900">
            Kira has your business details — the sending system doesn&apos;t yet.
          </p>
          <p className="mt-1 text-base text-stone-700">
            Until it does, she can draft emails for you but not send them. Nothing is lost; this
            usually clears on its own.
          </p>
          <Link
            href="/settings#business"
            className="mt-3 inline-block min-h-[44px] rounded-full bg-stone-900 px-5 py-3 text-base font-semibold text-white"
          >
            Try again
          </Link>
        </div>
      )}

      {val && val.gap > 0 && (
        <GapDashboard valuation={val} money={money} talkHref={talkHref} isWelcome={isWelcome} firstName={user?.first_name as string | undefined} />
      )}

      {/* ONE KIRA, NOT A LIST.
          "My Kiras · start a new Kira for a different goal" contradicted the entire pitch — one exec
          who learns YOUR business over months — in the first screen after paying. An owner does not
          want a fleet of assistants; he wants the one that knows him, and being offered another
          quietly says the first one is disposable. */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kira</h1>
        <p className="mt-1 text-base text-gray-600">
          {list.length === 0
            ? 'Have a short conversation and Kira starts learning how the business runs.'
            : 'She remembers your business and picks up where you left off.'}
        </p>
      </header>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-base text-gray-600">You haven&apos;t met Kira yet.</p>
          <p className="mt-1 text-sm text-gray-500">
            A short conversation is all it takes — she asks about the business and starts from there.
          </p>
          <Link
            href="/start"
            className="mt-4 inline-block rounded-lg bg-teal-600 px-5 py-3 text-base font-semibold text-white hover:bg-teal-700"
          >
            Start talking to Kira
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
                {/* TWO WRONGS, ONE LINE.
                    It printed the raw provisioning identifier — "Kira_Trinh_DevelopingThe_7f1c" —
                    which carries another person's first name and a slice of a user id, on the
                    dashboard of a product that promises advisors nothing crosses between clients.
                    Replacing it with the constant "Kira" then left six cards with identical titles
                    and nothing to tell them apart, which is its own kind of useless.
                    The journey is what actually distinguishes them, and it is already on the row. */}
                <h2 className="text-lg font-semibold text-gray-900">
                  {journeyLabel(String(a.journey_type ?? ''))}
                </h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600">
                  {String(a.journey_type ?? '')}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {Number(a.total_conversations ?? 0)} conversation{Number(a.total_conversations ?? 0) === 1 ? '' : 's'}
                {/* en-AU explicitly. A bare toLocaleDateString() takes the SERVER's locale in a
                    server component, which on Vercel is en-US — so an Australian owner was shown
                    03/08/2026 as 8/3/2026 on his own dashboard. */}
                {a.last_conversation_at
                  ? ` · last ${new Date(String(a.last_conversation_at)).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : ''}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {profile?.discovery_complete ? 'Discovery — Kira knows you' : 'Go deeper (optional)'}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {profile?.discovery_complete
                ? `${pct}% briefed across ${profile?.sessions_count ?? 0} session${(profile?.sessions_count ?? 0) === 1 ? '' : 's'}. Deepen it anytime.`
                : 'A longer coaching conversation so Kira learns your business, goals, people and how you work. Optional — deepens each session.'}
            </p>
            {(profile?.sessions_count ?? 0) > 0 && !profile?.discovery_complete && (
              <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
          <Link
            href="/discovery"
            className="inline-block whitespace-nowrap rounded-lg border border-teal-600 px-5 py-2.5 text-base font-semibold text-teal-700 hover:bg-teal-50"
          >
            {(profile?.sessions_count ?? 0) > 0 ? 'Continue discovery' : 'Start discovery'}
          </Link>
        </div>
      </div>
    </div>
  );
}

// The Business Value Gap Dashboard: the gap, how the 4-week process works, and the always-on entry.
/**
 * What to call a Kira on the dashboard.
 *
 * `journey_type` is the only thing on the row that differs between them, and it is already rendered
 * as a pill beside the title — so the title said "Kira" six times while the distinguishing fact sat
 * next to it in grey. Promoted rather than added: no new data, no new query.
 */
function journeyLabel(journey: string): string {
  const map: Record<string, string> = {
    business: 'Your business exec',
    personal: 'Your thinking partner',
    coach: 'Your coach',
  };
  return map[journey] ?? (journey ? `Kira — ${journey}` : 'Kira');
}

function GapDashboard({
  valuation,
  money,
  talkHref,
  isWelcome,
  firstName,
}: {
  valuation: Valuation;
  money: (n: number) => string;
  talkHref: string;
  isWelcome: boolean;
  firstName?: string;
}) {
  const readinessPct = Math.round((valuation.readiness ?? 0) * 100);
  const weeks = [
    { w: 'Week 1', t: 'Capture the essentials', b: "Kira learns how the business really runs — the things only you know — just by talking." },
    { w: 'Week 2', t: 'Document the core systems', b: 'Your pricing, processes and playbook get written down and made repeatable, without you writing a word.' },
    { w: 'Week 3', t: 'Reduce what only you can do', b: 'The jobs that depend on you start becoming jobs the systems handle. You feel the time come back.' },
    { w: 'Week 4', t: 'Handovers & recurring value', b: 'First clean handovers, steadier revenue, and a business that can run — and sell — without you.' },
  ];

  return (
    <section className="mb-10">
      <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 p-7 sm:p-9 text-white shadow-lg">
        <p className="text-white/80 font-medium">
          {isWelcome ? `Welcome${firstName ? `, ${firstName}` : ''} — I'm Kira. This is your` : 'Your'} Business Value Gap
        </p>
        <p className="text-4xl sm:text-5xl font-bold mt-1">{money(valuation.gap)}</p>
        <p className="text-white/90 max-w-2xl mt-3 leading-relaxed">
          That&apos;s the value locked in your head today — the difference between {money(valuation.worth_today)} (a business that needs you)
          and {money(valuation.worth_potential)} (one that runs without you). We close it together, a conversation at a time.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 text-sm bg-white/15 rounded-full px-4 py-1.5">
          Transferability today: {readinessPct}/100 — we grow this every week
        </div>

        {/* WHERE THIS NUMBER CAME FROM, AND HOW TO REPLACE IT.
            Reported twice by testers as "the valuation doesn't carry into the account". The plumbing
            was never the problem: /api/valuation/claim attaches a pre-signup valuation and FIRST ONE
            WINS, deliberately, so the baseline every later movement is measured from cannot be
            silently reset. But the rule was invisible. An owner who ran the numbers again saw three
            different figures here, with no date, no industry and no way to re-run — and "it ignored
            what I just did" is indistinguishable from broken.

            Naming the date and the sector turns an invisible rule into a stated one, and the link
            gives him the way back that he did not have. */}
        <p className="mt-4 text-sm text-white/75">
          Your baseline, taken{' '}
          {new Date(valuation.created_at).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          {valuation.industry ? ` · ${valuation.industry}` : ''}. It stays fixed so progress is
          measured from one starting point.{' '}
          <Link href="/business-valuation" className="underline underline-offset-2 hover:text-white">
            Run the numbers again
          </Link>
          .
        </p>
      </div>

      {/* How the process works */}
      <h2 className="mt-8 mb-3 text-lg font-bold text-gray-900">How we close it — your first 4 weeks</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {weeks.map((wk) => (
          <div key={wk.w} className="rounded-2xl border border-gray-200 bg-white p-5">
            <span className="text-xs font-bold text-violet-500">{wk.w}</span>
            <h3 className="font-semibold text-gray-900 mt-1">{wk.t}</h3>
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{wk.b}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-gray-500">…and beyond: Kira keeps building your Business Genome for as long as you keep talking to her.</p>

      {/* Meet Kira + always-on entry */}
      <div className="mt-8 rounded-3xl border-2 border-violet-200 bg-violet-50 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-shrink-0">
          <div className="rounded-full bg-gradient-to-br from-amber-300 via-pink-400 to-violet-500 p-1">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-white">
              <img src="/female_avatar.jpeg" alt="Kira" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">Meet Kira — she&apos;s ready when you are</h2>
          <p className="mt-1.5 text-gray-600 leading-relaxed">
            No forms, no setup. Just start talking — about a job, a headache, or how something works. Kira listens,
            works out what&apos;s needed, and quietly gets it built and remembered. Come back anytime; she picks up where you left off.
          </p>
          <Link
            href={talkHref}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 px-7 py-3.5 text-base font-bold text-white shadow-md hover:opacity-95 min-h-[52px]"
          >
            Start talking to Kira →
          </Link>
        </div>
      </div>
    </section>
  );
}
