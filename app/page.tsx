"use client";

import React, { useState, useEffect } from 'react';
import { OWNER_FAQ } from '@/lib/faq';

export default function KiraLandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
            <a href="https://corporate-ai-solutions.vercel.app/marketplace" target="_blank" rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 cas-badge text-white px-3 py-1.5 rounded-full text-sm font-body">
              <span className="opacity-80">by</span>
              <span className="font-semibold">Corporate AI Solutions</span>
            </a>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <a href="#how-it-works" className="font-body text-stone-600 hover:text-pink-500 transition-colors font-medium hidden md:block">How it works</a>
            <a href="#pricing" className="font-body text-stone-600 hover:text-pink-500 transition-colors font-medium hidden md:block">Pricing</a>
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
              <a href="https://corporate-ai-solutions.vercel.app/marketplace" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-stone-800/90 text-white px-4 py-2 rounded-full text-sm font-body hover:bg-stone-700 transition-colors">
                <span className="text-amber-400">⚡</span>
                <span>Part of the <span className="font-semibold text-amber-300">Corporate AI Solutions</span> Voice AI Suite</span>
                <span className="text-sm opacity-60">→</span>
              </a>
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
            </div>
            <p className={`font-body text-sm text-stone-400 mt-4 ${isVisible ? 'fade-up fade-up-delay-3' : 'opacity-0'}`}>Free · no sign-up · an indicative valuation on the spot.</p>
          </div>

          {/* Valuation teaser preview */}
          <div className={`mt-16 max-w-lg mx-auto ${isVisible ? 'fade-up fade-up-delay-3' : 'opacity-0'}`}>
            <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-2xl border border-amber-100">
              <div className="text-center mb-4">
                <span className="text-sm font-body text-stone-400 bg-stone-100 px-3 py-1 rounded-full">A 3-minute valuation, made real</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3">
                  <p className="text-sm uppercase tracking-wide text-stone-400 font-semibold">Walk away</p>
                  <p className="font-display font-bold text-stone-700 text-sm mt-1">$150k</p>
                </div>
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm uppercase tracking-wide text-stone-400 font-semibold">Today</p>
                  <p className="font-display font-bold text-stone-800 text-sm mt-1">$600k</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-300 p-3">
                  <p className="text-sm uppercase tracking-wide text-stone-400 font-semibold">Captured</p>
                  <p className="font-display font-bold text-violet-700 text-sm mt-1">$2.5M</p>
                </div>
              </div>
              <p className="font-body text-center text-sm text-stone-600">
                The <span className="font-semibold text-violet-600">$1.9M gap</span> is the knowledge in your head. Kira helps you capture it.
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

      {/* Real Examples */}
      <section className="bg-gradient-to-b from-amber-50 to-pink-50 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-stone-800 mb-4">Real things. <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">Not party tricks.</span></h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { quote: "My whole business was in my head. Kira got it out — the pricing, the process, who does what. First time I could picture actually selling it.", emoji: "🧰", type: "Business" },
              { quote: "I was stuck on a pricing decision. Kira asked what my actual goal was — turns out I was solving the wrong problem.", emoji: "💰", type: "Business" },
              { quote: "She drafted the follow-up to a client while I was still on site, ready for me to check. That was the moment I got it.", emoji: "✅", type: "Business" },
              { quote: "The BAS used to eat my Sunday. Kira flagged a cleaner way to keep it ready — one less thing I dread.", emoji: "📋", type: "Business" }
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 hover-pop shadow-sm border border-amber-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{item.emoji}</span>
                  <span className={`text-sm font-body px-3 py-1 rounded-full ${item.type === 'Personal' ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'}`}>{item.type}</span>
                </div>
                <p className="font-body text-stone-700 leading-relaxed">"{item.quote}"</p>
              </div>
            ))}
          </div>
          <p className="text-center font-body text-stone-500 mt-8 text-lg">Every one of these came from a Kira built around that owner's business. 💬</p>
        </div>
      </section>

      {/* The Offer — see the number first, then a plan priced to it */}
      <section id="pricing" className="bg-white py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="fun-border rounded-3xl p-10 lg:p-14 bg-gradient-to-br from-amber-50 to-pink-50">
            <span className="text-6xl mb-6 block">💷</span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-stone-800 mb-6">See the number. <span className="bg-gradient-to-r from-amber-500 to-pink-500 bg-clip-text text-transparent">Then decide.</span></h2>
            <div className="font-body text-xl text-stone-600 leading-relaxed space-y-4 mb-10">
              <p>The valuation is free — no sign-up, no card. It shows you the gap in about 3 minutes.</p>
              <p>If you want Kira to close it, her fee is set to <span className="font-semibold text-stone-800">a small fraction of what you stand to unlock</span> — so you see your gap before you ever see a price. You get <span className="font-bold text-stone-800">30 days to try her</span>, you&apos;re not invoiced until they&apos;re up, and you can cancel any time.</p>
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
          <p className="font-body text-stone-300 text-lg mb-8 max-w-2xl mx-auto">
            Kira is part of a suite of specialized AI Voice Agents. Each one built for a specific purpose. Each one designed to think WITH you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://corporate-ai-solutions.vercel.app/marketplace" target="_blank" rel="noopener noreferrer"
              className="font-display bg-amber-500 hover:bg-amber-400 text-stone-900 px-6 py-3 rounded-full font-bold transition-colors inline-flex items-center gap-2">
              Explore the Marketplace →
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
              <a href="https://corporate-ai-solutions.vercel.app/marketplace" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-stone-400 hover:text-amber-400 transition-colors">A Corporate AI Solutions Product</a>
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