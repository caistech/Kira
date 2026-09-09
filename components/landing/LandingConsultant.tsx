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
  { href: '#the-opportunity', label: 'The opportunity' },
  { href: '#how-it-works', label: 'How it works' },
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

const PROBLEMS = [
  {
    title: 'Owner dependence',
    body: 'The owner remains the person everyone goes to. Important knowledge exists primarily in their head. The business may perform well, but it is difficult to operate independently of them.',
  },
  {
    title: 'Knowledge disappears between engagements',
    body: 'You identify important issues during a meeting, but much of the context, decisions and operational knowledge remain informal. Without a mechanism to capture them, they drift.',
  },
  {
    title: 'You don\'t see everything',
    body: 'You may only see the business periodically. Between engagements, the owner deals with problems you never hear about — and opportunities that quietly pass.',
  },
  {
    title: 'Improvement needs to be demonstrated',
    body: 'It is not enough to say the business improved. The BBBO framework demands evidence: Assess → Improve → Measure → Prove. You contribute to the improvement — and potentially the proof.',
  },
];

const BENEFITS = [
  { title: 'Extend your reach', body: 'Kira captures information and prompts thinking between your consulting engagements, so your influence continues even when you are not in the room.' },
  { title: 'Deepen your understanding', body: 'Arrive at consulting conversations with a richer understanding of the issues the owner is facing — not just what they told you last month.' },
  { title: 'Increase the value of your intervention', body: 'Use persistent business knowledge to focus your expertise on the issues that matter most, rather than spending time reconstructing context.' },
  { title: 'Demonstrate progress', body: 'Create a stronger longitudinal record of what has changed, rather than relying entirely on anecdotal recollection at the next review.' },
  { title: 'Strengthen client relationships', body: 'Become part of a longer-term transformation journey rather than being associated with a one-off project that ends when the invoice is paid.' },
  { title: 'Address bigger problems', body: 'The BBBO ecosystem is designed around the wider value gap. You do not need to solve all of those problems yourself — that is precisely why the ecosystem exists.' },
];

