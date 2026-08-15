// @public-route
// What Kira does, and what she doesn't — the expectation-setting page.
//
// ONE page for both audiences, not two. Two versions of the same truth drift, and an advisor
// reading exactly what her client will be told is a feature rather than a leak: that is the thing
// she is assessing before she puts her name on an introduction.
//
// THE LIMITS ARE THE PERSUASIVE HALF, which is counter-intuitive until you have watched the ICP
// read them. The single most positive reaction in his walkthrough was to the paragraph admitting
// privacy mode is not built: "you've told me the bad news before I asked — that is the paragraph
// that would get the truth out of me." A man deciding whether to hand over thirty years of
// undocumented knowledge is not shopping for features. So the two columns carry equal weight here,
// and the "can't" side is written without apology or hedging.
//
// Content comes from lib/capabilities.ts so this page cannot drift from what the product does. A
// published capability list that overstates is not a stale page, it is a broken promise in print.

import Link from 'next/link';

import { CAN, CANNOT, ENFORCEMENT } from '@/lib/capabilities';

export const metadata = {
  title: 'What Kira does — and what she doesn’t · Kira',
  description:
    'Plainly: the things Kira can do for an owner today, and the things she cannot. Written for owners and for the advisors who introduce them.',
};

export default function WhatSheDoesPage() {
  return (
    <main className="min-h-screen bg-amber-50 text-stone-800">
      <nav className="border-b border-amber-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-xl font-bold text-stone-800">
            Kira
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/sample-genome" className="text-sm font-medium text-stone-600 hover:text-pink-500">
              What you get
            </Link>
            <Link href="/advisors" className="hidden text-sm font-medium text-stone-600 hover:text-pink-500 sm:block">
              For advisors
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold leading-tight text-stone-900 sm:text-5xl">
          What she does, and what she doesn’t.
        </h1>
        <p className="mt-6 max-w-prose text-lg leading-relaxed text-stone-600">
          Both lists, on one page, because the second one is the one that tells you whether to believe
          the first. If you ask her for something she can’t do, she’ll say so straight away rather
          than ask you three questions and then let you down.
        </p>
      </section>

      <section className="border-y border-amber-100 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-2xl font-bold text-stone-900">Ask her for these</h2>
          <ul className="mt-8 space-y-6">
            {CAN.map((c) => (
              <li key={c.ask} className="border-l-4 border-emerald-300 pl-5">
                <p className="font-display text-lg font-bold text-stone-900">{c.ask}</p>
                <p className="mt-1.5 leading-relaxed text-stone-600">{c.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="font-display text-2xl font-bold text-stone-900">She can’t do these</h2>
        <p className="mt-3 max-w-prose leading-relaxed text-stone-600">
          Not “not yet, ask us nicely”. There is no setting that turns these on, and where something
          genuinely is coming, it says so.
        </p>
        <ul className="mt-8 space-y-6">
          {CANNOT.map((l) => (
            <li key={l.thing} className="border-l-4 border-stone-300 pl-5">
              <p className="font-display text-lg font-bold text-stone-900">{l.thing}</p>
              <p className="mt-1.5 leading-relaxed text-stone-600">{l.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* The advisor's half. Same list, plus the thing her compliance officer actually asks: what
          makes a limit a limit rather than an intention. Not a separate page — she wants to see
          exactly what her client will be shown. */}
      <section className="border-y border-amber-100 bg-stone-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-2xl font-bold text-stone-900">
            If you’re introducing a client
          </h2>
          <p className="mt-3 max-w-prose leading-relaxed text-stone-600">
            You’re reading the same list your client will. What you’ll also want is what holds each
            limit in place, because “we wouldn’t do that” and “it cannot do that” are different
            promises.
          </p>

          <div className="mt-8 space-y-6">
            {ENFORCEMENT.map((e) => (
              <div key={e.claim} className="rounded-2xl border border-stone-200 bg-white p-6">
                <h3 className="font-display text-lg font-bold text-stone-900">{e.claim}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  <span className="font-semibold text-stone-600">What holds it:</span> {e.basis}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/advisors"
              className="font-display flex min-h-[48px] items-center rounded-full bg-stone-800 px-6 text-base font-bold text-white hover:bg-stone-900"
            >
              The introducer terms →
            </Link>
            <a
              href="/api/trust"
              className="font-display flex min-h-[48px] items-center rounded-full border-2 border-stone-300 px-6 text-base font-bold text-stone-700 hover:border-stone-400"
            >
              Download the one-page briefing
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="max-w-prose mx-auto text-lg leading-relaxed text-stone-600">
          If there’s something you’d want her to do that isn’t on the first list, tell her anyway.
          She writes it down, and that list is what decides what gets built next.
        </p>
        <Link
          href="/business-valuation"
          className="font-display mt-8 inline-flex min-h-[52px] items-center rounded-full bg-stone-800 px-7 text-base font-bold text-white hover:bg-stone-900"
        >
          See what your business is worth →
        </Link>
      </section>

      <footer className="border-t border-amber-100 bg-white py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-stone-500">
          <p>Kira · Corporate AI Solutions</p>
          <div className="flex gap-5">
            <Link href="/sample-genome" className="hover:text-pink-500">
              What you get
            </Link>
            <Link href="/terms" className="hover:text-pink-500">
              Terms
            </Link>
            <Link href="/" className="hover:text-pink-500">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
