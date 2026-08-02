'use client';

// app/business-valuation/page.tsx
//
// The Kira business valuation test - the quantified front door to the Operating Intelligence Layer.
// A privately-owned business owner answers the STEPS below (currently 11) and instantly sees three
// numbers: the walk-away floor, what it's worth today (a buyer buying a job), and what it's worth
// once the operating knowledge in their head is captured into a Business Genome. The gap between
// the last two is the headline - and the reason to start building their business's memory with Kira.
//
// Public, no auth, free instant result (no gate). Answers are parked in sessionStorage as they go,
// so an interrupted owner resumes rather than restarting eleven questions.
//
// NO floating voice widget here — see the note where it was removed at the foot of the file. The
// question count is rendered from STEPS.length rather than written in prose, because "a few
// questions" against an actual eleven is the kind of drift a comment cannot prevent.

import React, { useCallback, useMemo, useState, useEffect } from 'react';

import {
  SDE_DEFINITION,
  SDE_SHORT_REMINDER,
  sdeExample,
  sdeMarginNote,
} from '@/lib/valuation/sde-copy';
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
  buildBuyerRationale,
  type ValuationInputs,
} from '@/lib/valuation/model';
import { SECTOR_MULTIPLES } from '@/lib/valuation/sde-multiples';
import { priceForGap } from '@/lib/valuation/pricing';
import { formatMoney, formatMoneyApprox, formatPrice, getCurrency, CURRENCIES, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { synonymGroup, synonymSector } from '@/lib/valuation/industry-synonyms';
import { storeValuation, VALUATION_HANDOFF_KEY } from '@/lib/valuation/share';
import {
  clearValuationLocal,
  loadValuationLocal,
  saveValuationLocal,
  VALUATION_TTL_DAYS,
} from '@/lib/valuation/persist';

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

/** Where in-progress answers are parked so a reload resumes rather than restarting. */
const PROGRESS_KEY = 'kira_valuation_progress';

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
    placeholder: 'e.g. 2,000,000',
  },
  {
    id: 'annualProfit',
    kind: 'money',
    icon: <TrendingUp className="h-6 w-6" />,
    title: "And what's your annual PROFIT?",
    help: SDE_DEFINITION,
    placeholder: 'e.g. 200,000',
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


export default function BusinessValuationPage() {
  const [stepIndex, setStepIndex] = useState(-1); // -1 = intro, STEPS.length = result
  const [firstName, setFirstName] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [industryQuery, setIndustryQuery] = useState('');
  // Currency is display-only (the valuation math is a multiple of profit). Start on the SSR-safe
  // default, then use the owner's saved choice or the detected locale on mount. Persist any override
  // so it doesn't reset between questions.
  // AUD by default (this is an AU product — ABN lookups, AU sale data). We do NOT auto-switch from the
  // browser LOCALE: navigator.language is the device's language region, not the owner's country, so an
  // AU tradie on an en-GB/en-US laptop was being shown £/$US on the very number meant to hook them.
  // Owners pick their own currency from the selector (persisted); true location-based detection (IP)
  // is a later upgrade. Only a SAVED explicit choice overrides the AUD default.
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  // The LLM backstop's answer, and the phrase we already asked about — so a blur/refocus loop
  // cannot fire the same call repeatedly.
  const [llmSector, setLlmSector] = useState<string | null>(null);
  const [llmTried, setLlmTried] = useState<string | null>(null);
  const [llmPending, setLlmPending] = useState(false);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('kira_currency');
    } catch {}
    if (saved) setCurrency(saved);
  }, []);
  const changeCurrency = (c: string) => {
    setCurrency(c);
    try {
      localStorage.setItem('kira_currency', c);
    } catch {}
  };
  const currencySymbol = getCurrency(currency).symbol;

  // Answers survive a reload. Eleven questions is a long way to be asked to walk twice, and the
  // people most likely to be interrupted mid-flow are exactly the target — an owner answering on a
  // phone between jobs (naive-tester, 2026-07-27: "progress isn't durable").
  //
  // Kept locally with a 7-day expiry, matching the handoff in lib/valuation/share.ts. It was
  // per-tab, on the reasoning that turnover and profit should die with the tab — but the sentence
  // below the Start button promises he can "stop and come back", and per-tab made that untrue. The
  // risk is now bounded (it expires) and disclosed (he is told, and can erase it) rather than
  // avoided. See lib/valuation/persist.ts for the full reasoning, including why this matters to the
  // BASELINE and not just to convenience.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const saved = loadValuationLocal<{ stepIndex?: number; answers?: Answers; industryQuery?: string; firstName?: string }>(
        PROGRESS_KEY,
      );
      if (saved) {
        if (saved.answers) setAnswers(saved.answers);
        if (typeof saved.industryQuery === 'string') setIndustryQuery(saved.industryQuery);
        // Never restore straight onto the result — recompute by stepping, so a stale partial answer
        // set can't render a number as though it were freshly produced.
        if (typeof saved.firstName === 'string') setFirstName(saved.firstName);
        if (typeof saved.stepIndex === 'number') {
          setStepIndex(Math.min(saved.stepIndex, STEPS.length - 1));
        }
      }
    } catch {
      /* private browsing or a bad blob — start clean rather than break the page */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return; // don't overwrite saved progress with the initial empty state
    try {
      saveValuationLocal(PROGRESS_KEY, { stepIndex, answers, industryQuery, firstName });
    } catch {
      /* nothing to do; the visitor simply loses resume */
    }
  }, [restored, stepIndex, answers, industryQuery, firstName]);

  /**
   * Erase everything kept on this device and start over.
   *
   * Clears the finished-valuation handoff as well as the answers in progress. Wiping the questions
   * while leaving a completed valuation — with the same turnover and profit in it — parked for
   * /plan would make "clear my answers" a false statement, which is worse than not offering it.
   */
  const clearAnswers = useCallback(() => {
    if (!window.confirm('Erase the answers saved on this device and start again?')) return;
    clearValuationLocal(PROGRESS_KEY, VALUATION_HANDOFF_KEY);
    setAnswers({});
    setIndustryQuery('');
    setStepIndex(-1);
  }, []);

  const total = STEPS.length;
  const isIntro = stepIndex === -1;
  const isResult = stepIndex === total;
  const step = !isIntro && !isResult ? STEPS[stepIndex] : null;

  const canAdvance = useMemo(() => {
    if (!step) return true;
    const v = answers[step.id];
    if (step.kind === 'money') return typeof v === 'number' && !Number.isNaN(v);
    return typeof v === 'string' && v.length > 0;
  }, [step, answers]);

  function setAnswer(id: keyof ValuationInputs, value: string | number) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  /**
   * Ask the server-side backstop what sector a phrase belongs to.
   *
   * Extracted from the input's onBlur so that `next()` can AWAIT it. The model call takes a second
   * or two; firing it on blur ALONE meant the answer routinely arrived after the owner had already
   * pressed Next and the industry step had unmounted, so it landed nowhere and the screen that
   * asked the question never showed the answer to it. "it development" and "ai development" both
   * match correctly at the API — `IT & Software Services` and `Software & App Companies` — and
   * both looked completely dead on screen for exactly this reason.
   */
  const resolveIndustry = useCallback(async (raw: string): Promise<string | null> => {
    const q = raw.trim();
    if (!q) return null;
    setLlmPending(true);
    try {
      const response = await fetch('/api/valuation/match-industry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: q }),
      });
      const data = response.ok ? await response.json() : { matched: false };
      if (data?.matched && data.sector) {
        setLlmSector(data.sector);
        // Store the SECTOR so the valuation uses the real multiple. His own words stay in the box;
        // the model's answer is shown below, never silently swapped in.
        setAnswer('industry', data.sector);
        return data.sector as string;
      }
      return null;
    } catch {
      // Stays unmatched — the honest "no sector match" message already says so.
      return null;
    } finally {
      setLlmTried(q);
      setLlmPending(false);
    }
  }, []);

  async function next() {
    if (!canAdvance || llmPending) return;

    // Settle the backstop BEFORE leaving the industry question, so its answer can never arrive
    // after the step it belongs to has gone. Skipped when the phrase is already a sector name or
    // the synonym table resolves it — those are instant and free, and the model adds nothing.
    if (step?.id === 'industry' && !llmSector) {
      const raw = String(answers.industry ?? '').trim();
      const lower = raw.toLowerCase();
      const alreadyKnown =
        SECTOR_MULTIPLES.some((s) => s.name.toLowerCase() === lower) || Boolean(synonymSector(lower));
      if (raw && !alreadyKnown && llmTried !== raw) {
        await resolveIndustry(raw);
      }
    }

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

  // Carry the valuation into the sales page (and on to checkout) so the price + dashboard use it.
  //
  // Parked in sessionStorage rather than encoded into the link. The answers include annual turnover
  // and profit, and a URL carrying them ends up in browser history, in the Referer header of every
  // outbound click, in server logs, and in the email chain the moment someone forwards it. The two
  // pages are one navigation apart in the same tab, so the URL was never needed to get it there.
  useEffect(() => {
    if (!isResult) return;
    storeValuation({ inputs: answers as ValuationInputs, currency, firstName: firstName.trim() || undefined });
  }, [isResult, answers, currency, firstName]);

  /**
   * Did an owner who is ALREADY INSIDE the product send himself here?
   *
   * The dashboard invites a straight-in signup — someone who joined on a broker's word rather than
   * on the strength of a number — to set a baseline he never had. Without this he finishes the
   * eleven questions and is quoted a monthly price under a button that sells him the product he is
   * already paying for, which reads either as a second bill or as a page that has no idea who he is.
   *
   * A QUERY PARAM RATHER THAN AUTH. This page is deliberately public and auth-unaware (see the file
   * header), and making it read a session to change one link would hand it a dependency it has
   * avoided on purpose. The param is a hint about where he came from, and being wrong about it costs
   * a link pointing at the wrong page — never a claim about him.
   *
   * Read off `window` rather than through `useSearchParams`, which would oblige a Suspense boundary
   * around a thousand-line client page to answer a question this small.
   *
   * A LAZY INITIALISER, NOT AN EFFECT — and it does not risk a hydration mismatch, for a reason
   * specific to this page rather than a general one. The initialiser returns `false` on the server
   * and possibly `true` on the client, which is normally exactly how a mismatch is made. It is safe
   * here because the only thing that reads this value is `ResultView`, and at hydration `stepIndex`
   * is still -1 (the intro): the answers are restored from the device in an effect that has not run
   * yet, so nothing this value affects exists in the DOM at the moment the two renders are compared.
   *
   * If this page ever renders the result on first paint, this must go back to an effect.
   */
  const [returningToApp] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'app',
  );

  const planHref = returningToApp ? '/dashboard' : '/plan';

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
          {/* CURRENCY SELECTOR — ARCHIVED, deliberately not deleted.
              It offered ten currencies and CONVERTED NOTHING: changing it relabelled the same
              number, so an Australian owner's gap could read as £752,919. A wrong number is worse
              than a missing feature, and the fix is not a country picker — it is real FX plus an
              honest statement that the multiple is US-derived either way.
              We quote AUD only, because the ICP is Australian owner-operators and multi-currency is
              scale infrastructure for a market we have deliberately narrowed away from.
              The CURRENCIES table stays in lib/valuation/currency.ts and still carries each
              currency's TAX NAME, which the "+ GST" suffix reads from — so re-enabling this is
              restoring the markup below, not rebuilding the model.

          <label className="flex items-center gap-1.5 text-sm text-stone-500 font-body">
            <span className="hidden sm:inline">Currency</span>
            <select value={currency} onChange={(e) => changeCurrency(e.target.value)} aria-label="Display currency"
              className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-stone-700 min-h-[44px]">
              {CURRENCIES.map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}
            </select>
          </label>
          */}
        </div>
        {/* Progress */}
        <div className="h-1.5 w-full bg-amber-100">
          <div className="h-full grad-coral transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 sm:py-12 pb-32">
        {/* Explanatory header (persists across steps) */}
        {!isResult && (
          <div className="mb-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-800 mb-2">
              What is your business actually worth?
            </h1>
            <p className="text-stone-600 text-base leading-relaxed">
              For most owners, their business is their biggest asset — and the hardest thing to value.
              Answer {STEPS.length} short questions and see three honest numbers, plus the gap that&apos;s
              hiding inside your own head. About 3 minutes. Nothing to sign up for.
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
            {/* HIS NAME, ASKED ONCE, HERE.
                This is the only place the product ever hears it from him. Everything downstream was
                inference: the account name came from the name on the CARD, falling back to the local
                part of his email — which produced "shhahhussain" for one owner, and greeted two
                different people as a Stripe test customer. In production the quiet version is worse:
                the cardholder is often not the owner (a wife's card, a company card, the accountant
                setting it up), and the name is baked into her prompt at provision and never revisited.

                On the INTRO rather than as a twelfth question, deliberately. The three-minute,
                eleven-question, no-signup shape is the best thing on the site and the count is
                quoted in the button below it. And optional: a first name identifies nobody, but
                making it required would turn the one page that asks nothing of him into a form. */}
            <div className="mb-8">
              <label htmlFor="valuation-first-name" className="block font-display font-bold text-stone-800 mb-2">
                What should we call you?
              </label>
              <input
                id="valuation-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value.slice(0, 40))}
                placeholder="First name (optional)"
                autoComplete="given-name"
                className="w-full min-h-[52px] rounded-2xl border border-amber-200 px-4 text-lg text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none"
              />
              <p className="text-base text-stone-500 mt-2">
                Only so the result reads like it was written for you. It stays on this device with
                your answers.
              </p>
            </div>

            <button
              onClick={next}
              className="grad-coral text-white font-display font-bold px-7 py-4 rounded-full text-lg inline-flex items-center gap-2 min-h-[52px] shadow-lg shadow-pink-200 hover:opacity-95"
            >
              Start the {STEPS.length} questions <ArrowRight className="h-5 w-5" />
            </button>
            <p className="text-base text-stone-500 mt-4">
              Indicative estimate for guidance only — not a formal business valuation. Your answers are kept
              on this device as you go, so you can stop and come back — for {VALUATION_TTL_DAYS} days, on this
              device only. Nothing is sent anywhere until you decide to sign up.
            </p>
          </div>
        )}

        {/* QUESTION */}
        {step && (
          <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-sm border border-amber-100">
            <div className="flex items-center gap-3 mb-1 text-stone-400 text-sm font-medium">
              <span className="grad-genome text-white w-9 h-9 rounded-xl flex items-center justify-center">{step.icon}</span>
              Question {stepIndex + 1} of {total}
              {/* The other half of keeping his figures on the machine. Telling him his answers are
                  saved obliges us to give him a way to unsave them — and it belongs here, where he
                  is actually typing turnover and profit, not buried in a footer. */}
              <button
                type="button"
                onClick={clearAnswers}
                className="ml-auto min-h-[44px] px-3 text-sm font-medium text-stone-400 underline underline-offset-4 hover:text-stone-600"
              >
                Clear my answers
              </button>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-800 mt-4 mb-2">{step.title}</h2>
            <p className="text-stone-500 text-sm sm:text-base mb-7 leading-relaxed">{step.help}</p>

            {/* Industry — filtered dropdown (a real picker, not a fickle datalist) */}
            {step.kind === 'industry' && (() => {
              const q = industryQuery.trim().toLowerCase();
              // The suggestion list must know the same words the MULTIPLE does.
              //
              // Fixing lookupSdeMultiple alone made this worse, not better: the valuation quietly
              // used the correct Plumbing multiple while the screen still said "No sector match".
              // The number was right and the message was lying, which is harder to trust than
              // being wrong consistently. So the synonym layer feeds the visible list too.
              const synonymHit = q ? synonymSector(q) : null;
              // A word can point at a GROUP rather than one sector — "builder" is the case that
              // matters, because the data has no residential-building bucket and the old table
              // answered "Heavy Construction", i.e. roads and earthworks, at the highest multiple in
              // the group. Showing him the seven construction sectors puts a real sourced multiple
              // one tap away instead of our guess about which one he is.
              const groupHit = q ? synonymGroup(q) : null;
              const matches = (q
                ? SECTOR_MULTIPLES.filter(
                    (s) =>
                      s.name.toLowerCase().includes(q) ||
                      s.group.toLowerCase().includes(q) ||
                      (synonymHit ? s.name === synonymHit : false),
                    )
                : SECTOR_MULTIPLES
              ).concat(
                q && groupHit
                  ? SECTOR_MULTIPLES.filter((s) => s.group === groupHit)
                  : [],
              );
              const seenNames = new Set<string>();
              const shown = matches.filter((s) => !seenNames.has(s.name) && seenNames.add(s.name)).slice(0, 8);
              const exact = SECTOR_MULTIPLES.some((s) => s.name.toLowerCase() === q);
              return (
                <div>
                  <input
                    value={industryQuery}
                    onChange={(e) => {
                      setIndustryQuery(e.target.value);
                      setAnswer('industry', e.target.value);
                      // Forget the previous answer the moment the question changes.
                      //
                      // Without this, llmSector stuck: the green "Matched to X" panel kept showing
                      // the sector resolved for an EARLIER phrase, and — worse — the blur guard
                      // treats a set llmSector as "already handled", so the backstop never fired
                      // again for anything typed afterwards. Type "motor", get Auto Repair, clear
                      // the box, type "it development", and the screen still says Auto Repair while
                      // silently never asking about the new words. Both phrases match correctly at
                      // the API; only the display was stuck, which is indistinguishable from the
                      // matcher being badly wrong.
                      if (llmSector || llmTried) {
                        setLlmSector(null);
                        setLlmTried(null);
                      }
                    }}
                    onBlur={() => {
                      // The LLM backstop, and ONLY here: the mechanical layers (exact name, the
                      // Australian synonym table, loose substring) have already run and missed.
                      // On blur rather than per keystroke — a model call on the first field an
                      // owner touches would add latency and cost to every visitor.
                      const q = industryQuery.trim();
                      if (!q || exact || shown.length > 0 || llmSector || llmTried === q) return;
                      // Fire early so the answer is usually on screen before Next is pressed; next()
                      // awaits the same call as a backstop when it isn't.
                      void resolveIndustry(q);
                    }}
                    placeholder="Start typing your industry…"
                    className="w-full text-base rounded-2xl border-2 border-amber-200 focus:border-pink-400 focus:outline-none px-4 py-4 min-h-[52px] bg-amber-50/40"
                    autoFocus
                    autoComplete="off"
                  />
                  {industryQuery && !exact && shown.length > 0 && (
                    <div className="mt-2 rounded-2xl border border-amber-200 bg-white overflow-hidden max-h-64 overflow-y-auto shadow-sm">
                      {shown.map((s) => (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => {
                            setIndustryQuery(s.name);
                            setAnswer('industry', s.name);
                            // An explicit pick beats any model answer — and must not leave the
                            // previous one on screen underneath it.
                            setLlmSector(null);
                            setLlmTried(null);
                          }}
                          className="w-full text-left px-4 py-3 min-h-[44px] hover:bg-amber-50 flex items-center justify-between gap-3 border-b border-amber-50 last:border-0"
                        >
                          <span className="text-stone-800">{s.name}</span>
                          <span className="text-sm text-stone-400 flex-shrink-0">{s.group}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Told at the QUESTION, not just on the result. "Underwater basket weaving" used to
                      sail straight through with Next enabled and no signal that a market-average
                      multiple had been substituted (naive-tester, 2026-07-27). */}
                  {exact ? (
                    <p className="mt-2 rounded-xl bg-emerald-50 px-4 py-3 text-base text-stone-700">
                      Matched to <span className="font-semibold">{industryQuery.trim()}</span> — we&apos;ll
                      use that sector&apos;s average multiple.
                    </p>
                  ) : llmSector ? (
                    <p className="mt-2 rounded-xl bg-emerald-50 px-4 py-3 text-base text-stone-700">
                      Matched to <span className="font-semibold">{llmSector}</span> — that&apos;s the
                      sector average we&apos;ll use. Not right? Pick another from the list.
                    </p>
                  ) : llmPending ? (
                    /* Never leave the field looking dead while a model call is in flight — silence
                       here is indistinguishable from the matcher being broken, which is precisely
                       how it was reported. */
                    <p className="mt-2 rounded-xl bg-stone-100 px-4 py-3 text-base text-stone-600">
                      Checking &ldquo;{industryQuery.trim()}&rdquo; against our sector list…
                    </p>
                  ) : industryQuery.trim() && !exact && matches.length === 0 ? (
                    <p className="mt-2 rounded-xl bg-amber-100/70 px-4 py-3 text-base text-stone-700">
                      No sector match for &ldquo;{industryQuery.trim()}&rdquo;. You can carry on — we&apos;ll
                      use the overall market-average multiple — but a closer match gives a better number.
                    </p>
                  ) : (
                    <p className="text-base text-stone-500 mt-2">
                      Pick the closest match from the list — we&apos;ll use its sector-average multiple.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Money */}
            {step.kind === 'money' && (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg">{currencySymbol}</span>
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
                      <p className="text-sm text-rose-600 mt-2 leading-relaxed">
                        That&apos;s higher than the turnover you entered ({formatMoney(turnover, currency)}). Profit is what you keep <em>after</em> costs, so it should be lower than turnover — did you mean to enter sales here?
                      </p>
                    );
                  }
                  if (turnover && profit && profit > 0) {
                    return (
                      <p className="text-sm text-stone-500 mt-2 leading-relaxed">
                        {sdeMarginNote(Math.round((profit / turnover) * 100), formatMoney(turnover, currency))}
                      </p>
                    );
                  }
                  return (
                    <p className="text-sm text-stone-500 mt-2 leading-relaxed">
                      <strong>{SDE_SHORT_REMINDER}</strong> {sdeExample(currencySymbol)}
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
                  disabled={!canAdvance || llmPending}
                  className="grad-coral text-white font-display font-bold px-7 py-3 rounded-full inline-flex items-center gap-2 min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {llmPending
                    ? 'Checking…'
                    : stepIndex === total - 1
                      ? 'See my valuation'
                      : 'Next'} <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* RESULT */}
        {isResult && result && <ResultView result={result} currency={currency} planHref={planHref} firstName={firstName.trim()} matchedSector={String(answers.industry ?? "")} typedSector={industryQuery.trim()} onChangeSector={() => setStepIndex(0)} returningToApp={returningToApp} />}
      </main>

      {/* The "Ask Kira" floating widget was REMOVED from this flow on 2026-07-27.
          It sat fixed bottom-right, directly on top of the Next button, on all eleven question
          screens — a mobile tester mis-tapped it twice — and it also covered the hero headline, the
          question help text and the third result number. Two floating widgets competing for one
          corner on a 375px screen is one too many, and this was the one whose absence costs least:
          the questionnaire is eleven plain questions with inline help, not a surface that needs a
          voice clarifier, and voice remains reachable from the authenticated chrome (TalkFab) where
          the nuanced work actually happens.
          It was also a raw CDN <elevenlabs-convai> embed rather than the canonical
          @caistech/elevenlabs-convai VoiceWidget — so reinstating it here would mean adopting the
          canonical component first, not restoring this. */}
    </div>
  );
}

function ResultView({
  result,
  currency,
  planHref,
  firstName,
  matchedSector,
  typedSector,
  onChangeSector,
  returningToApp = false,
}: {
  result: ReturnType<typeof computeValuation>;
  currency: string;
  planHref: string;
  firstName?: string;
  matchedSector?: string;
  typedSector?: string;
  onChangeSector?: () => void;
  /** He is already a customer: don't sell, and don't quote him a price he is already paying. */
  returningToApp?: boolean;
}) {
  // APPROXIMATE, on the result screen. See formatMoneyApprox: eleven category answers and a sector
  // median cannot resolve a business to the dollar, and "$1,094,292" claims they can on the one
  // screen where this buyer decides whether to believe any of it. The walk-away auction range below
  // is left exact because it is already expressed as a range and reads as one.
  const money = (n: number) => formatMoneyApprox(n, currency);
  const noEarnings = result.today === 0 && result.potential === 0;
  const capturable = result.factors.filter((f) => f.capturable && f.uplift > 0);
  const readinessPct = Math.round(result.readiness * 100);
  const rationale = buildBuyerRationale(result);

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 text-pink-600 text-sm font-semibold mb-2">
          <Sparkles className="h-4 w-4" /> Your indicative valuation
        </div>

        {/* WHICH SECTOR WE MATCHED HIM TO, and a way to change it.
            He typed "engineer" and the screen said "Checking 'engineer' against our sector list…",
            accepted it, and moved on. He only discovered days later, on the dashboard, that he had
            been filed as "Architecture & Engineering": "I don't build buildings, I fabricate steel.
            That sector choice sets the multiple that sets the whole number, and I never got to see
            or correct it."
            He is right that it is load-bearing — the sector median IS the multiple — which makes it
            the one input that must never be applied silently. Shown with what he typed beside it, so
            a wrong match is obvious rather than something he has to go looking for. */}
        {matchedSector && (
          <p className="text-sm text-stone-500 mb-2">
            Priced against <span className="font-semibold text-stone-700">{matchedSector}</span>
            {typedSector && typedSector.toLowerCase() !== matchedSector.toLowerCase()
              ? ` — matched from “${typedSector}”`
              : ''}
            . This sets the multiple, so if it is wrong the number is too.{' '}
            {onChangeSector && (
              <button
                type="button"
                onClick={onChangeSector}
                className="min-h-[44px] underline underline-offset-4 hover:text-stone-700"
              >
                Change it
              </button>
            )}
          </p>
        )}
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-800">
          {/* Addressed to him when he told us who he is. The point of asking on the intro was never
              the account record — it was that the one screen he came for reads like it was written
              for him rather than generated. */}
          {firstName ? `${firstName}, ` : ''}
          {noEarnings
            ? firstName
              ? 'here’s where your business stands'
              : "Here's where your business stands"
            : firstName
              ? 'this is what your business could be worth'
              : 'This is what your business could be worth'}
        </h1>
        {!result.sectorMatched && (
          <p className="mt-3 rounded-xl bg-amber-100/70 px-4 py-3 text-base text-stone-700">
            We couldn&apos;t match <strong>your industry</strong> to a sector benchmark, so this uses the overall
            market-average multiple (~{result.sdeMultiple}× SDE). Go back and pick a closer match if you can —
            sector is one of the larger levers on the number.
          </p>
        )}
      </div>

      {noEarnings ? (
        <div className="bg-white rounded-3xl p-7 border border-amber-100 shadow-sm">
          <p className="text-stone-700 leading-relaxed">
            On the figures you entered, the business isn't currently throwing off a profit a buyer can bank —
            so today it's valued mainly on its assets: <strong>{money(result.walkAway)}</strong>. The
            opportunity is to build transferable, documented earnings that a buyer will pay a multiple for.
            That's exactly what capturing your operating knowledge into a Business Genome sets up.
          </p>
        </div>
      ) : (
        <>
          {/* Three numbers */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* THE HEADLINE AND ITS OWN CAPTION USED TO DISAGREE.
                The number was book value and the line underneath said a quick auction returns
                40–60c in the dollar — so the figure an owner reads as his floor overstated it by
                roughly double, contradicted by our own footnote six words later. For a man deciding
                whether he can afford to walk, that is the worst number on the page to get wrong.

                Now the headline IS the realisable range and book value is stated beneath it. Derived
                here rather than in the model on purpose: `walkAway` stays book value, so no
                valuation already shown to anyone is re-priced and MODEL_VERSION is untouched. */}
            <NumberCard
              label="Walk away"
              value={`${money(Math.round(result.walkAway * 0.4))} – ${money(Math.round(result.walkAway * 0.6))}`}
              sub={`What a quick auction on ${money(result.walkAway)} of gear typically returns (40–60c in the dollar)`}
              tone="floor"
            />
            <NumberCard
              label="Worth today"
              value={money(result.today)}
              sub={`A buyer buying a job · ~${result.appliedMultipleToday.toFixed(1)}× SDE`}
              tone="today"
            />
            <NumberCard
              label="With your knowledge captured"
              value={money(result.potential)}
              sub={`Runs & sells without you · ~${result.appliedMultiplePotential.toFixed(1)}× SDE`}
              tone="genome"
            />
          </div>

          {/* WHY ONE OF THESE IS A RANGE AND TWO ARE NOT.
              "You're more uncertain about the value of my second-hand gear than about the value of
              my entire business. That's backwards and it's the kind of thing a buyer's accountant
              will pick at."
              It looks backwards and it is not, and the honest fix is to say so rather than to invent
              symmetry. The gear range is real: 40–60c in the dollar is a documented auction-recovery
              band, so we can state it. Our sector table carries a single MEDIAN multiple and no
              within-sector dispersion, so any ± around the business figures would be a number we
              made up — on the one screen that earned its credibility by disclosing exactly where its
              inputs come from. Both figures are rounded instead, which is the precision they have. */}
          <p className="text-base text-stone-500 leading-relaxed">
            The gear figure is a range because auction recovery genuinely is one — 40 to 60 cents in
            the dollar is well documented. The two business figures are single numbers because our
            sector data gives one median multiple and no spread around it; putting a ± on them would
            be inventing a precision we do not have. Both are rounded for the same reason.
          </p>

          {/* The gap headline */}
          <div className="grad-genome rounded-3xl p-7 sm:p-9 text-white shadow-lg">
            <p className="text-white/80 font-medium mb-1">The value locked inside your head right now</p>
            <p className="font-display text-4xl sm:text-5xl font-bold mb-3">{money(result.gap)}</p>
            <p className="text-white/90 leading-relaxed max-w-xl">
              That's the difference between selling a job and selling an asset. It isn't extra hustle — it's the
              systems, relationships and know-how that today live only in your memory. Capture them into a
              <strong> Business Genome</strong> and they become transferable: worth more to a buyer, and yours to
              hand over cleanly.
            </p>
            {/* THE SCALE, not just the number. "Thirty-four out of what? Is 60 normal? Is 34 dire?
                What does a business you'd actually buy score? A number with no scale is a number I
                can't use, and this one is meant to be the thing I watch go up."
                The ends are stated from the MODEL rather than invented: readiness is a weighted sum
                of the same factors listed on this page, 0 is a business that is entirely its owner
                and 100 is one that runs and sells without him. No benchmark is claimed — we do not
                have a population to draw one from, and inventing "most owners score 40" on a screen
                that just disclosed its own data sources would undo the paragraph that earned the
                most trust in the whole walkthrough. */}
            <div className="mt-4 inline-flex items-center gap-2 text-sm bg-white/15 rounded-full px-4 py-1.5">
              <Brain className="h-4 w-4" /> Transferability score: {readinessPct}/100
            </div>
            <p className="mt-2 text-sm text-white/80 max-w-xl">
              0 means the business is you — nothing runs without you in it. 100 means it runs, and
              sells, without you. It is built from the same answers listed below, so every one you
              change moves it. This is the number to watch go up.
            </p>
          </div>

          {/* Buyer-risk rationale - why the multiple is what it is, adapted to the outcome */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-amber-100 shadow-sm">
            <h2 className="font-display text-xl font-bold text-stone-800 mb-4">{rationale.title}</h2>
            <div className="space-y-3">
              {rationale.paragraphs.map((p, i) => (
                <p key={i} className="text-stone-600 leading-relaxed">{p}</p>
              ))}
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
                      <p className="font-display font-bold text-lg text-pink-600">+{money(f.uplift)}</p>
                      <p className="text-sm text-stone-400">once captured</p>
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
        <h2 className="font-display text-2xl font-bold text-stone-800 mb-3">
          {returningToApp ? "That's your starting point" : "Start building your business's memory"}
        </h2>
        <p className="text-stone-600 max-w-xl mx-auto mb-7 leading-relaxed">
          {returningToApp
            ? "Kira will ask whether this one is yours the next time you open her, and then it becomes the figure everything from here is measured against. From that point on you close the gap by talking to her — she captures the operating knowledge in your head as you go."
            : "Kira interviews you the way a smart buyer would — capturing the operating knowledge in your head into a living Business Genome. It's how you close the gap: a business worth more, and one you can actually hand over."}
        </p>

        {/* HIS PRICE, HERE, where he was told it would be.
            The landing page says the fee depends on his gap and "you'll see it after the valuation."
            He finished the valuation and there was no price on the results page at all — he had to
            click a third CTA to find it, which for a buyer already braced for a bait-and-switch is
            the worst possible place to withhold a number.
            Nothing was blocking it: priceForGap() is pure, the gap is already computed on this
            screen, and /plan calls the same function. It is framed as a fraction of the gap because
            that is the honest justification and it only works while the gap is still on screen. */}
        {/* Not to someone who is already paying. Quoting a customer the monthly fee again, under a
            button labelled as though he has not started, is the "does this product know who I am"
            failure — and for a 66-year-old bracing for a second charge it is worse than that. */}
        {!noEarnings && !returningToApp && (
          <p className="text-stone-700 max-w-xl mx-auto mb-7 text-lg">
            For your business that comes to{' '}
            <span className="font-bold text-stone-900">
              {formatPrice(priceForGap(result.gap).monthly, currency)} a month
            </span>
            {priceForGap(result.gap).fractionWorthQuoting
              ? ` — about ${priceForGap(result.gap).fractionOfGapPct} a year of what you stand to unlock.`
              : '.'}{' '}
            You are never invoiced for the month you are in.
          </p>
        )}
        <a
          href={planHref}
          className="grad-coral text-white font-display font-bold px-8 py-4 rounded-full text-lg inline-flex items-center gap-2 min-h-[52px] shadow-lg shadow-pink-200 hover:opacity-95"
        >
          {returningToApp ? 'Back to Kira' : 'Start building your Business Genome'} <ArrowRight className="h-5 w-5" />
        </a>
        <div className="mt-5 flex items-center justify-center gap-5 text-sm">
          <button onClick={() => window.print()} className="text-stone-500 hover:text-stone-800 inline-flex items-center gap-1.5 min-h-[44px]">
            <Printer className="h-4 w-4" /> Save / print this
          </button>
          <a href="/business-valuation" className="text-stone-500 hover:text-stone-800 min-h-[44px] inline-flex items-center">Start over</a>
        </div>
      </div>

      <div className="space-y-3 text-base text-stone-500 leading-relaxed">
        <p>
          <strong className="text-stone-700">This is the value of the business, before debt.</strong> It&apos;s
          what the business itself is worth — not what lands in your pocket. Subtract any loans, equipment
          finance, lease obligations or tax owing to get to that. It also doesn&apos;t account for your lease
          terms, working capital, or how long you&apos;ve been trading, all of which a buyer will price.
        </p>
        <p>
          <strong className="text-stone-700">Where the multiples come from.</strong> Sector medians are
          BizBuySell&apos;s 2025 US small-business sale data — ~9,500 closed deals, market average ~2.5× SDE.
          There is no equivalent Australian dataset at this granularity: the AIBB&apos;s transaction database
          is members-only, and published Australian guides give broad EBITDA ranges across around two dozen
          industries rather than per-sector SDE medians. Australian broker resources draw on the same US data
          for that reason. We use it as an <strong className="text-stone-700">indicative benchmark, not an
          Australian market quote</strong> — the sector shape travels well; the absolute number should be
          checked against local evidence before anyone acts on it.
        </p>
        <p>
          An indicative estimate for guidance only, adjusted for size, owner-dependence, recurring revenue,
          client concentration and growth. Not a formal valuation and not financial advice — real sale prices
          depend on many factors specific to your business and your buyer.
        </p>
      </div>
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
      <p className="text-sm uppercase tracking-wide text-stone-500 font-semibold mb-1">{label}</p>
      <p className={`font-display text-2xl sm:text-[1.75rem] font-bold ${valueColor} leading-tight`}>{value}</p>
      <p className="text-sm text-stone-500 mt-2 leading-snug">{sub}</p>
    </div>
  );
}
