// @public-route

// app/about/page.tsx
//
// WHOSE PAGE THIS IS — decided 2026-08-09, DECISIONS.md §8.
//
// This was Corporate AI Solutions' page, on Kira's domain. Navy and orange against a cream site, a
// pink-to-orange gradient wordmark, four emoji, and the vocabulary of a portfolio deck: "a suite of
// AI Voice Agent platforms", "a marketplace of specialized AI Voice Agents", "Longtail AI Ventures",
// "That's the bet. That's the vision. And we're just getting started."
//
// The reader is a 66-year-old owner who opened it before typing his turnover into anything, because
// "that's what a suspicious man does before he types a turnover figure into a website." His verdict:
// "I genuinely thought I'd clicked through to a different company", and the expensive part — "That
// paragraph made me trust you. This page took it back."
//
// So the page now carries the founder section from the landing at full length. It is not new copy:
// it is the copy that already works, on the URL where it was being looked for. Ray again: "You
// already wrote the right About page. It's just on the wrong URL."
//
// THREE THINGS THAT WERE NOT TONE, and are the reason this was a rewrite rather than a restyle:
//
//   1. "Always Improving — Every agent learns, adapts, and gets better with every conversation."
//      Against the landing's "not sold, not pooled, not used to train anyone's model." He read the
//      first as "you train on what I tell you" and said the only thing that matters: "I know you
//      probably mean two different things. I can't tell which one to believe." For this ICP that is
//      the single worst sentence on the site. Gone, and the landing's actual data promise is here
//      instead — one statement of it, in one place. (Register P14; third confirmed instance of the
//      class K15's unbuilt single-statement check exists to catch.)
//   2. "Voice-First — Designed for natural conversation. Talk, don't type." Against the landing's
//      "if you would rather type, you can", to the one reader who will never speak out loud in an
//      office with a bookkeeper twenty feet away.
//   3. A page-local `fixed top-0 z-50` nav, on a route where the root layout ALSO renders
//      CorporateHeader — two navigation bars, one sitting on the other. Removed rather than
//      excluded: /about is a marketing page and the shared header is the correct chrome for it.
//      (See components/corporate/SiteHeader.tsx — /about is deliberately NOT in OWN_HEADER.)
//
// Also removed: an inline <style> importing DM Sans and Outfit from Google Fonts. Every face in this
// product is Inter by recorded decision (DESIGN.md §4), so those two were loading a typeface nothing
// else uses — and an @import inside a <style> element is render-blocking and discovered late, which
// is a live candidate for the slow-paint reports (register P3/K5). Colours now come from the
// kira-* tokens like every other surface.
//
// The portfolio story — the marketplace, the thesis — is deliberately NOT relocated. It has no
// destination from this product today, and inventing one is a separate decision (DECISIONS.md §8).
// Its former links pointed at corporate-ai-solutions.vercel.app, a raw hosting address that reads
// exactly as he read it: "I've learned the parent company doesn't have a website."

import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Per-page title. Every page carrying the same <title> is register P20 — "with three tabs open I
  // can't tell my valuation from the example."
  title: 'Who is behind Kira',
  description:
    'Kira is built by Dennis McMahon at Corporate AI Solutions in Western Australia — thirty years running construction, logistics and modular manufacturing businesses, not advising them.',
};

const CONTACT = [
  { label: 'Email', value: 'dennis@corporateaisolutions.com', href: 'mailto:dennis@corporateaisolutions.com' },
  { label: 'Phone', value: '+61 402 612 471', href: 'tel:+61402612471' },
  { label: 'Book a call', value: 'calendly.com/mcmdennis', href: 'https://calendly.com/mcmdennis' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-kira-charcoal">
      <section className="border-b border-kira-line bg-kira-surface">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <h1 className="text-[32px] font-semibold tracking-tight text-kira-dark lg:text-[42px]">
            Who is behind this
          </h1>
          <p className="mt-4 text-[17px] leading-[1.65] text-kira-charcoal">
            You are being asked to tell an assistant how your business really runs. It is fair to want
            to know who built it first.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl space-y-4 px-6 py-16 text-[17px] leading-[1.65]">
          <p>
            Kira is built by Dennis McMahon at Corporate AI Solutions, in Western Australia. I have
            spent thirty years in construction, logistics and modular manufacturing — running the
            businesses, not advising them — and I built the back-office systems for my own as I went,
            because nobody else was going to.
          </p>
          <p>
            This one started when I looked at buying businesses and kept finding the same problem from
            the other side of the table. The good ones were good because of the owner. Which is
            exactly what makes them hard to buy, and what a buyer discounts you for. One developer I
            work with is eighty, has built a substantial land bank, and none of it is written down
            anywhere but in his head.
          </p>
          <p>
            It is a small operation and I would rather you knew that than found out later. What you
            get is direct access to the person who built it, and a product that is still changing in
            response to what owners tell me. What you do not get is a support desk in another time
            zone.
          </p>
          <p>
            Your business details stay in your account. They are used to build your Genome and nothing
            else — not sold, not pooled, not used to train anyone&apos;s model. The{' '}
            <a
              href="/privacy"
              className="text-kira-600 underline underline-offset-2 hover:text-kira-700"
            >
              privacy policy
            </a>{' '}
            says so in plain terms, and{' '}
            <a
              href="/terms"
              className="text-kira-600 underline underline-offset-2 hover:text-kira-700"
            >
              the terms
            </a>{' '}
            are worth two minutes before you start.
          </p>
        </div>
      </section>

      {/* Contact is kept, and restyled rather than dropped: "direct access to the person who built
          it" is a claim, and a page making it with no way to reach him is making it thinly. Three
          rows of plain text, no cards, no icons — the same register as the rest of the site. */}
      <section className="border-t border-kira-line bg-kira-surface">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <h2 className="text-[22px] font-semibold tracking-tight text-kira-dark">
            Reaching me
          </h2>
          <p className="mt-3 text-[17px] leading-[1.65]">
            Directly, and it is me who answers. No form, no queue.
          </p>
          <dl className="mt-6 space-y-3">
            {CONTACT.map((c) => (
              <div key={c.label} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                <dt className="w-28 shrink-0 text-[15px] text-kira-soft">{c.label}</dt>
                <dd>
                  <a
                    href={c.href}
                    className="inline-flex min-h-[44px] items-center text-[17px] text-kira-600 underline underline-offset-2 hover:text-kira-700"
                    {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {c.value}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-[22px] font-semibold tracking-tight text-kira-dark">
            If you want to see the thing itself
          </h2>
          <p className="mt-3 text-[17px] leading-[1.65]">
            The valuation takes about three minutes, needs no account and no card, and nothing is sent
            anywhere until you decide to sign up.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/business-valuation"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-kira-600 px-6 text-[17px] font-medium text-white hover:bg-kira-700"
            >
              See what it&apos;s worth
            </a>
            <a
              href="/sample-genome"
              className="inline-flex min-h-[44px] items-center justify-center px-2 text-[17px] text-kira-600 underline underline-offset-2 hover:text-kira-700"
            >
              Or see a real Genome
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
