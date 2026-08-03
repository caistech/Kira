"use client";

// THE LESS-AI-LIKE LANDING PAGE.
//
// WHY IT EXISTS. A design review of the classic page found it reads as a competent, CONSISTENT
// AI-generated landing page. Recolouring fixed the inconsistency and did not touch the six patterns
// that make it read as generated:
//
//   1. the 3-column feature grid, twice, with numbered circles — the single most recognisable
//      AI layout there is
//   2. emoji as design elements, inside H2s ("How it works 🛠️", "Questions? 🙋‍♀️")
//   3. every H2 centred, all six of them, at the identical 48px/700
//   4. decorative blobs drifting on an infinite loop
//   5. cookie-cutter section rhythm, every section the same height
//   6. the same headline trick four times — a sentence with its last clause in the accent colour
//
// Plus four rendered font families and no type scale at all: 60 -> 48 -> 20, a 2.4x jump with
// nothing between, so every section is a flat list of equal shouts.
//
// WHAT THIS DOES DIFFERENTLY, and each is a direct answer to one of those:
//
//   * LEFT-ALIGNED. Centred body text is the loudest generated-page signal after the feature grid,
//     and it is genuinely harder to read at length — the eye loses the left margin on every line.
//   * ONE TYPEFACE. Inter, three weights. The classic page loads Outfit AND DM Sans AND Inter and
//     renders four families. Restraint reads as confidence; a second display face has to earn its
//     download and this one does not.
//   * A REAL SCALE, 1.25 ratio: 44 / 34 / 27 / 21 / 17. Sections stop being equal shouts.
//   * NO GRIDS OF THREE. The steps are a numbered vertical narrative with rules between them,
//     because they happen in sequence and a row of cards says they are parallel options.
//   * NO EMOJI, NO BLOBS, NO GRADIENT TEXT.
//   * VARIED RHYTHM. Sections differ in width, background and padding, so scrolling has texture
//     instead of a metronome.
//
// THE COPY IS NOT REWRITTEN. Every claim, figure and CTA is carried over verbatim from the classic
// page — it has been through three tester walkthroughs and the numbers are the engine's own. This
// is a structural rebuild, not a new pitch, and inventing new marketing claims here would throw
// away the one thing that has actually been validated.
//
// ICP: a 60-70 year old owner-operator reading about selling the business he built. Body text is
// 17px, contrast is high, and nothing bounces.

import React from 'react';
import { VoiceWidget } from '@caistech/elevenlabs-convai/react';

import { OWNER_FAQ } from '@/lib/faq';
import { LandingDemo } from '@/components/LandingDemo';
import { PRICE_TIERS } from '@/lib/valuation/pricing';
import { formatPrice, DEFAULT_CURRENCY } from '@/lib/valuation/currency';

