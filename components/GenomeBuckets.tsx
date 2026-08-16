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
 * THE VESSEL — four equal levels, filling UPWARD, in one colour.
 *
 * ⚠️ THIS REPLACED A FUNNEL, AND EVERY CHANGE HERE IS A DEFECT RAY FOUND ON 2026-08-16. He is the
 * ICP. He looked at nine funnels and said: "Do I understand what they're telling me? No. I
 * understood the words underneath them, and I ignored the pictures."
 *
 *   1. RED MEANT BAD. "Nine red-bottomed shapes is nine warning lights on a dashboard." The caption
 *      said the colour shows how much is CAPTURED, not how good the business is — and the picture
 *      won. There is now no red anywhere. Red returns only when something is actually wrong.
 *   2. A FUNNEL MEANS LEAKAGE. Every funnel he has met in 35 years — sales, enquiry — is a picture
 *      of LOSS: wide at the top, most of it does not make it through. We were using that shape to
 *      mean a container filling. A straight-sided vessel has no such second meaning.
 *   3. THE FILL WAS AT THE NARROW END, so progress was nearly invisible. Equal levels now, so one
 *      level of four looks like one level of four.
 *   4. RED WAS PERMANENT. He checked /sample-genome and found a FINISHED area still red at the
 *      bottom — "a traffic light, not a gauge. Complete and empty both have red in them." A single
 *      colour getting more of it cannot do that.
 *
 * Amber for "you told us" is his prescription verbatim: "Amber for 'you mentioned it', green for
 * 'done', grey for 'nothing', and nothing red at all until something is actually wrong."
 */
const EMPTY_FILL = '#f5f5f4';
const EMPTY_STROKE = '#d6d3d1';
const GREEN = '#3cbf5c';
const AMBER = '#f0a533';

