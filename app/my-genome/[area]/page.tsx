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

  const genome = await deriveOwnerGenome(user.id as string);
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
        {/* The buyer's own question, third person, exactly as it appears in the handover document —
            so what he is working towards and what a buyer eventually reads are visibly the same. */}
        <p className="mt-2 text-base leading-relaxed text-stone-700">
          A buyer&apos;s advisor asks: {def.buyerQuestion}
        </p>
        {!neverAssessed && (
          <p className="mt-3 inline-block rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-sm font-semibold text-stone-700">
            {BAND_LABEL[result.band]}
          </p>
        )}
      </header>

      {neverAssessed ? (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-900">Not checked yet</h2>
          <p className="mt-1 text-base leading-relaxed text-stone-700">
            {entryCount > 0
              ? `Kira holds ${entryCount} ${entryCount === 1 ? 'thing' : 'things'} about this part of your business. Checking it reads them against the questions a buyer always asks, and tells you which ones you have genuinely answered.`
              : 'Kira has not captured anything about this part of your business yet. Once she has, checking it will tell you which of a buyer’s questions you have actually answered.'}
          </p>
          <div className="mt-4">
            <AssessAreaButton area={area} disabled={entryCount === 0} />
          </div>
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

          <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <h2 className="text-lg font-semibold text-stone-900">Work through these with Kira</h2>
            <p className="mt-1 text-base leading-relaxed text-stone-700">
              {split.movesNumber > 0 && split.completesDocument > 0
                ? `${split.movesNumber} of these move your number. The other ${split.completesDocument} complete your handover document.`
                : split.movesNumber > 0
                  ? `${split.movesNumber} of these move your number.`
                  : 'These complete your handover document. They do not change what a buyer would pay.'}
            </p>
            <Link
              href={`/dashboard?focus_area=${area}`}
              className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-violet-700 px-6 text-base font-semibold text-white"
            >
              Talk to Kira about {def.title.toLowerCase()}
            </Link>
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
