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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { areaFor } from '@/lib/genome/areas';

/**
 * Where the last-seen band per area is parked, so a change can be noticed.
 *
 * ⚠️ DEVICE-LOCAL, AND THAT IS THE RIGHT TRADE HERE. Storing this server-side would be more
 * complete — the pulse would follow him between his phone and his laptop — and it would also mean a
 * schema, a write on every dashboard load, and a failure mode. This is a delight, not data: the cost
 * of missing one is that a bar changes quietly, which is exactly what happens today. It must never
 * become load-bearing, and nothing may read it except this component.
 */
const BANDS_SEEN_KEY = 'kira_bucket_bands_seen';

/** Band order, worst to best. The pulse fires on a move UP this list and only on a move up. */
const BAND_ORDER = ['empty', 'thin', 'building', 'covered'] as const;

/**
 * Which buckets have just improved since this browser last looked.
 *
 * THREE THINGS IT MUST NOT DO, each of which is the obvious implementation:
 *
 *   1. NEVER PULSE ON A FIRST VISIT. With nothing stored, every populated bucket "changed", so a
 *      new owner's first dashboard would fire nine celebrations for work he has not done. No record
 *      means record the current state and celebrate nothing.
 *   2. NEVER PULSE ON A MOVE DOWN. A band can legitimately fall — redaction is a promised feature
 *      ("anything here can be taken back"), and an entry the owner removes should take its coverage
 *      with it. Congratulating him for deleting his own data is the wrong note, so the comparison is
 *      directional rather than an inequality.
 *   3. NEVER PULSE TWICE FOR ONE CHANGE. The seen-state is written in the same effect that reads it,
 *      so a refresh shows the new band with no animation. The celebration marks the transition, not
 *      the state.
 *
 * Runs after hydration, so the server render carries no pulse classes and there is nothing for the
 * client to mismatch.
 *
 * PURE, AND EXPORTED, so those three rules are testable rather than trusted. The hook below is only
 * the wiring between this and localStorage — all of the judgement is here, where a test can reach
 * it without a DOM.
 */
export function improvedSince(
  previous: Record<string, string> | null,
  sections: BucketSection[],
): Set<string> {
  const moved = new Set<string>();
  if (!previous) return moved; // rule 1 — nothing seen before, so nothing has changed

  for (const section of sections) {
    const before = BAND_ORDER.indexOf(previous[section.key] as (typeof BAND_ORDER)[number]);
    const after = BAND_ORDER.indexOf(section.coverage);
    // `before < 0` is an area this browser has never seen — a newly added one, or a stored value
    // from an older model. Treated as a baseline rather than as a move from zero, per rule 1.
    if (before >= 0 && after > before) moved.add(section.key);
  }
  return moved;
}

function useImprovedBands(sections: BucketSection[]): Set<string> {
  const [improved, setImproved] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const current: Record<string, string> = {};
    for (const section of sections) current[section.key] = section.coverage;

    let previous: Record<string, string> | null = null;
    try {
      const raw = window.localStorage.getItem(BANDS_SEEN_KEY);
      previous = raw ? (JSON.parse(raw) as Record<string, string>) : null;
    } catch {
      // Private mode, a full quota, or a value someone else's code corrupted. Degrade to no pulse —
      // never to a pulse, which would be the failure that celebrates nothing having happened.
      previous = null;
    }

    const moved = improvedSince(previous, sections);
    if (moved.size > 0) setImproved(moved);

    try {
      window.localStorage.setItem(BANDS_SEEN_KEY, JSON.stringify(current));
    } catch {
      // Nothing to do. The next visit re-reads the old value and, at worst, pulses this change once
      // more — which is a great deal better than throwing on a dashboard.
    }
  }, [sections]);

  return improved;
}

/** Exactly what this component needs — so a caller can pass `OwnerGenome.sections` unchanged. */
export interface BucketSection {
  key: string;
  title: string;
  coverage: 'empty' | 'thin' | 'building' | 'covered';
  /**
   * What his own thirteen answers say about this area, or null.
   *
   * ⚠️ NEVER FOLDED INTO `coverage`, and that separation is the honest half of this component.
   * `deriveOwnerGenome` refuses to let a self-reported answer lift an area out of 'empty' — "a
   * self-reported answer is not a captured fact… letting one do so would manufacture progress from
   * a form he filled in before he paid". That rule is right and stays.
   *
   * But the consequence was a man who had just answered thirteen questions about his own business
   * being shown nine bars reading "Nothing yet" — which is a different lie, told in the other
   * direction. So the baseline is SHOWN and shown DIFFERENTLY: a distinct state that says "you told
   * us this" rather than "Kira captured this". Located, not captured. §3.2's rule made visible.
   */
  baseline?: { statement: string; ownerDependent: boolean } | null;
}

