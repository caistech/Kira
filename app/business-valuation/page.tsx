'use client';

// app/business-valuation/page.tsx
//
// The Kira business valuation test - the quantified front door to the Operating Intelligence Layer.
// A privately-owned business owner answers ~9 questions and instantly sees three numbers: the
// walk-away floor, what it's worth today (a buyer buying a job), and what it's worth once the
// operating knowledge in their head is captured into a Business Genome. The gap between the last
// two is the headline - and the reason to start building their business's memory with Kira.
//
// Public, no auth, free instant result (no gate). Voice clarifier reachable when configured.

import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  TrendingUp,
  Users,
  UserCog,
  FileStack,
  Repeat,
  Wrench,
  Sparkles,
  Printer,
  Brain,
} from 'lucide-react';
import {
  computeValuation,
  formatMoney,
  type ValuationInputs,
} from '@/lib/valuation/model';
import { SECTOR_MULTIPLES } from '@/lib/valuation/sde-multiples';

type Answers = Partial<ValuationInputs>;

interface ChoiceOption {
  value: string;
  label: string;
  sub?: string;
}

type Step =
  | { id: keyof ValuationInputs; kind: 'industry'; icon: React.ReactNode; title: string; help: string }
  | { id: keyof ValuationInputs; kind: 'money'; icon: React.ReactNode; title: string; help: string; placeholder: string }
  | { id: keyof ValuationInputs; kind: 'choice'; icon: React.ReactNode; title: string; help: string; options: ChoiceOption[] };

const STEPS: Step[] = [
  {
    id: 'industry',
    kind: 'industry',
    icon: <Building2 className="h-6 w-6" />,
    title: 'What industry is your business in?',
    help: 'Start typing and pick the closest match. This sets the multiple your sector can command when a business runs like a well-oiled machine.',
  },
  {
    id: 'turnover',
    kind: 'money',
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Roughly what's your annual turnover?",
    help: 'Total sales - everything the business invoices or takes in over a year, before any costs come out. We ask about profit on the next screen.',
    placeholder: 'e.g. 2000000 (total sales)',
  },
  {
    id: 'annualProfit',
    kind: 'money',
    icon: <TrendingUp className="h-6 w-6" />,
    title: "And what's your annual PROFIT?",
    help: "What's left after all costs, plus the salary and perks you pay yourself (often called SDE). Not turnover - the smaller number you actually keep. This is what the valuation runs on.",
    placeholder: 'e.g. 200000 (profit, not sales)',
  },
  {
    id: 'profitTrend',
    kind: 'choice',
    icon: <TrendingUp className="h-6 w-6" />,
    title: 'Over the last 5 years, profit has been…',
    help: 'The direction of travel matters more than any single year.',
    options: [
      { value: 'growing_strongly', label: 'Growing strongly', sub: 'Up meaningfully most years' },
      { value: 'growing', label: 'Growing steadily' },
      { value: 'flat', label: 'Flat', sub: 'Ticking along about the same' },
      { value: 'declining', label: 'Declining' },
    ],
  },
  {
    id: 'marginTrend',
    kind: 'choice',
    icon: <TrendingUp className="h-6 w-6" />,
    title: 'And your margins?',
    help: 'What you keep from every dollar of revenue.',
    options: [
      { value: 'improving', label: 'Improving' },
      { value: 'stable', label: 'Holding steady' },
      { value: 'shrinking', label: 'Getting squeezed' },
    ],
  },
  {
    id: 'clientTrend',
    kind: 'choice',
    icon: <Users className="h-6 w-6" />,
    title: 'Your client base is…',
    help: 'Whether demand is building or fading.',
    options: [
      { value: 'expanding', label: 'Expanding', sub: 'Winning new clients faster than losing them' },
      { value: 'stable', label: 'Stable' },
      { value: 'shrinking', label: 'Shrinking' },
    ],
  },
  {
    id: 'clientConcentration',
    kind: 'choice',
    icon: <Users className="h-6 w-6" />,
    title: 'How spread out is your revenue?',
    help: 'A buyer worries when too much rides on a handful of clients - especially ones who deal with you personally.',
    options: [
      { value: 'diversified', label: 'Well spread', sub: 'No single client is more than ~10%' },
      { value: 'moderate', label: 'A few big ones', sub: 'Top client is 10-30%' },
      { value: 'concentrated', label: 'Concentrated', sub: 'One or two clients are most of it' },
    ],
  },
  {
    id: 'ownerDependence',
    kind: 'choice',
    icon: <UserCog className="h-6 w-6" />,
    title: 'If you took a 3-month holiday tomorrow, what happens?',
    help: 'This is the single biggest driver of what your business is worth - and the thing most owners never think about until they try to sell.',
    options: [
      { value: 'i_am_the_business', label: 'It would fall apart', sub: 'I am the business' },
      { value: 'heavily_involved', label: 'It would struggle', sub: 'I am heavily involved day to day' },
      { value: 'mostly_runs', label: 'It would mostly run', sub: 'A few things would need me' },
      { value: 'fully_managed', label: 'It would run fine', sub: 'Fully under management' },
    ],
  },
  {
    id: 'systems',
    kind: 'choice',
    icon: <FileStack className="h-6 w-6" />,
    title: 'Your processes, pricing and know-how are…',
    help: 'The operating system of the business. Where does it actually live?',
    options: [
      { value: 'documented_team', label: 'Documented, and a team runs them', sub: 'Written down, not just remembered' },
      { value: 'some', label: 'Partly written down' },
      { value: 'in_my_head', label: "Mostly in my head", sub: 'I just know how it all works' },
    ],
  },
  {
    id: 'recurringRevenue',
    kind: 'choice',
    icon: <Repeat className="h-6 w-6" />,
    title: 'How much revenue is locked in ahead of time?',
    help: 'Contracts, retainers, memberships, repeat accounts - anything a buyer can count on continuing.',
    options: [
      { value: 'strong', label: 'A lot', sub: 'Contracts / recurring accounts carry us' },
      { value: 'some', label: 'Some' },
      { value: 'none', label: 'Almost none', sub: 'We start each month from scratch' },
    ],
  },
  {
    id: 'tangibleAssets',
    kind: 'money',
    icon: <Wrench className="h-6 w-6" />,
    title: 'Rough value of your gear, vehicles and stock?',
    help: 'Equipment, tools, vehicles, inventory - what you could sell if you simply closed up. A ballpark is fine; enter 0 if little applies.',
    placeholder: 'e.g. 150000',
  },
];

