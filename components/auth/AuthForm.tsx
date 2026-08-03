'use client';

// components/auth/AuthForm.tsx
// Thin ADAPTER over the canonical @caistech/corporate-components AuthForm (R1 auth surface).
//
// This used to be a 280-line hand-rolled re-implementation of the same thing (the "auth refactor
// debt"). It now delegates to the canonical component and only maps Kira's local API
// (mode/variant/redirectTo) onto the canonical props:
//   - variant 'user'  → light theme, rose accent, user paths (/login, /signup, /auth/*)
//   - variant 'admin' → dark theme, admin paths (/admin/*), no self-service signup
//   - mode 'forgot'/'reset' → the canonical 'forgot-password'/'reset-password'
// Kira's Supabase browser client is injected so the package never bundles a Supabase SDK.
//
// The canonical bakes in the whole R1 surface (forgot→reset flow, password visibility toggle,
// working magic-link, whitelisted error copy, 44px targets, explanatory header), so those are no
// longer Kira's to maintain. title/subtitle are accepted for call-site compatibility but the
// canonical renders its own mode header.

import { useEffect, useMemo, useState } from 'react';
import {
  AuthForm as CanonicalAuthForm,
  type AuthExtraField,
  type AuthMode,
} from '@caistech/corporate-components/auth';
import { createClient } from '@/lib/supabase/browser';
import { TERMS_VERSION } from '@/lib/terms';

type LocalMode = 'login' | 'signup' | 'forgot' | 'reset' | 'magic-link';

interface AuthFormProps {
  mode: LocalMode;
  redirectTo?: string;
  title?: string; // accepted for compat; canonical renders its own header
  subtitle?: string;
  variant?: 'user' | 'admin';
  /**
   * Ask "How did you hear about Kira?" on signup.
   *
   * Only pass this when we DON'T already know — someone who arrived through an introducer's link
   * has a signed attribution cookie, and asking them anyway is noise that invites a contradictory
   * answer. The signup page decides (it can read the HttpOnly cookie; this component can't).
   *
   * The answer lands in user_metadata.referral_source and the auth trigger copies it to
   * users.referral_source_text. It is a HINT for a human to follow up, never an attribution —
   * commission is decided by the signed cookie alone.
   */
  askReferralSource?: boolean;
}

const KIRA_ACCENT = '#fb7185'; // rose-400 — Kira's brand accent

/**
 * Signup-only fields.
 *
 * The terms checkbox is REQUIRED and unticked — a pre-ticked box is not agreement, and this is the
 * record that someone consented to us emailing them. It carries the version so the acceptance
 * stored against the account is answerable: not "they agreed once" but "they agreed to this."
 *
 * Values land in user_metadata; the auth trigger copies them onto the users row.
 */
function signupFields(askReferralSource: boolean): AuthExtraField[] {
  const fields: AuthExtraField[] = [
    {
      name: 'terms_accepted',
      type: 'checkbox',
      required: true,
      label: (
        <>
          {/* BOTH documents, because he is agreeing to both. The tickbox linked Terms only while
              the thing he is actually consenting to — what happens to the inside of his business —
              lives in the Privacy Policy. A consent record that points at half of what was agreed
              is the same defect as a policy page with REPLACE still in it: the box was ticked, and
              what it referred to cannot be produced. */}
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">
            Privacy Policy
          </a>
          , including emails about Kira. I can unsubscribe any time.
        </>
      ),
    },
    {
      // Constant, never rendered: records WHICH wording they agreed to. "They agreed" without
      // "to what" is a record that can't answer the only question anyone would ever ask of it.
      name: 'terms_version',
      value: TERMS_VERSION,
    },
  ];

  // Asked only when there's no signed attribution cookie — see app/signup/page.tsx.
  if (askReferralSource) {
    fields.push({
      name: 'referral_source',
      label: 'How did you hear about Kira? (optional)',
      type: 'text',
      placeholder: 'A broker, an accountant, a friend…',
      autoComplete: 'off',
    });
  }

  return fields;
}

const MODE_MAP: Record<LocalMode, AuthMode> = {
  login: 'login',
  signup: 'signup',
  forgot: 'forgot-password',
  reset: 'reset-password',
  'magic-link': 'magic-link',
};

export function AuthForm({
  mode,
  redirectTo,
  variant = 'user',
  askReferralSource = false,
  title,
  subtitle,
}: AuthFormProps) {
  // SSR-safe: build the browser client once on the client.
  const supabaseClient = useMemo(() => (typeof window === 'undefined' ? null : createClient()), []);

  // ⚠️ DO NOT RENDER THE CANONICAL UNTIL THERE IS A CLIENT.
  //
  // "The canonical accepts a possibly-null client and handles it internally" was true and not good
  // enough: what it does with a null client is render a DEVELOPER ERROR — "AuthForm is missing a
  // Supabase client. Pass createBrowserClient from @supabase/ssr…" — and because the client can only
  // be built in the browser, that error is what the SERVER renders. It sits in the HTML of /login and
  // is replaced when hydration lands.
  //
  // On a fast machine that is a blink. A tester on an ordinary connection watched it: "A man who is
  // nervous about whether this thing is real sees a red error message full of code on the sign-in
  // page and closes the tab. He does not report it." That is the first screen a broker-referred
  // owner ever sees.
  //
  // So the pre-hydration paint is a quiet placeholder of roughly the right shape instead. The real
  // fix belongs in the package — a shared auth component should never render developer text to an
  // end user — but that is a publish plus twenty-four consumer bumps, and this is the screen.
  //
  // THE PLACEHOLDER MUST CARRY WORDS, not just shapes. It first shipped as three grey bars, which
  // fixed the developer-error paint and left a different defect behind: the server response for
  // /login and /signup contained SIXTEEN characters of visible text — the SayFix widget's "Report a
  // problem" — and nothing else. Every status check passed over it, because the page answers 200
  // with the right commit and no redirect. `portfolio-gate-audit-first-paint` is the check that
  // catches it, and this is the fix it caught.
  //
  // `title`/`subtitle` are why they are accepted here at all. The canonical renders its own mode
  // header AFTER hydration, so this copy could not be added to AuthShell without stacking two
  // headings on the hydrated page — the same defect, moved. Rendering it in THIS branch is safe
  // precisely because the canonical replaces the branch rather than joining it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !supabaseClient) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading the sign-in form">
        {title ? <h1 className="text-2xl font-semibold text-stone-900">{title}</h1> : null}
        {subtitle ? <p className="text-base text-stone-600">{subtitle}</p> : null}
        <div className="h-11 rounded-lg bg-stone-100" />
        <div className="h-11 rounded-lg bg-stone-100" />
        <div className="h-11 rounded-full bg-stone-200" />
      </div>
    );
  }

  const admin = variant === 'admin';

  return (
    <CanonicalAuthForm
      mode={MODE_MAP[mode]}
      supabaseClient={supabaseClient}
      brandName={admin ? 'Kira Admin' : 'Kira'}
      theme={admin ? 'dark' : 'light'}
      accent={KIRA_ACCENT}
      redirectTo={redirectTo ?? (admin ? '/admin' : '/talk')}
      loginPath={admin ? '/admin/login' : '/login'}
      signupPath="/signup"
      forgotPasswordPath={admin ? '/admin/forgot-password' : '/auth/forgot-password'}
      resetPasswordPath={admin ? '/admin/password-reset' : '/auth/reset-password'}
      callbackPath="/auth/callback"
      hideSignupLink={admin}
      extraFields={mode === 'signup' ? signupFields(askReferralSource) : undefined}
    />
  );
}
