'use client';

// @public-route

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
  SDE_EXPANSION,
  SDE_SHORT_REMINDER,
  sdeExample,
  sdeMarginNote,
} from '@/lib/valuation/sde-copy';
import {
  formatRunDate,
  summariseAnswers,
} from '@/lib/valuation/answer-summary';
// THE QUESTION SET LIVES IN `lib/valuation/questions.ts`, not here.
//
// It was declared inline in this file, which meant the in-portal gate could not render the same
// questions without forking a 1,955-line component — and two copies of a question set is two
// genomes. The data moved; the drawing of it stayed. See that file's header for why the icons had
// to become keys.
import {
  RECORD_STEPS,
  SCREEN_COUNT,
  STEPS,
  type Answers,
  type AnswerKey,
  type IconKey,
} from '@/lib/valuation/questions';
import { BETA_CODE_STORAGE_KEY } from '@/components/BetaCodeCarrier';
import {
  EXIT_TIMEFRAME_OPTIONS,
  exitAdvice,
  type ExitTimeframe,
} from '@/lib/valuation/exit-timing';
import { HEADLINE_NUMBERS } from '@/lib/valuation/headline-numbers';
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
  Landmark,
  Sparkles,
  Printer,
  Mail,
  Brain,
  Clock,
} from 'lucide-react';
import {
  computeValuation,
  buildBuyerRationale,
  MODEL_VERSION,
  type Premises,
  type ValuationInputs,
} from '@/lib/valuation/model';
import { SECTOR_MULTIPLES } from '@/lib/valuation/sde-multiples';
import { sectorContext, MULTIPLE_SOURCE } from '@/lib/valuation/sector-context';
import { FULL_RATE_PERIOD_CAP, priceForProfit } from '@/lib/valuation/pricing';
import { netPosition } from '@/lib/valuation/net-position';
import { approxNumber, formatMoney, formatMoneyApprox, formatPrice, getCurrency, CURRENCIES, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { displayedFigures, displayedUplifts } from '@/lib/valuation/displayed';
import { whatIf } from '@/lib/valuation/what-if';
import {
  INDUSTRY_NOT_LISTED,
  INDUSTRY_OPTION_GROUPS,
  industryLabel,
  isSelectableIndustry,
} from '@/lib/valuation/industry-options';
import { synonymSector } from '@/lib/valuation/industry-synonyms';
import { forSharing, storeValuation, VALUATION_HANDOFF_KEY } from '@/lib/valuation/share';
import {
  clearValuationLocal,
  loadValuationLocal,
  saveValuationLocal,
  VALUATION_TTL_DAYS,
} from '@/lib/valuation/persist';

/**
 * THE ICONS, mapped from the key the question set carries.
 *
 * The questions moved to `lib/valuation/questions.ts` as pure data so a server component and the
 * in-portal gate can read them without pulling `lucide-react` in. An icon was the one field that
 * could not travel — it was a `React.ReactNode`, which would have forced every importer to be a
 * client component. So the data names an icon and this file draws it.
 *
 * ⚠️ `Record<IconKey, ...>` rather than a loose lookup, deliberately: adding a key to the question
 * set without adding it here fails to compile, instead of rendering a question with no glyph.
 */
const ICONS: Record<IconKey, React.ReactNode> = {
  'building-2': <Building2 className="h-6 w-6" />,
  'trending-up': <TrendingUp className="h-6 w-6" />,
  users: <Users className="h-6 w-6" />,
  'user-cog': <UserCog className="h-6 w-6" />,
  'file-stack': <FileStack className="h-6 w-6" />,
  repeat: <Repeat className="h-6 w-6" />,
  wrench: <Wrench className="h-6 w-6" />,
  landmark: <Landmark className="h-6 w-6" />,
  clock: <Clock className="h-6 w-6" />,
};

/** Where in-progress answers are parked so a reload resumes rather than restarting. */
const PROGRESS_KEY = 'kira_valuation_progress';

/**
 * A money figure said back in plain words — "2.4 million", "850 thousand".
 *
 * Grouping alone ("2,400,000") is still a shape, and the reader this is written for is checking it
 * on a phone in daylight. One decimal place at most: "2.43 million" is precision he did not give us
 * and would only invite him to correct a number that is meant to be approximate.
 */
export function amountInWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} million`;
  }
  if (n >= 1_000) {
    // "k", NOT "thousand" (register P17). $460,000 came back as "$460 thousand", and his note is
    // exactly right: no human writes that. "$2.4 million" is a phrase people say and write; "460
    // thousand" is a phrase nobody writes down, so on the one line whose entire job is to look
    // FAMILIAR enough to be checked at arm's length, it reads as machine output.
    //
    // "k" keeps the property the line exists for. The field above already shows "460,000", so the
    // echo has to differ in SHAPE or it confirms nothing — and a fat-fingered zero still separates
    // loudly: $460k against $4.6 million.
    const k = n / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return n.toLocaleString('en-AU');
}



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
  /** True when this page load picked up saved answers rather than starting clean. */
  const [resumed, setResumed] = useState(false);
  useEffect(() => {
    try {
      const saved = loadValuationLocal<{ stepIndex?: number; answers?: Answers; industryQuery?: string; firstName?: string }>(
        PROGRESS_KEY,
      );
      if (saved) {
        // TELL HIM IT RESUMED. It silently picked up mid-questionnaire with his turnover and profit
        // still in the browser, and nothing said so: "anyone who opens that tab and presses Back
        // four times reads them. I'm the man who hasn't told his wife. My bookkeeper uses my office
        // computer." A resume he did not ask for and was not told about is the leak this product
        // cannot afford, so it is announced at the moment it happens, with the way out beside it.
        const hasProgress =
          (typeof saved.stepIndex === 'number' && saved.stepIndex > 0) ||
          (saved.answers != null && Object.keys(saved.answers).length > 0);
        if (hasProgress) setResumed(true);
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

  // BETA INVITATION NAME PREFILL.
  //
  // An invited tester arrives at the valuation with ?code= in the URL (carried into sessionStorage
  // by BetaCodeCarrier). The invitation carries their name, so the "What should we call you?" intro
  // field can be pre-filled — the tester should not have to type a name the invitation already told
  // us. This is presentation only (see BetaCodeRow): the name is NOT identity authority.
  //
  // It must run as an effect AFTER restore (line above) so it never overwrites a name the tester
  // already typed or that was restored from progress — it only fills the field when it is still
  // empty. The invitation peek is read-only and never consumes the code.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The code can arrive two ways: BetaCodeCarrier parks it in sessionStorage when the tester
        // enters via the landing page, or the tester lands here directly with ?code= in the URL
        // (a new tab or an invitation email link that skipped the landing page). Resolve both so the
        // name pre-fill works whatever the entry path. The URL is the source of truth when both are
        // present, because it is the freshest signal.
        const fromUrl =
          new URLSearchParams(window.location.search).get('code')?.trim() ?? '';
        const parkedCode =
          window.sessionStorage.getItem(BETA_CODE_STORAGE_KEY)?.trim() ?? '';
        const codeToPeek = fromUrl || parkedCode;
        if (!codeToPeek) return;
        const response = await fetch('/api/beta/peek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ code: codeToPeek }),
        });
        if (!response.ok) return;
        const data = (await response.json().catch(() => null)) as {
          ok?: boolean;
          firstName?: string | null;
        } | null;
        if (cancelled) return;
        if (!data?.ok || !data.firstName) return;
        // Only pre-fill if the visitor has not already supplied/restored a name.
        setFirstName((current) =>
          current.trim() ? current : data.firstName!.trim().slice(0, 40),
        );
      } catch {
        // Non-fatal: the field simply stays empty and the tester types a name.
      }
    })();
    return () => {
      cancelled = true;
    };
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
    // A group's questions are all skippable — see the `optional` flags on its fields. The screen is
    // "three last things", not a gate, and the whole point of the timeframe question is that he is
    // free not to answer it.
    if (step.kind === 'group') return true;
    // ⚠️ `optional` was added because the debt question's help promised "leave it blank" while this
    // line disabled Next until a number was typed.
    if ('optional' in step && step.optional) return true;
    const v = answers[step.id];
    if (step.kind === 'money') return typeof v === 'number' && !Number.isNaN(v);
    return typeof v === 'string' && v.length > 0;
  }, [step, answers]);

  function setAnswer(id: AnswerKey, value: string | number) {
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

      // ⚠️ THE SENTINEL MUST NEVER REACH THE LLM. Since the question became a dropdown this branch
      // is only for a RESUMED free-text answer typed before that change — but "My industry is not
      // listed" is not a sector name and not in the synonym table, so it would sail through
      // `alreadyKnown` and be handed to the matcher, which would dutifully return its best guess for
      // a sentence that is not an industry. The one answer whose entire meaning is "none of these"
      // would come back as a sector, priced off a median the owner explicitly declined to claim.
      const isSentinel = raw === INDUSTRY_NOT_LISTED;

      if (raw && !isSentinel && !alreadyKnown && llmTried !== raw) {
        // KEEP HIS ORIGINAL WORDS FOR THE RECORD BLOCK. `resolveIndustry` overwrites
        // `answers.industry` with the matched sector, and the record line ("Plumbing — matched from
        // 'sparky'") reads the original out of `industryQuery`. That used to be the search box; with
        // a dropdown there is no box, so a resumed free-text answer would be silently rewritten to a
        // sector with nothing on the summary saying where it came from.
        setIndustryQuery(raw);
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
   * around a thousand-line client page — and this page is statically prerendered, so that boundary
   * would cost the public funnel's first paint to answer a question this small.
   *
   * ⚠️ IT MUST BE AN EFFECT, NOT A LAZY `useState` INITIALISER. It shipped as an initialiser and was
   * WRONG IN PRODUCTION — a naive tester walked the whole flow and got the sales copy and a price
   * quote, with `?from=app` sitting in the address bar the entire time.
   *
   * The reason is client-side navigation, not hydration. The dashboard links here with `<Link>`, so
   * the App Router RENDERS THIS COMPONENT BEFORE IT COMMITS THE NEW URL: at initialiser time
   * `window.location.search` is still the *dashboard's*, which is empty. By the time anyone looks at
   * the address bar it is correct, which is what makes the bug so convincing — the parameter is
   * visibly there and the code that reads it visibly ran.
   *
   * An effect runs after commit, so the URL is settled by the time it looks. The state starts false
   * and corrects on the first tick; nothing reads it until the result screen, eleven answers later.
   */
  const [returningToApp, setReturningToApp] = useState(false);
  // ⚠️ SAME EFFECT-NOT-INITIALISER RULE as above — the URL is not settled until after commit.
  // `?rerun=1` means he pressed "Run the numbers again" on a dashboard that already holds a frozen
  // baseline, so the result must say what it does to that baseline WHERE the new figure appears.
  const [isRerun, setIsRerun] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturningToApp(params.get('from') === 'app');
    setIsRerun(params.get('rerun') === '1');
  }, []);

  useEffect(() => {
    if (!isResult) return;
    storeValuation({
      // ⚠️ `forSharing`, NOT the raw answers. It strips the device-only answers — today that is the
      // exit timeframe, which must never become a row on an account (H3; see share.ts). The page
      // keeps rendering from the full set, because the advice below is built from what this removes.
      inputs: forSharing(answers),
      currency,
      firstName: firstName.trim() || undefined,
      // Carried so the app does not later ask him whether a valuation he ran from his own dashboard,
      // signed in, is his — see ValuationPayload.fromApp.
      fromApp: returningToApp,
    });
    // `returningToApp` is in the deps and DECLARED ABOVE, deliberately. It was below, so the
    // effect closed over the initial false and only worked by accident of ordering — the
    // result screen is eleven answers away, by which time the flag has settled.
  }, [isResult, answers, currency, firstName, returningToApp]);

  const planHref = returningToApp ? '/dashboard' : '/plan';

  const progress = isResult ? 100 : Math.round(((stepIndex + 1) / (total + 1)) * 100);

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800 font-body">
      <style>{`
        /* SELF-HOSTED FONTS, PAGE-SCOPED TYPOGRAPHY — K5/P3.
           An @import of a Google Fonts stylesheet stood here: a render-blocking third-
           party stylesheet inside a BODY style, invisible to the preload scanner, on five pages —
           and on the pages a tester called slow. next/font (app/layout.tsx) self-hosts the two
           faces and exposes them as variables, so the external request is gone entirely.
           ⚠️ These two rules stay HERE rather than moving to globals.css. Tailwind maps
           .font-display/.font-body to Inter and DESIGN.md §4 defers a second face; a body rule
           beats the head sheet at equal specificity, so keeping them page-scoped is what stops this
           becoming a site-wide typeface change nobody asked for. */
        .font-display { font-family: var(--font-display), 'Outfit', ui-sans-serif, sans-serif; }
        .font-body { font-family: var(--font-body), 'DM Sans', ui-sans-serif, sans-serif; }
        .grad-warm { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 45%, #fce7f3 100%); }
        .grad-coral { background: linear-gradient(135deg, #fb7185 0%, #f472b6 100%); }
        .grad-genome { background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 60%, #f472b6 100%); }
        .card-pop { transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
        .card-pop:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0,0,0,.08); }

        /* PRINT — register P9/P11. The result page carries a print button and is built to be handed
           to an accountant, and it printed with a sticky header floating over the first block, a
           gradient sell panel eating a page in ink, and cards split across page breaks.
           A document, not a screenshot of a web page. */
        @media print {
          /* Backgrounds and gradients cost a fortune in ink and read as grey mud on a mono printer.
             The gap headline is a white-on-violet panel, so it needs its own treatment rather than
             just losing the fill — otherwise the largest number on the page prints white on white. */
          .grad-warm, .grad-coral, .grad-genome {
            background: none !important;
            color: rgb(var(--print-ink)) !important;
          }
          .grad-genome * { color: rgb(var(--print-ink)) !important; }
          header { display: none !important; }
          .card-pop { transition: none !important; }
          /* Keep a block whole across a page break where the printer will let us. A three-figure
             card split down the middle is the one thing worse than no record at all. */
          section, dl, .rounded-3xl, .rounded-2xl { break-inside: avoid; page-break-inside: avoid; }
          a[href]::after { content: none !important; }
        }
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
            {/* ⚠️ SCREENS, NOT QUESTIONS — the same number this always rendered, now named
                honestly. `SCREEN_COUNT` is 13; `QUESTION_COUNT` is 15, because the closing screen
                holds three. Whether the copy should quote the larger number is a decision about
                what a cold visitor is being promised, not a refactor, so it is left alone here.

                ⚠️ AND IT LIVES OUTSIDE THE PARAGRAPH. Sitting between the two sentences, JSX
                trimmed the whitespace around the comment and the page rendered "the hardest thing
                to value.Answer 13 short questions" — on the first screen a cold visitor reads.
                Ray, 2026-08-16: "Small one, but I read everything." A comment that changes the
                output is not a comment. */}
            <p className="text-stone-600 text-base leading-relaxed">
              For most owners, their business is their biggest asset — and the hardest thing to value.
              Answer {SCREEN_COUNT} short questions and see three honest numbers, plus the gap that&apos;s
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
            {/* P8 — THE SAME THREE DEFINITIONS THE LANDING NOW SHOWS.
                These lived only here, which is how the landing's three headline numbers came to be
                printed with nothing saying what "walk away" meant. Read from
                lib/valuation/headline-numbers.ts so the four surfaces that print these labels
                cannot drift into four descriptions of them. */}
            <ul className="space-y-4 text-stone-700 mb-8">
              {HEADLINE_NUMBERS.map((h, i) => (
                <li key={h.key} className="flex gap-3">
                  <span className="text-stone-400 font-bold">{i + 1}.</span>
                  <span>
                    <strong>{h.longLabel}</strong> — {h.meaning}.
                  </span>
                </li>
              ))}
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
              Start the {SCREEN_COUNT} questions <ArrowRight className="h-5 w-5" />
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
              {/* `step.icon` is a KEY now, not a node — see ICONS above. Rendering it directly
                  typechecks perfectly well (a string is a valid ReactNode) and puts the literal
                  text "building-2" on the screen, which is why the mapping is not optional. */}
              <span className="grad-genome text-white w-9 h-9 rounded-xl flex items-center justify-center">{ICONS[step.icon]}</span>
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
            {/* THE RESUME, ANNOUNCED. Shown once per load, only when answers were actually
                restored, and dismissible — a banner that reappears on every question becomes
                furniture and stops being read. */}
            {resumed && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm sm:text-base text-stone-700">
                <p className="leading-relaxed">
                  Picking up where you left off. Your answers — including turnover and profit — are
                  saved <strong>in this browser on this device</strong> for {VALUATION_TTL_DAYS} days.
                  Nothing has been sent anywhere.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-5">
                  <button
                    type="button"
                    onClick={clearAnswers}
                    className="min-h-[44px] text-sm font-semibold text-stone-800 underline underline-offset-4"
                  >
                    Clear them and start fresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setResumed(false)}
                    className="min-h-[44px] text-sm font-medium text-stone-500 underline underline-offset-4"
                  >
                    Keep going
                  </button>
                </div>
              </div>
            )}

            {/* THE SECTOR, CARRIED FORWARD. The match confirmation lived only on question 1, so a
                visitor who pressed Next while it was still resolving never saw what he had been
                matched to — and that match sets the multiple, which sets every figure on the result
                page. He only found it by pressing Back later, onto a screen he had already left.
                Now it follows him, with the way to change it. */}
            {stepIndex > 0 && typeof answers.industry === 'string' && answers.industry.trim() !== '' && (
              <p className="mt-4 text-sm text-stone-500">
                Sector: <span className="font-semibold text-stone-700">{answers.industry}</span>
                {' · '}
                <button
                  type="button"
                  onClick={() => setStepIndex(0)}
                  className="font-medium underline underline-offset-4 hover:text-stone-700"
                >
                  change
                </button>
              </p>
            )}

            <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-800 mt-4 mb-2">{step.title}</h2>
            <p className="text-stone-500 text-sm sm:text-base mb-7 leading-relaxed">{step.help}</p>

            {/* Industry — filtered dropdown (a real picker, not a fickle datalist) */}
            {/* INDUSTRY — A DROPDOWN, NOT A SEARCH BOX. See lib/valuation/industry-options.ts.
                It was free text with a typeahead, and typing something the table did not know
                ("aviation") matched nothing and quietly priced the business off the 2.5x market
                average with one grey sentence of explanation. It failed OPEN, on the single most
                load-bearing input in the model — the sector multiple every other answer scales.
                A native <select> cannot do that: every answer is a sector we hold a real median
                for, or an explicit "not listed" that says what it costs him.

                NATIVE, not a custom combobox. On a phone this renders as the platform's own picker
                with group headings and first-letter jumping, which a 66-year-old has used a
                thousand times, and it needs no JS to be correct. */}
            {step.kind === 'industry' && (() => {
              const current = typeof answers.industry === 'string' ? answers.industry : '';
              // A RESUMED ANSWER THE LIST CANNOT REPRESENT is preserved and offered back, not
              // dropped and not silently rewritten to "not listed". It is his answer, typed before
              // this shipped, and quietly replacing it would change his valuation without telling
              // him. Shown in its own group so it is obvious what it is.
              const legacy = current && !isSelectableIndustry(current) ? current : null;
              return (
                <div>
                  <select
                    value={current}
                    onChange={(e) => setAnswer('industry', e.target.value)}
                    className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-4 text-base text-stone-900 focus:border-violet-400 focus:outline-none min-h-[52px]"
                  >
                    <option value="" disabled>
                      Choose the closest match…
                    </option>
                    {legacy && (
                      <optgroup label="Your earlier answer">
                        <option value={legacy}>{legacy}</option>
                      </optgroup>
                    )}
                    {INDUSTRY_OPTION_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {/* ⚠️ LABEL AUSTRALIAN, VALUE UNCHANGED. The option's value is still the
                            table's own name, so the multiple lookup and every stored answer are
                            untouched — only the words he reads change. See industryLabel(). */}
                        {g.options.map((name) => (
                          <option key={name} value={name}>
                            {industryLabel(name)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <optgroup label="None of these">
                      <option value={INDUSTRY_NOT_LISTED}>{INDUSTRY_NOT_LISTED}</option>
                    </optgroup>
                  </select>

                  {/* SAYS WHAT IT COSTS, at the moment he chooses it — not afterwards in grey. */}
                  {current === INDUSTRY_NOT_LISTED && (
                    <p className="mt-3 text-sm leading-relaxed text-amber-800">
                      We&apos;ll use the overall market average of 2.5&times; instead of a figure for
                      your sector. Everything else still works, but the number will be rougher than it
                      would be for a business we hold data on — so if anything above is close, it is
                      worth picking.
                    </p>
                  )}
                  {legacy && current === legacy && (
                    <p className="mt-3 text-sm leading-relaxed text-stone-500">
                      That&apos;s what you told us last time. If one of the listed sectors is closer,
                      pick it — the number will be better for it.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Money */}
            {step.kind === 'money' && (
              <div className="relative">
                <MoneyInput
                  value={answers[step.id] as number | undefined}
                  onChange={(n) => setAnswer(step.id, n)}
                  placeholder={step.placeholder}
                  currencySymbol={currencySymbol}
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

            {/* THE CLOSING GROUP — three short questions on one screen (register P7).
                No auto-advance on its choices: on a grouped screen that would carry him off the
                other two questions the moment he answered one. */}
            {step.kind === 'group' && (
              <div className="space-y-9">
                {step.fields.map((field) => (
                  <div key={field.id}>
                    <label
                      htmlFor={field.kind === 'money' ? `group-${field.id}` : undefined}
                      className="font-display block text-lg font-bold text-stone-800"
                    >
                      {field.label}
                    </label>
                    <p className="mb-4 mt-1 text-sm leading-relaxed text-stone-500 sm:text-base">{field.help}</p>

                    {field.kind === 'money' ? (
                      <MoneyInput
                        id={`group-${field.id}`}
                        value={answers[field.id] as number | undefined}
                        onChange={(n) => setAnswer(field.id, n)}
                        placeholder={field.placeholder}
                        currencySymbol={currencySymbol}
                      />
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {field.options.map((opt) => {
                          const selected = answers[field.id] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setAnswer(field.id, opt.value)}
                              aria-pressed={selected}
                              className={`card-pop flex min-h-[56px] items-center justify-between rounded-2xl border-2 px-4 py-3 text-left ${
                                selected ? 'border-pink-400 bg-pink-50' : 'border-amber-200 bg-white hover:border-amber-300'
                              }`}
                            >
                              <span>
                                <span className="font-display block font-semibold text-stone-800">{opt.label}</span>
                                {opt.sub && <span className="text-sm text-stone-500">{opt.sub}</span>}
                              </span>
                              <span
                                className={`ml-3 h-5 w-5 flex-shrink-0 rounded-full border-2 ${
                                  selected ? 'border-pink-400 bg-pink-400' : 'border-stone-300'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                <p className="text-sm leading-relaxed text-stone-500">
                  Skip any of these you would rather not answer — the valuation works without them.
                </p>
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
        {isResult && result && (
          <ResultView
            result={result}
            annualProfit={Number(answers.annualProfit) || 0}
            businessDebt={typeof answers.businessDebt === 'number' ? answers.businessDebt : undefined}
            workInProgress={typeof answers.workInProgress === 'number' ? answers.workInProgress : undefined}
            premises={answers.premises}
            exitTimeframe={answers.exitTimeframe}
            answers={answers}
            currency={currency}
            planHref={planHref}
            firstName={firstName.trim()}
            matchedSector={String(answers.industry ?? '')}
            typedSector={industryQuery.trim()}
            onChangeSector={() => setStepIndex(0)}
            returningToApp={returningToApp}
            isRerun={isRerun}
          />
        )}
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
  annualProfit,
  businessDebt,
  workInProgress,
  premises,
  exitTimeframe,
  answers,
  currency,
  planHref,
  firstName,
  matchedSector,
  typedSector,
  onChangeSector,
  returningToApp = false,
  isRerun = false,
}: {
  result: ReturnType<typeof computeValuation>;
  /** What the owner REPORTED. The price band comes from this, never from result.gap. */
  annualProfit: number;
  /**
   * What the business owes, if he told us. Converts the enterprise value the model produced into
   * the equity value he would actually keep. Undefined when the question was skipped, and the
   * after-debt block then does not render at all.
   */
  businessDebt?: number;
  /** Work in progress and retentions — the mirror image of debt. Undefined when skipped. */
  workInProgress?: number;
  /** Who owns the premises. Changes no figure; buys a disclosure. See `Premises` in model.ts. */
  premises?: Premises;
  /** ⚠️ DEVICE-ONLY (H3). Selects an advice paragraph and travels nowhere. */
  exitTimeframe?: ExitTimeframe;
  /** Everything he answered, for the record block. Read, never re-derived. */
  answers: Answers;
  currency: string;
  planHref: string;
  firstName?: string;
  matchedSector?: string;
  typedSector?: string;
  onChangeSector?: () => void;
  /** He is already a customer: don't sell, and don't quote him a price he is already paying. */
  returningToApp?: boolean;
  /**
   * He arrived from "Run the numbers again" on a dashboard that already holds a frozen baseline.
   *
   * ⚠️ THE RESULT MUST SAY WHAT IT DOES TO THAT BASELINE, HERE. He pressed a control we put on his
   * dashboard, nothing on the result screen said it would not replace his starting point, and he
   * finished believing his number had changed — then met the offer to change it on Settings.
   */
  isRerun?: boolean;
}) {
  // APPROXIMATE, on the result screen. See formatMoneyApprox: eleven category answers and a sector
  // median cannot resolve a business to the dollar, and "$1,094,292" claims they can on the one
  // screen where this buyer decides whether to believe any of it. The walk-away auction range below
  // is left exact because it is already expressed as a range and reads as one.
  const money = (n: number) => formatMoneyApprox(n, currency);
  /**
   * EXACT formatting, for figures that are already derived from rounded inputs.
   *
   * `money` re-rounds to 3 significant figures. Applied to a net-of-debt figure that was computed
   * from an already-rounded pair, it can move the two numbers in OPPOSITE directions and reopen the
   * subtraction the block exists to close. His debt figure is his own and is exact; the values it is
   * taken from are already approximated, so the precision here is inherited rather than invented.
   */
  const exact = (n: number) => formatMoney(n, currency);
  /**
   * THE GAP, DERIVED FROM WHAT IS ON SCREEN.
   *
   * Every figure here is rounded to 3 significant figures, and the gap was rounded independently of
   * the two it is the difference between — so the page showed $1,020,000 and $874,000 above a gap of
   * $147,000, and $1,020,000 − $874,000 is $146,000. A tester with a calculator caught it, and he
   * checked precisely BECAUSE the paragraph above earns that scrutiny by explaining why we round.
   *
   * It is one thousand on a million and it does not matter what it is: the gap is the number the
   * whole product is built on, it is printed in the largest type on the page, and it is a
   * two-number subtraction sitting in plain view. Being not-quite-right there is worse than being
   * wrong somewhere he cannot check.
   */
  // Derived in ONE place now (lib/valuation/displayed.ts) rather than here, because the dashboard
  // and /plan needed the identical derivation and each had grown its own — which is how one figure
  // came to have four values.
  const shown = displayedFigures({ worthToday: result.today, worthPotential: result.potential }, currency);
  const displayedGap = shown.gap;
  const noEarnings = result.today === 0 && result.potential === 0;

  /**
   * The realisable walk-away range, derived ONCE.
   *
   * 40–60c in the dollar on book value (register A6), and it lives here rather than inline in the
   * card because the after-debt block needs the identical numbers. Deriving it twice is how one
   * figure comes to have two values — the exact failure `displayedFigures` was extracted to end.
   */
  const walkAwayLow = approxNumber(Math.round(result.walkAway * 0.4));
  const walkAwayHigh = approxNumber(Math.round(result.walkAway * 0.6));

  /**
   * Enterprise value → equity value. Debt comes off every figure equally, so the GAP is untouched
   * and nothing about the model, MODEL_VERSION, the stored snapshots or his price moves.
   * `net.applied` is false when he left the question blank, and the block does not render.
   *
   * ⚠️ FED THE DISPLAYED FIGURES, NOT THE RAW ONES, AND THE DIFFERENCE IS A REAL DEFECT I SHIPPED
   * FOR ABOUT TEN MINUTES. Every figure on this page is rounded to 3 significant figures, and
   * `displayedGap` is the difference between the ROUNDED pair. Subtracting debt from the RAW pair
   * produced $712,000 and $988,000 under a headline gap of $280,000 — and 988 − 712 is 276. That is
   * exactly the J8 defect returning: "a tester with a calculator caught it, and he checked precisely
   * BECAUSE the paragraph above earns that scrutiny by explaining why we round."
   *
   * Taking debt off the DISPLAYED pair closes it by construction: the difference between the two net
   * figures IS `displayedGap`, for any debt, with no arithmetic left to disagree about. They are then
   * rendered with `formatMoney` rather than `money` — re-approximating an already-approximated
   * number is what would reopen the gap, because the two figures can round in opposite directions.
   */
  const net = netPosition(
    { walkAwayLow, walkAwayHigh, today: shown.today, potential: shown.potential },
    { debt: businessDebt, workInProgress },
  );
  /**
   * The date this was run, fixed once at mount.
   *
   * `useState` with an initialiser rather than a plain `new Date()` in the body: a re-render (a
   * currency change, a React strict double-render) must not move the date printed on a document.
   * Safe against hydration because `ResultView` is only ever reached by answering the questions —
   * the prerendered page is the intro screen, so this never renders on the server.
   */
  const [runDate] = useState(() => formatRunDate(new Date()));
  /** The record of what he was asked and what he answered — register P9. */
  const record = summariseAnswers(RECORD_STEPS, answers as Record<string, unknown>, {
    money: (n: number) => formatMoney(n, currency),
    typedSector,
  });
  const timing = exitAdvice(exitTimeframe);
  // Reconciled against `displayedGap` so the itemised lines add up to the headline above them —
  // they were rounded independently and came out $500 short. Render `upliftText`, never re-format.
  const capturable = displayedUplifts(
    result.factors.filter((f) => f.capturable && f.uplift > 0),
    displayedGap,
    currency,
  );
  const readinessPct = Math.round(result.readiness * 100);
  const rationale = buildBuyerRationale(result);
  /**
   * P4 — the sector's own multiple, printed beside his.
   *
   * "If electrical contracting averages 4.1× and I'm at 2.8×, that's a fact I'd chew on for a week.
   * As written it's a claim I can't check, on a page whose whole credibility rests on being
   * checkable." The figure was already in `sde-multiples.ts`; the page referenced it four times and
   * never once stated it. Derived from the SAME helper the rationale below uses, so the sentence
   * under the cards and the sentence in the essay can never disagree about which way he sits.
   */
  // The what-if picker (see the block under the factor cards). Local state only — it never writes
  // and never changes the stored baseline, which is the one figure that must stay fixed.
  const [whatIfFixed, setWhatIfFixed] = useState<string[]>([]);
  // ⚠️ THROUGH displayedFigures, LIKE EVERY OTHER FIGURE ON THIS PAGE. The movement is derived from
  // the ROUNDED pair, so "worth today would be X, which is Y more" adds up in the numbers he can
  // see. Rounding the difference separately is the $270,000/$271,000 defect in a new place.
  const whatIfRaw = whatIf(answers as ValuationInputs, whatIfFixed);
  const whatIfFigures = displayedFigures(
    { worthToday: whatIfRaw.today, worthPotential: whatIfRaw.potential },
    currency,
  );
  const todayFigures = displayedFigures(
    { worthToday: result.today, worthPotential: result.potential },
    currency,
  );
  const whatIfMovement = formatMoneyApprox(
    Math.max(0, whatIfFigures.today - todayFigures.today),
    currency,
  );

  // The email-it-to-me control (see the form below). Local to the result view — nothing about it
  // outlives the tab, which is the point.
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const sector = sectorContext({
    sectorMultiple: result.sdeMultiple,
    appliedMultiple: result.appliedMultipleToday,
    matched: result.sectorMatched,
    // The second landmark. Without it the headline can only say how far he is from the median,
    // which for an owner-dependent business reads as a suspiciously small haircut.
    floorMultiple: result.floorMultiple,
  });

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
            That's exactly what capturing your operating knowledge into an Operating Manual sets up.
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
              value={`${money(walkAwayLow)} – ${money(walkAwayHigh)}`}
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

          {/* P4 — THE SECTOR'S OWN MULTIPLE, BESIDE HIS.
              The page referenced it four separate times ("this sets the multiple", "below your
              sector's average", "near the top of what your sector commands", "sector figures inform
              the commentary") and never printed it. Directly under the cards because that is where
              "~2.8× SDE" is, and the whole point is that he can do the subtraction himself.
              `direction` is derived from the two printed figures — see sector-context.ts. */}
          <p className="text-base text-stone-600 leading-relaxed">
            {sector.sentence}
          </p>

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

          {/* AFTER DEBT — the number he said he would screenshot.
              "You could have asked in one box and shown me the number I actually care about, which
              is what lands in my pocket... That's the number I'd screenshot and show my wife."
              Until now the page ended with a disclaimer instructing him to do this subtraction
              himself, which is arithmetic we already had every input for.

              A SEPARATE BLOCK, not a fourth line inside each card, because it is a different
              QUESTION — the cards answer "what is the business worth", this answers "what would I
              be left with". Only rendered when he told us, so an owner who skipped the question
              sees exactly the page he saw before.

              The gap is deliberately NOT restated here: debt comes off `today` and `potential`
              equally, so it is unchanged, and repeating it would imply otherwise. */}
          {net.applied && (
            <div className="rounded-3xl border border-stone-200 bg-white p-7 sm:p-9">
              {/* THE HEADING NAMES BOTH LEGS, because it now has two.
                  It used to read "After the $380,000 the business owes" — correct while debt was the
                  only adjustment, and a false statement of the arithmetic the moment work in progress
                  started being added. A heading that names one of two operations is the same
                  stale-prose class as P4: nothing errors, and the sum below it stops matching the
                  sentence above it. */}
              <p className="font-display text-xl font-bold text-stone-900">
                {net.debt > 0 && net.workInProgress > 0
                  ? `After the ${exact(net.debt)} owed, and the ${exact(net.workInProgress)} owed to you`
                  : net.debt > 0
                    ? `After the ${exact(net.debt)} the business owes`
                    : `With the ${exact(net.workInProgress)} owed to you`}
              </p>
              <dl className="mt-5 space-y-3 text-lg">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-stone-600">Worth today</dt>
                  <dd className="font-display font-bold text-stone-900">{exact(net.today)}</dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-stone-600">With your knowledge captured</dt>
                  <dd className="font-display font-bold text-stone-900">{exact(net.potential)}</dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-stone-600">If you simply closed up</dt>
                  <dd className="font-display font-bold text-stone-900">
                    {exact(net.walkAwayLow)} – {exact(net.walkAwayHigh)}
                  </dd>
                </div>
              </dl>

              {/* NOT FLOORED AT ZERO, BY DECISION (operator, 2026-08-09).
                  Equipment finance is secured against the very gear the walk-away figure counts, so
                  owing more than it would fetch is a real position — and the most useful thing the
                  tool can tell him, because it means closing the doors is not available to him.
                  "Better for him to be clear and walk away than promise something from a not real
                  basis." Fires only when even the TOP of the range is under water, so it is a
                  statement of fact rather than a possibility dressed as one. */}
              {net.walkAwayNegative && (
                <p className="mt-5 rounded-xl bg-amber-50 px-4 py-4 text-base leading-relaxed text-stone-700">
                  <strong className="text-stone-900">Closing up is not an option on these numbers.</strong>{' '}
                  The gear would not cover what is owed, so simply shutting the doors leaves a
                  shortfall rather than a cheque. Selling the business, or getting it to a state
                  where someone wants to, is the way out — which is what the figures above are
                  about.
                </p>
              )}

              {/* THE TAX QUALIFIER, ONCE AND PLAINLY.
                  "What lands in your pocket" is his phrase and it is the right one, but it is
                  PRE-TAX: a sale triggers tax that depends on how he is structured, and there is no
                  honest way to compute it from eleven questions. Saying so once is the difference
                  between his phrase and a promise we cannot keep. Note this is a different thing
                  from the ATO debt in the question above, which is money owed today. */}
              {/* WORK IN PROGRESS IS NOT CERTAIN MONEY, and this page does not get to imply it is.
                  On a going-concern sale, work in progress and debtors are normally settled at
                  completion rather than sold with the business — but "normally" is a term of the
                  contract of sale, not a law, and a retention on a job he walks away from may never
                  be released. Stating that is the difference between adding his number and claiming
                  it. Only shown when he gave one. */}
              {net.workInProgress > 0 && (
                <p className="mt-5 text-base leading-relaxed text-stone-500">
                  The {exact(net.workInProgress)} owed to you is counted as yours, because work in
                  progress and retentions are usually settled separately at completion rather than
                  sold with the business. Usually, not always — it is a term of the contract, and a
                  retention on a job you walk away from may never be released.
                </p>
              )}

              <p className="mt-5 text-base leading-relaxed text-stone-500">
                Before whatever tax the sale itself triggers — that depends on how you are
                structured, and it is a question for your accountant rather than a calculator.
              </p>
            </div>
          )}

          {/* THE PREMISES — a disclosure, not an adjustment (register P7).
              "He owns the yard through his super fund; for a trade business often the biggest single
              question in the deal." It is deliberately NOT priced into anything above, and the two
              reasons point the same way: the property is a separate asset he keeps or sells on its
              own, and the rent arrangement distorts the profit figure in a direction that needs a
              market rent we do not have. Guessing it would corrupt the ONE input the whole model
              runs on. See `Premises` in lib/valuation/model.ts.
              The rent point is the one a broker would raise first and the product had never said. */}
          {premises === 'owns' && (
            <div className="rounded-3xl border border-stone-200 bg-white p-7 sm:p-9">
              <p className="font-display text-xl font-bold text-stone-900">
                The property is not in any of these figures
              </p>
              <p className="mt-4 text-base leading-relaxed text-stone-600">
                You own the premises, so they are yours whether or not you ever sell the business.
                Every figure above values the business alone — the property is a separate asset and a
                separate decision, and rolling the two together would give you one number that
                answers neither question.
              </p>
              <p className="mt-4 text-base leading-relaxed text-stone-600">
                One thing worth knowing before a buyer raises it, because he will. What the business
                pays you in rent changes its profit, and a buyer will re-work your figures at the
                market rent he would have to pay — to you, or to whoever owns it next. If you have
                been charging the business under the odds, some of the profit above is really rent
                you have chosen not to take, and the valuation moves down when that is corrected. If
                you have been charging over the odds, it moves up. Your accountant can tell you which
                way in about ten minutes, and it is worth knowing before somebody else works it out
                for you.
              </p>
            </div>
          )}

          {/* HOW LONG HE HAS GOT — advice, not arithmetic (register P7).
              "The entire product is aimed at a man in his sixties and never once asks how long he's
              got. Two years and eight years are completely different advice."
              ⚠️ This answer never left his device. See lib/valuation/exit-timing.ts (H3). */}
          {timing && (
            <div className="rounded-3xl border border-stone-200 bg-white p-7 sm:p-9">
              <h2 className="font-display text-xl font-bold text-stone-900">{timing.heading}</h2>
              <div className="mt-4 space-y-3">
                {timing.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="text-base leading-relaxed text-stone-600">
                    {p}
                  </p>
                ))}
              </div>
              <p className="mt-5 text-sm leading-relaxed text-stone-400">
                You told us this on the last question. It stayed on this device — it is not attached
                to any account, it was not sent anywhere, and it changed none of the figures above.
              </p>
            </div>
          )}

          {/* The gap headline */}
          <div className="grad-genome rounded-3xl p-7 sm:p-9 text-white shadow-lg">
            <p className="text-white/80 font-medium mb-1">The value locked inside your head right now</p>
            <p className="font-display text-4xl sm:text-5xl font-bold mb-3">{money(displayedGap)}</p>
            <p className="text-white/90 leading-relaxed max-w-xl">
              That's the difference between selling a job and selling an asset. It isn't extra hustle — it's the
              systems, relationships and know-how that today live only in your memory. Capture them into a
              <strong> Operating Manual</strong> and they become transferable: worth more to a buyer, and yours to
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
            {/* ⚠️ THE CONSEQUENCE, WHERE THE NEW FIGURE IS — not later, on Settings.
                He pressed "Run the numbers again" on his own dashboard and no screen after it said
                the result would not replace his starting point. Ray, 2026-08-17: "So I finished that
                exercise believing my number had changed… a man who presses a button called run the
                numbers again is entitled to be told what it does to his account." */}
            {isRerun && (
              <p className="mt-4 rounded-2xl bg-white/15 px-4 py-3 text-left text-sm leading-relaxed text-white/90">
                This is a fresh run. <strong>It has not replaced your starting point</strong> — that
                stays as it was, so your progress is still measured from one figure. If the business
                itself has changed and you want this to become the new starting point, you will be
                asked on your Overview.
              </p>
            )}
            <div className="mt-4 inline-flex items-center gap-2 text-sm bg-white/15 rounded-full px-4 py-1.5">
              <Brain className="h-4 w-4" /> Transferability score: {readinessPct}/100
            </div>
            {/* ⚠️ NEVER START THIS LINE WITH A BARE DIGIT.
                It sits directly under a pill ending "…/100", and Ray read the two as one string:
                "It says 30/100, then immediately under it 0 means — so for a second I read thirty
                out of a thousand, which would be a catastrophic score. I had to look twice at the
                one number the whole page is built around."
                Naming the scale first ("A score of 0…") costs three words and makes the collision
                impossible. */}
            <p className="mt-2 text-sm text-white/80 max-w-xl">
              A score of 0 means the business is you — nothing runs without you in it. A score of 100
              means it runs, and sells, without you. It is built from the same answers listed below,
              so every one you change moves it. This is the number to watch go up.
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
                      <p className="font-display font-bold text-lg text-pink-600">+{f.upliftText}</p>
                      <p className="text-sm text-stone-400">once captured</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ⚠️ TICK ONE AND WATCH THE FIGURE MOVE — his words, and his reason for paying.
                  "Right now I take the $270k entirely on faith." The cards above cost each piece of
                  locked-in knowledge; this lets him see what fixing a chosen one is actually worth
                  on his own numbers. RECOMPUTED, never summed — see lib/valuation/what-if.ts for why
                  adding the uplifts overstates every combination, always flatteringly. */}
              <div className="mt-4 rounded-2xl border-2 border-violet-200 bg-violet-50 p-5">
                <h3 className="font-display font-semibold text-stone-900">What if you fixed one of these?</h3>
                <p className="mt-1 max-w-prose text-sm leading-relaxed text-stone-600">
                  Tick what you would put right and the figure moves. Nothing is saved, and it does
                  not change your result above.
                </p>
                <div className="mt-3 space-y-2">
                  {capturable.map((f) => (
                    <label
                      key={f.key}
                      htmlFor={`whatif-${f.key}`}
                      className="flex min-h-[44px] items-center gap-3 text-base text-stone-800"
                    >
                      <input
                        id={`whatif-${f.key}`}
                        type="checkbox"
                        className="h-5 w-5"
                        checked={whatIfFixed.includes(f.key)}
                        onChange={(e) =>
                          setWhatIfFixed((prev) =>
                            e.target.checked ? [...prev, f.key] : prev.filter((k) => k !== f.key),
                          )
                        }
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
                {whatIfFixed.length > 0 && (
                  <p className="mt-4 border-t border-violet-200 pt-3 text-base text-stone-800">
                    Worth today would be{' '}
                    <strong className="font-display text-xl text-stone-900">{whatIfFigures.todayText}</strong>{' '}
                    — <strong>{whatIfMovement}</strong> more than today, on the same answers you gave.
                  </p>
                )}
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
            : "Kira interviews you the way a smart buyer would — capturing the operating knowledge in your head into a living Operating Manual. It's how you close the gap: a business worth more, and one you can actually hand over."}
        </p>

        {/* HIS PRICE, HERE, where he was told it would be.
            The landing page says the fee depends on his gap and "you'll see it after the valuation."
            He finished the valuation and there was no price on the results page at all — he had to
            click a third CTA to find it, which for a buyer already braced for a bait-and-switch is
            the worst possible place to withhold a number.
            Nothing was blocking it: the price function is pure and /plan calls the same one.
            It is no longer framed as a fraction of the gap: the band comes from the profit HE
            reported, not from the gap WE computed, and quoting the share here would re-imply the
            link that change exists to break. */}
        {/* Not to someone who is already paying. Quoting a customer the monthly fee again, under a
            button labelled as though he has not started, is the "does this product know who I am"
            failure — and for a 66-year-old bracing for a second charge it is worse than that. */}
        {/* THE CEILING BELONGS HERE, not only in the FAQ.
            The FAQ already said the rate steps down to a third; the tester never saw it, because
            THIS is the page where the sum gets done — a gap on one line and a monthly fee on the
            next. His words: "$200,000 against $999 + GST a month, for an unstated number of months.
            That's a good ratio if it's ten months. It's a bad one at thirty. This is where the
            missing duration estimate actually costs you the sale, because this is the page where
            I'm doing the sum."
            Enforced in lib/billing/arrears.ts `stepDownIfCapReached`, stated from the same constant
            the enforcement uses, and deliberately a CAP rather than an estimate (DECISIONS.md §2). */}
        {!noEarnings && !returningToApp && (
          <p className="text-stone-700 max-w-xl mx-auto mb-7 text-lg">
            For your business that comes to{' '}
            <span className="font-bold text-stone-900">
              {formatPrice(priceForProfit(annualProfit, result.gap).monthly, currency)} a month
            </span>
            {'.'}{' '}
            You are never invoiced for the month you are in, and after{' '}
            <span className="font-bold text-stone-900">{FULL_RATE_PERIOD_CAP} months</span> you move
            to a third of that rate whether or not we think the work is done.
          </p>
        )}
        <a
          href={planHref}
          className="grad-coral text-white font-display font-bold px-8 py-4 rounded-full text-lg inline-flex items-center gap-2 min-h-[52px] shadow-lg shadow-pink-200 hover:opacity-95"
        >
          {returningToApp ? 'Back to Kira' : 'Start building your Operating Manual'} <ArrowRight className="h-5 w-5" />
        </a>
        <div className="mt-5 flex items-center justify-center gap-5 text-sm">
          {/* THE LABEL SAYS WHAT THE BUTTON DOES (register P11).
              "'Save' in the label suggests a file, and what I got was a printer." It opens the print
              dialog — which is also how you save a PDF, on every browser he could be using, so the
              honest label is both, in that order. */}
          <button onClick={() => window.print()} className="print:hidden text-stone-500 hover:text-stone-800 inline-flex items-center gap-1.5 min-h-[44px]">
            <Printer className="h-4 w-4" /> Print, or save as a PDF
          </button>
          <button
            type="button"
            onClick={() => setEmailOpen((v) => !v)}
            className="print:hidden text-stone-500 hover:text-stone-800 inline-flex items-center gap-1.5 min-h-[44px]"
          >
            <Mail className="h-4 w-4" /> Email it to me
          </button>
          <a href="/business-valuation" className="print:hidden text-stone-500 hover:text-stone-800 min-h-[44px] inline-flex items-center">Start over</a>
        </div>

        {/* ⚠️ HE RAN IT ON THE OFFICE COMPUTER, and printing it puts it on the office printer.
            Ray: "I'd want to read it again at home at nine at night when there's nobody about, and
            the only copy of it is on the machine my bookkeeper uses."
            For a man who has told nobody he is selling, that is not an inconvenience — it is a
            reason to close the tab. The address is typed, used once, and not kept; the note under
            the field says so, because for this reader the absence of a list is the whole point. */}
        {emailOpen && (
          <form
            className="print:hidden mx-auto mt-4 max-w-md rounded-2xl border border-stone-200 bg-white p-4 text-left"
            onSubmit={async (event) => {
              event.preventDefault();
              const address = emailTo.trim();
              if (!address) return;
              setEmailState('sending');
              try {
                const r = await fetch('/api/valuation/email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: address,
                    worthToday: result.today,
                    worthPotential: result.potential,
                    industry: matchedSector || typedSector || '',
                    currency,
                  }),
                });
                setEmailState(r.ok ? 'sent' : 'error');
              } catch {
                setEmailState('error');
              }
            }}
          >
            <label htmlFor="valuation-email" className="block text-base font-medium text-stone-800">
              Where should it go?
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="valuation-email"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="you@example.com"
                className="min-h-[48px] w-full rounded-xl border border-stone-300 px-4 py-3 text-base"
              />
              <button
                type="submit"
                disabled={emailState === 'sending'}
                className="min-h-[48px] shrink-0 rounded-xl bg-stone-900 px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {emailState === 'sending' ? 'Sending…' : 'Send'}
              </button>
            </div>
            <p className="mt-2 text-sm text-stone-500">
              Used once to send this, then discarded. You are not added to anything and nobody
              follows up.
            </p>
            {emailState === 'sent' && (
              <p className="mt-2 text-sm font-medium text-emerald-700">Sent. Check your inbox.</p>
            )}
            {emailState === 'error' && (
              <p className="mt-2 text-sm font-medium text-red-700">
                That did not send. Print or save the page instead.
              </p>
            )}
          </form>
        )}
      </div>

      {/* ─── THE RECORD (register P9) ──────────────────────────────────────────────
          "If I print this and put it in a drawer, in six months I won't know what turnover figure it
          was based on or when I ran it."
          This is the page that LEAVES THE BUILDING — it carries a print button and is explicitly
          built to be handed to an accountant — and it printed three figures and an essay with no
          record of what produced them. His own summary of the fix: a small block carrying date,
          sector and the input figures "turns it from a screenshot into a document."
          Derived from the questionnaire itself (lib/valuation/answer-summary.ts), so a thirteenth
          question cannot be added without appearing here. */}
      <div className="rounded-3xl border border-stone-200 bg-white p-7 sm:p-9">
        <h2 className="font-display text-xl font-bold text-stone-900">What this was worked out from</h2>
        <p className="mt-2 text-base text-stone-500">
          Run on {runDate}
          {firstName ? ` for ${firstName}` : ''}. Your answers, as you gave them.
        </p>

        <dl className="mt-6 divide-y divide-stone-100">
          {record.map((row) => (
            <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5">
              <dt className="text-base text-stone-500">{row.label}</dt>
              <dd className="text-base font-medium text-stone-800">{row.value}</dd>
            </div>
          ))}
        </dl>

        {/* P10 — SDE, EXPANDED, ON THE PAGE THAT USES IT.
            The abbreviation appears twice under the headline numbers and again in the essay, and was
            defined on question 3, which by the time he is reading this he cannot see. Consumed from
            the single canonical definition (lib/valuation/sde-copy.ts), not restated here. */}
        <p className="mt-6 text-sm leading-relaxed text-stone-500">{SDE_EXPANSION}</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Sector multiples from {MULTIPLE_SOURCE}. Kira valuation model {MODEL_VERSION}.
        </p>
      </div>

      <div className="space-y-3 text-base text-stone-500 leading-relaxed">
        {/* THIS PARAGRAPH USED TO SET HOMEWORK.
            It read "Subtract any loans, equipment finance, lease obligations or tax owing to get to
            that" — the product telling a 66-year-old to do arithmetic it had every input for except
            one, and never asked for. It now asks (question 12) and does the subtraction, so what is
            left here is only what genuinely stays outside the model. */}
        <p>
          <strong className="text-stone-700">
            {net.applied
              ? 'The three headline figures are the value of the business, before debt.'
              : 'This is the value of the business, before debt.'}
          </strong>{' '}
          {net.applied
            ? 'What you would keep is shown separately above, after the figures you gave us.'
            : "It's what the business itself is worth — not what lands in your pocket. Tell us what the business owes and what is owed to you, and we will show you that too."}{' '}
          {/* ⚠️ THIS SENTENCE WENT STALE THE MOMENT WORK IN PROGRESS WAS APPLIED.
              It read "It doesn't account for your lease terms, working capital, or how long you've
              been trading" — and work in progress and retentions ARE working capital, now asked for
              and applied above. Exactly the P4 class: the code changed, the prose beside it did not,
              nothing errors, and the page contradicts itself for anyone reading both halves.
              What genuinely stays outside the model is what remains. */}
          It doesn&apos;t account for your lease terms, your stock and debtor position beyond what
          you told us, or how long you&apos;ve been trading, all of which a buyer will price.
        </p>
        {/* ⚠️ THIS PARAGRAPH DESCRIBED A MODEL THAT NO LONGER EXISTS.
            It read "Not a dataset — the two numbers either side of a deal will actually agree to.
            The bottom is 1.5×… The top is 5×." That was true of the UNIVERSAL band (2026-08-04 to
            08-08), which was flat for every sector and scaled only by profit. Since the band was
            sector-scaled on 08-08 it is false: 1.5× and 5× are outer GUARDS, and the real band is
            the sector median × 0.75 to × 1.35, size-adjusted. Ray's own figures give 2.2×–4.2×,
            while this paragraph told him 1.5× and 5×.
            Left behind because the 08-08 change was made in `model.ts` and nobody re-read the page
            that explains it — the same one-fact-two-places shape as E1/K11, and the reason P4 was
            filed at severity 1: we were withholding the sector figure on the one screen built to be
            checked, while describing a band that was not his. */}
        <p>
          <strong className="text-stone-700">Where your range comes from.</strong> Two things.{' '}
          <strong className="text-stone-700">The centre is your sector.</strong>{' '}
          {sector.matched
            ? `${sector.sectorMultiple.toFixed(1)}× SDE is the median for businesses like yours that have actually changed hands`
            : `${sector.sectorMultiple.toFixed(1)}× SDE is the overall market median across businesses that have actually changed hands`}{' '}
          ({MULTIPLE_SOURCE}).
          {!noEarnings && (
            <>
              {' '}That sets your band at{' '}
              <strong className="text-stone-700">
                {result.floorMultiple.toFixed(1)}× to {result.ceilingMultiple.toFixed(1)}×
              </strong>
              {/* ⚠️ THE NUMBER IS READ FROM `SCREEN_COUNT`, NEVER TYPED. This said "eleven" on a
                  thirteen-screen questionnaire. Ray: "There are thirteen. Small thing. I count
                  things." He counts things because the whole page asks him to trust arithmetic. */}
              , adjusted for the size of your earnings; where you land inside it is what the{' '}
              {SCREEN_COUNT} questions decide.
            </>
          )}{' '}
          <strong className="text-stone-700">The outer limits are 1.5× and 5×</strong>, and they hold
          whatever the sector says. Below about eighteen months of profit a seller doesn&apos;t sell;
          he keeps working it, because handing over a business he could simply continue to run
          isn&apos;t worth that. And no buyer pays more than four or five years of profit for a
          business this size, however rich the sector — he only reaches the top when three things are
          true at once: it is well run, he can take it over without you, and he believes he can add
          his own spin and lift the margins. Miss one and he is not at the top of the range.
        </p>
        <p>
          <strong className="text-stone-700">Which is why the questions are weighted the way they are.</strong>{' '}
          Half the score is whether a buyer can take it over at all — because if it stops when you stop, he
          isn&apos;t buying a business, he&apos;s buying a job, and there is no price for that above your
          equipment. Three tenths is whether the earnings survive the handover: locked-in revenue and clients
          who aren&apos;t only yours. The last fifth is the upside he thinks he can add, weighted least
          because a buyer discounts his own optimism and won&apos;t pay you today for improvements he intends
          to make himself. Your sector sets the centre of the band; your answers set where in it you
          sit.
        </p>
        <p>
          <strong className="text-stone-700">This is what the rubric supports and nothing more.</strong> A
          real sale can land above it — a sector in demand, a buyer who wants your licences, a competitor
          buying to remove you.
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

/**
 * The money field, in ONE place.
 *
 * Extracted when the closing group needed a second one (register P7). Every decision below was
 * bought with a tester finding, so a second hand-rolled input would have been a fork of four of
 * them — and the group's field is the one asking about retentions, where an unnoticed extra zero is
 * as expensive as it is on turnover.
 */
function MoneyInput({
  value,
  onChange,
  placeholder,
  currencySymbol,
  autoFocus = false,
  id,
}: {
  value: number | undefined;
  onChange: (n: number) => void;
  placeholder: string;
  currencySymbol: string;
  autoFocus?: boolean;
  id?: string;
}) {
  const has = typeof value === 'number' && !Number.isNaN(value);
  return (
    <div className="relative">
      <span className="absolute left-4 top-[26px] -translate-y-1/2 text-stone-400 text-lg">{currencySymbol}</span>
      <input
        id={id}
        // NOT type="number": it renders spinner arrows, and scrolling the page with the cursor over
        // the field silently changes the figure. A tester spotted it before it bit him — "I'll
        // change my turnover without knowing". inputMode still gives the numeric keypad on a phone,
        // so nothing is lost.
        type="text"
        inputMode="numeric"
        min={0}
        placeholder={placeholder}
        // GROUPED AS HE TYPES. It rendered the raw number, so 2400000 and 240000 are the same shape
        // on a phone at arm's length — a fat-fingered zero is a ten-fold error with nothing on
        // screen to catch it, and the first he'd know is a valuation out by a factor of ten. The
        // placeholder already promised "e.g. 2,000,000"; the field just never honoured it. Digits
        // are stripped on the way in, so the commas are display only and can never reach the number.
        value={has ? value.toLocaleString('en-AU') : ''}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '');
          onChange(digits === '' ? NaN : Math.max(0, Number(digits)));
        }}
        className="w-full text-lg rounded-2xl border-2 border-amber-200 focus:border-pink-400 focus:outline-none pl-9 pr-4 py-4 min-h-[52px] bg-amber-50/40"
        autoFocus={autoFocus}
      />
      {/* Said back in words, because commas alone still read as a shape. "$2.4 million" is the check
          a 66-year-old actually performs. */}
      {has && value > 0 && (
        <p className="mt-2 text-base font-medium text-stone-700">
          {currencySymbol}
          {amountInWords(value)}
        </p>
      )}
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