// The PUBLIC, no-account agent — the same one /start uses. A landing page visitor has no session
// and must not need one: the whole product claim is that you only ever talk to her, and until now
// there was nothing on any public page you could talk to. Ray's walkthrough recorded that as a
// FAIL, and he was right — "Hear Kira" plays a pre-recorded mp3, which is a recording, not an agent.
//
// It is the CANONICAL @caistech/elevenlabs-convai widget, not the raw CDN <elevenlabs-convai>
// embed still on /start. That embed is why voice was pulled from /business-valuation rather than
// restored — the note there says reinstating it would mean adopting the canonical component first.
// This adopts it.
//
// The agent id is no longer read on the client. It used to be passed straight to the widget as a
// public `agentId`, which is the WebRTC path — the one that fails in production. The signed URL is
// minted server-side by /api/kira/start, so the id now lives only on the server, where it belongs.

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  // "See a real one" rather than "What you get". Ray called /genome the most convincing thing on
  // the site and nearly never opened it, because "What you get" reads as a feature list and he
  // skipped it on the way past. It is also in the hero now, as a second door.
  { href: '/genome', label: 'See a real one' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

// ADVISORS IS NOT IN THE OWNER'S MENU. It tells brokers "you introduce the client; you earn while
// they stay" — and the owner is the one reading this page. Ray clicked it from the top nav and
// said: "I'm the client. I've just read a page, written for my broker, that explains he earns a
// trailing fee for sending me here." It stays reachable, in the footer, where the audience that
// wants it will look for it.
const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/advisors', label: 'For advisors' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

/** The three steps. A LIST, deliberately — they happen in order, and a row of cards denies that. */
const STEPS = [
  {
    n: '01',
    title: 'See the number',
    body: "A 3-minute valuation shows what your business is worth today — and the gap you're leaving on the table.",
  },
  {
    n: '02',
    title: 'Capture your knowledge',
    body: 'Kira interviews you like a smart buyer would, turning the systems and relationships in your head into a living Business Genome.',
  },
  {
    n: '03',
    title: 'Sell an asset, not a job',
    body: 'A documented, transferable business commands a real multiple — and hands over cleanly to a buyer or successor.',
  },
];

export function LandingNew() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  /**
   * What happened to a question typed into the voice widget's text fallback.
   *
   * The widget hands the text to `onTextFallbackSubmit` and clears the box either way, so WITHOUT
   * a handler the question vanishes silently — which is what shipped this morning and what a tester
   * hit with the single most important question a stranger can ask this product. The widget renders
   * nothing after the callback, so the acknowledgement has to come from here.
   */
  const [askState, setAskState] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Same derivation as the classic page: never type a price that the bands can move underneath.
  const currency = DEFAULT_CURRENCY;
  const floorPrice = formatPrice(PRICE_TIERS[0].monthly, currency);
  const ceilingPrice = formatPrice(PRICE_TIERS[PRICE_TIERS.length - 1].monthly, currency);

  return (
    <div className="min-h-screen bg-kira-surface text-kira-dark antialiased">
      <style>{`
        .ln-measure { max-width: 62ch; }
        /* One transition, one duration. The classic page had float, pulse, spin, wiggle and
           hover-pop; motion that never rests reads as a page trying to hold your attention
           rather than one that has your trust. */
        .ln-link { transition: color 160ms ease-out; }
        @media (prefers-reduced-motion: reduce) { .ln-link { transition: none; } }
      `}</style>

      {/* NAV — the avatar stays. Removing it was my call and it was the wrong one: she is a person
          the owner is deciding whether to talk to, and a wordmark on its own makes this a piece of
          software. The gradient RING is what went (it was amber->pink->purple); the face is the
          product. */}
      <header className="sticky top-0 z-50 border-b border-kira-line bg-kira-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="flex min-h-[44px] items-center gap-3">
            <span className="block h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-kira-line">
              <img src="/female_avatar.jpeg" alt="Kira" className="h-full w-full object-cover" />
            </span>
            <span className="text-[21px] font-semibold tracking-tight text-kira-dark">Kira</span>
            <span className="hidden text-[16px] sm:text-[15px] text-kira-soft sm:inline">by Corporate AI Solutions</span>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="ln-link text-[16px] sm:text-[15px] text-kira-charcoal hover:text-kira-600">
                {item.label}
              </a>
            ))}
            <a href="/login" className="ln-link flex min-h-[44px] items-center text-[16px] sm:text-[15px] text-kira-charcoal hover:text-kira-600">
              Sign in
            </a>
            <a
              href="/business-valuation"
              className="ln-link flex min-h-[44px] items-center rounded-md bg-kira-600 px-4 text-[16px] sm:text-[15px] font-medium text-white hover:bg-kira-700"
            >
              Value my business
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
            {[...NAV, { href: '/login', label: 'Sign in' }].map((item) => (
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

      {/* HERO — left-aligned, one statement, two doors. The portrait is back: this is a person you
          decide whether to talk to, and the page that sells her should show her. */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-16 lg:pt-24">
        <div className="mb-8 flex items-center gap-4">
          <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-kira-line lg:h-20 lg:w-20">
            <img src="/female_avatar.jpeg" alt="Kira" className="h-full w-full object-cover" />
          </span>
          <p className="text-[16px] sm:text-[15px] uppercase tracking-[0.14em] text-kira-soft">
            For owners whose business still runs on them
          </p>
        </div>

        <h1 className="max-w-[18ch] text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-kira-dark lg:text-[56px]">
          You spent thirty years building it.
        </h1>
        <p className="mt-4 max-w-[24ch] text-[27px] leading-[1.2] text-kira-charcoal lg:text-[34px]">
          Now sell it for what it&apos;s actually worth.
        </p>

        <p className="ln-measure mt-8 text-[17px] leading-[1.65] text-kira-charcoal">
          This is for one person: the owner in their sixties, three or four decades in, with a
          profitable business that runs on <strong className="font-semibold text-kira-dark">them</strong>. Everything that
          matters is in your head, not on paper — so a buyer isn&apos;t buying an asset, they&apos;re buying
          you, and they price it accordingly. Kira works alongside you day to day, in conversation,
          and turns what you know into a documented{' '}
          <a href="/genome" className="ln-link font-medium text-kira-600 underline underline-offset-4 hover:text-kira-700">
            Business Genome
          </a>{' '}
          the business can be sold with. Most owners start this before they&apos;ve told anyone.
        </p>

        {/* TWO DOORS, not one. Ray wanted to see the thing before typing anything into it, and the
            only route to /genome was a text link on the pricing page — two steps past the point he
            had already decided whether to bother. */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="/business-valuation"
            className="ln-link inline-flex min-h-[52px] items-center rounded-md bg-kira-600 px-7 text-[17px] font-medium text-white hover:bg-kira-700"
          >
            Find out in 3 minutes
          </a>
          <a
            href="/genome"
            className="ln-link inline-flex min-h-[52px] items-center rounded-md border border-kira-line bg-white px-7 text-[17px] font-medium text-kira-dark hover:border-kira-600 hover:text-kira-600"
          >
            See a real one
          </a>
        </div>
        <p className="mt-4 text-[16px] sm:text-[15px] text-kira-soft">
          Free · no sign-up · an indicative valuation on the spot.
        </p>
      </section>

      {/* MEET HER — the voice agent, in the page flow, in the shape the rest of the portfolio uses.

          THIS WAS A CORNER POPUP ON A RAW agentId, AND BOTH HALVES WERE WRONG.

          Shape: `placement="floating"` put a launcher in the corner that opened a panel over the
          page — it covered the one paragraph explaining what makes her different, and it framed the
          product's centrepiece as a support-chat bubble. `inline` is the canonical embedded shape
          (avatar → transcript → begin), in the flow, which is what every other voice surface in the
          portfolio uses.

          Transport: the widget was handed a public `agentId`, which connects over WEBRTC — and that
          is what has been failing in production. Measured with a working microphone: the token
          request returns 200, a LiveKit room is created, then the data channel errors and the
          session drops to "Not connected". A visitor therefore never got a voice agent; they got
          the text fallback, i.e. a chatbot, which is not what this product is.

          `getSignedUrl` is the canonical path and connects over WEBSOCKET instead. Kira's own
          authenticated /chat/[agentId] has always used it. `GET /api/kira/start` mints a signed URL
          for the SAME agent with no session at all — verified live: the socket opens and the agent
          sends `conversation_initiation_metadata`. The authless canonical route already existed;
          the landing simply was not using it.

          `textFallback` stays as the honest degrade for a visitor with no microphone — but it is
          now the exception rather than, in practice, the product. */}
      <section className="border-y border-kira-line bg-kira-mist">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            Talk to her before you decide anything
          </h2>
          <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
            No account, no card, nothing saved to your business. Ask her what she does, how the
            valuation works, or who can see what you tell her. If you would rather type, you can.
          </p>

          <div className="mt-8">
            <VoiceWidget
              placement="inline"
              avatarUrl="/female_avatar.jpeg"
              coachName="Kira"
              transcript
              textFallback
              title="Ask Kira anything — no account needed"
              getSignedUrl={async () => {
                const r = await fetch('/api/kira/start?journey=business');
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
          </div>
        </div>
      </section>

      {/* THE NUMBERS — a rule-separated row, not three gradient cards. */}
      <section className="border-y border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-[16px] sm:text-[15px] text-kira-soft">A real plumbing business, run through the actual calculator</p>

          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              { label: 'Walk away', value: '$220k', accent: false },
              { label: 'Today', value: '$582k', accent: false },
              { label: 'Captured', value: '$1.02M', accent: true },
            ].map((f) => (
              <div key={f.label} className="border-l-2 border-kira-line pl-5">
                <p className="text-[16px] sm:text-[15px] uppercase tracking-[0.1em] text-kira-soft">{f.label}</p>
                <p
                  className={`mt-2 text-[34px] font-semibold tracking-tight ${
                    f.accent ? 'text-kira-600' : 'text-kira-dark'
                  }`}
                >
                  {f.value}
                </p>
              </div>
            ))}
          </div>

          <p className="ln-measure mt-8 text-[17px] leading-[1.65] text-kira-charcoal">
            The <strong className="font-semibold text-kira-dark">$438k gap</strong> is the knowledge in your head.
            Kira helps you capture it.
          </p>
        </div>
      </section>

      {/* THE DEMO — kept, because it is the one thing that is not a claim. */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
          Watch what happens over six months
        </h2>
        <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
          Kira will talk you through it herself.
        </p>
        <div className="mt-8">
          <LandingDemo />
        </div>
      </section>

      {/* WHAT IT IS — prose in two columns, not a ❌ / ✨ comparison card pair. */}
      <section className="border-t border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="max-w-[20ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            Every Kira is different, because every business is.
          </h2>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">Other AI assistants</h3>
              <p className="mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
                The same generic assistant for everyone. You repeat your context every conversation,
                it tries to answer everything instantly, and it remembers none of what matters to you.
              </p>
            </div>
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">Yours — like a part-time GM</h3>
              <p className="mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
                Built around your business and knowing your context from day one. She gets things
                done and closes the loop, and every conversation builds on the last one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — a numbered narrative, in sequence. */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="max-w-[22ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
          Built to sell — for what it&apos;s really worth.
        </h2>
        <p className="ln-measure mt-4 text-[17px] leading-[1.65] text-kira-charcoal">
          After decades building it, most owners discover their business is worth a fraction of what
          they hoped — because it can&apos;t run without them. Kira changes that.
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
            What&apos;s my business worth?
          </a>
          <p className="mt-3 text-[16px] sm:text-[15px] text-kira-soft">
            Retiring, selling, or planning succession — start here.
          </p>
        </div>
      </section>

      {/* PARTNERSHIP — two plain lists. */}
      <section className="border-y border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">This is a partnership.</h2>
          <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
            Kira is honest about what she can and can&apos;t do. She needs you to show up too.
          </p>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">What Kira brings</h3>
              <ul className="mt-4 space-y-2.5 text-[17px] leading-[1.6] text-kira-charcoal">
                <li>Asks the questions you haven&apos;t thought of</li>
                <li>Pushes back when something is unclear</li>
                <li>Remembers your context and builds on it</li>
                <li>Admits when she doesn&apos;t know something</li>
              </ul>
            </div>
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">What Kira needs from you</h3>
              <ul className="mt-4 space-y-2.5 text-[17px] leading-[1.6] text-kira-charcoal">
                <li>Be honest about what is really going on</li>
                <li>Correct her when she is off track</li>
                <li>Add context — the more she knows, the better</li>
                <li>Think with her, not just ask for answers</li>
              </ul>
            </div>
          </div>

          <p className="ln-measure mt-10 text-[17px] leading-[1.65] text-kira-charcoal">
            <strong className="font-semibold text-kira-dark">When it&apos;s not working?</strong> Kira offers four
            paths: add more info, reset your goal, try a different approach, or end the conversation.
            No judgment, just options.
          </p>
        </div>
      </section>

      {/* PRICING — plain, left-aligned, no ornamental border and no emoji. */}
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
            Which band you land in depends on the size of your business — the annual profit you tell
            us, not the gap we calculate. That distinction is deliberate: the tool that works out what
            your business is worth has nothing to gain from the number being bigger. You&apos;ll see your
            own figure after the valuation, before you decide anything.
          </p>
          <p>The valuation is free — no sign-up, no card. It shows you the gap in about 3 minutes.</p>
          <p>
            Kira&apos;s fee is set to a small fraction of what you stand to unlock, so the number you
            see is sized to your business. You are{' '}
            <strong className="font-semibold text-kira-dark">never invoiced for the month you are in</strong> — each
            month is billed once it has finished, and if you cancel, that month is on us.
          </p>
          <p>No gap, no pressure. The number is yours to keep either way.</p>
        </div>

        <div className="mt-10">
          <a
            href="/business-valuation"
            className="ln-link inline-flex min-h-[52px] items-center rounded-md bg-kira-600 px-7 text-[17px] font-medium text-white hover:bg-kira-700"
          >
            What&apos;s my business worth?
          </a>
          <p className="mt-3 text-[16px] sm:text-[15px] text-kira-soft">
            Free · no sign-up · your indicative valuation in 3 minutes.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-kira-line bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">Questions</h2>
          <div className="mt-8">
            {OWNER_FAQ.map((faq, index) => (
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

      {/* FOOTER — same legal identity, unchanged. */}
      <footer className="bg-kira-dark">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[21px] font-semibold text-white">Kira</p>
              <p className="ln-measure mt-3 text-[17px] leading-[1.6] text-kira-on-dark">
                One assistant. She learns how your business actually runs, and turns it into
                something a buyer can read.
              </p>
              <a
                href="/business-valuation"
                className="ln-link mt-6 inline-flex min-h-[48px] items-center rounded-md bg-kira-600 px-6 text-[17px] font-medium text-white hover:bg-kira-700"
              >
                See what your business is worth
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

          {/* The voice agent moved OUT of the footer and up into its own section after the hero —
              see "MEET HER" above. A corner popup in the footer was the wrong shape for the thing
              the whole page is selling. */}

          {askState !== 'idle' && (
            <div
              role="status"
              aria-live="polite"
              className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-md border border-kira-line bg-white px-4 py-3 text-[16px] sm:text-[15px] leading-[1.5] text-kira-dark shadow-lg sm:left-auto sm:right-6 sm:mx-0"
            >
              {askState === 'sending' && 'Sending your question…'}
              {askState === 'sent' && (
                <>
                  <strong className="font-semibold">Got it.</strong> Voice needs a microphone and this
                  browser has not given one, so your question has gone to a person rather than to Kira.
                  Dennis reads these himself and will come back to you.
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

          <div className="mt-12 border-t border-kira-charcoal pt-8 text-[16px] sm:text-[15px] leading-[1.6] text-kira-on-dark-muted">
            <p>Global Buildtech Australia Pty Ltd · ABN 54 672 395 685 · trading as Corporate AI Solutions</p>
            <p className="mt-1">76-84 Brunswick Street, Fortitude Valley QLD 4006</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