/**
 * What to DRAW for a bucket — coverage, widened by whether the owner has located it himself.
 *
 * Pure and exported so the one rule that matters is testable without a DOM: a baseline can only
 * lift the EMPTY state. The moment Kira has actually captured something, capture is what is shown,
 * because a self-report can never outrank a fact.
 */
export type BucketDisplay = 'empty' | 'located' | 'thin' | 'building' | 'covered';

export function bucketDisplay(section: BucketSection): BucketDisplay {
  if (section.coverage === 'empty' && section.baseline) return 'located';
  return section.coverage;
}

/**
 * The four bands, as presentation.
 *
 * `label` is what the owner reads. It is deliberately about CAPTURE ("Kira holds a lot of this")
 * rather than about quality ("this area is strong"), because capture is what the band measures.
 */
/**
 * THE FOUR SEGMENTS OF THE FUNNEL, bottom to top.
 *
 * These are the operator's own thresholds, drawn rather than described: red at the bottom, amber,
 * light green, bright green at the top. An area fills from the bottom up, so a glance across nine
 * funnels shows which parts of the business have climbed and which have not.
 */
const SEGMENTS = [
  { fill: '#ef4444', label: 'Nothing yet' },       // bottom — narrowest
  { fill: '#c2703a', label: 'You told us' },
  { fill: '#bbe5c3', label: 'Building up' },
  { fill: '#3cbf5c', label: 'Well covered' },      // top — widest
] as const;