const SETUP_KIRA_AGENT_ID = process.env.NEXT_PUBLIC_SETUP_KIRA_AGENT_ID;

export default function BusinessValuationPage() {
  const [stepIndex, setStepIndex] = useState(-1); // -1 = intro, STEPS.length = result
  const [answers, setAnswers] = useState<Answers>({});
  const [industryQuery, setIndustryQuery] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);

  const total = STEPS.length;
  const isIntro = stepIndex === -1;
  const isResult = stepIndex === total;
  const step = !isIntro && !isResult ? STEPS[stepIndex] : null;

  // Load the ElevenLabs voice widget only when the owner opens it (and only if configured).
  useEffect(() => {
    if (!voiceOpen || !SETUP_KIRA_AGENT_ID) return;
    if (document.querySelector('script[src*="elevenlabs.io/convai-widget"]')) return;
    const s = document.createElement('script');
    s.src = 'https://elevenlabs.io/convai-widget/index.js';
    s.async = true;
    document.body.appendChild(s);
  }, [voiceOpen]);

  const canAdvance = useMemo(() => {
    if (!step) return true;
    const v = answers[step.id];
    if (step.kind === 'money') return typeof v === 'number' && !Number.isNaN(v);
    return typeof v === 'string' && v.length > 0;
  }, [step, answers]);

  function setAnswer(id: keyof ValuationInputs, value: string | number) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  function next() {
    if (!canAdvance) return;
    setStepIndex((i) => Math.min(i + 1, total));
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, -1));
  }

  const result = useMemo(() => {
    if (!isResult) return null;
    // Every field is required to reach the result, so the cast is safe.
    return computeValuation(answers as ValuationInputs);
  }, [isResult, answers]);

  const progress = isResult ? 100 : Math.round(((stepIndex + 1) / (total + 1)) * 100);

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800 font-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Outfit:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Outfit', sans-serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        .grad-warm { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 45%, #fce7f3 100%); }
        .grad-coral { background: linear-gradient(135deg, #fb7185 0%, #f472b6 100%); }
        .grad-genome { background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 60%, #f472b6 100%); }
        .card-pop { transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
        .card-pop:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0,0,0,.08); }
      `}</style>

      {/* Slim top bar */}
      <header className="sticky top-0 z-40 bg-amber-50/85 backdrop-blur border-b border-amber-200/60">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <a href="/" className="font-display font-bold text-xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">
            Kira
          </a>
          <span className="text-xs text-stone-500 font-body hidden sm:block">Business valuation · indicative</span>
        </div>
        {/* Progress */}
        <div className="h-1.5 w-full bg-amber-100">
          <div className="h-full grad-coral transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 sm:py-12">
        {/* Explanatory header (persists across steps) */}
        {!isResult && (
          <div className="mb-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-800 mb-2">
              What is your business actually worth?
            </h1>
            <p className="text-stone-600 text-base leading-relaxed">
              For most owners, their business is their biggest asset — and the hardest thing to value.
              Answer a few questions and see three honest numbers, plus the gap that's hiding inside your
              own head. Takes about 3 minutes. Nothing to sign up for.
            </p>
          </div>
        )}

        {/* INTRO */}
        {isIntro && (
          <div className="bg-white rounded-3xl p-7 sm:p-10 shadow-sm border border-amber-100">
            <div className="grad-genome w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6">
              <Brain className="h-7 w-7" />
            </div>
            <h2 className="font-display text-xl font-bold text-stone-800 mb-4">Here's what you'll find out</h2>
            <ul className="space-y-4 text-stone-700 mb-8">
              <li className="flex gap-3"><span className="text-stone-400 font-bold">1.</span> The <strong>walk-away</strong> value — if you just sold the gear and closed the doors.</li>
              <li className="flex gap-3"><span className="text-stone-400 font-bold">2.</span> What it's <strong>worth today</strong> — where a buyer is really buying themselves a job.</li>
              <li className="flex gap-3"><span className="text-stone-400 font-bold">3.</span> What it's worth once <strong>the knowledge in your head is captured</strong> — a business that runs, and sells, without you.</li>
            </ul>
            <button
              onClick={next}
              className="grad-coral text-white font-display font-bold px-7 py-4 rounded-full text-lg inline-flex items-center gap-2 min-h-[52px] shadow-lg shadow-pink-200 hover:opacity-95"
            >
              Start <ArrowRight className="h-5 w-5" />
            </button>
            <p className="text-xs text-stone-400 mt-4">Indicative estimate for guidance only — not a formal business valuation.</p>
          </div>
        )}

        {/* QUESTION */}
        {step && (
          <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-sm border border-amber-100">
            <div className="flex items-center gap-3 mb-1 text-stone-400 text-sm font-medium">
              <span className="grad-genome text-white w-9 h-9 rounded-xl flex items-center justify-center">{step.icon}</span>
              Question {stepIndex + 1} of {total}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-800 mt-4 mb-2">{step.title}</h2>
            <p className="text-stone-500 text-sm sm:text-base mb-7 leading-relaxed">{step.help}</p>

            {/* Industry */}
            {step.kind === 'industry' && (
              <div>
                <input
                  list="kira-industries"
                  value={industryQuery}
                  onChange={(e) => {
                    setIndustryQuery(e.target.value);
                    setAnswer('industry', e.target.value);
                  }}
                  placeholder="Start typing your industry…"
                  className="w-full text-base rounded-2xl border-2 border-amber-200 focus:border-pink-400 focus:outline-none px-4 py-4 min-h-[52px] bg-amber-50/40"
                  autoFocus
                />
                <datalist id="kira-industries">
                  {SECTOR_MULTIPLES.map((i) => (
                    <option key={i.name} value={i.name} />
                  ))}
                </datalist>
                <p className="text-xs text-stone-400 mt-2">Can't find an exact match? Pick the closest — we'll use a sensible sector average.</p>
              </div>
            )}

            {/* Money */}
            {step.kind === 'money' && (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={step.placeholder}
                  value={typeof answers[step.id] === 'number' ? String(answers[step.id]) : ''}
                  onChange={(e) => setAnswer(step.id, e.target.value === '' ? NaN : Math.max(0, Number(e.target.value)))}
                  className="w-full text-lg rounded-2xl border-2 border-amber-200 focus:border-pink-400 focus:outline-none pl-9 pr-4 py-4 min-h-[52px] bg-amber-50/40"
                  autoFocus
                />
                {step.id === 'annualProfit' && (() => {
                  const turnover = typeof answers.turnover === 'number' ? answers.turnover : null;
                  const profit = typeof answers.annualProfit === 'number' ? answers.annualProfit : null;
                  if (turnover && profit && profit > turnover) {
                    return (
                      <p className="text-xs text-rose-600 mt-2 leading-relaxed">
                        That&apos;s higher than the turnover you entered ({formatMoney(turnover)}). Profit is what you keep <em>after</em> costs, so it should be lower than turnover — did you mean to enter sales here?
                      </p>
                    );
                  }
                  if (turnover && profit && profit > 0) {
                    return (
                      <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                        That&apos;s a <strong>{Math.round((profit / turnover) * 100)}% margin</strong> on the {formatMoney(turnover)} turnover you entered. Looks right? Profit is the smaller number you keep after all costs and your own pay.
                      </p>
                    );
                  }
                  return (
                    <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                      <strong>Profit, not sales.</strong> If the business turned over {turnover ? formatMoney(turnover) : '$2M'} but you kept $200k after costs and your own pay, enter <strong>$200,000</strong>.
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Choice */}
            {step.kind === 'choice' && (
              <div className="space-y-3">
                {step.options.map((opt) => {
                  const selected = answers[step.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setAnswer(step.id, opt.value);
                        // Auto-advance on choice for a snappy, low-friction feel. Advance the index
                        // directly (not via next(), whose canAdvance closure is stale on the first
                        // selection - the answer we just set isn't visible to that closure yet).
                        setTimeout(() => setStepIndex((i) => Math.min(i + 1, total)), 180);
                      }}
                      className={`card-pop w-full text-left rounded-2xl border-2 px-5 py-4 min-h-[56px] flex items-center justify-between ${
                        selected ? 'border-pink-400 bg-pink-50' : 'border-amber-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      <span>
                        <span className="font-display font-semibold text-stone-800 block">{opt.label}</span>
                        {opt.sub && <span className="text-sm text-stone-500">{opt.sub}</span>}
                      </span>
                      <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ml-4 ${selected ? 'border-pink-400 bg-pink-400' : 'border-stone-300'}`} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Nav */}
            <div className="flex items-center justify-between mt-8">
              <button onClick={back} className="text-stone-500 hover:text-stone-800 inline-flex items-center gap-1 min-h-[44px] px-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              {step.kind !== 'choice' && (
                <button
                  onClick={next}
                  disabled={!canAdvance}
                  className="grad-coral text-white font-display font-bold px-7 py-3 rounded-full inline-flex items-center gap-2 min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {stepIndex === total - 1 ? 'See my valuation' : 'Next'} <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* RESULT */}
        {isResult && result && <ResultView result={result} answers={answers as ValuationInputs} />}
      </main>

      {/* Voice clarifier (reachable, degrades cleanly when unconfigured) */}
      {SETUP_KIRA_AGENT_ID && (
        <>
          <button
            onClick={() => setVoiceOpen((v) => !v)}
            className="fixed bottom-5 right-5 z-50 grad-genome text-white rounded-full shadow-xl px-5 py-3 min-h-[48px] font-display font-semibold text-sm inline-flex items-center gap-2 hover:opacity-95"
          >
            <Sparkles className="h-4 w-4" /> Ask Kira
          </button>
          {voiceOpen && (
            <div className="fixed bottom-20 right-5 z-50">
              {React.createElement('elevenlabs-convai', {
                'agent-id': SETUP_KIRA_AGENT_ID,
                'dynamic-variables': JSON.stringify({ journey_type: 'business', context: 'business_valuation' }),
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ResultView({ result, answers }: { result: ReturnType<typeof computeValuation>; answers: ValuationInputs }) {
  const noEarnings = result.today === 0 && result.potential === 0;
  const capturable = result.factors.filter((f) => f.capturable && f.uplift > 0);
  const readinessPct = Math.round(result.readiness * 100);

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 text-pink-600 text-sm font-semibold mb-2">
          <Sparkles className="h-4 w-4" /> Your indicative valuation
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-800">
          {noEarnings ? "Here's where your business stands" : "This is what your business could be worth"}
        </h1>
        {!result.sectorMatched && (
          <p className="text-xs text-stone-500 mt-2">
            We couldn't match your industry to a sector benchmark, so we've used the overall market-average multiple (~{result.sdeMultiple}× SDE).
          </p>
        )}
      </div>

      {noEarnings ? (
        <div className="bg-white rounded-3xl p-7 border border-amber-100 shadow-sm">
          <p className="text-stone-700 leading-relaxed">
            On the figures you entered, the business isn't currently throwing off a profit a buyer can bank —
            so today it's valued mainly on its assets: <strong>{formatMoney(result.walkAway)}</strong>. The
            opportunity is to build transferable, documented earnings that a buyer will pay a multiple for.
            That's exactly what capturing your operating knowledge into a Business Genome sets up.
          </p>
        </div>
      ) : (
        <>
          {/* Three numbers */}
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberCard
              label="Walk away"
              value={formatMoney(result.walkAway)}
              sub="Sell the gear, close the doors"
              tone="floor"
            />
            <NumberCard
              label="Worth today"
              value={formatMoney(result.today)}
              sub={`A buyer buying a job · ~${result.appliedMultipleToday.toFixed(1)}× SDE`}
              tone="today"
            />
            <NumberCard
              label="With your knowledge captured"
              value={formatMoney(result.potential)}
              sub={`Runs & sells without you · ~${result.appliedMultiplePotential.toFixed(1)}× SDE`}
              tone="genome"
            />
          </div>

          {/* The gap headline */}
          <div className="grad-genome rounded-3xl p-7 sm:p-9 text-white shadow-lg">
            <p className="text-white/80 font-medium mb-1">The value locked inside your head right now</p>
            <p className="font-display text-4xl sm:text-5xl font-bold mb-3">{formatMoney(result.gap)}</p>
            <p className="text-white/90 leading-relaxed max-w-xl">
              That's the difference between selling a job and selling an asset. It isn't extra hustle — it's the
              systems, relationships and know-how that today live only in your memory. Capture them into a
              <strong> Business Genome</strong> and they become transferable: worth more to a buyer, and yours to
              hand over cleanly.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm bg-white/15 rounded-full px-4 py-1.5">
              <Brain className="h-4 w-4" /> Transferability score: {readinessPct}/100
            </div>
          </div>

          {/* Reasons - each a costed piece of locked-in knowledge */}
          {capturable.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-bold text-stone-800 mb-4">Where that value is hiding</h2>
              <div className="space-y-3">
                {capturable.map((f) => (
                  <div key={f.key} className="bg-white rounded-2xl p-5 border border-amber-100 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display font-semibold text-stone-800">{f.label}</p>
                      <p className="text-sm text-stone-600 mt-1 leading-relaxed">{f.reason}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display font-bold text-lg text-pink-600">+{formatMoney(f.uplift)}</p>
                      <p className="text-xs text-stone-400">once captured</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* CTA - the Business Genome on-ramp */}
      <div className="bg-white rounded-3xl p-7 sm:p-9 border-2 border-violet-200 shadow-sm text-center">
        <div className="grad-genome w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-5">
          <Brain className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl font-bold text-stone-800 mb-3">Start building your business's memory</h2>
        <p className="text-stone-600 max-w-xl mx-auto mb-7 leading-relaxed">
          Kira interviews you the way a smart buyer would — capturing the operating knowledge in your head into a
          living Business Genome. It's how you close the gap: a business worth more, and one you can actually hand over.
        </p>
        <a
          href="/start?journey=business"
          className="grad-coral text-white font-display font-bold px-8 py-4 rounded-full text-lg inline-flex items-center gap-2 min-h-[52px] shadow-lg shadow-pink-200 hover:opacity-95"
        >
          Start building your Business Genome <ArrowRight className="h-5 w-5" />
        </a>
        <div className="mt-5 flex items-center justify-center gap-5 text-sm">
          <button onClick={() => window.print()} className="text-stone-500 hover:text-stone-800 inline-flex items-center gap-1.5 min-h-[44px]">
            <Printer className="h-4 w-4" /> Save / print this
          </button>
          <a href="/business-valuation" className="text-stone-500 hover:text-stone-800 min-h-[44px] inline-flex items-center">Start over</a>
        </div>
      </div>

      <p className="text-xs text-stone-400 leading-relaxed">
        This is an indicative estimate for guidance only. It applies a multiple of your SDE (profit plus your own
        pay), using real sector-median multiples from BizBuySell&apos;s 2025 small-business sale data (~9,500 closed
        deals, market average ~2.5× SDE), adjusted for size, owner-dependence, recurring revenue, client
        concentration and growth. It is not a formal business valuation or financial advice — real sale prices
        depend on many factors specific to your business and buyer.
      </p>
    </div>
  );
}

function NumberCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'floor' | 'today' | 'genome' }) {
  const styles = {
    floor: 'border-stone-200 bg-stone-50',
    today: 'border-amber-200 bg-amber-50',
    genome: 'border-violet-300 bg-gradient-to-br from-violet-50 to-pink-50',
  }[tone];
  const valueColor = tone === 'genome' ? 'text-violet-700' : 'text-stone-800';
  return (
    <div className={`rounded-2xl border-2 p-5 ${styles}`}>
      <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-1">{label}</p>
      <p className={`font-display text-2xl sm:text-[1.75rem] font-bold ${valueColor} leading-tight`}>{value}</p>
      <p className="text-xs text-stone-500 mt-2 leading-snug">{sub}</p>
    </div>
  );
}
