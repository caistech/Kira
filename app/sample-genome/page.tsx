// @public-route

// app/genome/page.tsx
//
// The Business Genome, made visible. "We promise, they see."
//
// The landing page has promised a "Business Genome" for months with nothing behind the word — the
// route 404'd, and the FAQ and privacy policy both promised an export that did not exist. A
// 66-year-old is being asked for $999/month for a deliverable he has never laid eyes on, which is
// the hardest possible thing to ask of this ICP.
//
// So this shows a REAL-SHAPED example, labelled as an example throughout, organised by the questions
// a buyer's advisor actually asks. The coverage numbers are the honest half: they name what is still
// only in his head, which is precisely what he is paying to change.

// NO 'use client' AND NO useState — P3/K5.
//
// The accordion was the ONLY interactive thing on this page, and it made the whole page a client
// component: every card's clickability waited on the bundle. Native <details> needs no JS, so the
// page is now a server component and there is no window in which it is served-but-inert.
import type { Metadata } from 'next';

import { ArrowRight, Check, ChevronDown, FileText, Lock, ShieldCheck } from 'lucide-react';
import { GenomeBuckets } from '@/components/GenomeBuckets';
import { EXAMPLE_GENOME, EXAMPLE_BUSINESS, exampleTransferability, type Confidence, type CoverageBand } from '@/lib/genome/example';

// Per-page title (register P20). "Kira — your part-time general manager" sat on every page, so a
// man comparing his own valuation against the worked example in another tab could not tell the two
// apart. The distinguishing word goes first, because a tab strip shows about twenty characters.
export const metadata: Metadata = {
  title: 'See a real Business Genome · Kira',
  description:
    'A worked example of a finished Business Genome — the nine areas, what is captured in each, and what is still only in the owner’s head.',
};

// The bar is a VISUAL for the band, not a measurement. Four fixed widths, so nothing on screen
// implies a precision the band does not carry.
const BAND_WIDTH: Record<CoverageBand, number> = { covered: 90, building: 60, thin: 30, empty: 6 };

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirmed: 'You confirmed this',
  captured: 'Captured — not yet confirmed',
  thin: 'Thin — needs a conversation',
};

