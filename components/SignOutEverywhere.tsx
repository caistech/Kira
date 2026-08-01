'use client';

// components/SignOutEverywhere.tsx
//
// End every session on every device, not just this browser.
//
// WHY IT MATTERS MORE HERE THAN IN MOST PRODUCTS. A naive tester, unprompted, in a list otherwise
// full of cosmetic notes: "There's no 'sign me out everywhere.' I use three machines and one of
// them is a shared office PC. That matters to me more than most."
//
// He is right that it matters more to him than most. What is behind this login is a document saying
// he is thinking of selling a business he has not told his staff about, and one of the machines
// holding a live session sits in an office his bookkeeper uses. Ordinary Sign Out ends the session
// in front of him — which is the one machine he is not worried about.
//
// `scope: 'global'` revokes every refresh token for the account server-side, so the other browsers
// lose access at their next refresh rather than whenever their cookie happens to expire.

import { useState } from 'react';

import { createClient } from '@/lib/supabase/browser';

export function SignOutEverywhere() {
  const [state, setState] = useState<'idle' | 'confirming' | 'working' | 'failed'>('idle');

  async function signOutEverywhere() {
    setState('working');
    try {
      const { error } = await createClient().auth.signOut({ scope: 'global' });
      if (error) {
        setState('failed');
        return;
      }
      window.location.assign('/login');
    } catch {
      setState('failed');
    }
  }

  if (state === 'failed') {
    // Never silent. He pressed this because he believes a session is open somewhere he cannot see;
    // letting him walk away thinking it is closed is the whole harm.
    return (
      <p className="text-sm text-red-700">
        That didn&apos;t work — your other devices are still signed in.{' '}
        <button type="button" onClick={signOutEverywhere} className="min-h-[44px] underline underline-offset-4">
          Try again
        </button>
      </p>
    );
  }

  if (state === 'confirming') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-700">
          Sign out on every device, including this one?
        </span>
        <button
          type="button"
          onClick={signOutEverywhere}
          className="min-h-[44px] rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Yes, sign out everywhere
        </button>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="min-h-[44px] px-2 text-sm font-medium text-gray-500 underline underline-offset-4"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={state === 'working'}
      onClick={() => setState('confirming')}
      className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 disabled:opacity-60"
    >
      {state === 'working' ? 'Signing out…' : 'Sign out on all devices'}
    </button>
  );
}
