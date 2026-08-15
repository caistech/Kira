// components/GenomeBuckets.tsx
//
// THE NINE BUCKETS, at a glance — the gap made visible, with locations.
//
// WHY IT EXISTS. The dashboard tells an owner he has $270,000 locked in his head and offers him no
// way to see WHERE. The gap is one number for a nine-part problem, so "how am I doing" has had no
// answer beyond a figure that (as of this writing) never moves. This is that figure, decomposed:
// nine areas, each showing how much of it Kira actually holds.
//
// ⚠️ BANDS, NEVER PERCENTAGES. `OwnerSection.coverage` explains why and the reasoning is load-
// bearing: a percentage needs a denominator, nobody knows how many facts a pricing section "should"
// contain, and inventing six and dividing by it puts a precise-looking number on a guess. Bands say
// what we can support. They are also better commercially — "amber" invites "what would make it
// green?", which is the conversation we want; "34%" invites "why not 40?", which is an argument
// nobody wins in front of a broker.
//
// ⚠️ WHAT GREEN MEANS TODAY IS "SIX ENTRIES", AND THAT IS NOT ENOUGH TO CLAIM SALE-READINESS.
// `deriveOwnerGenome` bands on raw entry count (0 / 1-2 / 3-5 / 6+), so six trivial facts about the
// people in a business score identically to the three that matter. That is fine for "is this area
// getting attention" and it is NOT a defensible answer to a broker asking "green on what basis?".
// The copy below is therefore written to claim exactly what the data supports — how much Kira holds
// — and never that the business is sale-ready. See docs/GENOME_BUCKET_CHECKLIST.md for the per-area
// checklist that would make green mean something; until that lands, do not upgrade this wording.
//
// ⚠️ COLOUR IS NEVER THE ONLY SIGNAL. Every bucket carries its band as a WORD as well as a colour.
// This is not generic accessibility box-ticking: red/green colour blindness affects roughly one man
// in twelve, and this product's stated ICP is men aged 60-70. A traffic-light dashboard whose whole
// meaning is carried by hue would be unreadable to a meaningful slice of the people paying for it.

import Link from 'next/link';
import { areaFor } from '@/lib/genome/areas';

/** Exactly what this component needs — so a caller can pass `OwnerGenome.sections` unchanged. */
export interface BucketSection {
  key: string;
  title: string;
  coverage: 'empty' | 'thin' | 'building' | 'covered';
}

/**
 * The four bands, as presentation.
 *
 * `label` is what the owner reads. It is deliberately about CAPTURE ("Kira holds a lot of this")
 * rather than about quality ("this area is strong"), because capture is what the band measures.
 */
const BANDS = {
  empty: {
    label: 'Nothing yet',
    dot: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-800 border-rose-200',
    bar: 'bg-rose-500',
    // A FIXED SLIVER, not a percentage. An entirely grey bar is hard to scan as "this row is the
    // red one", so empty still shows a mark — but `w-[6%]` would have been a percentage in a
    // component whose whole design decision is that there are no percentages here, and the test
    // caught it. A fixed width says the same thing without reintroducing the idea of a denominator.
    width: 'w-1.5',
  },
  thin: {
    label: 'Just started',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-900 border-amber-200',
    bar: 'bg-amber-500',
    width: 'w-1/3',
  },
  building: {
    label: 'Building up',
    dot: 'bg-lime-500',
    chip: 'bg-lime-50 text-lime-900 border-lime-300',
    bar: 'bg-lime-500',
    width: 'w-2/3',
  },
  covered: {
    label: 'Well covered',
    dot: 'bg-emerald-600',
    chip: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    bar: 'bg-emerald-600',
    width: 'w-full',
  },
} as const;