const CONSULTANT_JOURNEY = [
  { n: '01', title: 'You identify the opportunity', body: 'You see the gaps — owner dependence, undocumented knowledge, operational risk. You know where the business needs to improve.' },
  { n: '02', title: 'Kira continuously captures the business', body: 'She interviews the owner, asks the diagnostic questions, and turns what she learns into structured organisational knowledge — between your engagements.' },
  { n: '03', title: 'You see the issues more clearly', body: 'Kira surfaces what the owner is dealing with when you are not there. You arrive at each conversation with evidence, not guesses.' },
  { n: '04', title: 'You apply your expertise', body: 'Your strategic advice lands on real, captured data — not vague recollection. The business gets better because your work is focused and persistent.' },
  { n: '05', title: 'Improvement is measured', body: 'The BBBO framework tracks what changed. You contribute measurable interventions rather than simply providing advice.' },
  { n: '06', title: 'The business becomes more transferable', body: 'A documented, owner-independent business commands a higher multiple and transitions cleanly to a buyer, successor or management team.' },
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
              Explore Kira
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

      {/* THE OPPORTUNITY — §16 #1 */}
      <section id="the-opportunity" className="mx-auto max-w-5xl xl:max-w-6xl px-6 pb-16 pt-16 lg:pt-24">
        <div>
          <div className="mb-8 flex items-center gap-4">
            <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-kira-line lg:hidden">
              <img src="/female_avatar.jpeg" alt="Kira" className="h-full w-full object-cover" />
            </span>
            <p className="text-[16px] sm:text-[15px] uppercase tracking-[0.14em] text-kira-soft">
              A generation of valuable businesses is approaching ownership transition.
            </p>
          </div>

          <h1 className="max-w-[20ch] text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-kira-dark lg:text-[56px]">
            There is a major market opportunity in the BBBO generation.
          </h1>
          <p className="mt-4 max-w-[24ch] text-[27px] leading-[1.2] text-kira-charcoal lg:text-[34px]">
            Your expertise has a meaningful place in solving it.
          </p>

          <p className="ln-measure mt-8 text-[17px] leading-[1.65] text-kira-charcoal">
            Many Baby Boomer business owners have spent decades building valuable companies 
            without deliberately preparing those businesses for eventual transfer. 
            The issues that constrain performance today can also constrain value and saleability later — 
            and the window to address them is finite.{' '}
            <strong className="font-semibold text-kira-dark">The BBBO mission exists to help them get 
            everything those businesses are capable of being worth.</strong>
          </p>

          <p className="ln-measure mt-6 text-[17px] leading-[1.65] text-kira-charcoal">
            Kira is one capability inside that larger mission. She is not the ecosystem itself — 
            she is a technology capability that helps capture organisational knowledge, reduce owner 
            dependence and create persistent business intelligence.{' '}
            <strong className="font-semibold text-kira-dark">Your expertise is another.</strong>{' '}
            Together with the broader BBBO ecosystem, that is how these businesses improve.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="/business-valuation"
              className="ln-link inline-flex min-h-[52px] items-center rounded-md bg-kira-600 px-7 text-[17px] font-medium text-white hover:bg-kira-700"
            >
              Explore how Kira works
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

      {/* THE PROBLEM — §16 #2, §5 */}
      <section className="border-y border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="max-w-[28ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            The problems are real, and consultants feel them first.
          </h2>
          <p className="ln-measure mt-4 text-[17px] leading-[1.65] text-kira-charcoal">
            You already know what owner-dependent businesses look like from the inside. 
            These are the recurring issues that make your work harder and the business less transferable.
          </p>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            {PROBLEMS.map((p) => (
              <div key={p.title}>
                <h3 className="text-[21px] font-semibold text-kira-dark">{p.title}</h3>
                <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE BBBO MISSION — §16 #3, §8 */}
      <section className="border-t border-kira-line bg-kira-mist">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="max-w-[22ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            10,000 Baby Boomer Businesses.
          </h2>
          <p className="ln-measure mt-4 text-[17px] leading-[1.65] text-kira-charcoal">
            The BBBO mission is to help <strong className="font-semibold text-kira-dark">10,000 Baby Boomer-owned 
            businesses maximise the proven True-Value of what they have built</strong> and prepare those businesses 
            for eventual ownership transition.
          </p>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div className="rounded-lg border border-kira-line bg-white px-6 py-5">
              <p className="text-[16px] sm:text-[15px] uppercase tracking-[0.1em] text-kira-soft">First milestone</p>
              <p className="mt-2 text-[27px] font-semibold tracking-tight text-kira-dark">1,000 businesses</p>
              <p className="mt-1 text-[17px] text-kira-charcoal">by 31 December 2026</p>
            </div>
            <div className="rounded-lg border border-kira-line bg-white px-6 py-5">
              <p className="text-[16px] sm:text-[15px] uppercase tracking-[0.1em] text-kira-soft">Scale objective</p>
              <p className="mt-2 text-[27px] font-semibold tracking-tight text-kira-dark">10,000 businesses</p>
              <p className="mt-1 text-[17px] text-kira-charcoal">by 31 December 2027</p>
            </div>
          </div>

          <p className="ln-measure mt-8 text-[17px] leading-[1.65] text-kira-charcoal">
            The first 1,000 are intended to prove the methodology, partner model, evidence model, 
            marketplace proposition and commercial economics before scaling. This is not simply a 
            registration target — the ultimate objective is businesses that are better, more transferable, 
            supported by evidence, and genuinely prepared for ownership transition.
          </p>
        </div>
      </section>

      {/* KIRA'S ROLE — §16 #4, §10 */}
      <section className="border-t border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="max-w-[22ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            Kira provides the persistent business intelligence.
          </h2>
          <p className="ln-measure mt-4 text-[17px] leading-[1.65] text-kira-charcoal">
            Kira is a technology capability that can help reduce owner dependence by capturing 
            organisational knowledge, coordinating operational activity and creating persistent 
            organisational memory. She is not an exit adviser, a business broker, a valuation engine 
            or a replacement for your expertise.
          </p>

          <div className="ln-measure mt-6 space-y-4 text-[17px] leading-[1.65] text-kira-charcoal">
            <p>
              She interviews the owner in conversation, turning the undocumented systems and relationships 
              in their head into a structured, transferable{' '}
              <a href="/sample-genome" className="ln-link font-medium text-kira-600 underline underline-offset-4 hover:text-kira-700">
                Operating Manual
              </a>{' '}
              — written down so the business can be managed, scaled, or sold cleanly.
            </p>
            <p>
              Between your engagements, she maintains momentum — capturing decisions, filing procedures, 
              and surfacing what actually needs attention. When they return to you, they bring real, 
              captured data rather than vague updates.
            </p>
          </div>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">Between sessions — she captures</h3>
              <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
                Kira interviews the owner and key staff, turning daily operations and knowledge 
                into an exportable, verifiable manual of the business.
              </p>
            </div>
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">Between sessions — she maintains</h3>
              <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
                Key personnel can consult Kira to resolve operational questions exactly the way the 
                owner would, reducing the owner&apos;s immediate daily workload and preserving consistency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* YOUR ROLE — §16 #5, §6 */}
      <section className="border-y border-kira-line bg-kira-mist">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="max-w-[28ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            Your expertise remains central. Here is what changes.
          </h2>
          <p className="ln-measure mt-4 text-[17px] leading-[1.65] text-kira-charcoal">
            Kira does not replace the kind of work you do. She makes your capability more continuous, 
            informed and scalable — and she connects your work to a much larger ecosystem.
          </p>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title}>
                <h3 className="text-[21px] font-semibold text-kira-dark">{b.title}</h3>
                <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE ECOSYSTEM — §16 #6, §7 */}
      <section className="border-t border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="max-w-[24ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            You don&apos;t have to solve every value gap.
          </h2>
          <p className="ln-measure mt-4 text-[17px] leading-[1.65] text-kira-charcoal">
            You bring the expertise. Kira provides the persistent business intelligence. 
            The BBBO ecosystem provides the broader capabilities.
          </p>

          <div className="ln-measure mt-6 space-y-4 text-[17px] leading-[1.65] text-kira-charcoal">
            <p>
              The mission explicitly identifies business consultants as contributors providing 
              operational improvement, strategy and performance. That is your place in the ecosystem.
            </p>
            <p>
              Other ecosystem participants address other gaps — accountants and CFOs on financial 
              quality, brokers and M&amp;A advisers on transaction preparation, lawyers on legal structure 
              and succession, HR specialists on management depth, technology providers on systems and 
              knowledge capture, and coaches on accountability and execution.
            </p>
          </div>

          <p className="ln-measure mt-6 text-[17px] leading-[1.65] text-kira-charcoal">
            That is precisely why the ecosystem exists. Each contributor addresses specific value gaps 
            according to their existing capabilities.{' '}
            <strong className="font-semibold text-kira-dark">You don&apos;t need to solve every problem — 
            you have a place in a system that can.</strong>
          </p>
        </div>
      </section>

      {/* THE OUTCOME — §16 #7, §9 + §12 */}
      <section id="how-it-works" className="border-y border-kira-line bg-kira-mist">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="max-w-[22ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            The consultant journey, from identification to transfer.
          </h2>
          <p className="ln-measure mt-4 text-[17px] leading-[1.65] text-kira-charcoal">
            The BBBO framework is: <strong className="font-semibold text-kira-dark">Assess → Improve → 
            Measure → Prove → Sell.</strong> Your expertise remains central throughout.
          </p>

          <ol className="mt-12">
            {CONSULTANT_JOURNEY.map((s, i) => (
              <li key={s.n} className={`grid gap-x-8 gap-y-3 py-8 sm:grid-cols-[4rem_1fr] ${i > 0 ? 'border-t border-kira-line' : ''}`}>
                <span className="text-[21px] font-semibold tabular-nums text-kira-600">{s.n}</span>
                <div>
                  <h3 className="text-[21px] font-semibold text-kira-dark">{s.title}</h3>
                  <p className="ln-measure mt-2 text-[17px] leading-[1.65] text-kira-charcoal">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <p className="ln-measure text-[17px] leading-[1.65] text-kira-charcoal">
              The ultimate proposition to the owner is <strong className="font-semibold text-kira-dark">Maximum 
              Proven True-Value</strong> — not an inflated valuation, but a business whose improved value can be 
              demonstrated with evidence. You contribute to the improvement. The ecosystem provides the other capabilities.
            </p>
          </div>
        </div>
      </section>

      {/* TALK TO HER — voice widget, positioned after the strategic story */}
      <section className="border-y border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            Talk to her yourself before introducing a client
          </h2>
          <p className="ln-measure mt-3 text-[17px] leading-[1.65] text-kira-charcoal">
            No account, no card, nothing saved. Ask her how she works alongside advisers, 
            how she fits within the BBBO ecosystem, or how the valuation works. 
            Type it, or talk to her — both work.
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
                placeholder="How does Kira work alongside a business consultant?"
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

      {/* THE NUMBERS — proof that the gap exists */}
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
            The <strong className="font-semibold text-kira-dark">$195k gap</strong> is the knowledge locked 
            in your client&apos;s head. Kira helps you capture and unlock it together.
          </p>

          <p className="ln-measure mt-4 text-[17px] leading-[1.65] text-kira-soft">
            This plumber has all of it in his head — nothing written down, no contracts, one big 
            customer. That is the <strong className="font-semibold">widest the gap gets</strong>. An 
            owner who has already documented half of it sees roughly half as much, because Kira only 
            claims what is left to capture. Working out a larger gap can never earn us (or you) more.
          </p>
        </div>
      </section>

      {/* DEMO */}
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

      {/* WHERE IT ENDS UP — the Operating Manual */}
      <section className="border-t border-kira-line bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="max-w-[24ch] text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            It ends up in their filing cabinet, not ours.
          </h2>
          <div className="ln-measure mt-4 space-y-4 text-[17px] leading-[1.65] text-kira-charcoal">
            <p>
              What Kira captures becomes an Operating Manual — structured document-by-document, 
              written directly into your client&apos;s own Google Drive.
            </p>
            <p>
              There are two distinct versions. Their internal copy has everything in it. The 
              handover version automatically excludes sensitive plans and figures — making it safe 
              to send to accountants, brokers, or potential buyers as dated, verified evidence 
              of their enterprise systems.
            </p>
            <p>
              They can download it cleanly. It opens in any browser, prints, and works without 
              an account or login. If they stop paying us tomorrow, they keep a document that works forever.
            </p>
          </div>
        </div>
      </section>

      {/* PARTNERSHIP */}
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
                <li>Diagnostic questions the owner hasn&apos;t considered</li>
                <li>Pushback when procedures are vague or missing</li>
                <li>Absolute, row-isolated privacy boundaries between clients</li>
                <li>Honesty when she doesn&apos;t know operational specifics</li>
              </ul>
            </div>
            <div>
              <h3 className="text-[21px] font-semibold text-kira-dark">What Kira needs</h3>
              <ul className="mt-4 space-y-2.5 text-[17px] leading-[1.6] text-kira-charcoal">
                <li>Honest disclosures from the owner on key dependencies</li>
                <li>Correction when her summarised workflows are off track</li>
                <li>Your strategic lens to review their readiness</li>
                <li>Cooperative goal setting to address newly surfaced gaps</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
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
            Which band your client lands in depends on the size of their business — the annual profit 
            they tell us, not the gap we calculate. That distinction is non-negotiable: the tool that 
            works out what the business is worth has nothing to gain from the number being bigger.
          </p>
          <p>The valuation is completely free — no sign-up, no card, no obligation.</p>
          <p>
            Kira&apos;s fee is set to a small fraction of what they stand to unlock. They are{' '}
            <strong className="font-semibold text-kira-dark">never invoiced for the month they are 
            in</strong> — each month is billed once it has finished, and if they cancel, that month is on us.
          </p>
          <p>
            <strong className="font-semibold text-kira-dark">It is meant to end.</strong> Kira&apos;s job 
            is to get what is in their head onto paper. Once that is done, keeping it current costs only{' '}
            <strong className="font-semibold text-kira-dark">a third of their band</strong>.
          </p>
          <p>
            <strong className="font-semibold text-kira-dark">
              And there is a ceiling: after {FULL_RATE_PERIOD_CAP} months they move to the lower rate 
              whether or not we think the work is done.
            </strong>{' '}
            We would rather cap what you and your client can be charged than guess or drag out the timeline.
          </p>
        </div>

        <div className="mt-10">
          <a
            href="/business-valuation"
            className="ln-link inline-flex min-h-[52px] items-center rounded-md bg-kira-600 px-7 text-[17px] font-medium text-white hover:bg-kira-700"
          >
            Experience the valuation
          </a>
          <p className="mt-3 text-[16px] sm:text-[15px] text-kira-soft">
            Free · no sign-up · see the numbers in 3 minutes.
          </p>
        </div>
      </section>

      {/* ABOUT */}
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
              in response to what advisers and owners tell me. What you do not get is a support desk 
              in another time zone.
            </p>
            <p>
              Your client&apos;s business details stay in their account. They are used to build their 
              Operating Manual and nothing else — not sold, not pooled, not used to train anyone&apos;s 
              model. The{' '}
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

      {/* QUESTIONS */}
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

      {/* THE NEXT STEP — §16 #8, §15 */}
      <section className="border-t border-kira-line bg-kira-mist">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-[27px] font-semibold tracking-tight text-kira-dark lg:text-[34px]">
            See how Kira could work with your clients.
          </h2>
          <p className="ln-measure mx-auto mt-4 text-[17px] leading-[1.65] text-kira-charcoal">
            There is a large, specific and time-sensitive market of mature Baby Boomer-owned businesses 
            that need help becoming more valuable, more transferable and more demonstrably ready for 
            their next owner. Your expertise is one of the capabilities that can help make that happen.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/business-valuation"
              className="ln-link inline-flex min-h-[52px] items-center rounded-md bg-kira-600 px-7 text-[17px] font-medium text-white hover:bg-kira-700"
            >
              Explore becoming a BBBO ecosystem consultant
            </a>
            <a
              href="/sample-genome"
              className="ln-link inline-flex min-h-[52px] items-center rounded-md border border-kira-line bg-white px-7 text-[17px] font-medium text-kira-dark hover:border-kira-600 hover:text-kira-600"
            >
              See a sample manual
            </a>
          </div>
          <p className="mt-4 text-[16px] sm:text-[15px] text-kira-soft">
            No account required. The journey begins with a 3-minute valuation.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-kira-dark">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[21px] font-semibold text-white">Kira</p>
              <p className="ln-measure mt-3 text-[17px] leading-[1.6] text-kira-on-dark">
                Part of the BBBO mission to help 10,000 Baby Boomer-owned businesses achieve their 
                maximum proven value. One technology capability inside a much larger ecosystem.
              </p>
              <a
                href="/business-valuation"
                className="ln-link mt-6 inline-flex min-h-[48px] items-center rounded-md bg-kira-600 px-6 text-[17px] font-medium text-white hover:bg-kira-700"
              >
                Explore Kira
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
