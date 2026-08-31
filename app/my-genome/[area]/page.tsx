// One bucket, opened up — the way in for an owner who wants to push.
//
// WHO THIS IS FOR. The Genome shows nine funnels and no way in. An owner who is comfortable with
// Kira and wants to move his number has nowhere to go. This is that page: what a buyer asks about
// this area, which of those questions his record actually answers, and — where one is answered
// badly — why, and a better question.
//
// ⚠️ IT IS AN AGENDA, NOT A FORM. `GENOME_BUCKET_CHECKLIST.md` §4 is blunt about it: "a 66-year-old
// will talk and will not fill in fields". There is no input on this page. The outstanding items are
// a list he reads and a conversation he starts — the checklist is the SCORER's denominator and
// KIRA's agenda, and he meets it only as "two things left in this area".
//
// ⚠️ IT MUST NOT IMPLY THAT ALL-GREEN MEANS SALE-READY. Sector and size dominate the multiple; a
// perfectly systemised café is still 1.0-2.5x. The defensible claim is "the top of your sector's
// range", which the model already computes, and the closing line here says exactly that.

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getCurrentAppUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { GENOME_AREAS, type AreaKey } from '@/lib/genome/areas';
import { resolveOrganisationForPerson } from '@/lib/auth';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { assessArea as assessAreaItems, type AssessedItem, type ItemStatus } from '@/lib/genome/checklist-bands';
import { outstandingSplit } from '@/lib/genome/checklist-bands';
import { pathwayAvailableFor } from '@/lib/genome/pathway';
import { AssessAreaButton } from '@/components/AssessAreaButton';

export const dynamic = 'force-dynamic';

const BAND_LABEL: Record<string, string> = {
  empty: 'Nothing yet',
  thin: 'You told us',
  building: 'Building up',
  covered: 'Well covered',
};

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const def = GENOME_AREAS.find((a) => a.key === area);
  return { title: def ? `${def.title} · Your Genome · Kira` : 'Your Genome · Kira' };
}

