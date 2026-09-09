"use client";

import React from 'react';
import { VoiceWidget } from '@caistech/elevenlabs-convai/react';

import { ADVISOR_FAQ } from '@/lib/faq';
import { LandingDemo } from '@/components/LandingDemo';
import { BetaFeedbackButton } from '@/components/BetaFeedbackButton';
import { FULL_RATE_PERIOD_CAP, PRICE_TIERS } from '@/lib/valuation/pricing';
import { formatPrice, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { HEADLINE_NUMBERS } from '@/lib/valuation/headline-numbers';

const LANDING_EXAMPLE_FIGURES = ['$220k', '$626k', '$821k'] as const;

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '/sample-genome', label: 'See a sample genome' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/advisors', label: 'For advisors' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

const STEPS = [
  {
    n: '01',
    title: 'Reveal the value gap',
    body: "A 3-minute valuation shows your client what their business is worth today — and the gap they're leaving on the table.",
  },
  {
    n: '02',
    title: 'Capture their knowledge',
    body: 'Kira interviews them like a buyer would, turning the systems and relationships in their head into a living Operating Manual of their business.',
  },
  {
    n: '03',
    title: 'Build a transferable asset',
    body: 'A documented, transferable business commands a real multiple — and transitions smoothly to a buyer, successor, or management team.',
  },
];

export function LandingConsultant() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [askState, setAskState] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [askText, setAskText] = React.useState('');

  const currency = DEFAULT_CURRENCY;
  const floorPrice = formatPrice(PRICE_TIERS[0].monthly, currency);
  const ceilingPrice = formatPrice(PRICE_TIERS[PRICE_TIERS.length - 1].monthly, currency);

  return (
    <div className="min-h-screen bg-kira-surface text-kira-dark antialiased">
      <style>{`
        .ln-measure { max-width: 62ch; }
        .ln-link { transition: color 160ms ease-out; }
        @media (prefers-reduced-motion: reduce) { .ln-link { transition: none; } }
      `}</style>

      <header className="sticky top-0 z-50 border-b border-kira-line bg-kira-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl xl:max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex min-h-[44px] items-center gap-3">
            <span className="block h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-kira-line">
              <img src="/female_avatar.jpeg" alt="Kira" className="h-full w-full object-cover" />
            </span>
            <span className="text-[21px] font-semibold tracking-tight text-kira-dark">Kira</span>
            <span className="hidden text-[16px] sm:text-[15px] text-kira-soft sm:inline">by Corporate AI Solutions</span>
          </a>

          <nav className="hidden items-center gap-5 lg:gap-7 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="ln-link whitespace-nowrap text-[16px] sm:text-[15px] text-kira-charcoal hover:text-kira-600">
                {item.label}
              </a>
            ))}
            <a href="/login" className="ln-link flex min-h-[44px] items-center whitespace-nowrap text-[16px] sm:text-[15px] text-kira-charcoal hover:text-kira-600">
              Sign in
            </a>
            <a
              href="/signup"
              className="ln-link flex min-h-[44px] items-center whitespace-nowrap text-[16px] sm:text-[15px] text-kira-charcoal hover:text-kira-600"
            >
              Create an account
            </a>
            <a
              href="/business-valuation"
              className="ln-link flex min-h-[44px] items-center whitespace-nowrap rounded-md bg-kira-600 px-4 text-[16px] sm:text-[15px] font-medium text-white hover:bg-kira-700"
            >
              Value a business
            </a>
          </nav>

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-kira-charcoal hover:bg-kira-mist md:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-kira-line bg-kira-surface px-6 py-2 md:hidden">
            {[...NAV, { href: '/login', label: 'Sign in' }, { href: '/signup', label: 'Create an account' }].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block min-h-[44px] py-3 text-[17px] text-kira-charcoal"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </header>

      <section className="mx-auto max-w-5xl xl:max-w-6xl px-6 pb-16 pt-16 lg:pt-24">
        <div>
          <div className="mb-8 flex items-center gap-4">
            <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-kira-line lg:hidden">
              <img src="/female_avatar.jpeg" alt="Kira" className="h-full w-full object-cover" />
            </span>
            <p className="text-[16px] sm:text-[15px] uppercase tracking-[0.14em] text-kira-soft">
              For business advisers, exit planners and consultants
            </p>
          </div>

          <h1 className="max-w-[18ch] text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-kira-dark lg:text-[56px]">
            Give your clients a better path to a stronger business.
          </h1>
          <p className="mt-4 max-w-[24ch] text-[27px] leading-[1.2] text-kira-charcoal lg:text-[34px]">
            And give yourself a powerful ongoing AI capability to help them get there.
          </p>

          <p className="ln-measure mt-8 text-[17px] leading-[1.65] text-kira-charcoal">
            This is for professional advisers who work with owner-operators in construction, manufacturing, 
            logistics, and services. You know the problem: the business's greatest value is also its greatest 
            weakness — it completely depends on the owner. Everything is in their head, not on paper, so 
            a buyer discounts them heavily. Kira works alongside you and your client in conversation, continuously 
            capturing the undocumented systems and relationships in the owner's head and turning them into a 
            structured,{' '}
            <a href="/sample-genome" className="ln-link font-medium text-kira-600 underline underline-offset-4 hover:text-kira-700">
              transferable Operating Manual
            </a>{' '}
            — written down so the business can be managed, scaled, or sold cleanly.
          </p>

          <p className="ln-measure mt-6 text-[17px] leading-[1.65] text-kira-charcoal">
            Kira's promise to your clients: <strong className="font-semibold text-kira-dark">they take two months off and the 
            business doesn't skip a beat</strong> — she plays their part while they are away. 
            Kira's promise to you: <strong className="font-semibold text-kira-dark">she maintains the momentum of business 
            development between your advisory sessions</strong>, keeping the owner focused on enterprise value.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="/business-valuation"
              className="ln-link inline-flex min-h-[52px] items-center rounded-md bg-kira-600 px-7 text-[17px] font-medium text-white hover:bg-kira-700"
            >
              Value a client's business
            </a>
            <a
              href="/sample-genome"
              className="ln-link inline-flex min-h-[52px] items-center rounded-md border border-kira-line bg-white px-7 text-[17px] font-medium text-kira-dark hover:border-kira-600 hover:text-kira-600"
            >
              See a sample manual
            </a>
          </div>
          <p className="mt-4 text-[16px] sm:text-[15px] text-kira-soft">
            Free · no sign-up · run an indicative valuation in 3 minutes.
          </p>
        </div>
      </section>

      <section className="border-y border-kira-line bg-kira-mist">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            Talk to her yourself before introducing a client
          </h2>
          <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
            No account, no card, nothing saved. Ask her how she works alongside advisers, how she protects 
            client data, or how the valuation works. Type it, or talk to her — both work.
          </p>

          <form
            className="mt-8 rounded-lg border border-kira-line bg-white p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              const value = askText.trim();
              if (!value) return;
              setAskState('sending');
              setAskText('');
              try {
                const r = await fetch('/api/kira/ask', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ question: value }),
                });
                setAskState(r.ok ? 'sent' : 'error');
              } catch {
                setAskState('error');
              }
            }}
          >
            <label htmlFor="ask-kira" className="block text-[17px] font-semibold text-kira-dark">
              Type your question
            </label>
            <p className="mt-1 text-[15px] leading-[1.5] text-kira-soft">
              Nothing is recorded and nothing is saved about you or your clients.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                id="ask-kira"
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                placeholder="How does Kira work alongside a business coach?"
                className="min-h-[52px] w-full rounded-md border border-kira-line px-4 py-3 text-[17px] text-kira-dark"
              />
              <button
                type="submit"
                className="min-h-[52px] shrink-0 rounded-md bg-kira-dark px-6 py-3 text-[17px] font-semibold text-white"
              >
                Ask
              </button>
            </div>
          </form>

          <p className="mt-6 text-[17px] leading-[1.65] text-kira-charcoal">
            Or talk to her out loud — you will need a microphone, and she will ask before she starts listening.
          </p>

          <div className="mt-3">
            <VoiceWidget
              placement="inline"
              avatarUrl="/female_avatar.jpeg"
              coachName="Kira"
              transcript
              textFallback
              title="Ask Kira anything — no account needed"
              getSignedUrl={async () => {
                const r = await fetch('/api/kira/ask');
                if (!r.ok) throw new Error(`could not start a conversation (${r.status})`);
                const { signedUrl } = await r.json();
                return signedUrl as string;
              }}
              onTextFallbackSubmit={async (text) => {
                setAskState('sending');
                try {
                  const r = await fetch('/api/kira/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: text }),
                  });
                  setAskState(r.ok ? 'sent' : 'error');
                } catch {
                  setAskState('error');
                }
              }}
            />

            {askState !== 'idle' && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 rounded-md border border-kira-line bg-white px-4 py-3 text-[16px] leading-[1.5] text-kira-dark"
              >
                {askState === 'sending' && 'Sending your question…'}
                {askState === 'sent' && (
                  <>
                    <strong className="font-semibold">Got it — and I should be straight with you.</strong>{' '}
                    There is no microphone here, so this did not reach Kira. It went to a question list 
                    that one person reads: Dennis, who built this. He cannot reply, because you have not 
                    given him an address and this page does not ask for one — nothing about you was 
                    recorded beyond the question itself.{' '}
                    <a className="font-medium text-kira-600 underline" href="mailto:dennis@corporateaisolutions.com">
                      Email him directly
                    </a>{' '}
                    if you want an answer, or read the questions below — most advisers ask what you just asked.
                  </>
                )}
                {askState === 'error' && (
                  <>
                    That did not send. Nothing was lost on your side — email{' '}
                    <a className="font-medium text-kira-600 underline" href="mailto:dennis@corporateaisolutions.com">
                      dennis@corporateaisolutions.com
                    </a>{' '}
                    and it will reach the same place.
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-[16px] sm:text-[15px] text-kira-soft">A real plumbing business, run through the actual calculator</p>

          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {HEADLINE_NUMBERS.map((f, i) => (
              <div key={f.key} className="border-l-2 border-kira-line pl-5">
                <p className="text-[16px] sm:text-[15px] uppercase tracking-[0.1em] text-kira-soft">{f.shortLabel}</p>
                <p
                  className={`mt-2 text-[34px] font-semibold tracking-tight ${
                    f.key === 'captured' ? 'text-kira-600' : 'text-kira-dark'
                  }`}
                >
                  {LANDING_EXAMPLE_FIGURES[i]}
                </p>
                <p className="mt-2 text-[15px] leading-[1.5] text-kira-soft">{f.meaning}</p>
              </div>
            ))}
          </div>

          <p className="ln-measure mt-8 text-[17px] leading-[1.65] text-kira-charcoal">
            The <strong className="font-semibold text-kira-dark">$195k gap</strong> is the knowledge locked in your client's head. 
            Kira helps you capture and unlock it together.
          </p>

          <p className="ln-measure mt-4 text-[17px] leading-[1.65] text-kira-soft">
            This plumber has all of it in his head — nothing written down, no contracts, one big customer. 
            That is the <strong className="font-semibold">widest the gap gets</strong>. An owner who has already documented 
            half of it sees roughly half as much, because Kira only claims what is left to capture. Working out a larger gap 
            can never earn us (or you) more.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
          Watch what your client experiences over six months
        </h2>
        <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
          Kira guides them through the capture process while keeping you in the loop.
        </p>
        <div className="mt-8">
          <LandingDemo />
        </div>
      </section>

      <section className="border-t border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="max-w-[20ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            Every Kira is unique, because every business is.
          </h2>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">Generic AI tools</h3>
              <p className="mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
                The same generic assistant for everyone. They repeat their context every conversation, 
                it tries to answer everything instantly, and it remembers none of what matters to their business.
              </p>
            </div>
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">Kira — a custom continuous GM</h3>
              <p className="mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
                Built around your client's exact context and history. She understands their structure, 
                relationships, and challenges from day one, and every conversation builds on the last one.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="max-w-[22ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
          Consultant + Kira + Business Owner: The Journey
        </h2>
        <p className="ln-measure mt-4 text-[17px] leading-[1.65] text-kira-charcoal">
          Kira does not replace your advisory work. She makes your capability more continuous, informed, 
          and scalable.
        </p>

        <ol className="mt-12">
          {STEPS.map((s, i) => (
            <li key={s.n} className={`grid gap-x-8 gap-y-3 py-8 sm:grid-cols-[4rem_1fr] ${i > 0 ? 'border-t border-kira-line' : ''}`}>
              <span className="text-[21px] font-semibold tabular-nums text-kira-600">{s.n}</span>
              <div>
                <h3 className="text-[21px] font-semibold text-kira-dark">{s.title}</h3>
                <p className="ln-measure mt-2 text-[17px] leading-[1.65] text-kira-charcoal">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6">
          <a
            href="/business-valuation"
            className="ln-link inline-flex min-h-[52px] items-center rounded-md bg-kira-600 px-7 text-[17px] font-medium text-white hover:bg-kira-700"
          >
            Experience the valuation journey
          </a>
          <p className="mt-3 text-[16px] sm:text-[15px] text-kira-soft">
            Retiring, selling, or scaling succession — start with the numbers.
          </p>
        </div>
      </section>

      <section className="border-y border-kira-line bg-kira-mist">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="max-w-[24ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            Your advisory, made continuous and scalable.
          </h2>
          <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
            You see clients periodically, but their business operates every day. Kira acts as your continuous 
            on-site capability, maintaining momentum and documenting truth.
          </p>

          <div className="ln-measure mt-6 space-y-4 text-[17px] leading-[1.65] text-kira-charcoal">
            <p>
              Most owner-operators struggle to execute business development between advisory sessions. 
              The day-to-day fires pull them back on the tools, and knowledge documentation stalls.
            </p>
            <p>
              Kira bridges this gap: <span className="font-semibold text-kira-dark">she makes strategic execution safe and structured.</span>{' '}
              She captures their decisions, files their procedures, and maintains the momentum you establish in your sessions. 
              When they return to you, they bring real, captured data rather than vague updates.
            </p>
          </div>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">Between sessions — she documents</h3>
              <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
                Kira interviews the owner and key staff, turning daily operations and knowledge into an exportable, 
                verifiable manual.
              </p>
            </div>
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">Between sessions — she runs</h3>
              <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
                Key personnel can consult Kira to resolve operational questions exactly the way the owner would, 
                reducing the owner's immediate daily workload.
              </p>
            </div>
          </div>

          <p className="ln-measure mt-10 text-[17px] leading-[1.65] text-kira-charcoal">
            This means you get to offer a <strong className="font-semibold text-kira-dark">differentiated, modern capability</strong>{' '}
            that turns your strategic guidance into durably documented equity value.
          </p>

          <div className="mt-8">
            <a
              href="/business-valuation"
              className="ln-link inline-flex min-h-[52px] items-center rounded-md bg-kira-600 px-7 text-[17px] font-medium text-white hover:bg-kira-700"
            >
              See the valuation process
            </a>
            <p className="mt-3 text-[16px] sm:text-[15px] text-kira-soft">
              A 3-minute valuation — no sign-up, no card.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="max-w-[24ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            And it ends up in their filing cabinet, not ours.
          </h2>
          <div className="ln-measure mt-4 space-y-4 text-[17px] leading-[1.65] text-kira-charcoal">
            <p>
              What Kira captures becomes an Operating Manual — structured document-by-document, written 
              directly into your client's own Google Drive.
            </p>
            <p>
              There are two distinct versions. Their internal copy has everything in it. The handover version 
              automatically excludes sensitive plans and figures — making it safe to send to accountants, 
              brokers, or potential buyers as dated, verified evidence of their enterprise systems.
            </p>
            <p>
              They can download it cleanly. It opens in any browser, prints, and works without an account or login. 
              If they stop paying us tomorrow, they keep a document that works forever.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">This is a partnership.</h2>
          <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
            Kira is honest about her bounds. She needs you and your client to show up too.
          </p>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">What Kira brings</h3>
              <ul className="mt-4 space-y-2.5 text-[17px] leading-[1.6] text-kira-charcoal">
                <li>Asks the diagnostic questions they haven't considered</li>
                <li>Pushes back when procedures are vague or missing</li>
                <li>Maintains absolute, row-isolated privacy boundaries</li>
                <li>Admits when she doesn't know operational specifics</li>
              </ul>
            </div>
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">What Kira needs</h3>
              <ul className="mt-4 space-y-2.5 text-[17px] leading-[1.6] text-kira-charcoal">
                <li>Honest disclosures from the owner on key dependencies</li>
                <li>Correction when her summarized workflows are off track</li>
                <li>Your strategic lens to review their readiness genome</li>
                <li>Cooperative goal setting to address newly surfaced gaps</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
          See the number. Then decide.
        </h2>

        <p className="mt-8 text-[16px] sm:text-[15px] uppercase tracking-[0.1em] text-kira-soft">Plans run from</p>
        <p className="mt-2 text-[44px] font-semibold tracking-tight text-kira-dark">
          {floorPrice}
          <span className="text-[21px] font-normal text-kira-soft"> to {ceilingPrice} /month</span>
        </p>

        <div className="ln-measure mt-8 space-y-4 text-[17px] leading-[1.65] text-kira-charcoal">
          <p>
            Which band your client lands in depends on the size of their business — the annual profit they tell 
            us, not the gap we calculate. That distinction is non-negotiable: the tool that works out what 
            the business is worth has nothing to gain from the number being bigger. They see their 
            figure after the free valuation, before any card is saved.
          </p>
          <p>The valuation is completely free — no sign-up, no card, no obligation.</p>
          <p>
            Kira's fee is set to a small fraction of what they stand to unlock. They are <strong className="font-semibold text-kira-dark">never invoiced for the month they are in</strong> — each month is billed once it has finished, and if they cancel, that month is on us.
          </p>
          <p>
            <strong className="font-semibold text-kira-dark">It is meant to end.</strong> Kira's job is to get what 
            is in their head onto paper. Once that is done, keeping it current costs only <strong className="font-semibold text-kira-dark">a third of their band</strong>.
          </p>
          <p>
            <strong className="font-semibold text-kira-dark">
              And there is a ceiling: after {FULL_RATE_PERIOD_CAP} months they move to the lower rate whether or not we think the work is done.
            </strong>{' '}
            We would rather cap what you and your client can be charged than guess or drag out the timeline.
          </p>
        </div>

        <div className="mt-10">
          <a
            href="/business-valuation"
            className="ln-link inline-flex min-h-[52px] items-center rounded-md bg-kira-600 px-7 text-[17px] font-medium text-white hover:bg-kira-700"
          >
            Try the valuation tool
          </a>
          <p className="mt-3 text-[16px] sm:text-[15px] text-kira-soft">
            Free · no sign-up · run the numbers in 3 minutes.
          </p>
        </div>
      </section>

      <section className="border-t border-kira-line bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            Who is behind this
          </h2>
          <div className="ln-measure mt-6 space-y-4 text-[17px] leading-[1.65] text-kira-charcoal">
            <p>
              Kira is built by Dennis McMahon at Corporate AI Solutions, in Western Australia. I have 
              spent thirty years in construction, logistics and modular manufacturing — running the 
              businesses, not advising them — and I built the back-office systems for my own as I 
              went, because nobody else was going to.
            </p>
            <p>
              This one started when I looked at buying businesses and kept finding the same problem 
              from the other side of the table. The good ones were good because of the owner. Which 
              is exactly what makes them hard to buy, and what a buyer discounts you for. One 
              developer I work with is eighty, has built a substantial land bank, and none of it is 
              written down anywhere but in his head.
            </p>
            <p>
              It is a small operation and I would rather you knew that than found out later. What you 
              get is direct access to the person who built it, and a product that is still changing 
              in response to what advisers and owners tell me. What you do not get is a support desk in another 
              time zone.
            </p>
            <p>
              Your client's business details stay in their account. They are used to build their Operating 
              Manual and nothing else — not sold, not pooled, not used to train anyone's model. The{' '}
              <a href="/privacy" className="text-kira-600 underline underline-offset-2 hover:text-kira-700">
                privacy policy
              </a>{' '}
              says so in plain terms, and{' '}
              <a href="/terms" className="text-kira-600 underline underline-offset-2 hover:text-kira-700">
                the terms
              </a>{' '}
              are worth two minutes before you start.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-kira-line bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">Questions</h2>
          <div className="mt-8">
            {ADVISOR_FAQ.map((faq, index) => (
              <details key={index} className="group border-t border-kira-line py-1">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-medium text-kira-dark">
                  {faq.q}
                  <span className="shrink-0 text-[21px] text-kira-600 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="ln-measure pb-5 text-[17px] leading-[1.65] text-kira-charcoal">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-kira-dark">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[21px] font-semibold text-white">Kira</p>
              <p className="ln-measure mt-3 text-[17px] leading-[1.6] text-kira-on-dark">
                One assistant. She learns how your client's business actually runs, and turns it into 
                something a buyer can read.
              </p>
              <a
                href="/business-valuation"
                className="ln-link mt-6 inline-flex min-h-[48px] items-center rounded-md bg-kira-600 px-6 text-[17px] font-medium text-white hover:bg-kira-700"
              >
                Value a business
              </a>
            </div>

            <div className="flex flex-wrap gap-x-8 text-[16px] sm:text-[15px] text-kira-on-dark">
              {FOOTER_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="ln-link flex min-h-[44px] items-center hover:text-white">
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-12 border-t border-kira-charcoal pt-8 text-[16px] sm:text-[15px] leading-[1.6] text-kira-on-dark-muted">
            <p>Global Buildtech Australia Pty Ltd · ABN 54 672 395 685 · trading as Corporate AI Solutions</p>
            <p className="mt-1">76-84 Brunswick Street, Fortitude Valley QLD 4006</p>
          </div>
        </div>
      </footer>

      <BetaFeedbackButton cohort="fresh" testerId="public" workflow="landing-consultant" />
    </div>
  );
}
