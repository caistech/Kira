'use client';

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

import { useState } from 'react';
import { ArrowRight, Check, FileText, Lock, ShieldCheck } from 'lucide-react';
import { EXAMPLE_GENOME, EXAMPLE_BUSINESS, overallCoverage, type Confidence } from '@/lib/genome/example';

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirmed: 'You confirmed this',
  captured: 'Captured — not yet confirmed',
  thin: 'Thin — needs a conversation',
};

export default function GenomePage() {
  const [open, setOpen] = useState<string | null>(EXAMPLE_GENOME[0].key);
  const overall = overallCoverage();

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800 font-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Outfit:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Outfit', sans-serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        .grad-genome { background: linear-gradient(135deg,#16A34A,#15803D 60%,#166534); }
        .grad-coral { background: linear-gradient(135deg,#15803D,#166534); }
      `}</style>

      <header className="sticky top-0 z-40 bg-amber-50/85 backdrop-blur border-b border-amber-200/60">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <a href="/" className="font-display font-bold text-xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">Kira</a>
          <a href="/business-valuation" className="text-sm text-stone-500 hover:text-pink-500 min-h-[44px] flex items-center">Value my business</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pb-20">
        <section className="py-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 text-violet-700 text-sm font-semibold px-3 py-1.5 mb-5">
            <FileText className="h-4 w-4" /> An example Genome
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
        </section>

        <section className="grad-genome rounded-3xl p-8 text-white">
          <p className="text-white/80 font-medium">On the page, not in your head</p>
          <p className="font-display text-5xl font-bold mt-1">{overall}%</p>
          <p className="text-white/90 max-w-xl mt-4 leading-relaxed">
            This is the number that moves. Every conversation fills in a little more, and the parts still
            carried in one person&apos;s memory are named rather than glossed over — because those are exactly
            what a buyer discounts you for.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          {EXAMPLE_GENOME.map((s) => {
            const isOpen = open === s.key;
            return (
              <article key={s.key} className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : s.key)}
                  aria-expanded={isOpen}
                  className="w-full text-left px-5 py-4 min-h-[64px] flex items-center justify-between gap-4 hover:bg-amber-50/60"
                >
                  <span>
                    <span className="font-display font-bold text-lg block">{s.title}</span>
                    <span className="text-sm text-stone-500">{s.question}</span>
                  </span>
                  <span className="flex-shrink-0 text-right">
                    <span className="font-display font-bold text-xl">{s.coverage}%</span>
                    <span className="block text-xs text-stone-400">documented</span>
                  </span>
                </button>

                <div className="h-1.5 w-full bg-amber-100">
                  <div className="h-full grad-coral" style={{ width: `${s.coverage}%` }} />
                </div>

                {isOpen && (
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
                )}
              </article>
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
              <p className="font-display font-bold text-lg">Privacy mode — on the roadmap, and not built yet</p>
              <p className="text-stone-700 mt-2 leading-relaxed">
                Where this is going: Kira sits quietly in the background while you work and only wakes when
                you say her name — like Siri, but for your business. That means a pause you can hit at any
                time, and Kira offering it herself when a conversation is obviously not hers to hear:{' '}
                <em>&ldquo;want me to turn off for this?&rdquo;</em> A good executive assistant leaves the room
                without being asked.
              </p>
              <p className="text-stone-700 mt-3 leading-relaxed">
                We are telling you it is not finished because most owners reading this have not told their
                staff or their family yet, and you should know exactly what we can and cannot do before you
                say a word to us. Today Kira listens only when you open a conversation and press the button.
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
