'use client';

// components/KiraShape.tsx
//
// Kira, present on the page an owner lands on — the full shape, not a link to it.
//
// WHY THIS EXISTS. Talking to Kira is the product. Until now the dashboard only ever LINKED to her:
// a button reading "Talk to Kira →" that navigated to /chat/<agentId>. For a stretch in August it
// was the ONLY route from inside the app, because the persistent mic FAB had been unmounted — so an
// owner on My Genome or Drafts had no way to reach the thing he is paying for without going back to
// Overview first. Fourteen beta invitations went out in that state.
//
// ⚠️ RENDERING IS NOT CONNECTING, AND THAT SEPARATION IS THE WHOLE DESIGN.
//
// `autoConnect` is deliberately NOT set. She is visibly here — her face, her name, the transcript
// frame, the mic — and nothing is spent and nothing is asked of him until he taps. Three reasons,
// each of which has already cost this portfolio something:
//
//   1. A microphone permission prompt firing the instant a page loads reads, to a sixty-six-year-old
//      thinking about selling his business, as an application that started listening to him. The
//      product's own tester stopped at less than that.
//   2. A live session opened by arriving is metered vendor time spent on someone who came to read
//      his numbers.
//   3. It keeps the dashboard independent of ElevenLabs being up. A page that every owner opens
//      must not fail because a third party is having a bad minute.
//
// ⚠️ AND NO AGENT IS PROVISIONED ON PAGE LOAD. An owner without one gets an honest invitation into
// the existing setup flow rather than a widget that cannot connect. Provisioning on a page view
// creates a real vendor resource from a page view — including from crawlers and double-renders —
// into an ElevenLabs workspace SHARED BY ELEVEN PRODUCTS, which has already accumulated 212 agents
// and 702 tools, 534 of them referencing nothing. It also has a known silent failure here (an agent
// created with zero tools while the attach logged success) and a concurrent-tab race that ended, in
// a sibling product, with the owner silently getting no agent at all. None of that belongs on the
// app's landing page.

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { VoiceWidget } from '@caistech/elevenlabs-convai/react';

import { reportVoiceConnect, type VoiceSurface } from '@/lib/voice/connect-telemetry';

