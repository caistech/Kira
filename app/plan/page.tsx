// @public-route

// app/plan/page.tsx
//
// Server shell for the identity boundary. The actual flow (beta redemption, identity
// establishment, mismatch handling, redirects) is entirely client-side state — see
// PlanPageClient.tsx, moved here unchanged except for its export name.
//
// WHY THIS FILE EXISTS SEPARATELY FROM THE LOGIC. The whole page used to be one
// 'use client' file, so nothing here ever server-rendered: a visitor's first paint was
// whatever the client's initial state happened to render, which was "Loading your
// onboarding session…" — 48 characters of visible content, found by
// portfolio-gate-audit-first-paint (a genuine defect, not a false positive: every
// partner following an invitation link saw this before anything real appeared). This
// file server-renders a real heading immediately; PlanPageClient still owns the entire
// interactive flow, untouched.
//
// ⚠️ MUST BE A HEADING TAG, NOT A <p>. The first version of this fix used a <p> and still
// FAILED the same audit in CI: portfolio-gate-audit-first-paint passes on EITHER >=200 chars
// of non-chrome content OR a heading (h1/h2/h3, >=8 chars) — deliberately, so a legitimately
// sparse page (this one) isn't pressured into padding itself with prose to satisfy a char
// count. A <p> gets neither signal. h2 (not h1) so this slim strip never duplicates the h1
// PlanPageClient renders once hydrated.
export default function PlanPage() {
  // A slim strip, not a hero block — PlanPageClient's own states are all full-height
  // (min-h-screen) sections with their own headings once hydrated, so anything larger here
  // would read as a duplicate banner sitting above whatever the client is actually showing.
  // This exists purely so the FIRST thing a visitor sees is real text, not a blank screen.
  return (
    <>
      <h2 className="border-b border-stone-100 bg-stone-50 px-6 py-2 text-center text-sm font-normal text-stone-500">
        Setting up your Kira account — confirming your invitation…
      </h2>
      <PlanPageClient />
    </>
  );
}

import { PlanPageClient } from './PlanPageClient';
