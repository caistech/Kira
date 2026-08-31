'use client';

import { useEffect, useState } from 'react';
import { readStoredValuation } from '@/lib/valuation/share';

// components/OnboardingGate.tsx
//
// The outstanding step, drawn INSIDE the dashboard shell.
//
// It replaces a redirect to `/start` — a page with its own dark palette — which is what produced the
// operator's two complaints in one screenshot: he arrived somewhere he had not asked to go, and it
// looked like a different product. Both are the same defect. Rendering the step here means one
// destination, one chrome, and the difference between a new owner and an established one is the
// CONTENT of the page rather than which page it is.
//
// ⚠️ NOT A WALL. Each step names what it is for, what it costs him, and — where the work happens on
// another page — sends him there deliberately rather than bouncing him. The nav, the sign-out and
// his own email stay visible throughout, because a man who has just paid should never be somewhere
// he cannot get out of.

import Link from 'next/link';

import type { OnboardingStep } from '@/lib/onboarding/gate';

interface StepCopy {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  /** Said under the button, for the thing he is entitled to know before he clicks. */
  note?: string;
}

/**
 * ⚠️ EVERY STEP STATES WHY IT IS BEING ASKED FOR. A new owner has just paid, or just redeemed an
 * invitation, and is being asked to do more work before he sees anything — which is the moment a
 * product feels like a form. The reason is what makes it a step rather than an obstacle.
 */
const COPY: Record<Exclude<OnboardingStep, null>, StepCopy> = {
  baseline: {
    eyebrow: 'First thing',
    title: 'Start with where the business stands today',
    body:
      "Thirteen short questions — what it turns over, what it earns, how much of it runs through you — and you'll see what it's worth now, what it could be worth running without you, and the difference between the two. About three minutes.",
    cta: 'Answer the questions',
    href: '/business-valuation?from=app',
    // The reason it comes first, said plainly. Taken later it stops being a baseline.
    note: 'That figure becomes the starting point everything from here is measured against, and it stays fixed once set — so it is worth doing before anything else.',
  },
  identity: {
    eyebrow: 'Next',
    title: 'Who is Kira writing as?',
    body:
      'Your business name and address. She can already talk with you and draft whatever you need — this is only so that anything she sends goes out signed as you, rather than as us.',
    cta: 'Add your business details',
    href: '/setup/business',
    note: 'Takes a minute. Nothing you have done so far depends on it.',
  },
  agent: {
    eyebrow: 'Last step',
    title: 'Now meet Kira',
    body:
      'A short conversation so she learns how the work actually gets done — the things only you know. She writes it up for you to check, and nothing is kept until you approve it.',
    cta: 'Start talking to Kira',
    href: '/start?journey=business&from=app',
    // Typing is a choice, not a fallback for a broken microphone — same correction as the button
    // this step leads to (app/start/page.tsx).
    note: 'You can talk to her or type it — both work, and you can switch.',
  },
};

export function OnboardingGate({
  step,
  progress,
  firstName,
}: {
  step: Exclude<OnboardingStep, null>;
  progress: { done: number; total: number };
  firstName?: string;
}) {
  // ⚠️ DO NOT ASK HIM TO DO THE VALUATION HE HAS JUST DONE.
  //
  // hasBaseline reads business_valuations, and a valuation taken before signup sits on the DEVICE
  // until he confirms it is his (ClaimStoredValuation, mounted on UserShell). So a man who was
  // REQUIRED to answer thirteen questions to reach the plan page arrived at his own Overview and was
  // told to start with where the business stands today.
  //
  // Ray, 2026-08-16 — the only thing in three walkthroughs that made him swear: "I did those
  // thirteen questions. They were compulsory. You would not let me past the plan page without doing
  // them — that is how I got the gap figure this whole product is built around. Now the app
  // home screen tells me I have not started… For a man who has just handed you his numbers, being
  // asked for them again is the single clearest signal that the thing is not really joined up."
  //
  // The claim prompt is already on screen, so the honest step is CONFIRM, not repeat. Client-side
  // because sessionStorage is the only place that answer lives at this moment.
  const [deviceValuation, setDeviceValuation] = useState(false);
  useEffect(() => {
    try { setDeviceValuation(Boolean(readStoredValuation())); } catch { setDeviceValuation(false); }
  }, []);

  // The baseline step becomes a CONFIRM when the answers are already sitting on the device. Every
  // other step is unaffected.
  const copy: StepCopy =
    step === 'baseline' && deviceValuation
      ? {
          eyebrow: 'First thing',
          title: 'Confirm the valuation you just did',
          body:
            'You answered the thirteen questions before signing up, and the figures are still on this device. Say they are yours and they become your baseline — there is nothing to answer again.',
          cta: 'It is just above — say it is yours',
          href: '#claim-valuation',
          note: 'That figure becomes the starting point everything from here is measured against, and it stays fixed once set.',
        }
      : COPY[step];

  return (
    <section className="mb-10">
      <div className="rounded-3xl border-2 border-violet-200 bg-violet-50 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">{copy.eyebrow}</p>
          {/* Derived from the same state as the step itself, so the two cannot disagree. */}
          <p className="text-sm text-stone-500">
            {progress.done} of {progress.total} done
          </p>
        </div>

        <h2 className="mt-2 font-display text-2xl font-bold text-stone-900 sm:text-3xl">
          {firstName && step === 'baseline' ? `${firstName} - ${copy.title.toLowerCase()}` : copy.title}
        </h2>

        <p className="mt-3 max-w-prose text-base leading-relaxed text-stone-700">{copy.body}</p>

        <Link
          href={copy.href}
          className="mt-6 inline-flex min-h-[52px] items-center rounded-full bg-stone-900 px-7 py-3.5 text-base font-bold text-white hover:bg-stone-800"
        >
          {copy.cta}
        </Link>

        {copy.note && <p className="mt-3 max-w-prose text-sm leading-relaxed text-stone-600">{copy.note}</p>}
      </div>

      {/* THE THREE STEPS, SHOWN AS A LIST rather than as a bar.
          He can see what is coming and that it is short — which is the difference between "one more
          thing" and "how many more of these are there". The completed ones are named, not ticked
          into anonymity, because on arrival he has usually done one already (the valuation he ran
          before he ever signed up) and seeing it credited is the point. */}
      <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-1 px-1 text-sm text-stone-500">
        {(['baseline', 'identity', 'agent'] as const).map((key) => (
          <li key={key} className={key === step ? 'font-semibold text-stone-900' : ''}>
            {key === 'baseline' ? 'Your starting figure' : key === 'identity' ? 'Business details' : 'Meet Kira'}
          </li>
        ))}
      </ol>
    </section>
  );
}
