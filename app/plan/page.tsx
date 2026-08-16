'use client';

// @public-route

// app/plan/page.tsx
//
// The sales / explainer page. The owner has seen their gap; this page reframes it as the value Kira
// unlocks, explains how the machine works in plain language (Kira listens -> orchestrator -> agent
// swarm does & logs the work -> Mnemo recalls instantly -> Memory Governance keeps it protected),
// shows the dynamic price (a small fraction of their gap), and takes them to Stripe checkout.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Mic,
  Network,
  Users,
  Brain,
  ShieldCheck,
  Clock,
  HeartHandshake,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import { WHO_CAN_SEE_IT } from '@/lib/privacy';
import { computeValuation } from '@/lib/valuation/model';
import { formatMoneyApprox, formatPrice, taxSuffix, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { displayedFigures } from '@/lib/valuation/displayed';
import { priceForProfit, PRICE_TIERS, FULL_RATE_PERIOD_CAP } from '@/lib/valuation/pricing';
import { BetaRedeem } from '@/components/BetaRedeem';
import { TermsAgreement, TERMS_VERSION } from '@/components/TermsAgreement';
import { billingCopy } from '@/lib/billing/copy';
import {
  decodeValuationParam,
  readStoredValuation,
  storeValuation,
  type ValuationPayload,
} from '@/lib/valuation/share';

export default function PlanPage() {
  const [payload, setPayload] = useState<ValuationPayload | null>(null);
  const [ready, setReady] = useState(false);
  // Whether the visitor already has an account. Resolved from /api/valuation/mine, which knows
  // because it reads the session — see the note there.
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  // Is billing actually live? Defaults to FALSE and stays false if the check fails.
  //
  // The default is the safety property, not a placeholder. Claiming "your card will be charged in
  // 30 days" when Stripe is in test mode tells someone they have subscribed when they have not —
  // they find out when the service they think they bought never bills them. The reverse error
  // (saying "beta, not charging yet" while live) is embarrassing but harmless, so that is the
  // direction to fail in.
  const [billingLive, setBillingLive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/mode')
      .then((r) => (r.ok ? r.json() : { live: false }))
      .then((d) => { if (!cancelled) setBillingLive(d?.live === true); })
      .catch(() => { /* stay in the safe state */ });
    return () => { cancelled = true; };
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // THE BETA PATH — the same funnel, without the card.
  //
  // Opened either by `?code=` (what the invitation email links to, so a tester lands straight on it)
  // or by the discreet line under the checkout button, which exists for the one whose link went
  // stale. That second entrance is the lesson from the 2026-08-10 invitation audit: eight people
  // could never sign in because what they were sent expired before they opened it. The code in the
  // email body is the backup for the link in the email.
  //
  // ⚠️ DELIBERATELY NOT A PRICING CARD. A "Beta — free" column beside a real monthly price turns the
  // price into an opening bid and every conversation into a negotiation about access. The people who
  // need this are told it exists; nobody else is shown a discount they can ask for.
  // TERMS, BEFORE MONEY CHANGES HANDS.
  //
  // Acceptance used to be captured only by the /signup form, so every owner who arrived through
  // checkout reached a paid account with `terms_accepted_at` NULL — the one group with a contract
  // was the group with no recorded acceptance. It has to be collected HERE rather than at
  // /onboarding, because by the time that page runs he has already paid, and a gate that can only
  // refuse someone who has been charged is not a gate.
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Where the code is parked so it survives the trip to the valuator and back.
  const BETA_CODE_KEY = 'kira_beta_code';

  const [betaCode, setBetaCode] = useState<string | null>(null);
  const [betaOpen, setBetaOpen] = useState(false);
  // ⚠️ THE CODE MUST SURVIVE THE ROUND TRIP THROUGH THE VALUATION.
  //
  // It was read from the URL and held in state only. `/plan?code=…` promised, in a box he liked,
  // "we have kept WE6EDRWEF3WM and will use it when you get to the end — there is nothing to pay and
  // no card to enter." He was then sent to the valuation, came back to a bare `/plan`, and the code
  // was gone: no banner, a $999 card checkout, and the redeem path in small print at the bottom.
  //
  // Ray, 2026-08-16: "You explicitly promised me you'd kept it. Two screens later you hadn't. That's
  // the first thing on the whole visit and it's a promise broken in under three minutes… for thirty
  // seconds I was looking at a page asking me for a card, on a product I'd been told was free to me.
  // If I hadn't been the sort to poke about, I'd have closed the tab thinking bait-and-switch."
  //
  // sessionStorage, matching where the valuation itself is parked — same tab, same visit, and it
  // never enters a URL. A code is not a secret (it is bound to one email and single-use), but it has
  // no business in browser history either.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('code');
    if (fromUrl) {
      setBetaCode(fromUrl);
      setBetaOpen(true);
      try {
        window.sessionStorage.setItem(BETA_CODE_KEY, fromUrl);
      } catch {
        // Private mode or a full quota. He still has the code in this tab; the promise only breaks
        // if he navigates away, which is strictly better than breaking it every time.
      }
      return;
    }
    try {
      const kept = window.sessionStorage.getItem(BETA_CODE_KEY);
      if (kept) {
        setBetaCode(kept);
        setBetaOpen(true);
      }
    } catch {
      // Nothing to restore. He can still use the link in the small print, which is where he ended up
      // before this existed.
    }
  }, []);

  useEffect(() => {
    // sessionStorage first — that is where the valuation page now parks it, so the owner's turnover
    // and profit never enter a URL (and so browser history, Referer headers and forwarded links
    // don't carry them). The `?v=` read is a fallback for links sent before that change; nothing
    // generates them any more.
    // ⚠️ THE ACCOUNT BASELINE WINS OVER THE DEVICE, and the order used to be the other way round.
    //
    // Everything else in the product measures from the FROZEN baseline and says so. This page read
    // the device store first — so an owner who pressed "Run the numbers again" had a fresh, unclaimed
    // valuation in sessionStorage and saw it here, on the one page with the card button, while his
    // dashboard and his Genome showed the baseline.
    //
    //   "$270,000 on my dashboard and my Genome page, and $300,000 on the page that asks for my
    //    card — both live at the same time… the fee is 'about 4.0% a year of what you stand to
    //    unlock'. Against $270,000 it is 4.4%. I am not suggesting you did that on purpose. I am
    //    telling you what it looks like from my chair." — Ray, 2026-08-17
    //
    // The device store is still exactly right for this page's main audience — an anonymous visitor
    // who has just run the numbers in this browser and has no account to read. `/api/valuation/mine`
    // returns null for him, so asking the account first costs him nothing and one request.
    const stored = readStoredValuation();

    const legacy = decodeValuationParam(new URLSearchParams(window.location.search).get('v'));
    if (legacy) {
      // Re-park it and strip the query, so an old link stops leaking the figures the moment it is
      // opened rather than every time the page is shared onward from here.
      storeValuation(legacy);
      window.history.replaceState(null, '', window.location.pathname);
      setPayload(legacy);
      setReady(true);
      return;
    }

    // THEN THE ACCOUNT — the fix for a closed loop a tester walked.
    //
    // He finished the eleven questions from a button on his own dashboard, was sent here by the
    // result page, and was told "Let's find your number first… take the 3-minute valuation and it'll
    // bring you right back here." The only two links on this page send him back to the valuation, so
    // there was no way out — while /dashboard was showing his completed figures the whole time.
    //
    // The device store is genuinely right FIRST: an anonymous visitor who has just run the numbers
    // in this browser has no account to read, and that is this page's main audience. But a signed-in
    // owner on a different machine, or after clearing his browser, is not someone to ask to do it
    // again — his answer is on his account.
    let cancelled = false;
    fetch('/api/valuation/mine')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled) return;
        // Account first, device as the fallback.
        setPayload(body?.valuation ?? stored ?? null);
        setSignedIn(Boolean(body?.signedIn));
        setReady(true);
      })
      .catch(() => {
        // Signed out, offline, or the lookup failed. The device answer is better than nothing for
        // all three, and the page's own "run the valuation" state covers the case where there is
        // neither.
        if (!cancelled) {
          setPayload(stored ?? null);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const model = useMemo(() => {
    if (!payload) return null;
    const result = computeValuation(payload.inputs);
    const quote = priceForProfit(payload.inputs.annualProfit, result.gap);
    return { result, quote };
  }, [payload]);

  // Approximate, matching the result page and every other surface. This printed $981,990 against a
  // result screen showing $982,000 for the same gap — on a product whose most persuasive paragraph
  // explains why it rounds. A tester checked the arithmetic precisely BECAUSE that paragraph invited
  // him to, and found four surfaces giving three answers.
  const money = (n: number) => formatMoneyApprox(n, payload?.currency || DEFAULT_CURRENCY);
  // Every PRICE carries its tax qualifier; `money` stays for valuation figures, which are not
  // prices and must not gain a '+ GST'. The label follows the visitor's currency — this product
  // is reachable from anywhere, and '+ GST' is meaningless to a buyer in London.
  const price = (n: number) => formatPrice(n, payload?.currency || DEFAULT_CURRENCY);
  const tax = taxSuffix(payload?.currency || DEFAULT_CURRENCY);
  // One switch, every sentence — see lib/billing/copy.ts. The inline ternaries this replaced were
  // the flag being honoured a dozen times independently, which is how two readings drift apart.
  const copy = billingCopy(billingLive);

  async function startCheckout() {
    if (!payload || !model) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // firstName rides along so the account is created with the name HE gave on the valuation
        // intro rather than the name on the card — see app/api/onboarding/complete/route.ts.
        body: JSON.stringify({
          inputs: payload.inputs,
          currency: payload.currency,
          firstName: payload.firstName,
          // Carried into Stripe session metadata and read back by /api/onboarding/complete, which
          // is where the account is actually created and therefore the only place the DB trigger
          // can see it.
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout');
      setLoading(false);
    }
  }

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
        .grad-hero { background: radial-gradient(ellipse at 25% 15%, rgba(251,191,36,.25), transparent 55%), radial-gradient(ellipse at 80% 60%, rgba(167,139,250,.22), transparent 55%), linear-gradient(135deg,#fffbeb,#fef3c7 55%,#fce7f3); }
        .grad-coral { background: linear-gradient(135deg,#fb7185,#f472b6); }
        .grad-genome { background: linear-gradient(135deg,#a78bfa,#8b5cf6 60%,#f472b6); }
      `}</style>

      <header className="sticky top-0 z-40 bg-amber-50/85 backdrop-blur border-b border-amber-200/60">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <a href="/" className="font-display font-bold text-xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">Kira</a>
          <a href="/business-valuation" className="text-sm text-stone-500 hover:text-pink-500 min-h-[44px] flex items-center">Redo my valuation</a>
        </div>
      </header>

      {/* FIRST PAINT — what the server actually sends, and the only thing on screen until the
          valuation is read off this device.
          Before this existed, the server response for /plan carried 164 characters of chrome and
          SIXTEEN of content (the SayFix widget), because both branches below wait on client state.
          A tester timed fifteen seconds of white on it: "the page where you ask for my card is not
          a slow page, it's a broken one, and I have no way to tell the difference." Every status
          check passed straight over it — 200, right commit, no redirect.
          `ready` starts false, so this branch IS the server render, and hydration REPLACES it. That
          is why the copy can live here without stacking a second <h1> on the hero below. */}
      {!ready && (
        <main className="max-w-2xl mx-auto px-5 py-24 text-center">
          <h1 className="font-display text-3xl font-bold text-stone-800 mb-4">
            Set free what&apos;s locked in your head
          </h1>
          <p className="font-body text-lg text-stone-600 leading-relaxed">
            Kira is the part-time general manager you could never justify hiring. You talk, a few
            minutes at a time; she listens, works out what you need, and quietly builds the systems
            that make your business worth more.
          </p>

          {/* P12 — THE MONEY QUESTION IS ANSWERED BY THE SERVER, not after the browser catches up.
              This block used to end on "Reading your valuation from this device…", and his reading
              of that is unarguable: "of every page on this site, the one that starts as a loading
              message is the one where I'm deciding to pay you." The first-paint audit passes /plan,
              correctly — there IS real text — so no check could see this. It is not about how long
              the wait is; it is about what the page says while you wait, on the page that asks for
              a card.
              His exact figure genuinely cannot be server-rendered: it is derived from turnover and
              profit that live in sessionStorage on purpose, so the numbers never enter a URL, a
              Referer header or browser history. What CAN be said without knowing him is the part he
              actually wants first — what it costs, and when he is charged — so that is said here,
              and the personalised figure refines it rather than being the first thing that answers.
              ⚠️ THE FLOOR ONLY, NEVER THE BAND TABLE. pricing.ts:35-39 records that as a decision
              (2026-08-01): the floor answers "roughly what does this cost", a full table invites
              band-shopping before there is a gap to size it against. Read from PRICE_TIERS and
              FULL_RATE_PERIOD_CAP so this cannot drift from what is charged. */}
          <div className="mt-8 rounded-2xl border border-amber-200 bg-white/70 px-5 py-5 text-left">
            <p className="font-body text-stone-700 leading-relaxed">
              <strong className="font-semibold text-stone-900">
                From {formatPrice(PRICE_TIERS[0].monthly, DEFAULT_CURRENCY)} a month
              </strong>
              , priced on the size of your business. You are billed{' '}
              <strong className="font-semibold text-stone-900">after each month has finished</strong>,
              never in advance — cancel before then and that month is on us. After{' '}
              {FULL_RATE_PERIOD_CAP} months you move to a third of the rate whether or not the work
              is done.
            </p>
            <p className="mt-3 text-sm text-stone-500">
              Your own figure is worked out from the valuation on this device, and appears in a
              moment.
            </p>
          </div>
        </main>
      )}

      {ready && !model && (
        <main className="max-w-2xl mx-auto px-5 py-24 text-center">
          <div className="grad-genome w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-6"><Brain className="h-7 w-7" /></div>

          {/* ⚠️ ACKNOWLEDGE THE CODE HE ARRIVED WITH, BEFORE ASKING HIM FOR ANYTHING.
              `?code=` was read into state above and the panel that shows it lives inside the
              `model &&` branch — so a man who followed his invitation link and had not yet done the
              valuation was met with "Let's find your number first" and not one word about the code
              in his hand. Ray, 2026-08-16: "you sent me a code and the code's own URL pretends not
              to know about it."

              Structurally the same defect as the area panel's missing button: content that can only
              render in one branch of a fork, and the branch a new arrival is actually in is the
              other one.

              ⚠️ IT SAYS "KEPT", NOT "VALID". Nothing has checked it at this point — redemption
              happens after the valuation — and claiming it is good and then rejecting it later is
              worse than saying nothing. */}
          {betaCode && (
            <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left">
              <p className="font-semibold text-stone-900">Your invitation code is saved</p>
              <p className="mt-1 text-base leading-relaxed text-stone-700">
                We have kept <span className="font-mono font-semibold">{betaCode}</span> and will use
                it when you get to the end — there is nothing to pay and no card to enter. First,
                three minutes on the numbers, because the rest of it is built around them.
              </p>
            </div>
          )}

          <h1 className="font-display text-2xl font-bold mb-3">
            {betaCode ? 'First, your number' : "Let's find your number first"}
          </h1>
          <p className="text-stone-600 mb-8">This page is built around the value gap in your business. Take the 3-minute valuation and it&apos;ll bring you right back here.</p>
          <a href="/business-valuation" className="grad-coral text-white font-display font-bold px-8 py-4 rounded-full inline-flex items-center gap-2 min-h-[52px]">Find my gap <ArrowRight className="h-5 w-5" /></a>
        </main>
      )}

      {model && (
        <main className="max-w-4xl mx-auto px-5">
          {/* Hero */}
          <section className="grad-hero -mx-5 px-5 py-16 sm:py-20 text-center">
            <div className="inline-flex items-center gap-2 text-pink-600 text-sm font-semibold mb-4"><Sparkles className="h-4 w-4" /> You&apos;ve seen the gap</div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-stone-800 leading-tight max-w-2xl mx-auto">
              There&apos;s <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">{displayedFigures({ worthToday: model.result.today, worthPotential: model.result.potential }, payload?.currency || DEFAULT_CURRENCY).gapText}</span> locked in your head.
              <br className="hidden sm:block" /> Kira helps you set it free.
            </h1>
            <p className="font-body text-lg text-stone-600 max-w-2xl mx-auto mt-5 leading-relaxed">
              You don&apos;t do it with spreadsheets and consultants. You do it by <span className="font-semibold text-stone-800">talking to Kira</span> — a few minutes at a time, over the next 4 weeks and beyond. She listens, works out what you need, and quietly builds the systems that make your business worth more. She&apos;s the part-time general manager you could never justify hiring, on call whenever you talk.
            </p>
          </section>

          {/* The promise / first gains */}
          <section className="py-16">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-3">Just talk. Kira does the building.</h2>
            <p className="text-center text-stone-600 max-w-2xl mx-auto mb-12">The knowledge that makes your business run is already in your head. Kira&apos;s job is to get it out — into documented, transferable systems — without you stopping to write any of it down.</p>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { icon: <Clock className="h-6 w-6" />, t: 'Time back, from week one', b: 'The jobs that only you can do start becoming jobs your systems can do. You get hours back before the month is out.' },
                { icon: <HeartHandshake className="h-6 w-6" />, t: 'Less carried in your head', b: 'The mental load of being the only one who knows how it all works starts to lift. Less stress, fewer 2am worries.' },
                { icon: <Users className="h-6 w-6" />, t: 'A business, not a job', b: 'As the systems build, the business leans on you less — better handovers, a calmer team, and a real asset forming.' },
                { icon: <Brain className="h-6 w-6" />, t: 'A living Business Genome', b: 'Everything Kira captures becomes your Business Genome: the operating brain of the company, yours to keep and hand over.' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm">
                  <div className="grad-genome w-11 h-11 rounded-xl flex items-center justify-center text-white mb-4">{c.icon}</div>
                  <h3 className="font-display font-bold text-lg mb-1.5">{c.t}</h3>
                  <p className="text-stone-600 text-sm leading-relaxed">{c.b}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How the machine works */}
          <section className="py-16">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-3">What happens when you talk to Kira</h2>
            {/* ⚠️ THIS SAID "Nobody reads your conversations." It was not true, and it was on the page read
                BEFORE paying while the honest version sat on a page only reachable after.
                A tester found all three readings in one session — this one, My Genome's "our support
                team can see what Kira has captured", and the operator console rendering his facts
                verbatim — and drew the obvious conclusion: "the honest one is the only one I couldn't
                see until after I'd signed up. That's the wrong way round." He also pointed out the
                fix is not to hide the screen: "Fix the promise, not the screen."
                So the pre-purchase page now carries the same sentence as the post-purchase one. */}
            <p className="text-center text-stone-600 max-w-2xl mx-auto mb-12">You only ever talk to Kira. Behind her is software that does the work and keeps the record — not a room of people reading transcripts. {WHO_CAN_SEE_IT}</p>
            {/* The page that asks for $999 had ZERO links to the page showing what you get for it.
                Ray, 66, read the whole sales page and never learned the deliverable existed
                (naive-tester, 2026-07-28). This is the difference between buying a promise and
                seeing the thing. */}
            <p className="text-center mb-12 -mt-8">
              <a href="/sample-genome" className="text-violet-600 font-semibold underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500 min-h-[44px] inline-flex items-center">
                See an example of what you end up with →
              </a>
            </p>
            <div className="space-y-4">
              {[
                { icon: <Mic className="h-5 w-5" />, t: 'Kira listens & clarifies', b: 'You talk about a job, a headache, a process. Kira asks the questions a good operator would until she knows exactly what you need.' },
                { icon: <Network className="h-5 w-5" />, t: 'She lines up the work', b: 'Kira turns what you said into a clear set of tasks — exactly the pieces of work that actually need doing.' },
                { icon: <Users className="h-5 w-5" />, t: 'The work gets done — and written down', b: 'The tasks get completed and recorded, so what you know about your business stops living only in your head.' },
                { icon: <Brain className="h-5 w-5" />, t: 'Kira remembers it — instantly', b: 'Everything you tell Kira is remembered, so next time she already knows and picks up right where you left off.' },
                // "only you, and anyone you choose, can ever see it" was the second overclaim on this page.
                // What is true and still worth saying: it is not shown to a buyer, not shared with an
                // introducer, and the handover document leaves out his own position.
                // ⚠️ WHO_CAN_SEE_IT IS SAID ONCE ON THIS PAGE, IN THE INTRO ABOVE — NOT AGAIN HERE.
                // It was printed twice within a screen of itself, and repetition reads as anxiety
                // rather than reassurance. Ray, on the man who has told nobody he is selling: "The
                // privacy paragraph says the same thing twice in slightly different words. When a
                // page protests that much I start wondering what it is protesting about."
                // This card carries what the intro does NOT say — the buyer, the introducer, and
                // what the handover document leaves out.
                { icon: <ShieldCheck className="h-5 w-5" />, t: 'Your knowledge stays yours', b: 'It is never shown to a buyer and never shared with anyone who referred you. The handover document leaves out your own position — your plans, your circumstances, what you would accept.' },
              ].map((s, i, arr) => (
                <div key={i} className="flex gap-4 items-start bg-white rounded-2xl p-5 border border-amber-100">
                  <div className="grad-coral text-white w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">{s.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-400">STEP {i + 1}</span>
                    </div>
                    <h3 className="font-display font-bold text-lg">{s.t}</h3>
                    <p className="text-stone-600 text-sm leading-relaxed mt-1">{s.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* The value framing + price */}
          <section className="py-16">
            <div className="grad-genome rounded-3xl p-8 sm:p-10 text-white text-center shadow-lg">
              <p className="text-white/80 font-medium">You could unlock</p>
              {/* ⚠️ THE SAME `gapText` AS THE HEADLINE FOUR INCHES ABOVE — NOT `money(result.gap)`.
                  `displayedFigures` derives the gap FROM the rounded pair, so the number printed is
                  true in the numbers actually shown; rounding the raw gap independently produces a
                  figure that is also correct and DIFFERENT. This page carried both at once: the
                  headline said $270,000 and this panel said $271,000, on one screen.

                  Ray, 2026-08-16: "It's a thousand dollars and it doesn't change anything. That's
                  not the point. The point is I am being asked to pay real money on the strength of a
                  calculation, and the calculation can't hold one number still across two panels of
                  one screen."

                  Third time this exact class has been found (7 Aug, 16 Aug on /my-genome, now here).
                  It keeps returning because each fix went to the screen that was reported. */}
              <p className="font-display text-4xl sm:text-5xl font-bold mt-1">
                {
                  displayedFigures(
                    { worthToday: model.result.today, worthPotential: model.result.potential },
                    payload?.currency || DEFAULT_CURRENCY,
                  ).gapText
                }
              </p>
              <p className="text-white/90 max-w-lg mx-auto mt-4 leading-relaxed">
                Kira is <span className="font-bold">{money(model.quote.monthly)}/month {tax}</span>{copy.priceQualifier}
                {model.quote.fractionWorthQuoting ? (
                  <> — about <span className="font-bold">{model.quote.fractionOfGapPct}</span> a year of what you stand to unlock</>
                ) : null}
                . It&apos;s the part-time general manager you could never justify hiring, at a fraction of the cost — plus the time, the calm and the handover you can&apos;t put a number on.
              </p>
            </div>

            <div className="mt-8 bg-white rounded-3xl p-8 border-2 border-violet-200 shadow-sm max-w-lg mx-auto text-center">
              <span className="text-xs font-body uppercase tracking-wider text-violet-500 font-semibold">{model.quote.label} plan</span>
              <p className="font-display text-4xl font-bold text-stone-800 mt-2">{money(model.quote.monthly)}<span className="text-lg text-stone-400 font-body">/month {tax}</span></p>
              <p className="text-sm text-stone-500 mt-1">
                {billingLive
                  ? <>Billed at the end of each month, for the month just gone. Cancel any time and the month you are in is on us.</>
                  : <>Free while we are in beta. {price(model.quote.monthly)}/month once billing goes live — we will tell you first.</>}
              </p>
              {/* A badge, not just a sentence. Someone skimming a checkout reads the button and the
                  line under it; burying "we are not actually charging you" in a paragraph below the
                  fold is how the current page ended up looking like a real purchase. */}
              {/* HIS SIDE OF IT, NOT OURS. This read "Beta · payments not live — Stripe is in test
                  mode", and a tester's reaction was the whole problem: "I know what that means
                  because my nephew writes software. What I heard was: this isn't finished, and I'd
                  be the experiment." Naming our payment vendor's internal setting tells him nothing
                  he can act on and everything about how finished we are. The promise underneath is
                  unchanged and genuinely good — he is not charged and we write before that changes —
                  so it is stated as certainty rather than as plumbing. */}
              {!billingLive && (
                <p className="mt-3 inline-block rounded-full bg-amber-100 text-amber-900 text-xs font-semibold px-3 py-1.5">
                  Free while we are in beta — no card charged
                </p>
              )}
              {/* Every claim on this card follows the SAME billingLive switch as the price line and
                  the fine print. Three strings were made conditional when the beta badge went in and
                  four were left asserting a 30-day trial, so in beta the card promised "30 days free"
                  and "free while we are in beta" side by side — two different offers, on the page
                  that asks for $999. A tester read it as the most expensive page being the least
                  clear one (naive-tester, Ray, 2026-07-28). A partial switch is worse than none,
                  because it reads as deliberate. */}
              <ul className="text-left space-y-2.5 my-6 text-stone-700">
                {[
                  copy.bullets[0],
                  'Always-on Kira — talk anytime, she remembers everything',
                  'Kira quietly captures your know-how into a Business Genome',
                  'Your knowledge stays private and yours to keep',
                  copy.bullets[1],
                  copy.bullets[2],
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm"><Check className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" /> {f}</li>
                ))}
              </ul>
              {/* CONSEQUENCE BEFORE THE CLICK (§9), and it needs saying loudest while billing is OFF.
                  A tester pressed "Start now — free while in beta" and landed, in one click with no
                  warning, on a Stripe card form. "A man who has just been told 'no card is charged'
                  is now being asked for a card with no warning… I'd have stopped there in real
                  life." The next screen asks for a card either way, so the button has to say so. */}
              {confirming && (
                <div className="mb-3 rounded-2xl border-2 border-stone-300 bg-white p-4 text-left">
                  <p className="font-display font-bold text-stone-900">{copy.confirmTitle}</p>
                  <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                    {copy.confirmBody(`${money(model.quote.monthly)} ${tax}`)}
                  </p>
                  {/* THE CHECKBOX SITS INSIDE THE CONFIRM STEP, not beside the first button.
                      This is the screen that already says, in words, what is about to happen and
                      what it will cost — which is the moment a legal agreement means something. Put
                      on the outer CTA it would be one more thing to get past on the way to reading
                      the confirmation, and he would tick it before he had been told the price. */}
                  <TermsAgreement checked={termsAccepted} onChange={setTermsAccepted} id="terms-paid" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={startCheckout}
                      /* Disabled until ticked. The button says why below rather than failing
                         silently on click, which is how a required checkbox becomes a dead button
                         nobody can explain. */
                      disabled={loading || !termsAccepted}
                      className="grad-coral text-white font-display font-bold px-6 py-3 rounded-full inline-flex items-center gap-2 min-h-[48px] disabled:opacity-60"
                    >
                      {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Starting…</> : <>Continue to Stripe <ArrowRight className="h-5 w-5" /></>}
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      className="rounded-full border border-stone-300 bg-white px-6 py-3 font-semibold text-stone-700 min-h-[48px]"
                    >
                      Not yet
                    </button>
                  </div>
                  {!termsAccepted && (
                    <p className="mt-2 text-sm text-stone-500">
                      Tick the box above to continue.
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={() => setConfirming(true)}
                disabled={loading}
                className="grad-coral text-white font-display font-bold px-8 py-4 rounded-full text-lg inline-flex items-center gap-2 min-h-[52px] shadow-lg shadow-pink-200 w-full justify-center disabled:opacity-60"
              >
                {copy.cta} <ArrowRight className="h-5 w-5" />
              </button>
              {error && <p className="text-rose-600 text-sm mt-3">{error}</p>}
              {/* A DOOR THAT ISN'T A CARD FORM.
                  Ray, 7 August, having read the whole pricing argument and accepted it: "I am not
                  putting a card in before I have seen the thing work. I am sixty-six and thinking
                  about selling and I have not told my wife." He went round the back via Sign in →
                  "Need an account? Sign up" — two clicks and a bit of nerve — and said plainly that
                  most cautious buyers would not find it. For THIS audience, wanting to look first is
                  the normal case, not the objection. The account, the dashboard and a working Kira
                  already exist behind it; we simply were not offering them. */}
              {/* ⚠️ NOT OFFERED TO SOMEONE WHO HAS ALREADY TAKEN THEM. A signed-in owner was shown
                  "Create an account without a card", "Already have an account? Sign in" and "Been
                  invited to the beta?" on the page asking for his card. Ray: "Three offers I have
                  already taken." Each is exactly right for the anonymous visitor this page is
                  mainly written for, and each reads as a page that does not know who it is talking
                  to when he is signed in. */}
              {!signedIn && (
              <p className="mt-4 text-sm text-stone-600">
                Rather look around first?{' '}
                <a href="/signup" className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500">
                  Create an account without a card
                </a>{' '}
                and come back when you&apos;re ready.
              </p>
              )}
              <p className="mt-3 text-sm text-stone-500">
                Before you decide:{' '}
                <a href="/what-she-does" className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500">
                  what she does, and what she doesn&apos;t
                </a>
                .
              </p>

              {/* THE BETA DOOR — a line, not a card. See the note on `betaCode` above for why this
                  is not a pricing tier. Rendered last of the three secondary lines because it is the
                  one fewest readers need: an invited tester usually arrives by `?code=` and never
                  reads this at all. It is here for the one whose link went stale. */}
              {signedIn ? null : betaOpen ? (
                <div className="mt-5">
                  <BetaRedeem initialCode={betaCode ?? ''} firstName={payload?.firstName} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-stone-500">
                  Been invited to the beta?{' '}
                  <button
                    type="button"
                    onClick={() => setBetaOpen(true)}
                    className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500 min-h-[44px]"
                  >
                    Enter your invitation code
                  </button>
                  .
                </p>
              )}
              {/* ⚠️ THE RETURNING OWNER HAS NOWHERE TO GO FROM THIS PAGE.
                  Every route into /plan is a funnel for a new customer, and the page carried a logo,
                  a "Redo my valuation" link and a button that starts taking money. A man who already
                  has an account and lands here — from a bookmark, an old email, or by re-running the
                  valuation to see it again — could not reach it.

                  Ray, 2026-08-16: "I already have an account from last time… To get to my own
                  account I had to go back to the landing page and find it in the top corner. I
                  wouldn't create a second account, so what I'd actually have done is given up."

                  It also catches the invitation-code dead end: a code that has already been redeemed
                  means he has an account, and this is the line that resolves it without the API
                  having to say which of the three rejection reasons applied. */}
              {!signedIn && (
              <p className="mt-3 text-sm text-stone-500">
                Already have an account?{' '}
                <a
                  href="/login"
                  className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500"
                >
                  Sign in
                </a>
                .
              </p>
              )}
              <p className="text-xs text-stone-400 mt-3">
                {copy.finePrint(`${money(model.quote.monthly)} ${tax}`)} You set your password and meet Kira right after.
              </p>
            </div>
          </section>

          {/* A <div>, not a <footer>. This page keeps the root CorporateFooter — it is where money
              is asked for, so the operator's identity belongs at the bottom of it — and two
              <footer> elements on one page is the /about defect in a quieter form. The identity
              half was a duplicate of what CorporateFooter already says; the "redo" link is the
              only part that was page-specific, so that is all that is left. */}
          <div className="py-10 text-center text-sm text-stone-400 border-t border-amber-100">
            <a href="/business-valuation" className="hover:text-pink-500">Redo my valuation</a>
          </div>
        </main>
      )}
    </div>
  );
}