export default function GenomePage() {
  const overall = exampleTransferability();

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800 font-body">
      <style>{`
        /* SELF-HOSTED FONTS, PAGE-SCOPED TYPOGRAPHY — K5/P3.
           An @import of a Google Fonts stylesheet stood here: a render-blocking third-
           party stylesheet inside a BODY <style>, invisible to the preload scanner, on five pages —
           and on the pages a tester called slow. next/font (app/layout.tsx) self-hosts the two
           faces and exposes them as variables, so the external request is gone entirely.
           ⚠️ These two rules stay HERE rather than moving to globals.css. Tailwind maps
           .font-display/.font-body to Inter and DESIGN.md §4 defers a second face; a body rule
           beats the head sheet at equal specificity, so keeping them page-scoped is what stops this
           becoming a site-wide typeface change nobody asked for. */
        .font-display { font-family: var(--font-display), 'Outfit', ui-sans-serif, sans-serif; }
        .font-body { font-family: var(--font-body), 'DM Sans', ui-sans-serif, sans-serif; }
        .grad-genome { background: linear-gradient(135deg,#16A34A,#15803D 60%,#166534); }
        .grad-coral { background: linear-gradient(135deg,#15803D,#166534); }

        /* The default disclosure triangle, removed in both dialects — Safari still needs the
           -webkit- pseudo-element, and without it the card carries two indicators. The chevron
           below is the one indicator, and it turns on [open] with no JS involved. */
        .genome-area > summary { list-style: none; }
        .genome-area > summary::-webkit-details-marker { display: none; }
        .genome-area[open] > summary .genome-chevron { transform: rotate(180deg); }
      `}</style>

      <header className="sticky top-0 z-40 bg-amber-50/85 backdrop-blur border-b border-amber-200/60">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <a href="/" className="font-display font-bold text-xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">Kira</a>
          <a href="/business-valuation" className="text-sm text-stone-500 hover:text-pink-500 min-h-[44px] flex items-center">Value my business</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pb-20">
        <section className="py-12">
          {/* ⚠️ EMBLAZONED, NOT MENTIONED — operator instruction, 2026-08-15.
              The page used to say "An example Genome" in a quiet violet pill. That is a LABEL; this
              is a WARNING, and the difference cost something real: the operator opened this page
              while signed in, expected his own Genome, and read a fictional plumber's. If it can
              catch the person who commissioned it, it will catch a 66-year-old who has just been
              told his own Genome exists.
              The route rename (/genome -> /sample-genome) fixes the address. This fixes the page. */}
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400 text-stone-900 text-sm font-bold uppercase tracking-widest px-4 py-1.5 mb-5">
            <FileText className="h-4 w-4" /> Sample — not your business
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight max-w-3xl">
            This is what &ldquo;getting it out of your head&rdquo; actually looks like.
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mt-5 leading-relaxed">
            Your Business Genome is the operations manual your business never had. Kira builds it from
            ordinary conversations while you work — no forms, no homework — and organises it around the
            questions a buyer&apos;s advisor will ask you anyway. Below is a worked example, so you can see
            exactly what you would end up owning.
          </p>
          <p className="text-base text-stone-500 mt-4">
            {EXAMPLE_BUSINESS.name}. {EXAMPLE_BUSINESS.note}
          </p>
          {/* WHERE HE IS HEADING, said plainly. Operator: "I would have a perfect example used to
              show them where they are heading." A half-finished sample shows a half-finished
              deliverable, which is the wrong thing to put in front of someone deciding whether the
              deliverable is worth paying for. Saying it is a FINISHED one is what keeps that honest
              rather than aspirational — he is not being shown week one. */}
          <p className="mt-4 max-w-2xl rounded-2xl border border-stone-200 bg-white p-4 text-base leading-relaxed text-stone-700">
            <strong className="text-stone-900">This one is finished.</strong> It is what a business
            looks like once the work is done — every area answered, the owner-dependent parts named,
            nothing left that only he could explain. Yours starts empty and fills up as you talk to
            her.{' '}
            <a href="/my-genome" className="font-semibold text-violet-700 underline underline-offset-4">
              Yours is here
            </a>
            .
          </p>
        </section>

        {/* THE NINE AREAS AT A GLANCE, above the detail.
            The operator asked three times where the visual was, and the answer was that it existed
            only on /dashboard — behind a login, on a page a prospect never reaches. This is the page
            that sells the deliverable, so it is the page where seeing the shape of it matters most.
            ⚠️ `trackMovement={false}` — the sample is FIXED. Remembering its bands and pulsing a
            "move" on a later visit would congratulate a visitor for work nobody did, on the one page
            whose whole job is to be believable, and would pollute a real owner's stored bands. */}
        <GenomeBuckets
          sections={EXAMPLE_GENOME.map((sec) => ({ key: sec.key, title: sec.title, coverage: sec.coverage }))}
          trackMovement={false}
          href="/my-genome"
          heading="The nine areas, finished"
          intro="Every area a buyer's advisor works through, answered. This is the shape you are aiming at — yours starts empty and fills as you talk to her."
        />

        <section className="grad-genome rounded-3xl p-8 text-white">
          {/* ONE METRIC, ONE SCALE, ONE NAME — see exampleTransferability().
              This said "On the page, not in your head" over a percentage that exists nowhere in the
              product, while the valuation and My Genome both show "Transferability /100". Two
              numbers, both captioned as the one that matters. */}
          <p className="text-white/80 font-medium">Transferability — the number that moves</p>
          <p className="font-display text-5xl font-bold mt-1">{overall}<span className="text-3xl font-semibold text-white/70">/100</span></p>
          <p className="text-white/90 max-w-xl mt-4 leading-relaxed">
            This is the number that moves. Every conversation fills in a little more, and the parts still
            carried in one person&apos;s memory are named rather than glossed over — because those are exactly
            what a buyer discounts you for.
          </p>
        </section>

        {/* NATIVE <details>, SO THE CARDS WORK BEFORE THE JAVASCRIPT ARRIVES — P3/K5.
            "8 of the 9 areas are not clickable." Investigated on production: the handlers were real
            and did work, but a click issued before hydration was silently dropped — aria-expanded
            unchanged, no text moved, no console error. The page was served, readable, and inert,
            and the failure is indistinguishable from a broken button.
            The measured window was only ~300ms from a fast headless client on a fast link, which
            does not explain a man clicking, waiting and giving up — so his client was slower, and
            since his client cannot be measured from here, the fix removes the DEPENDENCY rather
            than shortening the wait. <details> is open/closed by the browser with no JS at all, so
            there is no window in which it is inert, whatever the device.
            `name` gives exclusive accordion behaviour natively where supported; where it is not,
            the panels open independently, which is a graceful loss rather than a broken one. */}
        <section className="mt-10 space-y-3">
          {EXAMPLE_GENOME.map((s, i) => {
            return (
              <details
                key={s.key}
                name="genome-area"
                open={i === 0}
                className="genome-area rounded-2xl border border-amber-200 bg-white overflow-hidden"
              >
                <summary className="w-full cursor-pointer text-left px-5 py-4 min-h-[64px] flex items-center justify-between gap-4 hover:bg-amber-50/60">
                  <span>
                    <span className="font-display font-bold text-lg block">{s.title}</span>
                    <span className="text-sm text-stone-500">{s.question}</span>
                  </span>
                  {/* The product's own four bands, not a percentage it never produces.
                      ⚠️ The sub-label "documented" used to sit under a percentage, where it read
                      correctly ("78% documented"). Under a band it produced "Empty / documented" on
                      the same card — a page contradicting itself on one line, which is exactly what
                      a tester reported hours after this shipped. The band IS the statement; it does
                      not need a noun under it. */}
                  <span className="flex-shrink-0 flex items-center gap-3 text-right">
                    <span className="font-display font-bold text-xl capitalize">{s.coverage}</span>
                    <ChevronDown className="genome-chevron h-5 w-5 text-stone-400 transition-transform" />
                  </span>
                </summary>

                <div className="h-1.5 w-full bg-amber-100">
                  <div
                    className="h-full grad-coral"
                    style={{ width: `${BAND_WIDTH[s.coverage]}%` }}
                  />
                </div>

                <div className="px-5 py-5 space-y-5">
                    {s.entries.map((e) => (
                      <div key={e.title} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-stone-800">{e.title}</p>
                          <p className="text-stone-600 mt-1 leading-relaxed">{e.detail}</p>
                          <p className="text-xs text-stone-400 mt-2">
                            {CONFIDENCE_LABEL[e.confidence]} · {e.capturedFrom}
                          </p>
                        </div>
                      </div>
                    ))}

                    {s.stillOnlyInYourHead.length > 0 && (
                      <div className="rounded-xl bg-amber-100/70 px-4 py-4">
                        <p className="font-semibold text-stone-800">Still only in your head</p>
                        <ul className="mt-2 space-y-1.5 text-stone-700">
                          {s.stillOnlyInYourHead.map((g) => <li key={g}>· {g}</li>)}
                        </ul>
                        <p className="text-sm text-stone-500 mt-3">
                          Kira will bring these up in conversation rather than sending you a form.
                        </p>
                      </div>
                    )}
                </div>
              </details>
            );
          })}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">What you can take with you</h2>
          <p className="text-stone-600 mt-3 max-w-2xl leading-relaxed">
            It is yours, and it leaves with you in a form someone else can read.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div className="rounded-2xl border border-amber-200 bg-white p-5">
              <FileText className="h-6 w-6 text-violet-500" />
              <p className="font-display font-bold text-lg mt-3">A handover document</p>
              <p className="text-stone-600 mt-2 leading-relaxed">
                One pack a buyer&apos;s accountant or solicitor can read cold — the same sections you see above,
                with the gaps stated honestly. This is the thing that shortens due diligence.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-5">
              <ShieldCheck className="h-6 w-6 text-violet-500" />
              <p className="font-display font-bold text-lg mt-3">A copy of the data</p>
              <p className="text-stone-600 mt-2 leading-relaxed">
                A machine-readable file of everything captured, exportable whenever you like. If you stop
                paying us, you keep it.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-6">
          <div className="flex items-start gap-3">
            <Lock className="h-6 w-6 text-violet-600 flex-shrink-0 mt-0.5" />
            <div>
              {/* ⚠️ REWRITTEN 2026-08-09 — register P18. THE ORDER WAS THE DEFECT, and the first
                  sentence was worse than the order.
                  It opened "Kira sits quietly in the background while you work and only wakes when
                  you say her name — like Siri, but for your business." His reading: "for a man whose
                  entire problem is leakage, 'sits quietly in the background' is not a feature, it's
                  the thing I'm afraid of." The heading did say "not built yet" — and it does not
                  help, because "the sentence before that lands first."
                  Two changes. WHAT IS TRUE TODAY GOES FIRST, so the reassurance is not conditional
                  on him parsing a roadmap note. And the roadmap item is described by the half that
                  is actually the feature — the LEAVING, not the listening. An always-on microphone
                  waiting for its name is not what we are selling him, and describing it as though it
                  were is the K20 failure in print: unbuilt surveillance is the claim this audience
                  least forgives, and it was being volunteered. */}
              <p className="font-display font-bold text-lg">Privacy mode — on the roadmap, and not built yet</p>
              <p className="text-stone-700 mt-2 leading-relaxed">
                First, what is true today. Kira hears nothing at all unless you open a conversation and
                press the button, and she stops when you close it. There is no listening in the
                background, nothing waiting for its name, and nothing running between conversations.
              </p>
              <p className="text-stone-700 mt-3 leading-relaxed">
                What is coming is not more listening — it is a better way to stop. A pause you can hit
                mid-sentence without ending the conversation, and Kira offering it herself when what is
                being said is obviously not hers to hear: <em>&ldquo;want me to turn off for this?&rdquo;</em>{' '}
                A good executive assistant leaves the room without being asked.
              </p>
              <p className="text-stone-700 mt-3 leading-relaxed">
                We are telling you it is not finished because most owners reading this have not told their
                staff or their family yet, and you should know exactly what we can and cannot do before you
                say a word to us.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12 text-center">
          <a href="/business-valuation" className="grad-coral text-white font-display font-bold px-8 py-4 rounded-full inline-flex items-center gap-2 min-h-[52px]">
            See what your business is worth <ArrowRight className="h-5 w-5" />
          </a>
          <p className="text-sm text-stone-500 mt-4">Three minutes, eleven questions, no card.</p>
        </section>
      </main>
    </div>
  );
}
