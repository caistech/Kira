'use client';

// components/auth/AuthForm.tsx
// Shared auth surface for both portals (PRODUCT_STANDARDS §2 / §8.5). Modes: login, signup,
// forgot, reset. Login offers password + magic-link + forgot-password. Used by the user portal
// (/login, /signup) and the admin portal (/admin/login) — the only difference is `redirectTo`
// and the copy.

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { PasswordInput } from './PasswordInput';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

interface AuthFormProps {
  mode: Mode;
  /** Where to send the user after a successful password login (server routes via callback). */
  redirectTo?: string;
  /** Heading + subheading copy. */
  title: string;
  subtitle?: string;
  /** Admin portal tweaks the sign-up link visibility. */
  variant?: 'user' | 'admin';
}

export function AuthForm({ mode, redirectTo = '/dashboard', title, subtitle, variant = 'user' }: AuthFormProps) {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // When set, render the "confirm your email" panel instead of the form (signup that requires
  // confirmation, or a login blocked because the email isn't confirmed yet).
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const callbackUrl = (next: string) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // An unconfirmed email is not a credential failure — route to the confirm panel + resend.
          if (/not confirmed/i.test(error.message) || (error as { code?: string }).code === 'email_not_confirmed') {
            setPendingEmail(email);
            return;
          }
          throw error;
        }
        window.location.assign(redirectTo);
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName },
            emailRedirectTo: callbackUrl(redirectTo),
          },
        });
        if (error) throw error;
        // Auto-confirm returns a session immediately → log them straight in. Only when email
        // confirmation is required (no session) do we ask them to check their inbox.
        if (data.session) {
          window.location.assign(redirectTo);
        } else {
          // No session → email confirmation is required. Show the dedicated confirm panel.
          setPendingEmail(email);
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: callbackUrl(variant === 'admin' ? '/admin/password-reset' : '/auth/reset-password'),
        });
        if (error) throw error;
        setNotice('If that email has an account, a reset link is on its way.');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setNotice('Password updated. Redirecting…');
        setTimeout(() => window.location.assign(variant === 'admin' ? '/admin' : redirectTo), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function onMagicLink() {
    if (!email) {
      setError('Enter your email first.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl(redirectTo) },
      });
      if (error) throw error;
      setNotice('Magic link sent — check your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send magic link.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    const target = pendingEmail || email;
    if (!target) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: target,
        options: { emailRedirectTo: callbackUrl(redirectTo) },
      });
      if (error) throw error;
      setNotice('Confirmation email resent — check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the email.');
    } finally {
      setBusy(false);
    }
  }

  // Email-confirmation-pending panel — shown after a signup that needs confirmation, or when a
  // login is blocked by an unconfirmed email. Replaces the form so the next action is obvious.
  if (pendingEmail) {
    return (
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Confirm your email</h1>
        <p className="mt-2 text-base text-gray-600">
          We&apos;ve sent a confirmation link to <strong>{pendingEmail}</strong>. Click it to activate
          your account, then come back and sign in.
        </p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {notice && <p className="mt-4 text-sm text-teal-700">{notice}</p>}
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {busy ? 'Working…' : 'Resend confirmation email'}
        </button>
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href={variant === 'admin' ? '/admin/login' : '/login'} className="text-teal-700 hover:underline">
            Back to sign in
          </Link>
          <button
            type="button"
            onClick={() => { setPendingEmail(null); setError(null); setNotice(null); }}
            className="text-gray-500 hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  const cta =
    mode === 'login' ? 'Sign in'
    : mode === 'signup' ? 'Create account'
    : mode === 'forgot' ? 'Send reset link'
    : 'Update password';

  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="mt-2 text-base text-gray-600">{subtitle}</p>}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === 'signup' && (
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            autoComplete="given-name"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        )}

        {mode !== 'reset' && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        )}

        {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={mode === 'reset' ? 'New password' : 'Password'}
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-teal-700">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {busy ? 'Working…' : cta}
        </button>
      </form>

      {mode === 'login' && (
        <div className="mt-4 space-y-3 text-sm">
          <button
            type="button"
            onClick={onMagicLink}
            disabled={busy}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Email me a magic link instead
          </button>
          <div className="flex items-center justify-between">
            <Link href={variant === 'admin' ? '/admin/forgot-password' : '/auth/forgot-password'} className="text-teal-700 hover:underline">
              Forgot password?
            </Link>
            {variant === 'user' && (
              <Link href="/signup" className="text-teal-700 hover:underline">
                Create an account
              </Link>
            )}
          </div>
        </div>
      )}

      {mode === 'signup' && (
        <p className="mt-4 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-teal-700 hover:underline">
            Sign in
          </Link>
        </p>
      )}

      {(mode === 'forgot' || mode === 'reset') && (
        <p className="mt-4 text-sm text-gray-600">
          <Link href={variant === 'admin' ? '/admin/login' : '/login'} className="text-teal-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      )}
    </div>
  );
}