/** How many segments are filled, and what to call the state. */
const BANDS = {
  // ⚠️ `empty` FILLS NOTHING. An outline with no colour is the honest picture of an area Kira has
  // never been told anything about, and it is visibly different from one he has answered for.
  empty: { filled: 0, label: 'Nothing yet', chip: 'bg-rose-100 text-rose-900 border-rose-300' },
  // "YOU TOLD US" — he answered for it in the thirteen questions; Kira has captured nothing. The
  // distinction is the point of this state and the label is where a reader meets it.
  located: { filled: 1, label: 'You told us', chip: 'bg-amber-100 text-amber-900 border-amber-300' },
  thin: { filled: 2, label: 'Just started', chip: 'bg-orange-100 text-orange-900 border-orange-300' },
  building: { filled: 3, label: 'Building up', chip: 'bg-lime-100 text-lime-900 border-lime-400' },
  covered: { filled: 4, label: 'Well covered', chip: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
} as const;

/**
 * One segment of the funnel as an SVG path.
 *
 * The funnel is an inverted trapezoid — widest at the top, narrowest at the bottom — so each slice
 * is a trapezoid whose width is interpolated from its own y position. Drawn per-slice rather than as
 * one clipped shape because the segments have GAPS between them, which is what makes it read as a
 * stack of levels rather than a single filling vessel.
 */
function segmentPath(index: number): string {
  const TOP_W = 92, BOT_W = 30, H = 120, SLICE = H / 4, GAP = 3;
  // index 0 is the TOP slice in draw order; the array is bottom-to-top, so flip.
  const yTop = (3 - index) * SLICE;
  const yBot = yTop + SLICE - GAP;
  const halfAt = (y: number) => (TOP_W - ((TOP_W - BOT_W) * y) / H) / 2;
  const [tl, tr] = [50 - halfAt(yTop), 50 + halfAt(yTop)];
  const [bl, br] = [50 - halfAt(yBot), 50 + halfAt(yBot)];
  return `M ${tl} ${yTop} L ${tr} ${yTop} L ${br} ${yBot} L ${bl} ${yBot} Z`;
}

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
  trackMovement = true,
  heading = 'Where the value is locked up',
  intro,
  areaHref,
}: {
  sections: BucketSection[];
  variant?: 'full' | 'compact';
  href?: string;
  /**
   * Watch for a bucket moving up a band and pulse it.
   *
   * ⚠️ FALSE ON THE PUBLIC EXAMPLE, and that is not a detail. `/genome` shows a FIXED, invented
   * business — nothing about it ever changes — so remembering its bands and celebrating a "move"
   * on a later visit would be the product congratulating a visitor for work nobody did, on the one
   * page whose entire job is to be believable. It would also pollute the real owner's stored bands
   * with an example's.
   */
  trackMovement?: boolean;
  heading?: string;
  /** Overrides the explanatory line — the example is not "your" business. */
  intro?: string;
  /**
   * When set, each funnel becomes a link to `${areaHref}/${key}` — the way into a single area.
   *
   * ⚠️ OPT-IN, AND NOT SET ON THE PUBLIC EXAMPLE. `/sample-genome` shows a fixed, invented business;
   * clicking one of its funnels through to a real owner's area page would open somebody else's
   * (empty) bucket from a page selling a finished one. Same reason `trackMovement` is false there —
   * the example must not behave as though it were his.
   */
  areaHref?: string;
}) {
  // ORDER IS THE AREAS' OWN RANK, NOT "MOST FULL FIRST".
  //
  // /my-genome sorts populated-first, deliberately, so a man opening his own Genome does not lead on
  // a list of things he has not done. This view has the opposite job: it is a map of where the gap
  // is, and a map whose regions move around between visits is not a map. Buyer-priority order is
  // also the order a broker reads them in, and it is held as data precisely so it can be re-ordered
  // without a rebuild (areas.ts).
  const ordered = sections;

  const improved = useImprovedBands(trackMovement ? sections : []);

  const covered = sections.filter((s) => s.coverage === 'covered').length;
  const untouched = sections.filter((s) => s.coverage === 'empty').length;

  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold text-stone-900">{heading}</h2>
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
        {intro ??
          "Your business broken into the nine areas a buyer's advisor works through. The colour shows how much of each one Kira has captured so far — not how good that part of the business is. Every conversation fills one of these in."}
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
        {ordered.map((section, index) => {
          const display = bucketDisplay(section);
          const band = BANDS[display];
          const justImproved = improved.has(section.key);
          // The whole card is the target when it links — a 96px funnel is a far better tap target
          // than a caption, and this ICP is reading it on a phone. `block` keeps the flex column.
          const Card = areaHref
            ? ({ children }: { children: React.ReactNode }) => (
                <Link
                  href={`${areaHref}/${section.key}`}
                  className="flex flex-col items-center rounded-xl p-1 hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600"
                >
                  {children}
                </Link>
              )
            : ({ children }: { children: React.ReactNode }) => <>{children}</>;
          return (
            <li
              key={section.key}
              className={`kira-rise-in flex flex-col items-center text-center ${
                justImproved ? 'kira-band-pulse' : ''
              }`}
              /* THE STAGGER — 45ms apart so the row assembles as one motion. Capped at the 8th,
                 because an uncapped ramp puts the last of nine 400ms behind the first, which stops
                 reading as one motion and starts reading as a slow page. */
              style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}
            >
              <Card>
              <svg
                viewBox="0 0 100 120"
                className="h-32 w-24"
                role="img"
                /* THE PICTURE IS NOT THE ONLY SIGNAL. Screen readers and anyone who cannot separate
                   red from green get the state as a sentence; the funnel is the fast path, not the
                   only one. Red/green blindness affects roughly one man in twelve and this ICP is
                   men aged 60-70, so that is closer to the median user than an edge case. */
                aria-label={`${section.title}: ${band.label}`}
              >
                {SEGMENTS.map((seg, i) => {
                  const isFilled = i < band.filled;
                  return (
                    <path
                      key={seg.label}
                      d={segmentPath(i)}
                      fill={isFilled ? seg.fill : '#ffffff'}
                      stroke={isFilled ? '#1c1917' : '#d6d3d1'}
                      strokeWidth={1.5}
                    />
                  );
                })}
              </svg>

              <p className="mt-2 text-sm font-semibold leading-snug text-stone-900">{section.title}</p>

              {/* The band as a WORD beneath the picture — see the aria-label note above. */}
              <span
                className={`mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${band.chip}`}
              >
                {band.label}
              </span>

              {display === 'located' && section.baseline ? (
                /* HIS OWN WORDS. `AreaBaseline.statement` is written "addressed to the owner, in his
                   own words as far as possible", which is what makes this a receipt for what he told
                   us rather than a claim we are making. */
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{section.baseline.statement}</p>
              ) : display === 'empty' ? (
                <p className="mt-1.5 text-xs text-stone-500">{emptyReason(section.key)}</p>
              ) : null}
              </Card>
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
