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
    // The persistent portal chrome (nav + bg) comes from app/discovery/layout.tsx → UserShell.
    // overflow-x-hidden guards against the voice panel pushing a few px of sideways scroll on mobile.
    <div className="overflow-x-hidden">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <p className="text-sm font-medium text-violet-700">Discovery</p>
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
              <Link href="/dashboard" className="mt-4 inline-block text-sm text-violet-700 hover:underline">
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

        {/* A WAY THROUGH WHEN THE MICROPHONE ISN'T THERE — always shown, not on failure.
            The widget's own failure state is "Connection problem" with a Mute and an End button,
            both of which assume a call is happening. No "check your microphone", no "your browser is
            blocking it", and no way to continue by typing — even though /talk has a working typing
            box. Ray, 6 August 2026: *"A lot of men my age are on a desktop tower with no microphone
            at all and don't know it. They will land exactly here."*

            OFFERED UP FRONT RATHER THAN AFTER A FAILURE, deliberately. A man with no microphone
            should not have to fail first to discover there was another door, and the failure itself
            is silent enough that he may just conclude the product is broken. The same reasoning the
            convai widget's text fallback got when its timeout was added: waiting for an error is
            waiting for something that may never arrive.

            NOT FIXED IN THE PANEL, and that is deliberate too: "Connection problem" is rendered
            inside @caistech/discovery-agent's DiscoveryWidget. Reaching into a shared component from
            a consumer is the fork this portfolio's @caistech-first rule exists to prevent, so the
            panel's own copy is a package change and is recorded as one. This is the honest thing
            Kira can do from outside it. */}
        <p className="mt-4 text-base text-stone-600">
          No microphone, or she can&apos;t hear you?{' '}
          <Link href="/talk" className="font-semibold text-violet-700 underline underline-offset-4">
            Type to her instead
          </Link>
          {' '}— it is the same conversation, and she remembers it the same way.
        </p>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Stage {stageIdx + 1} of {DISCOVERY_STAGES.length}
          </span>
          <Link href="/dashboard" className="text-violet-700 hover:underline">
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-violet-500 focus:outline-none"
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-violet-500 focus:outline-none"
            />
          </div>
          {message && (
            <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-violet-700'}`}>{message}</p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={status === 'working'}
            className="w-full rounded-xl bg-violet-700 px-4 py-3 text-base font-medium text-white hover:bg-violet-800 disabled:opacity-60"
          >
            {status === 'working' ? 'Reading…' : 'Let Kira read this'}
          </button>
        </div>
      )}
    </div>
  );
}