/** How many levels are filled, what to call the state, and — for `located` only — a different colour. */
const BANDS = {
  // ⚠️ `empty` FILLS NOTHING. An outline with no colour is the honest picture of an area Kira has
  // never been told anything about. It is GREY, not red: nothing is wrong, nothing has happened yet.
  empty: { filled: 0, fill: EMPTY_FILL, label: 'Nothing yet', chip: 'bg-stone-100 text-stone-700 border-stone-300' },
  // "YOU TOLD US" — he answered for it in the thirteen questions; Kira has captured nothing. Amber,
  // because he HAS done something, and grey would tell him he had not.
  located: { filled: 1, fill: AMBER, label: 'You told us', chip: 'bg-amber-100 text-amber-900 border-amber-300' },
  thin: { filled: 2, fill: GREEN, label: 'Just started', chip: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
  building: { filled: 3, fill: GREEN, label: 'Building up', chip: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
  covered: { filled: 4, fill: GREEN, label: 'Well covered', chip: 'bg-emerald-200 text-emerald-900 border-emerald-500' },
} as const;

/** The four levels of the vessel, bottom to top. Equal heights — see defect 3 above. */
const LEVELS = [0, 1, 2, 3] as const;

/**
 * One level of the vessel as an SVG rect.
 *
 * Straight-sided and equal-height, deliberately: the previous trapezoid interpolated its width from
 * its own y, which is what made the bottom level a sliver and progress invisible. `index` 0 is the
 * BOTTOM level, matching the direction it fills.
 */
function levelRect(index: number): { x: number; y: number; width: number; height: number } {
  const W = 64, H = 116, LEVEL = H / 4, GAP = 4;
  return { x: (100 - W) / 2, y: (3 - index) * LEVEL, width: W, height: LEVEL - GAP };
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

/**
 * The key's own tile — the same four stacked blocks, at legend size.
 *
 * ⚠️ A KEY THAT DOES NOT LOOK LIKE THE THING IT EXPLAINS IS NOT A KEY. The levels were listed as
 * "1 you mentioned it / 2 she has the basics / …" beside numerals, which asked him to hold a
 * mapping in his head while looking at a grid of shapes. Ray: "There is a key under the grid now,
 * which helps, but it is words and numbers next to a picture made of blocks. Put the blocks in the
 * key and I would not have to work anything out."
 *
 * Drawn from the same LEVELS and the same green as the tiles, so the two cannot drift apart.
 */
function KeyGlyph({ filled }: { filled: number }) {
  return (
    <svg viewBox="0 0 20 24" className="h-6 w-5 shrink-0" aria-hidden="true">
      {LEVELS.map((i) => (
        <rect
          key={i}
          x={2}
          y={(3 - i) * 6}
          width={16}
          height={5}
          rx={1}
          fill={i < filled ? GREEN : '#e7e5e4'}
        />
      ))}
    </svg>
  );
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
  unfiledCount = 0,
  stillFiling = false,
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
  /**
   * Things Kira holds that are not yet filed into any area.
   *
   * ⚠️ WITHOUT IT THIS SENTENCE CONTRADICTS THE PAGE IT SITS ON. Ray found four statements about the
   * same thing on one screen: "Nothing is filled in yet" / "8 things captured" / nine areas
   * "Not captured" / "Not yet filed (8)". Nothing was untrue and the page was incoherent, which for
   * a man deciding whether to trust it is worse. Knowing the number lets the one sentence tell the
   * whole story instead of half of it.
   */
  unfiledCount?: number;
  /**
   * ⚠️ SHE FILES AFTER THE CALL, AND THE PAGE MUST SAY SO WHILE SHE IS DOING IT.
   *
   * Distillation runs when the conversation ends and takes a few minutes, so an owner who walks
   * straight here from a good conversation sees nine empty bars and a sentence telling him that is
   * expected before his first conversation — which he has just had.
   *
   * Ray, 2026-08-16: "She had just told me she had got it. The page said she had not… Most owners
   * will not come back later — they will conclude it does not work, which is exactly what I
   * concluded for about twenty minutes."
   *
   * Set by the page from the last conversation's end time. It never claims she is busy on a page
   * opened the next day.
   */
  stillFiling?: boolean;
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
  // ⚠️ THE THIRD QUANTITY, AND ITS ABSENCE IS WHY THE PAGE CONTRADICTED ITSELF.
  //
  // There are three states on this screen and only two were ever counted: CAPTURED (she has it),
  // LOCATED (he answered for it in the thirteen questions, she has captured nothing), and NOTHING.
  // `untouched` counts by `coverage`, which treats located as empty — correctly, since a self-report
  // is not a captured fact. So the footer said "Nothing is filled in yet" above six tiles that were
  // visibly showing something, and Ray counted six different totals for one pile: "if the stock
  // count disagrees with the invoice, you stop and find out why before you do anything else."
  //
  // Naming the third quantity is what lets one sentence tell the whole truth instead of a third of it.
  const located = sections.filter((s) => bucketDisplay(s) === 'located').length;
  // ⚠️ BOTH NUMBERS. "0 of 9 well covered so far" sat directly above a grid where three visibly had
  // green in them. Ray: "I understand what you mean — well covered is a high bar. But the headline
  // number a man reads is zero, and the picture underneath says three… the summary contradicts the
  // picture and the picture is the honest one."
  const started = sections.filter((s) => s.coverage !== 'empty').length;

  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold text-stone-900">{heading}</h2>
        {/* ⚠️ COMPACT ONLY. On /my-genome this link pointed at the page it was already on. Ray
            clicked it three times: "and it goes to the page I'm already on. Nothing happens."
            A link that does nothing costs more trust than a missing one. */}
        {variant === 'compact' && (
          <Link
            href={href}
            className="inline-flex min-h-[44px] items-center text-base font-semibold text-violet-700 underline underline-offset-4"
          >
            Open your Genome
          </Link>
        )}
      </div>

      {/* THE EXPLANATORY HEADER (§5 of the product standards) — what this is, what to do, why it
          matters. It also does the bounding: this says how much Kira HOLDS, and stops short of any
          claim about what the business is worth or whether it is ready to sell.

          ⚠️ IT NO LONGER CARRIES A COUNT. It said "${started} of 9 started, ${covered} well covered"
          a few inches above a footer saying "0 of 9 areas are well covered, 6 more are sketched in"
          — two tallies of the same grid, in different words, on one screen. Ray, 2026-08-17: "Four
          different counts of the same thing on two screens. I read the whole page before I touch
          anything, so I found all four." One statement per component; the footer is it. */}
      <p className="mt-1 max-w-prose text-base leading-relaxed text-stone-600">
        {intro ??
          `Your business, in the nine areas a buyer's advisor works through. Each one fills up as Kira captures what answers it — that is how much she holds, not how good that part of the business is. Tap any area to work on it.`}
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
                aria-label={`${section.title}: ${band.label} — ${band.filled} of 4 levels`}
              >
                {LEVELS.map((i) => {
                  const isFilled = i < band.filled;
                  // ⚠️ A FILLED BAR IS A PROMISE — so "you told us" is SKETCHED, never solid.
                  //
                  // He answered for it in the thirteen questions; Kira has captured nothing. Drawing
                  // that as a solid block put a filled bar directly above the words "Not captured"
                  // in the list on the same screen — one of six totals Ray found disagreeing with
                  // each other. His fix, and it is the right one: "if 'you told us in the
                  // questionnaire' is genuinely a different state, give it its own visual — a dotted
                  // outline, not a filled bar."
                  //
                  // Now the picture and the words agree: nothing is filled, one level is sketched in.
                  const outlineOnly = display === 'located';
                  const r = levelRect(i);
                  return (
                    <rect
                      key={i}
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      rx={4}
                      fill={isFilled && !outlineOnly ? band.fill : EMPTY_FILL}
                      stroke={isFilled ? (outlineOnly ? band.fill : '#1c1917') : EMPTY_STROKE}
                      strokeWidth={isFilled && outlineOnly ? 2.5 : 1.5}
                      strokeDasharray={isFilled && outlineOnly ? '5 3' : undefined}
                    />
                  );
                })}
              </svg>

              <p className="mt-2 text-sm font-semibold leading-snug text-stone-900">{section.title}</p>

              {/* The band as a WORD beneath the picture — see the aria-label note above. */}
              <span
                className={`mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-sm sm:text-xs font-semibold ${band.chip}`}
              >
                {band.label}
              </span>

              {/* ⚠️ SAY IT IS CLICKABLE. Ray found it by accident: "nothing says so. No underline,
                  no arrow, no 'view'… A bloke my age doesn't go poking at pictures to see if they
                  do something." A hover state is not an affordance for someone who never hovers. */}
              {areaHref && (
                <span className="mt-1 text-base sm:text-xs font-semibold text-violet-700 underline underline-offset-2">
                  Open this area
                </span>
              )}

              {display === 'located' && section.baseline ? (
                /* HIS OWN WORDS. `AreaBaseline.statement` is written "addressed to the owner, in his
                   own words as far as possible", which is what makes this a receipt for what he told
                   us rather than a claim we are making. */
                <p className="mt-1.5 text-base sm:text-xs leading-relaxed text-stone-600">{section.baseline.statement}</p>
              ) : display === 'empty' ? (
                <p className="mt-1.5 text-base sm:text-xs text-stone-500">{emptyReason(section.key)}</p>
              ) : null}
              </Card>
            </li>
          );
        })}
      </ul>

      {/* THE KEY. Four boxes with nothing saying what they mean is, in Ray's words, "a progress
          bar for a journey nobody has described… I am guessing, and a man guessing about his own
          business is not the feeling you are selling." Four words per level, once, under the grid. */}
      {/* ⚠️ THE KEY USES THE TILES' OWN WORDS, or it explains nothing.
          The tiles read "You told us / Just started / Building up / Well covered" and the key read
          "you mentioned it / she has the basics / most of it is written down / a buyer could use
          it" — four levels described twice with no word in common, so a man matching one to the
          other had to infer the mapping. Ray, 2026-08-17: the labels and the legend "share no
          words"; "You told us" resolves lower down to "Not captured".
          The label now comes from BANDS — the same constant the tiles render — so the two cannot
          drift apart again, and the plain-English gloss follows it. */}
      <ol className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-100 pt-4 text-base text-stone-600 sm:text-sm">
        {(
          [
            ['located', 'you have mentioned it'],
            ['thin', 'she has the basics'],
            ['building', 'most of it is written down'],
            ['covered', 'a buyer could use it'],
          ] as const
        ).map(([band, gloss], i) => (
          <li key={band} className="flex items-center gap-2">
            <KeyGlyph filled={i + 1} />
            <span>
              <span className="font-semibold text-stone-900">{BANDS[band].label}</span> — {gloss}
            </span>
          </li>
        ))}
      </ol>
      {variant === 'full' && (
        <div className="mt-6 border-t border-stone-100 pt-4">
          {/* SAID FIRST, AND SAID BEFORE THE COUNTS — because the counts are what is wrong.
              A man who has just finished talking is looking at bars that have not moved, and the
              only honest reading of that screen is "it did not work". One line converts twenty
              minutes of that into a wait. It is deliberately above the summary rather than beside
              it: he needs the reason before he reads the numbers, not after. */}
          {stillFiling && (
            <p className="mb-3 max-w-prose rounded-2xl bg-violet-50 px-4 py-3 text-base text-violet-900">
              She is still writing up your last conversation — that takes a few minutes after you
              finish talking. The areas below will not have moved yet. Nothing is lost; check back
              shortly.
            </p>
          )}
          {/* WRITTEN TO READ WELL AT ZERO, which is where every owner starts.
              The baseline from the questionnaire is deliberately never counted toward coverage — a
              self-reported answer is not a captured fact — so a man who has just paid sees nine
              "Nothing yet" bars. That is honest, and it is the pitch rather than a failure: the gap
              he was shown a screen ago, with locations on it. It must not read as a report card on
              his business, so the sentence names the cause (we have not talked yet) rather than the
              state (you are at zero). */}
          <p className="max-w-prose text-base text-stone-600">
            {/* ONE SENTENCE, ALL THREE QUANTITIES. Every branch names what is captured, what is
                only sketched in from his own answers, and what is still holding. Saying only one of
                the three is what made six statements on one screen disagree. */}
            {untouched === sections.length
              ? [
                  located > 0
                    ? `${located} of ${sections.length} ${located === 1 ? 'area is' : 'areas are'} sketched in from your own answers — that is the dashed outline. Kira counts nothing as captured until you have talked it through with her.`
                    : 'Nothing is captured yet — that is expected before your first conversation.',
                  unfiledCount > 0
                    ? `She is also holding ${unfiledCount} ${unfiledCount === 1 ? 'thing' : 'things'} you have told her and has not yet worked out where ${unfiledCount === 1 ? 'it belongs' : 'they belong'}. Nothing is lost in the meantime.`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              : covered === sections.length
                ? 'Every area is well covered. From here the work is confirming what Kira holds — a fact she has read back to you and you have agreed with is the form a buyer cannot discount.'
                : [
                    `${covered} of ${sections.length} areas are well covered.`,
                    located > 0 ? `${located} more ${located === 1 ? 'is' : 'are'} sketched in from your own answers.` : '',
                    'The empty ones are where the most value is still tied up in you.',
                  ]
                    .filter(Boolean)
                    .join(' ')}
          </p>
        </div>
      )}
    </section>
  );
}