export default async function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const def = GENOME_AREAS.find((a) => a.key === area);
  if (!def) notFound();

  const user = await getCurrentAppUser();
  if (!user?.id) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <p className="text-base text-stone-700">
          <Link href="/login" className="underline">
            Sign in
          </Link>{' '}
          to see your Genome.
        </p>
      </div>
    );
  }

  const orgContext = await resolveOrganisationForPerson(user.id as string);
  if (!orgContext) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="font-display text-2xl font-bold">Your Business Genome</h1>
        <p className="text-stone-600 mt-3">No organisation membership found.</p>
      </main>
    );
  }
  const genome = await deriveOwnerGenome(orgContext);
  const section = genome.sections.find((s) => s.key === area);

  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from('genome_item_status')
    .select('item_key, status, why, evidence')
    .eq('user_id', user.id)
    .eq('area', area);

  const assessed: AssessedItem[] = (rows ?? []).map((r) => ({
    itemKey: r.item_key as string,
    status: r.status as ItemStatus,
    why: (r.why as string | null) ?? null,
    evidence: (r.evidence as string[] | null) ?? [],
  }));

  // Never assessed is a DIFFERENT STATE from assessed-and-empty, and collapsing them is the failure
  // this page would most easily commit: telling a man nothing in his record answers anything, when
  // in truth nobody has looked yet.
  const neverAssessed = assessed.length === 0;
  const result = assessAreaItems(area as AreaKey, assessed);
  const split = outstandingSplit(result);
  const entryCount = section?.entries.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link
        href="/my-genome"
        className="inline-flex min-h-[44px] items-center text-base text-stone-600 underline underline-offset-4"
      >
        ← All nine areas
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-stone-900">{def.title}</h1>
        {/* ⚠️ THE OWNER-FACING WORDING, ON THE OWNER'S OWN PAGE.
            This rendered buyerQuestion — third person, because it is written for the handover
            document where the reader is an advisor and the subject is someone else. On his own screen
            it read "Could someone else reach HIS number?" and "Does the work happen without HIM on
            site?". Ray: "Whose number? It is my number… it reads as though the software is discussing
            me with someone else. Given everything else on the page is about how private this is,
            that is a bad note to strike."
            areas.ts already carries ownerFacingQuestion for exactly this — a deliberate rewrite
            rather than a you/your substitution, because several change shape when the subject becomes
            the reader. It existed; this page was not using it. */}
        <p className="mt-2 text-base leading-relaxed text-stone-700">
          What a buyer&apos;s advisor will ask you: {def.ownerFacingQuestion}
        </p>
        {!neverAssessed && (
          <p className="mt-3 inline-block rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-sm font-semibold text-stone-700">
            {BAND_LABEL[result.band]}
          </p>
        )}

        {/*
          ⚠️ THE BASELINE, BECAUSE ITS ABSENCE MADE TWO SCREENS CONTRADICT EACH OTHER.
          The card on /my-genome shows `section.baseline.statement` — "You told us your client base is
          steady" — and this panel showed none of it, so one click later the same area said "Kira has
          not captured anything about this part of your business yet." Ray: "Which is it? I told you
          or I didn't. That's not a subtlety I'm going to work out; it's just wrong."

          It is shown as HIS OWN WORDS and deliberately NOT counted as coverage: a self-report from
          the thirteen questions is not a captured fact, and letting one lift an area out of empty
          would manufacture progress from a form he filled in before he paid (see OwnerSection).
        */}
        {section?.baseline && (
          <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-base leading-relaxed text-stone-700">
            <span className="font-medium">From your answers:</span> {section.baseline.statement}
          </p>
        )}
      </header>

      {/*
        ⚠️ THE PRIMARY ACTION IS OUTSIDE THE FORK, AND THAT IS THE WHOLE FIX.
        It used to live in the assessed branch, so on a new account — the ONLY state a new owner is
        ever in — it could not render, and the single control on screen was a DISABLED button with no
        explanation. Nine areas, nine identical dead ends. Ray, 2026-08-16: "Not homework I'll never
        do — homework doesn't have a door. This is a room with no door at all."

        This is the second time in one day: the funnels on /my-genome were mounted inside
        `g.empty ? … : …` for the same reason. A branch is not a layout decision — putting an action
        inside one silently decides WHO gets to take it, and the state you build in is never the
        state a new owner arrives in. See feedback-correct-tested-and-unreachable.
      */}
      <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5">
        <h2 className="text-lg font-semibold text-stone-900">
          {entryCount > 0 ? 'Pick this up with Kira' : 'Tell Kira about this'}
        </h2>
        <p className="mt-1 text-base leading-relaxed text-stone-700">
          She opens on this part of the business and asks the questions a buyer would — one at a
          time, in your own words. Nothing here is a form.
        </p>
        <Link
          href={`/talk?area=${area}`}
          className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-violet-700 px-6 text-base font-semibold text-white"
        >
          Tell Kira about {def.title.toLowerCase()}
        </Link>
      </section>

      {neverAssessed ? (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-900">Not checked yet</h2>
          <p className="mt-1 text-base leading-relaxed text-stone-700">
            {entryCount > 0
              ? `Kira holds ${entryCount} ${entryCount === 1 ? 'thing' : 'things'} about this part of your business. Checking it reads them against the questions a buyer always asks, and tells you which ones you have genuinely answered.`
              : 'Once you have talked to her about it, checking this area will tell you which of a buyer’s questions you have actually answered.'}
          </p>
          {/*
            ⚠️ NO DISABLED BUTTON, EVER. The old version rendered it greyed with nothing said, which
            Ray read — correctly — as "software that isn't finished", and it made the honest refusal
            message ("Nothing could be checked yet…") permanently unreachable, because the control
            that produces it could not be pressed. If there is nothing to check, do not offer to
            check; offer the thing that WOULD give her something to check.
          */}
          {entryCount > 0 && (
            <div className="mt-4">
              <AssessAreaButton area={area} />
            </div>
          )}
        </section>
      ) : (
        <>
          {result.answered.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-semibold text-stone-900">
                On the record ({result.answered.length})
              </h2>
              <ul className="mt-3 space-y-2">
                {result.answered.map((item) => (
                  <li key={item.key} className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <span aria-hidden className="text-emerald-700">✓</span>
                    <span className="text-base text-stone-800">{item.buyerItem}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.weak.length > 0 && (
            <section className="mt-6">
              {/* The state the old model could not represent at all: answered, and not well enough.
                  It is separated from "not yet" because the two need different responses — one is a
                  question to ask, the other is pushing back on an answer he has already given. */}
              <h2 className="text-lg font-semibold text-stone-900">
                Needs a better answer ({result.weak.length})
              </h2>
              <ul className="mt-3 space-y-3">
                {result.weak.map((item) => (
                  <li key={item.key} className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <p className="text-base font-medium text-stone-900">{item.ownerPrompt}</p>
                    {item.why && <p className="mt-1.5 text-base text-stone-700">{item.why}</p>}
                    {pathwayAvailableFor(item.key) && (
                      /* ⚠️ THE HONEST LINE. For these items no answer he gives closes the gap —
                         writing down "only I can run this job" does not make it less true. Saying
                         so here is what stops the panel promising that talking is enough. */
                      <p className="mt-2 text-sm leading-relaxed text-stone-600">
                        Answering this well records where you are. Actually moving it means changing
                        something in the business — Kira can map out how that would work.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.open.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-semibold text-stone-900">Not yet ({result.open.length})</h2>
              <ul className="mt-3 space-y-2">
                {result.open.map((item) => (
                  <li key={item.key} className="rounded-xl border border-stone-200 bg-white p-4">
                    <p className="text-base text-stone-800">{item.ownerPrompt}</p>
                    {!item.required && (
                      <p className="mt-1 text-sm text-stone-500">
                        Worth having, but a buyer will not stop over it.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* The Talk button is NOT repeated here — it is above, outside the fork, where every
              state can reach it. What belongs here is only what depends on having been assessed. */}
          <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-base leading-relaxed text-stone-700">
              {split.movesNumber > 0 && split.completesDocument > 0
                ? `${split.movesNumber} of these move your number. The other ${split.completesDocument} complete your handover document.`
                : split.movesNumber > 0
                  ? `${split.movesNumber} of these move your number.`
                  : 'These complete your handover document. They do not change what a buyer would pay.'}
            </p>
            <div className="mt-4">
              <AssessAreaButton area={area} label="Check this area again" />
            </div>
          </section>
        </>
      )}

      {/* ⚠️ THE BOUND. Filling this area in does not make a business saleable — sector and size
          dominate the multiple, and a perfectly systemised café is still 1.0-2.5x. What it does is
          take him to the top of his own sector's range, which is what the model actually computes
          and the only claim this page is entitled to make. */}
      <p className="mt-8 border-t border-stone-200 pt-4 text-sm leading-relaxed text-stone-500">
        Filling in every area takes you to the top of your sector&apos;s range. It does not change
        the range — that is set by what you do and how big you are.
      </p>
    </div>
  );
}
