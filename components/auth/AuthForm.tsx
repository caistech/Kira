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

import { useMemo } from 'react';
import { AuthForm as CanonicalAuthForm, type AuthMode } from '@caistech/corporate-components/auth';
import { createClient } from '@/lib/supabase/browser';

type LocalMode = 'login' | 'signup' | 'forgot' | 'reset' | 'magic-link';

interface AuthFormProps {
  mode: LocalMode;
  redirectTo?: string;
  title?: string; // accepted for compat; canonical renders its own header
  subtitle?: string;
  variant?: 'user' | 'admin';
}

const KIRA_ACCENT = '#fb7185'; // rose-400 — Kira's brand accent

const MODE_MAP: Record<LocalMode, AuthMode> = {
  login: 'login',
  signup: 'signup',
  forgot: 'forgot-password',
  reset: 'reset-password',
  'magic-link': 'magic-link',
};

export function AuthForm({ mode, redirectTo, variant = 'user' }: AuthFormProps) {
  // SSR-safe: build the browser client once on the client. The canonical accepts a possibly-null
  // client and handles it internally.
  const supabaseClient = useMemo(() => (typeof window === 'undefined' ? null : createClient()), []);

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
    />
  );
}
