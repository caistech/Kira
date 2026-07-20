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

        <PreBriefPanel />
      </div>
    </div>
  );
}

// Optional accelerant: seed the Client Profile from a link (a website/bio) or pasted notes, so Kira
// walks into the conversation already knowing some of it. Not required — the conversation is still
// the source — which is why it lives below the call as a "head start", collapsed by default.
function PreBriefPanel() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit() {
    if (!url.trim() && !text.trim()) {
      setStatus('error');
      setMessage('Add a link or paste some notes first.');
      return;
    }
    setStatus('working');
    setMessage('');
    try {
      const res = await fetch('/api/kira/discovery/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(url.trim() ? { url: url.trim() } : { text: text.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not use that source');
      setStatus('done');
      setMessage(`Got it — Kira now knows a bit more (${Math.round((body.completeness ?? 0) * 100)}% briefed).`);
      setUrl('');
      setText('');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-base font-semibold text-gray-900">Give Kira a head start (optional)</span>
          <span className="mt-1 block text-sm text-gray-600">
            Paste a link to your website/bio or some notes, and Kira will read them before you talk.
          </span>
        </span>
        <span className="ml-3 text-gray-400">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="prebrief-url" className="mb-1 block text-sm font-medium text-gray-700">
              A link (website, LinkedIn/about page, article)
            </label>
            <input
              id="prebrief-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/about"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div className="text-center text-xs text-gray-400">or</div>
          <div>
            <label htmlFor="prebrief-text" className="mb-1 block text-sm font-medium text-gray-700">
              Paste notes about you or your business
            </label>
            <textarea
              id="prebrief-text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Anything that helps Kira understand you and your work…"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-teal-500 focus:outline-none"
            />
          </div>
          {message && (
            <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-teal-700'}`}>{message}</p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={status === 'working'}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 text-base font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {status === 'working' ? 'Reading…' : 'Let Kira read this'}
          </button>
        </div>
      )}
    </div>
  );
}