export function KiraShape({
  agentId,
  surface,
  firstName,
  welcomeBack,
  firstMessage,
  userId,
}: {
  /** The owner's own ElevenLabs agent. Null when he has not been set up yet. */
  agentId: string | null;
  /** Which page this instance is on — telemetry only, so a failure can be located. */
  surface: VoiceSurface;
  firstName?: string;
  /**
   * The caller's Kira user id — the SAME identifier /talk sends. The agent's
   * tools declare `user_id` as a required dynamic variable; without it the
   * ElevenLabs session is rejected at start ("Missing required dynamic
   * variables in tools"), which is exactly what /dashboard and /my-genome did
   * while /talk worked.
   */
  userId?: string;
  /** Shown only when there is something genuinely recalled to pick up from. */
  welcomeBack?: string;
  /**
   * What she SAYS first, when the page knows something worth opening on.
   *
   * ⚠️ THE TRIGGER, NEVER THE CONTENT — VOICE_MEMORY_STANDARD, and the reason bites here
   * specifically. This page renders once; the call runs twenty minutes. Anything baked in is a
   * snapshot that can be several answers stale by the time she speaks it, so the opener names WHAT
   * to look at and she pulls the detail herself (`area_agenda`).
   *
   * Without it she opens on whatever was raised last — which, measured on the operator's own
   * account, meant the same plumbing quote three days running while three areas a buyer asks about
   * held nothing. On the Genome page that is the whole defect in one sentence.
   */
  firstMessage?: string;
}) {
  const [typedConversationId, setTypedConversationId] = useState<string | null>(null);

  /**
   * The signed URL for HIS agent, resolved at connect time.
   *
   * Owner-gated: /api/kira/chat/start verifies he owns this agent before minting anything, so the
   * ownership boundary holds even though the agent id reaches the browser.
   */
  const getSignedUrl = useCallback(async (): Promise<string> => {
    const res = await fetch('/api/kira/chat/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // Reported before throwing, because this is the half of a failed connection that is OURS —
      // the route refused — and it is the half that used to leave no trace anywhere.
      void reportVoiceConnect({ surface, outcome: 'signed_url_failed', detail: data.error });
      throw new Error(data.error || 'Could not start the conversation');
    }
    const { signedUrl } = await res.json();
    return signedUrl as string;
  }, [agentId]);

  /**
   * The no-microphone path, and it has to GO somewhere.
   *
   * The widget clears its box on submit whether or not a handler exists, so an embed that omits this
   * silently eats every question typed into it — which is exactly what shipped on the chat page
   * once already: box cleared, no message, no reply, no error, no console output.
   */
  const handleTypedMessage = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value || !agentId) return;
      try {
        const res = await fetch('/api/kira/chat/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, message: value, conversationId: typedConversationId }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.conversationId) setTypedConversationId(data.conversationId as string);
      } catch {
        // The widget shows its own failure state; a throw here would surface as an unhandled
        // rejection and change nothing the owner can see.
      }
    },
    [agentId, typedConversationId],
  );

  // NO AGENT YET — an honest door into the flow that creates one, wearing the same face.
  //
  // Deliberately NOT a disabled widget. A mic that cannot connect is the "facade" failure: it looks
  // like the product working and behaves like the product broken, and the person it fools is the
  // brand-new owner who has no way to know which.
  if (!agentId) {
    return (
      <section className="mb-10 rounded-2xl border border-violet-200 bg-violet-50 p-6">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/female_avatar.jpeg"
            alt="Kira"
            className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
          />
          <div>
            <h2 className="font-display text-xl font-bold text-stone-900">
              {firstName ? `${firstName}, Kira isn’t set up yet` : 'Kira isn’t set up yet'}
            </h2>
            <p className="mt-1 max-w-prose text-base leading-relaxed text-stone-700">
              She needs one short conversation about the business before she can be useful — what you
              do, how it runs, what you are trying to sort out. About three minutes, and you can stop
              and come back.
            </p>
            <Link
              href="/start?journey=business&from=app"
              className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-base font-bold text-white"
            >
              Set up Kira →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <VoiceWidget
        // INLINE, not a floating bubble. The shape is the surface, not a launcher over it.
        placement="inline"
        mode="greeting"
        avatarUrl="/female_avatar.jpeg"
        coachName="Kira"
        transcript
        // Both on, and both go somewhere — see handleTypedMessage.
        textInput
        textFallback
        onTextFallbackSubmit={handleTypedMessage}
        getSignedUrl={getSignedUrl}
        // ⚠️ ONLY WHEN THERE IS SOMETHING TO PICK UP. "Kira remembers where you left off" shown to a
        // man with no history is the cheapest possible way to lose him: it is checkable, he checks
        // it, and it is false on the first screen he sees.
        // ⚠️ THE BANNER MUST NOT CONTRADICT WHAT SHE SAYS. Observed live on /my-genome, 2026-08-18:
        // the banner read "Welcome back — Kira remembers where you left off" while she opened, half a
        // second later and correctly, on the four areas she knows nothing about. area-focus.ts is
        // explicit that a page-supplied opener BEATS the welcome-back — being met with "last time we
        // went through the plumbing quote" is the groove the whole feature exists to break — but only
        // the SPEECH was made to obey it. The banner was not, so the screen argued with the voice.
        // One expression, so a page cannot supply an opener and a contradicting banner again.
        title={firstMessage ? undefined : welcomeBack}
        // Only sent when the page had something to open on; otherwise the agent's own greeting (or
        // its connect-time welcome-back recall) stands, which is the right default everywhere else.
        overrides={firstMessage ? { agent: { firstMessage } } : undefined}
        onConnect={() => void reportVoiceConnect({ surface, outcome: 'connected' })}
        onError={(error) => void reportVoiceConnect({ surface, outcome: 'error', detail: error })}
        userId={userId}
      />
    </section>
  );
}
