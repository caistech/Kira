'use client';

/**
 * KiraBootstrap — the honest on-demand provisioning screen.
 *
 * When a normal user arrives on /talk with an organisation context but no Kira, this component
 * POSTs to /api/kira/ensure (idempotent, org-scoped) and redirects on success.
 *
 * On failure it shows the same honest card as the mid-setup state, with a Retry action — no
 * fabricated progress, no fake spinners masking an unknown vendor wait.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_RETRIES = 2;

interface Props {
  firstName: string | null;
  focusArea: string | null;
}

export default function KiraBootstrap({ firstName, focusArea }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const provisionRef = useRef<() => void>(() => {});

  const provision = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/kira/ensure', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Provisioning failed');
      }

      if (data?.agentId) {
        // The agent now exists. A hard reload makes /talk render the ChatPage path cleanly —
        // /talk stays the canonical URL so the user never sees /chat/UUID.
        router.refresh();
      } else {
        throw new Error('No agent ID returned');
      }
    } catch (err: any) {
      if (!mounted.current) return;
      const msg = err?.message || 'Something went wrong setting up Kira.';
      if (retries < MAX_RETRIES) {
        setRetries((r) => r + 1);
        setError(`${msg} — retrying…`);
        setTimeout(() => provisionRef.current(), 2000);
      } else {
        setError(msg);
        setBusy(false);
      }
    }
  }, [retries, router]);

  useEffect(() => {
    provisionRef.current = provision;
  }, [provision]);

  // Fire on mount (or after retry changes).
  useEffect(() => {
    if (busy) {
      void provision();
    }
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------

  const greeting = firstName ? `Hey ${firstName}…` : 'Hey…';
  const intro = focusArea
    ? `I'm getting her ready for ${focusArea.toLowerCase()}. This only happens the first time.`
    : "I'm getting her ready. This only happens the first time.";

  // — Busy / provisioning state (honest: says what is actually happening).
  if (busy && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            </div>
          </div>
          <p className="text-xl text-slate-800 font-medium">{greeting}</p>
          <p className="text-slate-500 leading-relaxed">{intro}</p>
        </div>
      </div>
    );
  }

  // — Error state (honest: shows the real message, offers retry + setup fallback).
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="space-y-2">
          <p className="text-xl text-slate-800 font-medium">Kira wasn't quite ready</p>
          <p className="text-slate-500 leading-relaxed">
            {error || "Something went wrong setting her up."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => { setRetries(0); setBusy(true); }}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Try again
          </button>
          <a
            href={`/setup${focusArea ? `?area=${encodeURIComponent(focusArea)}` : ''}`}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Set Kira up properly
          </a>
        </div>
      </div>
    </div>
  );
}
