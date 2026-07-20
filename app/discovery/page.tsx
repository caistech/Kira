'use client';

// app/discovery/page.tsx
// The deep-discovery phase surface. Kira (in coach/consultant mode) draws the whole operation out
// of the owner's head; the DiscoveryWidget runs the staged voice session and, post-call, the server
// distils it into the Client Profile. It deepens over multiple sessions.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DiscoveryWidget } from '@caistech/discovery-agent/react';
import { discoveryClientConfig, DISCOVERY_STAGES } from '@/lib/kira/discovery-config';

interface DiscoverySession {
  token: string;
  agentId: string;
  promptOverride?: string;
}

export default function DiscoveryPage() {
  const [session, setSession] = useState<DiscoverySession | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/kira/discovery/start', { method: 'POST' })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Could not start discovery');
        return body as DiscoverySession;
      })
      .then(setSession)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <p className="text-sm font-medium text-teal-700">Discovery</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Let&apos;s get to know you</h1>
          <p className="mt-2 text-base text-gray-600">
            Before Kira can be genuinely useful, she needs to understand you and how you work — your
            business, your goals, your people, your style. This is a relaxed conversation, not a form.
            You can come back and go deeper anytime; each session makes Kira know you better.
          </p>
        </header>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          {error ? (
            <div className="text-center">
              <p className="text-sm text-red-600">{error}</p>
              <Link href="/dashboard" className="mt-4 inline-block text-sm text-teal-700 hover:underline">
                Back to dashboard
              </Link>
            </div>
          ) : !session ? (
            <p className="text-center text-gray-500">Preparing your session…</p>
          ) : (
            <DiscoveryWidget
              config={discoveryClientConfig}
              session={session}
              activeStageId={DISCOVERY_STAGES[stageIdx].id}
              placement="inline"
              onStageComplete={() => setStageIdx((i) => Math.min(i + 1, DISCOVERY_STAGES.length - 1))}
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Stage {stageIdx + 1} of {DISCOVERY_STAGES.length}
          </span>
          <Link href="/dashboard" className="text-teal-700 hover:underline">
            Done for now →
          </Link>
        </div>
      </div>
    </div>
  );
}
