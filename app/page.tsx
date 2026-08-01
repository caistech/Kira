"use client";

import React, { useState, useEffect } from 'react';
import { OWNER_FAQ } from '@/lib/faq';
import { LandingDemo } from '@/components/LandingDemo';
import { PRICE_TIERS } from '@/lib/valuation/pricing';
import { formatPrice, DEFAULT_CURRENCY } from '@/lib/valuation/currency';

export default function KiraLandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // THE LANDING PRICE IS THE AU DEFAULT. It is not detected, and it must not become detected again.
  //
  // This page used to guess from navigator.language and swap the price a beat after paint. Three
  // things were wrong with that, and the third is why it kept surviving a fix:
  //
  //   1. It contradicted the FAQ three paragraphs below it, which promises "Australian dollars by
  //      default — this is an Australian product. Prefer another currency? Switch it on the
  //      valuation screen." The code disagreed with our own published answer.
  //   2. The figure visibly CHANGED under the reader — $499 + GST, then £499 + VAT — on the one
  //      screen where a number moving on its own costs you the sale.
  //   3. It was a GUESS PRESENTED AS A PRICE. Prices here are round marketing numbers per currency,
  //      not FX conversions (lib/valuation/pricing.ts), so a browser-locale guess does not quote a
  //      converted price — it quotes a DIFFERENT one. £499 is roughly A$970. Every previous fix
  //      corrected the formatting, which was never the broken part.
  //
  // Currency is a choice the owner makes on the valuation screen, where it binds: that value is what
  // reaches Stripe (app/api/checkout/route.ts passes it as the line item currency). Guessing here
  // bought nothing and could only ever disagree with the thing that actually charges him.
  const currency = DEFAULT_CURRENCY;

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // The cheapest band, with its tax qualifier. Derived from PRICE_TIERS rather than typed, so a
  // change to the bands cannot leave a stale number sitting on the landing page.
  const floorPrice = formatPrice(PRICE_TIERS[0].monthly, currency);

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800 font-sans overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400;1,9..40,500&family=Outfit:wght@300;400;500;600;700&display=swap');
        
        .font-display { font-family: 'Outfit', sans-serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        
        .gradient-hero {
          background: 
            radial-gradient(ellipse at 20% 20%, rgba(251, 191, 36, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(244, 114, 182, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(167, 139, 250, 0.15) 0%, transparent 60%),
            linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fce7f3 100%);
        }
        
        .gradient-coral { background: linear-gradient(135deg, #fb7185 0%, #f472b6 100%); }
        .gradient-sunny { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); }
        .gradient-lavender { background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); }
        .gradient-mint { background: linear-gradient(135deg, #34d399 0%, #10b981 100%); }
        
        .blob-1 {
          position: absolute; width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%);
          border-radius: 50%; filter: blur(60px); animation: float1 20s ease-in-out infinite;
        }
        .blob-2 {
          position: absolute; width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(244, 114, 182, 0.35) 0%, transparent 70%);
          border-radius: 50%; filter: blur(60px); animation: float2 25s ease-in-out infinite;
        }
        .blob-3 {
          position: absolute; width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(167, 139, 250, 0.3) 0%, transparent 70%);
          border-radius: 50%; filter: blur(50px); animation: float3 18s ease-in-out infinite;
        }
        
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 20px) scale(1.1); }
          66% { transform: translate(30px, -30px) scale(0.9); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 40px) scale(1.15); }
        }
        
        .fade-up { opacity: 0; transform: translateY(30px); animation: fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .fade-up-delay-1 { animation-delay: 0.15s; }
        .fade-up-delay-2 { animation-delay: 0.3s; }
        .fade-up-delay-3 { animation-delay: 0.45s; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        
        .hover-pop { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease; }
        .hover-pop:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); }
        
        .wiggle:hover { animation: wiggle 0.5s ease-in-out; }
        @keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
        
        .avatar-ring { background: linear-gradient(135deg, #fbbf24 0%, #f472b6 50%, #a78bfa 100%); padding: 3px; border-radius: 50%; }
        .chat-bubble-kira { background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%); border: 2px solid rgba(251, 191, 36, 0.3); }
        .chat-bubble-user { background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); }
        .fun-border { border: 3px solid transparent; background: linear-gradient(white, white) padding-box, linear-gradient(135deg, #fbbf24 0%, #f472b6 50%, #a78bfa 100%) border-box; }
        .cas-badge { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); transition: all 0.3s ease; }
        .cas-badge:hover { background: linear-gradient(135deg, #334155 0%, #475569 100%); }
        
        .journey-card { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .journey-card:hover { transform: translateY(-8px) scale(1.02); }
        
        .step-connector { position: relative; }
        .step-connector::after {
          content: ''; position: absolute; top: 50%; right: -2rem; width: 4rem; height: 3px;
          background: linear-gradient(90deg, #fbbf24, #f472b6); border-radius: 2px;
        }
        @media (max-width: 768px) { .step-connector::after { display: none; } }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-amber-50/80 backdrop-blur-lg border-b border-amber-200/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-3 wiggle cursor-pointer">
              <div className="avatar-ring">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
                  <img src="/female_avatar.jpeg" alt="Kira" className="w-full h-full object-cover" />
                </div>
              </div>
              <span className="font-display font-bold text-2xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">Kira</span>
            </a>
            {/* Attribution stays — it is true and it is trust-building. The LINK out to a
                marketplace of other agents does not. */}
            <span className="hidden md:flex items-center gap-2 cas-badge text-white px-3 py-1.5 rounded-full text-sm font-body">
              <span className="opacity-80">by</span>
              <span className="font-semibold">Corporate AI Solutions</span>
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <a href="#how-it-works" className="font-body text-stone-600 hover:text-pink-500 transition-colors font-medium hidden md:block">How it works</a>
            <a href="#pricing" className="font-body text-stone-600 hover:text-pink-500 transition-colors font-medium hidden md:block">Pricing</a>
            <a href="/genome" className="font-body text-stone-600 hover:text-pink-500 transition-colors font-medium hidden md:block">What you get</a>
            <a href="/advisors" className="font-body text-stone-600 hover:text-pink-500 transition-colors font-medium hidden md:block">Advisors</a>
            <a href="/about" className="font-body text-stone-600 hover:text-pink-500 transition-colors font-medium hidden md:block">About</a>
            <a href="/login" className="font-body flex min-h-[44px] items-center px-2 text-sm font-medium text-stone-700 hover:text-pink-500">Sign in</a>
            <a href="/business-valuation" className="font-display gradient-sunny text-stone-800 px-4 py-2.5 rounded-full text-sm font-bold hover-pop shadow-md flex min-h-[44px] items-center">Value my business →</a>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              /* shrink-0 is load-bearing: h-11 w-11 is already 44x44, but as a flex CHILD beside a
                 long CTA it was being squeezed to 30px wide on a 375px screen — a tester measured
                 it. A touch target that meets the rule in the class list and fails it on the device
                 is the worst kind, because it looks compliant in review. */
              className="md:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-100"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>}
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile dropdown — same items, thumb-reachable */}
        {menuOpen && (
          <div className="md:hidden border-t border-amber-100 bg-white/95 backdrop-blur px-6 py-3 space-y-1">
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-stone-700 hover:bg-amber-50">How it works</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-stone-700 hover:bg-amber-50">Pricing</a>
            <a href="/genome" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-stone-700 hover:bg-amber-50">What you get</a>
            <a href="/advisors" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-stone-700 hover:bg-amber-50">Advisors</a>
            <a href="/about" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-stone-700 hover:bg-amber-50">About</a>
            {/* No Admin link. The operator console is not a customer destination, and putting it in
                the public nav advertises an attack surface to every visitor while telling the
                customer this is a tool for someone else. Reachable directly at /admin/login. */}
          </div>
        )}
      </nav>

      {/* Hero Section - Updated messaging */}
      <section className="gradient-hero min-h-screen flex items-center justify-center relative pt-20">
        <div className="blob-1 -top-20 -left-40 opacity-60" />
        <div className="blob-2 top-1/3 -right-20 opacity-50" />
        <div className="blob-3 bottom-20 left-1/4 opacity-40" />

        <div className="max-w-5xl mx-auto px-6 py-20 relative z-10">
          <div className="text-center">
            <div className={`mb-6 ${isVisible ? 'fade-up' : 'opacity-0'}`}>
              {/* Was a link to a marketplace of other AI agents — the first thing on the page, on a
                  product whose entire pitch is ONE assistant that learns YOUR business. It told a
                  cautious owner he was browsing a catalogue before he had read a word about himself. */}
              <span className="inline-flex items-center gap-2 bg-stone-800/90 text-white px-4 py-2 rounded-full text-sm font-body">
                <span className="text-amber-400">&#9679;</span>
                <span>For owners whose business still runs on them</span>
              </span>
            </div>

            <div className={`mb-8 ${isVisible ? 'fade-up' : 'opacity-0'}`}>
              <div className="avatar-ring inline-block">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-white">
                  <img src="/female_avatar.jpeg" alt="Kira" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <h1 className={`font-display text-4xl lg:text-6xl font-bold text-stone-800 mb-6 leading-tight ${isVisible ? 'fade-up fade-up-delay-1' : 'opacity-0'}`}>
              You spent thirty years building it.
              <br /><span className="text-2xl lg:text-4xl text-stone-600">Now sell it for what it&apos;s <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">actually worth.</span></span>
            </h1>

            <p className={`font-body text-lg lg:text-xl text-stone-600 max-w-2xl mx-auto mb-6 leading-relaxed ${isVisible ? 'fade-up fade-up-delay-2' : 'opacity-0'}`}>
              This is for one person: the owner in their sixties, three or four decades in, with a
              profitable business that runs on <span className="font-semibold text-stone-800">them</span>. Everything that matters is
              in your head, not on paper — so a buyer isn&apos;t buying an asset, they&apos;re buying you, and they
              price it accordingly. <span className="font-semibold text-stone-800">Kira</span> works alongside you day to day, in
              conversation, and turns what you know into a documented <a href="/genome" className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500">Business Genome</a> the
              business can be sold with. Most owners start this <span className="font-semibold text-stone-800">before they&apos;ve told anyone</span>.
            </p>

            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${isVisible ? 'fade-up fade-up-delay-3' : 'opacity-0'}`}>
              <a href="/business-valuation" className="font-display gradient-coral text-white px-8 py-4 rounded-full text-lg font-bold hover-pop shadow-xl shadow-pink-200 inline-block">Find out in 3 minutes →</a>

              {/* THE DEMO, IN THE HERO — not a section further down and not a route of its own.
                  A 66-year-old who has told nobody he is selling does not scroll a marketing page
                  looking for proof, and he certainly does not click into a /demo tab. The one thing
                  that differentiates this product is that he can hear her and watch the gap close,
                  so it goes where his eyes already are. It ends by asking him to run his own
                  valuation, with the button on that beat. */}
              <div className="mt-12 text-left">
                <p className="font-body text-center text-stone-600 mb-4">
                  Or watch what happens over six months — <span className="font-semibold">Kira will talk you through it herself.</span>
                </p>
                <LandingDemo />
              </div>
            </div>
            <p className={`font-body text-sm text-stone-400 mt-4 ${isVisible ? 'fade-up fade-up-delay-3' : 'opacity-0'}`}>Free · no sign-up · an indicative valuation on the spot.</p>
          </div>

          {/* Valuation teaser preview */}
          <div className={`mt-16 max-w-lg mx-auto ${isVisible ? 'fade-up fade-up-delay-3' : 'opacity-0'}`}>
            <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-2xl border border-amber-100">
              <div className="text-center mb-4">
                <span className="text-sm font-body text-stone-400 bg-stone-100 px-3 py-1 rounded-full">A real plumbing business, run through the actual calculator</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                {/* THE ENGINE'S OWN NUMBERS, not a marketing illustration.
                    These were $150k / $600k / $2.5M — an implied 4.2x. A real plumbing business run
                    through the actual calculator returns 1.75x, so the shop window oversold the shop
                    by well over double and the owner found out at the results page (naive-tester,
                    Ray, 2026-07-28). Whoever changes the model must change these with it.
                    Same business as /genome and the demos — one story across every surface. */}
                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3">
                  <p className="text-sm uppercase tracking-wide text-stone-400 font-semibold">Walk away</p>
                  <p className="font-display font-bold text-stone-700 text-sm mt-1">$220k</p>
                </div>
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm uppercase tracking-wide text-stone-400 font-semibold">Today</p>
                  <p className="font-display font-bold text-stone-800 text-sm mt-1">$582k</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-300 p-3">
                  <p className="text-sm uppercase tracking-wide text-stone-400 font-semibold">Captured</p>
                  <p className="font-display font-bold text-violet-700 text-sm mt-1">$1.02M</p>
                </div>
              </div>
              <p className="font-body text-center text-sm text-stone-600">
                The <span className="font-semibold text-violet-600">$438k gap</span> is the knowledge in your head. Kira helps you capture it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Unique Approach */}
      <section className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-5xl mb-4 block">✨</span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-stone-800 mb-6">Every Kira is <span className="bg-gradient-to-r from-amber-500 to-pink-500 bg-clip-text text-transparent">different.</span></h2>
            <p className="font-body text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">Because every business is different. Yours deserves an exec who knows it inside out — not a generic bot.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-gradient-to-br from-rose-50 to-pink-100 rounded-3xl p-8 border-2 border-rose-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">❌</span>
                <h3 className="font-display text-xl font-bold text-stone-800">Other AI assistants</h3>
              </div>
              <ul className="font-body text-stone-600 space-y-3">
                <li className="flex items-start gap-2"><span className="text-rose-400">•</span> Same generic AI for everyone</li>
                <li className="flex items-start gap-2"><span className="text-rose-400">•</span> You repeat context every conversation</li>
                <li className="flex items-start gap-2"><span className="text-rose-400">•</span> Tries to answer everything instantly</li>
                <li className="flex items-start gap-2"><span className="text-rose-400">•</span> No memory of what matters to you</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-3xl p-8 border-2 border-amber-300">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">✨</span>
                <h3 className="font-display text-xl font-bold text-stone-800">Your Kira — your fractional exec</h3>
              </div>
              <ul className="font-body text-stone-700 space-y-3">
                <li className="flex items-start gap-2"><span className="text-amber-500">•</span> <strong>Built around YOUR business</strong></li>
                <li className="flex items-start gap-2"><span className="text-amber-500">•</span> Knows your context from day one</li>
                <li className="flex items-start gap-2"><span className="text-amber-500">•</span> Gets things done, then closes the loop</li>
                <li className="flex items-start gap-2"><span className="text-amber-500">•</span> Remembers and builds on every conversation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Business exit — the primary journey */}
      <section className="bg-gradient-to-br from-amber-100 via-pink-50 to-violet-50 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-5xl mb-4 block">🏦</span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-stone-800 mb-6">Built to sell — <span className="bg-gradient-to-r from-amber-500 to-pink-500 bg-clip-text text-transparent">for what it's really worth.</span></h2>
            <p className="font-body text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">After decades building it, most owners discover their business is worth a fraction of what they hoped — because it can't run without them. Kira changes that.</p>
          </div>

          {/* Three-step exit arc */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { n: "1", grad: "gradient-sunny", title: "See the number", body: "A 3-minute valuation shows what your business is worth today — and the gap you're leaving on the table." },
              { n: "2", grad: "gradient-lavender", title: "Capture your knowledge", body: "Kira interviews you like a smart buyer would, turning the systems and relationships in your head into a living Business Genome." },
              { n: "3", grad: "gradient-coral", title: "Sell an asset, not a job", body: "A documented, transferable business commands a real multiple — and hands over cleanly to a buyer or successor." },
            ].map((s) => (
              <div key={s.n} className="journey-card bg-white rounded-3xl p-7 shadow-xl border-2 border-amber-200">
                <div className={`${s.grad} w-12 h-12 rounded-2xl flex items-center justify-center mb-5 text-white font-display font-bold text-xl`}>{s.n}</div>
                <h3 className="font-display text-xl font-bold text-stone-800 mb-2">{s.title}</h3>
                <p className="font-body text-stone-600 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a href="/business-valuation" className="font-display gradient-coral text-white px-8 py-4 rounded-full text-lg font-bold hover-pop shadow-xl shadow-pink-200 inline-block">What's my business worth? →</a>
            <p className="font-body text-stone-500 text-sm mt-3">Retiring, selling, or planning succession — start here.</p>
          </div>
        </div>
      </section>

      {/* How It Actually Works - The Real Flow */}
      <section id="how-it-works" className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-stone-800 mb-4">How it works 🛠️</h2>
            <p className="font-body text-xl text-stone-600">From first hello to your personalized guide in under 5 minutes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center step-connector">
              <div className="gradient-sunny w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white font-display font-bold text-3xl shadow-lg">1</div>
              <h3 className="font-display text-xl font-bold text-stone-800 mb-3">Tell Kira about your business</h3>
              <p className="font-body text-stone-600">Tell Setup Kira what you do and what you're trying to sort out — she builds a guide around your business from the first hello.</p>
            </div>
            <div className="text-center step-connector">
              <div className="gradient-coral w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white font-display font-bold text-3xl shadow-lg">2</div>
              <h3 className="font-display text-xl font-bold text-stone-800 mb-3">Setup Kira learns you</h3>
              <p className="font-body text-stone-600">A quick voice conversation to understand your context, constraints, and what success looks like for you.</p>
            </div>
            <div className="text-center">
              <div className="gradient-lavender w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white font-display font-bold text-3xl shadow-lg">3</div>
              <h3 className="font-display text-xl font-bold text-stone-800 mb-3">YOUR Kira is born</h3>
              <p className="font-body text-stone-600">We create a unique Kira just for you — loaded with your context, ready to think through problems together.</p>
            </div>
          </div>

          {/* Visual flow */}
          <div className="bg-gradient-to-r from-amber-50 via-pink-50 to-violet-50 rounded-3xl p-8 border border-amber-200">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
              <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow-sm">
                <span className="text-2xl">👤</span>
                <span className="font-body font-medium text-stone-700">You</span>
              </div>
              <span className="text-pink-400 text-2xl">→</span>
              <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow-sm">
                <div className="avatar-ring"><div className="w-8 h-8 rounded-full overflow-hidden bg-white"><img src="/female_avatar.jpeg" alt="Kira" className="w-full h-full object-cover" /></div></div>
                <span className="font-body font-medium text-stone-700">Setup Kira</span>
              </div>
              <span className="text-pink-400 text-2xl">→</span>
              <div className="flex items-center gap-3 bg-gradient-to-r from-amber-100 to-pink-100 rounded-full px-5 py-3 shadow-sm border-2 border-amber-300">
                <div className="avatar-ring"><div className="w-8 h-8 rounded-full overflow-hidden bg-white"><img src="/female_avatar.jpeg" alt="Kira" className="w-full h-full object-cover" /></div></div>
                <span className="font-display font-bold text-stone-800">YOUR Kira</span>
                <span className="text-sm bg-amber-400 text-stone-800 px-2 py-0.5 rounded-full font-bold">Personalized</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Two-Way Partnership */}
      <section className="bg-gradient-to-b from-white to-amber-50 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-5xl mb-6 block">🤝</span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-stone-800 mb-6">This is a <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">partnership.</span></h2>
            <p className="font-body text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">Kira's honest about what she can and can't do. She needs you to show up too.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-amber-100">
              <h3 className="font-display text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">💬</span> What Kira brings
              </h3>
              <ul className="space-y-4 font-body text-stone-600">
                <li className="flex items-start gap-3"><span className="text-amber-500 mt-1">✓</span> Asks the questions you haven't thought of</li>
                <li className="flex items-start gap-3"><span className="text-amber-500 mt-1">✓</span> Pushes back when something's unclear</li>
                <li className="flex items-start gap-3"><span className="text-amber-500 mt-1">✓</span> Remembers your context and builds on it</li>
                <li className="flex items-start gap-3"><span className="text-amber-500 mt-1">✓</span> Admits when she doesn't know something</li>
              </ul>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-pink-100">
              <h3 className="font-display text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">🙋</span> What Kira needs from you
              </h3>
              <ul className="space-y-4 font-body text-stone-600">
                <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✓</span> Be honest about what's really going on</li>
                <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✓</span> Correct her when she's off track</li>
                <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✓</span> Add context — the more she knows, the better</li>
                <li className="flex items-start gap-3"><span className="text-pink-500 mt-1">✓</span> Think WITH her, not just ask for answers</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-violet-100 to-pink-100 rounded-2xl p-6 text-center">
            <p className="font-body text-stone-700 text-lg">
              <span className="font-bold">When it's not working?</span> Kira offers four paths: add more info, reset your goal, try a different approach, or end the conversation. <span className="text-stone-500">No judgment, just options.</span>
            </p>
          </div>
        </div>
      </section>

      {/* REMOVED 2026-08-01: four unattributed customer testimonials, closing with "Every one of
          these came from a Kira built around that owner's business."

          They did not. No owner had completed an engagement when they were written, so the page was
          asserting social proof that did not exist — which is misleading conduct under Australian
          Consumer Law, not a copy nitpick, and it would have been on screen at the first broker demo.

          Nothing replaces them until a real owner says something real and agrees to be quoted, with
          attribution. An invented quote is worth less than an empty space: the space costs a
          scroll, the quote costs the trust the entire product is selling. */}

      {/* The Offer — the floor price, then the personalised number after the valuation */}
      <section id="pricing" className="bg-white py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="fun-border rounded-3xl p-10 lg:p-14 bg-gradient-to-br from-amber-50 to-pink-50">
            {/* Was 💷 — a pound sign on an Australian product. */}
            <span className="text-6xl mb-6 block">💰</span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-stone-800 mb-6">See the number. <span className="bg-gradient-to-r from-amber-500 to-pink-500 bg-clip-text text-transparent">Then decide.</span></h2>

            {/* The floor, stated plainly. A nav item called "Pricing" that showed no price read as
                evasion to the cautious owner this page is written for — and he will not spend three
                minutes on a valuation to find out the order of magnitude. Only the floor: the
                personalised figure still comes after the gap, where it can be framed as a fraction
                of it. Tax qualifier is mandatory on every displayed price and follows the visitor's
                currency, never a hardcoded "GST". */}
            <p className="font-body text-stone-500 text-lg mb-2">Plans start at</p>
            <p className="font-display text-5xl font-bold text-stone-800 mb-2">
              {floorPrice}
              <span className="font-body text-2xl font-medium text-stone-500"> /month</span>
            </p>
            <p className="font-body text-stone-500 text-base mb-8">
              Your own number depends on the size of your gap — you&apos;ll see it after the valuation.
            </p>

            <div className="font-body text-xl text-stone-600 leading-relaxed space-y-4 mb-10">
              <p>The valuation is free — no sign-up, no card. It shows you the gap in about 3 minutes.</p>
              <p>Kira&apos;s fee is set to <span className="font-semibold text-stone-800">a small fraction of what you stand to unlock</span>, so the number you see is sized to your business. You&apos;re <span className="font-bold text-stone-800">never invoiced for the month you&apos;re in</span> — each month is billed once it has finished, and if you cancel, that month is on us.</p>
              <p>No gap, no pressure. The number is yours to keep either way.</p>
            </div>
            <a href="/business-valuation" className="font-display gradient-coral text-white px-10 py-5 rounded-full text-xl font-bold hover-pop shadow-xl shadow-pink-200 inline-block">What&apos;s my business worth? →</a>
            <p className="font-body text-stone-400 text-sm mt-4">Free · no sign-up · your indicative valuation in 3 minutes ⚡</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gradient-to-b from-white to-amber-50 py-24">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold text-stone-800 mb-12 text-center">Questions? 🙋‍♀️</h2>
          <div className="space-y-4">
            {OWNER_FAQ.map((faq, index) => (
              <details key={index} className="bg-white rounded-2xl border border-amber-100 group">
                <summary className="font-display text-lg font-bold text-stone-800 p-6 cursor-pointer list-none flex items-center justify-between hover:bg-amber-50 rounded-2xl transition-colors">
                  {faq.q}
                  <span className="text-pink-400 group-open:rotate-45 transition-transform text-2xl">+</span>
                </summary>
                <div className="px-6 pb-6 font-body text-stone-600 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate AI Solutions Banner */}
      <section className="bg-stone-900 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="font-body text-stone-400 text-sm uppercase tracking-wider mb-4">Brought to you by</p>
          <h3 className="font-display text-3xl font-bold text-white mb-4">Corporate AI Solutions</h3>
          {/* "Kira is part of a suite… Explore the Marketplace" sat here. Sending someone shopping
              at the point they are deciding to trust ONE assistant with thirty-five years of
              undocumented knowledge works against the sale it is placed next to. */}
          <p className="font-body text-stone-300 text-lg mb-8 max-w-2xl mx-auto">
            One assistant. She learns how your business actually runs, and turns it into something a
            buyer can read.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/business-valuation"
              className="font-display bg-amber-500 hover:bg-amber-400 text-stone-900 px-6 py-3 rounded-full font-bold transition-colors inline-flex items-center gap-2">
              See what your business is worth &#8594;
            </a>
            <a href="/about" className="font-display text-white hover:text-amber-400 px-6 py-3 font-medium transition-colors inline-flex items-center gap-2">Learn Our Story</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-800 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="avatar-ring"><div className="w-8 h-8 rounded-full overflow-hidden bg-white"><img src="/female_avatar.jpeg" alt="Kira" className="w-full h-full object-cover" /></div></div>
              <span className="font-display font-bold text-white">Kira</span>
              <span className="text-stone-500">|</span>
              <span className="font-body text-sm text-stone-400">A Corporate AI Solutions Product</span>
            </div>
            {/* 44px minimum tap target (PRODUCT_STANDARDS §1). These were 18-20px high — legible,
                but on a phone the gap between "Privacy" and "Terms" is smaller than a fingertip,
                so the wrong one opens. Flex-wrap rather than a scroll: five items at full height
                need two rows on a narrow screen, and a row that runs off-screen hides links. */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 font-body text-sm text-stone-400">
              <a href="/about" className="flex min-h-[44px] items-center hover:text-pink-400 transition-colors">About</a>
              <a href="#how-it-works" className="flex min-h-[44px] items-center hover:text-pink-400 transition-colors">How it Works</a>
              <a href="#pricing" className="flex min-h-[44px] items-center hover:text-pink-400 transition-colors">Pricing</a>
              <a href="/privacy" className="flex min-h-[44px] items-center hover:text-pink-400 transition-colors">Privacy</a>
              <a href="/terms" className="flex min-h-[44px] items-center hover:text-pink-400 transition-colors">Terms</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-stone-700 text-center">
            {/* The legal entity behind the product, named where a customer can find it. Required
                for the Spam Act identification our emails already carry — a footer that omits it
                while every outbound email states it is an inconsistency someone will notice. */}
            <p className="font-body text-stone-400 text-sm">
              Global Buildtech Australia Pty Ltd · ABN 54 672 395 685 · trading as Corporate AI Solutions
            </p>
            <p className="font-body text-stone-500 text-sm mt-1">
              76-84 Brunswick Street, Fortitude Valley QLD 4006
            </p>
            <p className="font-body text-stone-500 text-sm mt-3">
              © 2026 Corporate AI Solutions · Created by Dennis McMahon ·
              <a href="https://corporate-ai-solutions.vercel.app/studio/thesis" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400 ml-1">Longtail AI Ventures</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}