'use client';

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
import { computeValuation } from '@/lib/valuation/model';
import { formatMoneyApprox, formatPrice, taxSuffix, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { priceForGap } from '@/lib/valuation/pricing';
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

  useEffect(() => {
    // sessionStorage first — that is where the valuation page now parks it, so the owner's turnover
    // and profit never enter a URL (and so browser history, Referer headers and forwarded links
    // don't carry them). The `?v=` read is a fallback for links sent before that change; nothing
    // generates them any more.
    const stored = readStoredValuation();
    if (stored) {
      setPayload(stored);
      setReady(true);
      return;
    }

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
        setPayload(body?.valuation ?? null);
        setReady(true);
      })
      .catch(() => {
        // Signed out, offline, or the lookup failed — the page's own "run the valuation" state is
        // the correct answer for all three, and it is the state this page was written for.
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const model = useMemo(() => {
    if (!payload) return null;
    const result = computeValuation(payload.inputs);
    const quote = priceForGap(result.gap);
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Outfit:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Outfit', sans-serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
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

      {ready && !model && (
        <main className="max-w-2xl mx-auto px-5 py-24 text-center">
          <div className="grad-genome w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-6"><Brain className="h-7 w-7" /></div>
          <h1 className="font-display text-2xl font-bold mb-3">Let&apos;s find your number first</h1>
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
              There&apos;s <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">{money(model.result.gap)}</span> locked in your head.
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
            <p className="text-center text-stone-600 max-w-2xl mx-auto mb-12">You only ever talk to Kira. Behind her is software that does the work and keeps the record — not a team of people. Nobody reads your conversations.</p>
            {/* The page that asks for $999 had ZERO links to the page showing what you get for it.
                Ray, 66, read the whole sales page and never learned the deliverable existed
                (naive-tester, 2026-07-28). This is the difference between buying a promise and
                seeing the thing. */}
            <p className="text-center mb-12 -mt-8">
              <a href="/genome" className="text-violet-600 font-semibold underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500 min-h-[44px] inline-flex items-center">
                See an example of what you end up with →
              </a>
            </p>
            <div className="space-y-4">
              {[
                { icon: <Mic className="h-5 w-5" />, t: 'Kira listens & clarifies', b: 'You talk about a job, a headache, a process. Kira asks the questions a good operator would until she knows exactly what you need.' },
                { icon: <Network className="h-5 w-5" />, t: 'She lines up the work', b: 'Kira turns what you said into a clear set of tasks — exactly the pieces of work that actually need doing.' },
                { icon: <Users className="h-5 w-5" />, t: 'The work gets done — and written down', b: 'The tasks get completed and recorded, so what you know about your business stops living only in your head.' },
                { icon: <Brain className="h-5 w-5" />, t: 'Kira remembers it — instantly', b: 'Everything you tell Kira is remembered, so next time she already knows and picks up right where you left off.' },
                { icon: <ShieldCheck className="h-5 w-5" />, t: 'Your knowledge stays yours', b: 'Everything Kira captures is private and protected — only you, and anyone you choose, can ever see it.' },
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
              <p className="font-display text-4xl sm:text-5xl font-bold mt-1">{money(model.result.gap)}</p>
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
                    {copy.confirmBody(`${price(model.quote.monthly)} ${tax}`)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={startCheckout}
                      disabled={loading}
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
              <p className="mt-4 text-sm text-stone-500">
                Before you decide:{' '}
                <a href="/what-she-does" className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500">
                  what she does, and what she doesn&apos;t
                </a>
                .
              </p>
              <p className="text-xs text-stone-400 mt-3">
                {copy.finePrint(`${price(model.quote.monthly)} ${tax}`)} You set your password and meet Kira right after.
              </p>
            </div>
          </section>

          <footer className="py-10 text-center text-sm text-stone-400 border-t border-amber-100">
            Kira — Built by Corporate AI Solutions · <a href="/business-valuation" className="hover:text-pink-500">Redo my valuation</a>
          </footer>
        </main>
      )}
    </div>
  );
}
