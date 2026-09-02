// app/requests/page.tsx
//
// What the owner has asked Kira for, and whose move it is.
//
// WHY THIS IS ITS OWN PAGE. This list was the first section of the dashboard — the page an owner
// lands on every time he opens the app. On a real account it showed twelve items, the oldest
// seventeen days, under the heading "Waiting on you". Every one of the twelve was waiting on HER:
// ten "on her list, not written yet", two "accepted and not finished", none drafted for his
// go-ahead. So the product opened by presenting her backlog as his fault.
//
// Two things were wrong and only one of them was the heading. Even correctly labelled, a list of
// unfinished work is the wrong thing to put in front of someone at the moment he arrives; it is the
// thing he goes looking for when he wants it. Hence a nav item.
//
// READ-ONLY, deliberately — unchanged from the dashboard version. Approving happens in conversation,
// where she reads the draft back and confirms the recipient out loud. An Approve button here would
// be a second way to fire a real email at a real client from a screen built at the end of a long
// day, bypassing the confirmation that makes the first path safe.

import Link from 'next/link';

import { getCurrentOrganisationContext } from '@/lib/auth';
import { readTaskLedger, STALLED_AFTER_DAYS, type OpenTaskSummary } from '@/lib/kira/swarm/open-tasks';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { KiraShapeSection } from '@/components/KiraShapeSection';

export const dynamic = 'force-dynamic';

function ageLabel(task: OpenTaskSummary): string {
  if (task.ageDays < 1) return 'today';
  return `${task.ageDays} day${task.ageDays === 1 ? '' : 's'} waiting`;
}

function TaskRow({ task }: { task: OpenTaskSummary }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-stone-100 pt-3">
      {/* The title opens the text. It was once a line of prose beside a button that took him back
          into the chat, which offered to email it — a loop with no way to READ the thing. */}
      <Link
        href={`/drafts/${task.id}`}
        className="inline-flex min-h-[44px] items-center text-base text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-500"
      >
        {task.summary}
      </Link>
      <span className={`text-sm ${task.stalled ? 'font-semibold text-amber-700' : 'text-stone-500'}`}>
        {task.state} · {ageLabel(task)}
      </span>
    </li>
  );
}

export default async function RequestsPage() {
  const orgContext = await getCurrentOrganisationContext();
  const ledger = orgContext?.personId
    ? await readTaskLedger(orgContext.personId)
    : { openCount: 0, open: [], recentlyDone: [], waitingOnOwner: [], waitingOnKira: [], stalled: [], spoken: '' };

  // The talk link, resolved the same way the dashboard resolves it, so "talk to her about these"
  // lands on his own Kira rather than the onboarding flow.
  const svc = createServiceClientV2();
  const { data: agents } = orgContext
    ? await svc
        .from('kira_agents')
        .select('elevenlabs_agent_id, journey_type, status')
        .eq('organisation_id', orgContext.organisationId)
        .neq('status', 'deleted')
    : { data: [] as Array<Record<string, unknown>> };
  const businessAgent =
    (agents ?? []).find((a) => a.journey_type === 'business' && a.status === 'active') ?? (agents ?? [])[0];
  const talkHref = businessAgent
    ? `/chat/${(businessAgent as { elevenlabs_agent_id: string }).elevenlabs_agent_id}`
    : '/start?journey=business&from=app';

  return (
    // Bottom gutter for the fixed SayFix pill, which is blind to what it lands on.
    <div className="pb-28">
      {/* ⚠️ A DIV, NOT A <header>. This page sits inside UserShell, which supplies the real chrome,
          and every sibling authenticated page (/drafts, /knowledge) titles itself with a plain h1
          for the same reason. Using a literal <header> here made site-chrome.test.ts require an
          OWN_HEADER entry — i.e. it made the page claim to own chrome it does not own — and the
          paired footer assertion then failed, correctly. The tag was the mistake, not the test. */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-stone-900">Requests</h1>
        <p className="mt-2 max-w-prose text-base leading-relaxed text-stone-600">
          Everything you have asked Kira for that has not landed yet, and whose move it is. Nothing
          goes out until you say so — tell her to send one and she will read it back to you first.
        </p>
      </div>

      {/* Kira herself, above the list — the point of the page is to ask her about these, and the
          old dashboard version's only affordance was a link that took him away to do it. */}
      <KiraShapeSection surface="requests" />

      {ledger.openCount === 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">Nothing outstanding</h2>
          <p className="mt-1 max-w-prose text-base text-stone-600">
            When you ask Kira for something, it appears here until it is finished.
          </p>
        </section>
      )}

      {/* ⚠️ HIS LIST FIRST, AND ONLY WHEN IT HAS SOMETHING IN IT.
          This is the only group he can move. Rendering an empty "Waiting on you" above her backlog
          would recreate, in layout, the thing the heading used to do in words. */}
      {ledger.waitingOnOwner.length > 0 && (
        <section className="mb-8 rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <h2 className="text-lg font-semibold text-stone-900">
            Waiting on you ({ledger.waitingOnOwner.length})
          </h2>
          <p className="mt-1 max-w-prose text-base text-stone-700">
            Written and held. Tell Kira to send one and she will read it back before it goes.
          </p>
          <ul className="mt-4 space-y-3">
            {ledger.waitingOnOwner.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </section>
      )}

      {ledger.waitingOnKira.length > 0 && (
        <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-900">
            Waiting on Kira ({ledger.waitingOnKira.length})
          </h2>
          <p className="mt-1 max-w-prose text-base text-stone-600">
            Accepted and not finished. You do not need to do anything for these.
          </p>
          {/* ⚠️ AGE HAS TO CHANGE SOMETHING ON SCREEN, or the list ages silently and reads as
              activity while it is rot. Seventeen days sat in the old list saying nothing. */}
          {ledger.stalled.length > 0 && (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-base text-amber-900">
              <span className="font-semibold">
                {ledger.stalled.length === 1
                  ? 'One of these has been waiting'
                  : `${ledger.stalled.length} of these have been waiting`}{' '}
                more than {STALLED_AFTER_DAYS} days
              </span>{' '}
              — the oldest is {ledger.stalled[0].ageDays} days. That is longer than it should take.
              Raise it with Kira, or ask her to drop it.
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {ledger.waitingOnKira.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </section>
      )}

      {ledger.recentlyDone.length > 0 && (
        <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-900">Finished recently</h2>
          <ul className="mt-4 space-y-3">
            {ledger.recentlyDone.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/drafts"
          className="inline-block min-h-[44px] rounded-full bg-stone-900 px-5 py-3 text-base font-semibold text-white"
        >
          See what you have asked for
        </Link>
        <Link
          href={talkHref}
          className="inline-block min-h-[44px] rounded-full border border-stone-300 bg-white px-5 py-3 text-base font-semibold text-stone-800 hover:border-violet-300"
        >
          Talk to Kira about these
        </Link>
      </div>
    </div>
  );
}
