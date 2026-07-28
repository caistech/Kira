'use client';

// The ICP demo. Public, static, no auth, no DB — nobody creates an account to evaluate, and an owner
// who has told nobody he is selling certainly will not.
//
// AUTO-ADVANCE with an obvious pause, big targets, words rather than icons: he is 66 and watches
// rather than drives.
//
// It OPENS ON WHAT KIRA CANNOT DO. That is the evidence, not a hunch — the only two things that
// moved the ICP tester toward trusting this were admissions (the Genome being honest about its gaps,
// and privacy mode labelled unbuilt). Leading with the limits is what buys the right to claim
// anything afterwards.

import { DemoPlayer } from '@/components/DemoPlayer';
import { ICP_BEATS } from '@/lib/genome/timeline';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-amber-50 text-stone-800 font-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Outfit:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Outfit', sans-serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <header className="sticky top-0 z-40 bg-amber-50/85 backdrop-blur border-b border-amber-200/60">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <a href="/" className="font-display font-bold text-xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">Kira</a>
          <a href="/business-valuation" className="text-base text-stone-600 hover:text-pink-500 min-h-[44px] flex items-center">Value my business</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-20">
        <section className="py-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
            Watch what happens over six months.
          </h1>
          <p className="text-lg text-stone-600 mt-5 leading-relaxed">
            A real-shaped plumbing business — thirty-one years old, nine staff, and it runs on one man.
            Press start and Kira will talk you through it. Nothing here is a real business, and no real
            accounts or data are involved.
          </p>
          <p className="text-base text-stone-500 mt-3">
            Takes about three minutes. You can pause at any point, and it reads fine with the sound off.
          </p>
        </section>

        <DemoPlayer beats={ICP_BEATS} mode="auto" big />

        <section className="mt-10 text-center">
          <a href="/genome" className="text-violet-600 font-semibold underline decoration-violet-300 underline-offset-4 min-h-[44px] inline-flex items-center text-lg">
            See the whole example Genome →
          </a>
          <p className="text-base text-stone-500 mt-6">
            Or find your own number first — three minutes, eleven questions, no card.
          </p>
          <a href="/business-valuation" className="mt-4 text-white font-display font-bold px-8 py-4 rounded-full inline-flex items-center gap-2 min-h-[56px] text-lg"
             style={{ background: 'linear-gradient(135deg,#fb7185,#f472b6)' }}>
            Value my business →
          </a>
        </section>
      </main>
    </div>
  );
}
