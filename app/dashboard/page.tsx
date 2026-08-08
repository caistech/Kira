import Link from 'next/link';
import { getCurrentAppUser } from '@/lib/auth';
import { canSend } from '@/lib/business-identity';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { createServiceClient } from '@/lib/supabase/server';
import { formatMoney, formatMoneyApprox, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { displayedFigures } from '@/lib/valuation/displayed';
import { shouldInviteBaseline } from '@/lib/valuation/baseline-invite';
import { readTaskLedger } from '@/lib/kira/swarm/open-tasks';

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

/**
 * Has the send path been unconfirmed long enough to be worth telling him about?
 *
 * NOT THE INSTANT HE ARRIVES. The sync is usually seconds behind the save, so gating purely on "not
 * synced yet" put a fault banner at the top of the paid home screen for every owner who had just
 * finished setup — his first impression of the product being that it is broken.
 *
 * Ray's rule, and it is the right one: if it is genuinely transient, don't show it until it has
 * actually failed. Ten minutes is long enough that a normal sync is never mentioned to him, and
 * short enough that a real outage still reaches him on the same visit.
 *
 * Outside the component because it reads the clock, and calling an impure function during render is
 * both a lint error and — once this page is ever memoised — a real staleness bug.
 */
const UNSYNCED_GRACE_MS = 10 * 60 * 1000;

function sendingLooksStuck(identity: { synced_to_orchestrator_at?: string | null; updated_at?: string | null } | null): boolean {
  if (!identity || identity.synced_to_orchestrator_at) return false;
  if (!identity.updated_at) return true; // no timestamp to wait on — an unsynced row IS the signal
  return Date.now() - new Date(identity.updated_at).getTime() > UNSYNCED_GRACE_MS;
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

  // WHO IS KIRA WRITING AS — asked plainly, on the way past, instead of barring the door.
  //
  // This was `if (!canSend(identity)) redirect('/setup/business')`, and it was asked BEFORE the
  // dashboard because she cannot send anything without it. The reasoning was right; the enforcement
  // was not. `canSend` requires an 11-digit ABN and an Australian state, so the redirect was a door
  // with no key for any owner outside Australia — sign in, land on a form you cannot complete, and
  // every route sends you back to it (Shah Hussain, 2026-08-06).
  //
  // Still gated on the identity being COMPLETE rather than on a row existing: the sender refuses a
  // tenant missing any of entity / ABN / address, so "there is a row" is the easier question, and
  // answering it is how a screen ends up reassuring someone about a send that will be refused.
  // The difference is what happens on a NO — he now reads it and keeps going.
  const identity = user?.id ? await getBusinessIdentity(user.id) : null;
  const cannotSendYet = Boolean(user?.id) && !canSend(identity);

  // Saved here, not held by the system that sends. A real state, and one he must be able to see —
  // he is not trapped in setup over our outage, but he is not told it worked either. The grace
  // period that stops this firing the instant he arrives lives in sendingLooksStuck above.
  const identityUnsynced = sendingLooksStuck(identity);

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
  // The fallback is now NAMED, not silent. An owner with no agent used to get a button reading
  // "Talk to Kira" that quietly went to /start — a page that looks like a different product,
  // because there was no Kira to talk to. The paid path leads into /start directly now
  // (app/onboarding/page.tsx), so this branch is the recovery route rather than the main one, and
  // `hasMetKira` below already switches the copy to "Start talking to Kira" when it fires.
  const talkHref = businessAgent
    ? `/chat/${businessAgent.elevenlabs_agent_id}`
    : '/start?journey=business&from=paid';

  const val = valuation as Valuation | null;
  // APPROXIMATE, like the result page — see formatMoneyApprox.
  //
  // The valuation result explains, carefully and correctly, that putting a ± on these figures
  // would be "inventing a precision we do not have", and rounds to $1,440,000. This page then
  // showed $1,441,595 for the same number. A tester caught it in one glance: "You've argued for
  // rounding and then not done it three screens later. A man who's just been told precision would
  // be dishonest and is then shown five significant figures notices."
  const money = (n: number) => formatMoneyApprox(n, val?.currency || DEFAULT_CURRENCY);

  // Two decisions, not one condition — see lib/valuation/baseline-invite.ts, where they are pinned
  // by tests because both read as tidy-uppable.
  const showBaselineInvite = shouldInviteBaseline(list);

  // WHAT IS WAITING ON HIM, on his own screen.
  //
  // Ray found 39 open items on the OPERATOR's page, several "4 days ago · nobody has looked",
  // including a real owner's quote follow-up — and no way for that owner to see any of it. The
  // admin page's own header says why: no owner surface reads `queued` or `awaiting_approval` at all.
  //
  // That is the whole promise inverted. He is buying "she keeps the list so I don't have to", and
  // the list existed somewhere he could not look while things aged on it.
  //
  // READ-ONLY, deliberately. Approving still happens in conversation, where she reads the draft back
  // and confirms the recipient out loud — the path the approval guard actually protects. Putting an
  // Approve button here would create a second way to fire a real email at a real client, on a screen
  // built at the end of a long day, bypassing the confirmation that makes the first path safe.
  const ledger = user?.id ? await readTaskLedger(user.id) : { openCount: 0, open: [] as { id: string; summary: string; state: string; ageDays: number }[] };

  return (
    <div>
      {/* THE SETUP PROMPT THAT REPLACED THE SETUP REDIRECT.
          Same requirement, same `canSend` check, different consequence: he reads it and carries on
          rather than being held at the door by a form only an Australian business can complete.
          Placed first so it outranks the unsynced banner below — "you have not told me who you are"
          precedes "what you told me has not registered yet", and showing both at once would be two
          amber boxes saying overlapping things.
          It names the ABN out loud on purpose: for an owner outside Australia that sentence is the
          whole explanation, and the alternative is him filling the form three times wondering which
          field is being rejected. */}
      {cannotSendYet && !identityUnsynced && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-base font-semibold text-stone-900">
            Kira can&apos;t send email as you yet — everything else is ready.
          </p>
          <p className="mt-1 max-w-prose text-base text-stone-700">
            She can talk with you, learn your business and draft whatever you need right now. To send
            anything on your behalf she has to sign it with your business name, ABN and address —
            Australian law requires that on the bottom of every commercial email, and it identifies
            you, not us. Takes a minute, and you can do it whenever you like.
          </p>
          <Link
            href="/setup/business"
            className="mt-3 inline-block min-h-[44px] rounded-full bg-stone-900 px-5 py-3 text-base font-semibold text-white"
          >
            Add your business details
          </Link>
        </div>
      )}

      {identityUnsynced && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          {/* Ray, on day one: "'the sending system doesn't yet' is your plumbing, not my problem,
              and 'this usually clears on its own' tells me it happens often enough to have a usual.
              At the top of the page I paid for, that reads as: the thing I'm buying doesn't work."
              He was right on both counts. It named our internals, it admitted a recurring fault, and
              it gave him nothing to do. Now it says what he can do and what still works, in his
              terms — and it no longer appears the instant he arrives (see the grace period above). */}
          <p className="text-base font-semibold text-stone-900">
            Emails can&apos;t go out yet — everything else is working.
          </p>
          <p className="mt-1 text-base text-stone-700">
            Kira can draft for you and keep everything on your list; she just can&apos;t send until
            your business details finish registering. Nothing you&apos;ve done is lost. Open your
            business details and save them once more, and that usually does it.
          </p>
          <Link
            href="/settings#business"
            className="mt-3 inline-block min-h-[44px] rounded-full bg-stone-900 px-5 py-3 text-base font-semibold text-white"
          >
            Try again
          </Link>
        </div>
      )}

      {ledger.openCount > 0 && (
        <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-900">Waiting on you</h2>
          <p className="mt-1 max-w-prose text-base text-stone-600">
            Kira has these drafted and ready. Nothing goes out until you say so — tell her to send
            one and she&apos;ll read it back to you first.
          </p>
          <ul className="mt-4 space-y-3">
            {ledger.open.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-stone-100 pt-3"
              >
                <span className="text-base text-stone-900">{task.summary}</span>
                {/* The AGE is the part that matters to him, and the part a quiet list hides. Four
                    days is the difference between a follow-up and an apology. */}
                <span
                  className={`text-sm ${task.ageDays >= 2 ? 'font-semibold text-amber-700' : 'text-stone-500'}`}
                >
                  {task.state}
                  {task.ageDays >= 1
                    ? ` · ${task.ageDays} day${task.ageDays === 1 ? '' : 's'} waiting`
                    : ' · today'}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={talkHref}
            className="mt-4 inline-block min-h-[44px] rounded-full bg-stone-900 px-5 py-3 text-base font-semibold text-white"
          >
            Talk to Kira about these
          </Link>
        </section>
      )}

      {/* NO BASELINE AT ALL — the straight-in signup.
          Gated on the ROW, not on the gap: a valuation that computed to zero is still a baseline he
          gave us, and telling that owner he has not done this yet would be a plain falsehood. */}
      {!val && showBaselineInvite && <NoBaselineYet />}

      {val && val.gap > 0 && (
        <GapDashboard valuation={val} money={money} talkHref={talkHref} isWelcome={isWelcome} hasMetKira={list.length > 0} firstName={user?.first_name as string | undefined} />
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

      {/* NO SECOND "MEET KIRA" HERE.
          There used to be a dashed empty-state card in this slot saying "You haven't met Kira yet /
          A short conversation is all it takes / Start talking to Kira" — and the violet card further
          down the page says the same thing, warmer, with her face on it and the same talkHref
          behind the same button. An owner who finished the eleven questions got both, one under the
          other: two invitations to meet the same person, which reads as the page not knowing what
          he has already done.
          The one below wins on every count, so this slot now renders only the agent grid and stays
          empty when there is nothing to grid. See the conditional copy on that card — it also has to
          stop saying "Meet Kira" to someone who has been talking to her for months. */}
      {list.length === 0 ? null : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {list.map((a: Record<string, unknown>) => (
            <Link
              key={String(a.id)}
              href={`/chat/${a.elevenlabs_agent_id}`}
              className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-violet-300 hover:shadow-sm"
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
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
          <Link
            href="/discovery"
            className="inline-block whitespace-nowrap rounded-lg border border-violet-600 px-5 py-2.5 text-base font-semibold text-violet-700 hover:bg-violet-50"
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

/**
 * The straight-in signup's way to a baseline.
 *
 * WHY THIS EXISTS. Both writers of `business_valuations` originate from the eleven questions — one
 * through Stripe checkout metadata, one through the device handoff that `ClaimStoredValuation`
 * offers. An owner who signs up WITHOUT ever running them therefore has no row, and the dashboard
 * simply omitted the gap block: no figure, no explanation, and nothing anywhere on his screen
 * suggesting the thing existed. He has not been told anything false; he has been told nothing.
 *
 * That is the shape the register calls INERT RATHER THAN BROKEN, and it is worse than broken because
 * it looks like it is working. Two things were quietly lost with it: his own reason for being here,
 * and the origin every later movement is measured from — so an introducer watching a referral sees
 * permanent blanks in a column that is supposed to be the proof the product works.
 *
 * AND IT IS THE BROKER CHANNEL THAT PRODUCES IT. `/r/[token]` stamps the attribution cookie and
 * drops the visitor on the home page, so a client who signs up on his broker's word rather than on
 * the strength of a number is exactly the person who arrives with nothing.
 *
 * AN INVITATION, NOT A GATE. §4.1 decides the baseline eventually BLOCKS, as onboarding block 1 —
 * but that is C3, it is gated on the area model, and turning the dashboard into a wall today would
 * trap every existing owner behind eleven questions to fix a problem none of them has.
 *
 * NO CONFIDENTIALITY CLAIM HERE, deliberately. The obvious reassuring line — "this is not shared
 * with anyone" — is not true for a referred client: an introducer holds `view_status` and sees the
 * movement, by design. The fix is to not make the claim rather than to make a comfortable version
 * of it.
 */
function NoBaselineYet() {
  return (
    <section className="mb-10 rounded-2xl border-2 border-violet-200 bg-violet-50 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-stone-900">Start with where the business stands today</h2>
      <p className="mt-2 max-w-prose text-base leading-relaxed text-stone-700">
        Kira doesn&apos;t have a starting point for the business yet. Eleven questions — what it turns
        over, what it earns, how much of it runs through you — and you&apos;ll see what it&apos;s worth
        now, what it could be worth running without you, and the difference between the two.
      </p>
      <p className="mt-3 max-w-prose text-base leading-relaxed text-stone-700">
        That figure becomes the starting point everything from here is measured against, and it stays
        fixed once it&apos;s set — so it&apos;s worth doing before you get too far. You can stop
        part-way and come back; your answers stay on this device while you do.
      </p>
      <Link
        href="/business-valuation?from=app"
        className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-stone-900 px-6 py-3 text-base font-semibold text-white hover:bg-stone-800"
      >
        Answer the eleven questions
      </Link>
    </section>
  );
}

function GapDashboard({
  valuation,
  money,
  talkHref,
  isWelcome,
  firstName,
  hasMetKira,
}: {
  valuation: Valuation;
  money: (n: number) => string;
  talkHref: string;
  isWelcome: boolean;
  firstName?: string;
  /** An agent already exists. The card must not say "Meet Kira" to someone who has met her. */
  hasMetKira: boolean;
}) {
  const readinessPct = Math.round((valuation.readiness ?? 0) * 100);
  // Every valuation figure on this screen comes from here, rounded once and mutually consistent.
  const figures = displayedFigures(
    { worthToday: valuation.worth_today, worthPotential: valuation.worth_potential, gap: valuation.gap },
    valuation.currency || DEFAULT_CURRENCY,
  );
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
        {/* ONE SET OF FIGURES, ROUNDED ONCE — see lib/valuation/displayed.ts.
            This block previously rendered the STORED gap beside the two rounded figures it is
            supposedly the difference of, so it read "$271,000 — the difference between $1,570,000
            and $1,840,000", which is $270,000. A tester with a calculator caught it, and he checked
            precisely because the result page had earned that scrutiny by explaining why it rounds.
            `displayedFigures` derives the gap FROM the rounded pair, so the sentence is true by
            construction. Never call money() on a valuation figure here again. */}
        <p className="text-4xl sm:text-5xl font-bold mt-1">{figures.gapText}</p>
        <p className="text-white/90 max-w-2xl mt-3 leading-relaxed">
          That&apos;s the value locked in your head today — the difference between {figures.todayText} (a business that needs you)
          and {figures.potentialText} (one that runs without you). We close it together, a conversation at a time.
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
          {/* THIS CARD RENDERS ALWAYS, so its copy cannot assume he has never met her.
              Unconditional "Meet Kira — she's ready when you are" was shown to an owner with thirty
              conversations behind him — the product forgetting him on the one screen whose entire
              promise is that it doesn't. */}
          <h2 className="text-xl font-bold text-gray-900">
            {!hasMetKira ? 'Meet Kira — she’s ready when you are' : 'Kira’s ready when you are'}
          </h2>
          <p className="mt-1.5 text-gray-600 leading-relaxed">
            {!hasMetKira
              ? 'No forms, no setup. Just start talking — about a job, a headache, or how something works. Kira listens, works out what’s needed, and quietly gets it built and remembered.'
              : 'Pick up where you left off — she remembers the business and what was still outstanding. A job, a headache, or something you want drafted.'}
          </p>
          <Link
            href={talkHref}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 px-7 py-3.5 text-base font-bold text-white shadow-md hover:opacity-95 min-h-[52px]"
          >
            {!hasMetKira ? 'Start talking to Kira →' : 'Talk to Kira →'}
          </Link>
        </div>
      </div>
    </section>
  );
}
