// app/advisors/page.tsx
//
// The front door for brokers, accountants and advisors — the people who already hold the
// relationship with the owners Kira is for.
//
// Written for someone who sells businesses for a living. The argument is not "here's an AI tool";
// it's "your listings are worth more and close more often when the business runs without the owner
// in the middle of it, and you get paid while that happens."

import Link from 'next/link';

import { ADVISOR_FAQ } from '@/lib/faq';
import { AdvisorDemo } from './AdvisorDemo';

import { AdvisorEnquiryForm } from './AdvisorEnquiryForm';

export const metadata = {
  title: 'For brokers & accountants · Kira',
  description:
    'Introduce the owners you already act for. They get their business documented and running without them; you earn 10% monthly for as long as they subscribe.',
};

const STEPS = [
  {
    heading: 'You introduce a client',
    body: 'You send your own link, in your own words, to an owner you already act for. They open it and it is recorded as yours from that moment.',
  },
  {
    heading: 'Kira does the part they never get to',
    body: 'She talks to them between jobs, captures how the business actually runs, and turns what is in their head into something documented and transferable.',
  },
  {
    heading: 'You watch it move',
    body: 'Your dashboard shows who signed up and how their valuation is tracking. Progress only — never their conversations.',
  },
  {
    heading: 'You get paid, monthly',
    body: '10% of what they pay us, every month, for as long as they keep paying. On collected funds only.',
  },
  {
    // Stated to advisors as plainly as to owners. A broker is putting their own name on the
    // introduction, so the first thing they need to know is what they are NOT vouching for yet.
    heading: 'Privacy mode is on the roadmap, not built',
    body: 'Where this goes: Kira sits in the background and wakes on her name, with a pause the owner controls — and Kira offering it herself when a conversation is obviously private. Today she listens only when the owner opens a conversation. Your client is not being recorded in the background, and we would rather you heard that from us than have to ask.',
  },
];

export default function AdvisorsPage() {
  return (
    <main className="min-h-screen bg-amber-50 text-stone-800">
      <nav className="border-b border-amber-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-xl font-bold text-stone-800">
            Kira
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-stone-600 hover:text-pink-500">
              Home
            </Link>
            <Link href="/genome" className="hidden text-sm font-medium text-stone-600 hover:text-pink-500 sm:block">
              What your client gets
            </Link>
            <Link href="/#pricing" className="hidden text-sm font-medium text-stone-600 hover:text-pink-500 sm:block">
              Pricing
            </Link>
            <a
              href="#register"
              className="flex min-h-[44px] items-center rounded-full bg-stone-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-900"
            >
              Request access
            </a>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <p className="font-body text-sm font-semibold uppercase tracking-wider text-pink-500">
          For brokers, accountants &amp; advisors
        </p>
        <h1 className="font-display mt-3 text-4xl font-bold leading-tight text-stone-900 sm:text-5xl">
          Your clients in their sixties, whose business runs on them.
        </h1>
        <p className="mt-6 max-w-prose text-lg leading-relaxed text-stone-600">
          That is the only owner we work with: thirty or forty years in, genuinely profitable, and
          every decision still routes through one person. You know the ones — you would list them
          tomorrow if the owner weren&apos;t the product. The multiple suffers, due diligence drags, and
          deals fall over on things nobody ever wrote down. Send us that client and we get the
          business out of their head and onto the page, so what you list is an asset rather than a job.
        </p>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-stone-600">
          Kira is an AI executive assistant that gets that out of their head — by talking to them
          while they work, not by asking them to sit down and document a business. You introduce
          the client; you earn while they stay.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#register"
            className="font-display flex min-h-[52px] items-center rounded-full bg-stone-800 px-7 py-3.5 text-base font-bold text-white hover:bg-stone-900"
          >
            Request access →
          </a>
          <Link
            href="/business-valuation"
            className="font-display flex min-h-[52px] items-center rounded-full border-2 border-stone-300 px-7 py-3.5 text-base font-bold text-stone-700 hover:border-stone-400"
          >
            See what a client sees
          </Link>
        </div>
      </section>

      {/* The advisor demo. PREV/NEXT rather than auto-advance, because an advisor is evaluating and
          will want to go back and re-read the commission terms — where the owner watches, she
          interrogates. Same sample business as /genome and the ICP demo, so every surface describes
          one business rather than three. */}
      <section className="border-y border-amber-100 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-2xl font-bold text-stone-900">See it before you refer anyone</h2>
          <p className="mt-3 max-w-prose leading-relaxed text-stone-600">
            Six screens, in Kira&apos;s own voice, on a real-shaped client: what they experience, what you
            see, what you never see, and what you get paid. No real business, no real data — and it
            reads fine with the sound off.
          </p>
          <div className="mt-8">
            <AdvisorDemo />
          </div>
        </div>
      </section>

      <section className="border-y border-amber-100 bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-display text-2xl font-bold text-stone-900">How it works</h2>
          <ol className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <li key={step.heading} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6">
                <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="font-display mt-4 text-lg font-bold text-stone-900">{step.heading}</h3>
                <p className="mt-2 leading-relaxed text-stone-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border-2 border-stone-200 bg-white p-8">
          <h2 className="font-display text-2xl font-bold text-stone-900">The terms, plainly</h2>
          <dl className="mt-6 space-y-5">
            {[
              ['Commission', '10% of what the owner pays, monthly, on funds we have actually collected.'],
              ['For how long', "The life of their subscription. Five years of subscription is five years of commission."],
              ['Attribution', 'First-touch. Whoever introduced them is credited — not whoever they clicked last — and it cannot be quietly reassigned.'],
              ['Paid to', 'You or your firm, whichever you nominate.'],
              ['Cost to join', 'Nothing. No fee, no minimum, no exclusivity.'],
              ['The one condition', 'You only send it to owners you already hold a current listing or engagement agreement with, and you tell them you are paid a commission.'],
            ].map(([term, detail]) => (
              <div key={term} className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4">
                <dt className="font-display font-bold text-stone-900">{term}</dt>
                <dd className="leading-relaxed text-stone-600 sm:col-span-2">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-y border-amber-100 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-2xl font-bold text-stone-900">Questions advisors ask</h2>
          <div className="mt-8 space-y-3">
            {ADVISOR_FAQ.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-amber-100 bg-amber-50/50">
                <summary className="font-display flex cursor-pointer list-none items-center justify-between p-5 text-base font-bold text-stone-800 hover:bg-amber-50">
                  {faq.q}
                  <span className="text-2xl text-pink-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-5 pb-5 leading-relaxed text-stone-600">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="register" className="mx-auto max-w-2xl scroll-mt-8 px-6 py-16">
        <h2 className="font-display text-2xl font-bold text-stone-900">Request access</h2>
        <p className="mt-2 max-w-prose leading-relaxed text-stone-600">
          Tell us a little about your practice and we&apos;ll set you up with your link and a
          dashboard. A person reads these — you&apos;ll hear back from us, not an autoresponder.
        </p>
        <div className="mt-6 rounded-3xl border border-amber-100 bg-white p-6 sm:p-8">
          <AdvisorEnquiryForm />
        </div>
      </section>

      <footer className="border-t border-amber-100 bg-white py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-stone-500">
          <p>Kira · Corporate AI Solutions</p>
          <div className="flex gap-5">
            <Link href="/#pricing" className="hover:text-pink-500">
              Pricing
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