/**
 * Why an area is empty — and there are two answers, which the model already distinguishes.
 *
 * `truthLivesIn: 'conversation'` means the answer genuinely is in his head and only he can give it.
 * `truthLivesIn: 'system'` means it lives at the accountant's, in a filing cabinet, or in software —
 * nobody has shown Kira where.
 *
 * Telling a 66-year-old that his depreciation schedule is in his head is confidently wrong, he knows
 * it immediately, and it makes him distrust the parts that ARE right. So an empty bucket says which
 * kind of empty it is, and what would move it.
 *
 * EXPORTED for its test rather than for a second caller. It encodes a product rule that cost real
 * trust to learn, and a grep over the JSX would only prove the two strings exist somewhere — not
 * that the right one reaches the right area.
 */
export function emptyReason(key: string): string {
  return areaFor(key)?.truthLivesIn === 'system'
    ? 'Kira has not been shown where this lives'
    : 'Only you can tell her this';
}

export function GenomeBuckets({
  sections,
  /** Compact = the dashboard strip. Full = the standalone view with the legend. */
  variant = 'full',
  href = '/my-genome',
}: {
  sections: BucketSection[];
  variant?: 'full' | 'compact';
  href?: string;
}) {
  // ORDER IS THE AREAS' OWN RANK, NOT "MOST FULL FIRST".
  //
  // /my-genome sorts populated-first, deliberately, so a man opening his own Genome does not lead on
  // a list of things he has not done. This view has the opposite job: it is a map of where the gap
  // is, and a map whose regions move around between visits is not a map. Buyer-priority order is
  // also the order a broker reads them in, and it is held as data precisely so it can be re-ordered
  // without a rebuild (areas.ts).
  const ordered = sections;

  const covered = sections.filter((s) => s.coverage === 'covered').length;
  const untouched = sections.filter((s) => s.coverage === 'empty').length;

  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold text-stone-900">Where the value is locked up</h2>
        <Link
          href={href}
          className="inline-flex min-h-[44px] items-center text-base font-semibold text-violet-700 underline underline-offset-4"
        >
          Open your Genome
        </Link>
      </div>

      {/* THE EXPLANATORY HEADER (§5 of the product standards) — what this is, what to do, why it
          matters. It also does the bounding: this says how much Kira HOLDS, and stops short of any
          claim about what the business is worth or whether it is ready to sell. */}
      <p className="mt-1 max-w-prose text-base leading-relaxed text-stone-600">
        Your business broken into the nine areas a buyer&apos;s advisor works through. The colour
        shows how much of each one Kira has captured so far — not how good that part of the business
        is. Every conversation fills one of these in.
      </p>

      <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((section) => {
          const band = BANDS[section.coverage];
          return (
            <li key={section.key}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-base font-medium leading-snug text-stone-900">{section.title}</span>
                {/* The band as a WORD, beside the colour — see the accessibility note at the top. */}
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${band.chip}`}
                >
                  {band.label}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div className={`h-full rounded-full ${band.bar} ${band.width}`} />
              </div>
              {section.coverage === 'empty' && (
                <p className="mt-1.5 text-sm text-stone-500">{emptyReason(section.key)}</p>
              )}
            </li>
          );
        })}
      </ul>

      {variant === 'full' && (
        <div className="mt-6 border-t border-stone-100 pt-4">
          {/* WRITTEN TO READ WELL AT ZERO, which is where every owner starts.
              The baseline from the questionnaire is deliberately never counted toward coverage — a
              self-reported answer is not a captured fact — so a man who has just paid sees nine
              "Nothing yet" bars. That is honest, and it is the pitch rather than a failure: the gap
              he was shown a screen ago, with locations on it. It must not read as a report card on
              his business, so the sentence names the cause (we have not talked yet) rather than the
              state (you are at zero). */}
          <p className="max-w-prose text-base text-stone-600">
            {untouched === sections.length
              ? 'Nothing is filled in yet — that is expected before your first conversation. What you told us during the valuation gave Kira a starting point, but she counts nothing as captured until you have actually talked it through.'
              : covered === sections.length
                ? 'Every area is well covered. From here the work is confirming what Kira holds — a fact she has read back to you and you have agreed with is the form a buyer cannot discount.'
                : `${covered} of ${sections.length} areas are well covered. The red ones are where the most value is still tied up in you.`}
          </p>
        </div>
      )}
    </section>
  );
}
