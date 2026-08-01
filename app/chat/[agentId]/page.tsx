// @explanatory-header-exempt — nested workflow page; entry-point header lives on the parent surface
// app/chat/[agentId]/page.tsx
// Chat page with ElevenLabs voice widget
// Includes: persistent bottom control bar, refer a friend, knowledge base upload

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { VoiceWidget } from '@caistech/elevenlabs-convai/react';
import { buildWelcomeBackFirstMessage } from '@/lib/kira/welcome-back';

// Icons as inline SVGs to avoid lucide-react dependency issues.
// (The voice controls — mic/pause/play/stop — now live inside the canonical VoiceWidget.)
const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const MoreIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const PenIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const GiftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArchiveIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

interface ConversationContext {
  has_history: boolean;
  last_topic?: string;
  suggested_greeting?: string;
  time_gap_category?: string;
  message_count?: number;
}

interface AgentInfo {
  id: string;
  user_id: string;
  agent_name: string;
  journey_type: string;
  status: string;
  elevenlabs_agent_id: string;
  first_name?: string | null;
}

export default function ChatPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Modal states
  const [showReferModal, setShowReferModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  // Overflow menu — the daily surface is the mic; the extras tuck behind "More".
  const [showMenu, setShowMenu] = useState(false);

  // The typed conversation. Kept here rather than inside the widget because it survives the widget
  // unmounting, and because the transcript is the thing he came back to read.
  const [typed, setTyped] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [typedConversationId, setTypedConversationId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);

  /**
   * What she last worked on with him — only if it is sayable.
   *
   * `last_topic` is NOT a topic. It is whatever the summariser wrote, in the third person, at
   * whatever length it felt like, and dropping it into a greeting produced this on the first screen
   * after signing in:
   *
   *   "Last time you talked about The user reiterated the need for a streamlined onboarding
   *    wizard... The goal is to map all user ac."
   *
   * Spliced, about "the user", and cut mid-word. So the value is now VALIDATED rather than trusted:
   * short enough to be a topic, not a sentence about somebody in the third person, and not
   * truncated. Anything failing that is dropped and he gets the plain greeting, which is a good
   * greeting — the fallback is not a degraded experience, it is simply a different true one.
   */
  const lastTopic = (() => {
    if (!context?.has_history) return null;
    const raw = (context.last_topic ?? '').trim();
    if (!raw) return null;
    // A topic is a few words. A paragraph is a summary someone forgot to summarise.
    if (raw.length > 60) return null;
    // Third-person report about him, not a subject he would recognise as his own.
    if (/^(the user|the business|the owner|dennis|he |she )/i.test(raw)) return null;
    // Cut mid-word by an upstream truncation. Tested on the LAST WORD, not the last characters:
    // "soil testing" ends in two lowercase letters and is a perfectly good topic, while
    // "map all user ac" is not. Checking the characters alone rejects almost everything, which
    // turns a guard into an off switch.
    if (/[.]{3}$/.test(raw) || raw.endsWith('…')) return null;
    const lastWord = raw.split(/\s+/).pop() ?? '';
    if (lastWord.length <= 2 && /^[a-z]+$/.test(lastWord)) return null;
    return raw;
  })();

  /* ---------------- Load agent + context ---------------- */

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const agentRes = await fetch(`/api/kira/agent?agentId=${agentId}`);
        if (!agentRes.ok) throw new Error('Agent not found');
        const agent: AgentInfo = await agentRes.json();
        setAgentInfo(agent);

        const ctxRes = await fetch(
          `/api/kira/conversation/context?agentId=${agentId}&userId=${agent.user_id}&limit=30`
        );
        if (ctxRes.ok) {
          const ctx: ConversationContext = await ctxRes.json();
          setContext(ctx);
        }
      } catch {
        setError('Failed to load agent');
      } finally {
        setLoading(false);
      }
    }

    if (agentId) loadData();
  }, [agentId]);

  /* ---------------- Owner-gated voice via the canonical Morgan VoiceWidget ---------------- */
  // These are PER-USER PRIVATE coach agents. /api/kira/chat/start verifies the caller owns this
  // agent, then returns a signed ElevenLabs URL. The canonical VoiceWidget
  // (@caistech/elevenlabs-convai >=0.5.0) resolves it fresh at connect time (WebSocket), so the
  // ownership boundary is preserved while the coach runs on the shared portfolio voice surface —
  // no bespoke useConversation fork (which is what broke under @elevenlabs/react 1.10).
  const getSignedUrl = useCallback(async (): Promise<string> => {
    const res = await fetch('/api/kira/chat/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agentInfo?.elevenlabs_agent_id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to start voice session');
    }
    const { signedUrl } = await res.json();
    return signedUrl as string;
  }, [agentInfo]);

  // The spoken opener, rendered from the context we already loaded. null → no history yet, so the
  // agent's own first-time greeting stands.
  const welcomeBack = buildWelcomeBackFirstMessage(
    agentInfo?.first_name || agentInfo?.agent_name?.split('_')[1] || '',
    context,
  );

  /**
   * What happens when he types instead of speaking.
   *
   * This is the prop whose absence made the text box swallow input: the widget calls
   * onTextFallbackSubmit when there is no live session, and with nothing wired it cleared the field
   * and did nothing. Now it reaches /api/kira/chat/text, which answers as the SAME Kira (her prompt
   * is read from the deployed agent) and writes both turns into the same memory the voice path uses.
   *
   * His message goes on screen before the request, so he can see it landed even if the reply is slow
   * — the silence was the whole complaint. An error is SHOWN, never swallowed.
   */
  const handleTypedMessage = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value || !agentInfo?.elevenlabs_agent_id) return;
      setTyped((prev) => [...prev, { role: 'user', text: value }]);
      setTyping(true);
      try {
        const res = await fetch('/api/kira/chat/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agentInfo.elevenlabs_agent_id,
            message: value,
            conversationId: typedConversationId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setTyped((prev) => [...prev, { role: 'assistant', text: data.error || "That didn't get through — try again?" }]);
          return;
        }
        if (data.conversationId) setTypedConversationId(data.conversationId as string);
        setTyped((prev) => [...prev, { role: 'assistant', text: String(data.reply ?? '') }]);
      } catch {
        setTyped((prev) => [...prev, { role: 'assistant', text: "That didn't get through — try again?" }]);
      } finally {
        setTyping(false);
      }
    },
    [agentInfo, typedConversationId],
  );

  // Distil the typed session, which is the text equivalent of the post-call webhook. Without it,
  // everything he typed stays a transcript and never becomes Genome.
  //
  // THREE TRIGGERS, because each one misses a different way a session actually ends:
  //
  //   `visibilitychange` → hidden   the one that fires on a PHONE. A mobile browser backgrounding a
  //                                 tab and later killing it frequently never fires `pagehide`, and
  //                                 backgrounding is how a phone session normally ends — so on the
  //                                 device an owner is most likely to type from, the original
  //                                 trigger was the least likely to run.
  //   `pagehide`                    desktop close/navigate, kept as-is.
  //   every 3 minutes               neither of the above survives a crash, an OS kill, or a laptop
  //                                 that sleeps and never wakes the tab. Bounded loss instead of
  //                                 total loss.
  //
  // Firing this often is only reasonable because the server skips when no message is newer than
  // `conversations.distilled_at` — so the extra beacons cost one cheap query, not one LLM pass.
  useEffect(() => {
    if (!typedConversationId || !agentInfo?.elevenlabs_agent_id) return;

    const distil = () => {
      navigator.sendBeacon?.(
        '/api/kira/chat/text',
        new Blob(
          [JSON.stringify({ agentId: agentInfo.elevenlabs_agent_id, conversationId: typedConversationId, end: true })],
          { type: 'application/json' },
        ),
      );
    };
    // sendBeacon is used even for the periodic case: it is the one send that survives the document
    // being torn down mid-flight, which is precisely the moment worth protecting against.
    const onHide = () => {
      if (document.visibilityState === 'hidden') distil();
    };

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', distil);
    const timer = window.setInterval(distil, 3 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', distil);
      window.clearInterval(timer);
    };
  }, [typedConversationId, agentInfo]);

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-400 to-orange-400 animate-ping opacity-20"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-r from-rose-400 to-orange-400 animate-pulse"></div>
            <img
              src="/female_avatar.jpeg"
              alt="Kira"
              className="absolute inset-3 w-14 h-14 rounded-full object-cover"
            />
          </div>
          <p className="text-gray-600 font-medium">Getting everything ready…</p>
        </div>
      </div>
    );
  }

  if (error && !agentInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Oops</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50">
      <div className="relative flex flex-col min-h-[calc(100vh-52px)] max-w-2xl mx-auto">
        {/* Slim header — the widget below is the focus (it shows the avatar + mic). */}
        <header className="px-4 pt-5 pb-1 text-center">
          <p className="text-sm font-medium text-gray-500">
            {isConnected
              ? '🟢 Live conversation'
              : agentInfo?.journey_type === 'business'
                ? 'Kira · your fractional exec'
                : 'Kira · your thinking partner'}
          </p>
        </header>

        {/* Voice coach — the canonical portfolio VoiceWidget, owner-gated via signed URL. It renders
            its own avatar, transcript, and mic/mute/end controls (no bespoke voice UI). */}
        <main className="flex-1 px-4 pb-6">
          <div className="text-center pt-2 pb-4">
            {/* "Hey there! 👋" addressed nobody, in emoji, on the first screen after a landing page
                that had named his exact situation. This is the tone break both testers hit. The
                greeting now references what SHE last worked on with him — the data is already there
                (conversations.last_topic, which the connect-time recall reads) — and falls back to
                something plain rather than something jaunty. */}
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {lastTopic ? 'Picking up where you left off' : 'Ready when you are'}
            </h2>
            <p className="text-gray-500 text-sm">
              {lastTopic
                ? `Last time you talked about ${lastTopic}. Tap the mic to carry on.`
                : 'Tap the mic below to talk with Kira.'}
            </p>
          </div>

          {/* THE TYPED EXCHANGE.
              The widget owns the input box; it does not own the transcript, and a reply held in
              state that nothing renders is the same silence he complained about. Shown above the
              widget so the newest turn sits nearest the box he is typing into. */}
          {typed.length > 0 && (
            <div className="mb-4 space-y-3 max-w-xl mx-auto">
              {typed.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-2xl bg-stone-800 text-white px-4 py-3 text-base'
                      : 'mr-auto max-w-[85%] rounded-2xl bg-white border border-amber-200 px-4 py-3 text-base text-stone-800'
                  }
                >
                  {m.text}
                </div>
              ))}
              {typing && (
                <div className="mr-auto rounded-2xl bg-white border border-amber-200 px-4 py-3 text-base text-stone-400">
                  Kira is typing…
                </div>
              )}
            </div>
          )}

          {agentInfo && (
            <VoiceWidget
              placement="inline"
              mode="greeting"
              avatarUrl="/female_avatar.jpeg"
              coachName="Kira"
              transcript
              // TEXT INPUT IS OFF UNTIL IT GOES SOMEWHERE.
              //
              // It was turned on as a one-prop fix for "no microphone means no product". Reading the
              // widget afterwards, `submitText` sends to the live session when connected and
              // otherwise calls `props.onTextFallbackSubmit?.(value)` — an optional call on a prop
              // this page never passed. With no mic there is no session, so typing cleared the box
              // and did nothing: no message, no reply, no error, no console output. Worse than the
              // honest "Not supported" it replaced, and sitting on the one action the product exists
              // for.
              //
              // BOTH ARE ON NOW, because both go somewhere. `textInput` types into a live call;
              // `textFallback` is the no-voice path, and onTextFallbackSubmit is the handler whose
              // absence made the box swallow input in the first place.
              textInput
              textFallback
              onTextFallbackSubmit={handleTypedMessage}
              title={
                context?.has_history
                  ? 'Welcome back — Kira remembers where you left off. Tap the mic to continue.'
                  : undefined
              }
              // Speak the recall instead of hoping the agent fetches it. This page already holds the
              // context (loaded above from the same RPC the agent's get_conversation_context tool
              // reads), and previously spent it on the banner alone — while the agent, which does not
              // reliably call that tool at turn zero, opened from its stale signup snapshot and then
              // WAITED to be asked. Rendering the opener here makes the first sentence deterministic.
              // Returns null when there is no history, so a genuine first-timer keeps the agent's own
              // new-user greeting (never a faked "welcome back").
              overrides={
                welcomeBack
                  ? { agent: { firstMessage: welcomeBack } }
                  : undefined
              }
              getSignedUrl={getSignedUrl}
              onConnect={() => {
                setIsConnected(true);
                setError(null);
              }}
              onDisconnect={() => setIsConnected(false)}
              onError={(e) => setError(e)}
            />
          )}

          {error && agentInfo && (
            <p className="text-center text-red-500 text-sm mt-4">{error}</p>
          )}
        </main>

        {/* Minimal footer — the mic dominates; the extras live behind "More". */}
        <footer className="relative border-t border-gray-100 bg-white p-3 safe-area-pb">
          {showMenu && (
            <>
              {/* click-away backdrop */}
              <button
                aria-label="Close menu"
                onClick={() => setShowMenu(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <button
                  onClick={() => { setShowMenu(false); setShowUploadModal(true); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <UploadIcon /> <span className="font-medium">Add knowledge</span>
                </button>
                <button
                  onClick={() => { setShowMenu(false); setShowReferModal(true); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-rose-50"
                >
                  <GiftIcon /> <span className="font-medium">Share Kira</span>
                </button>
                <button
                  onClick={() => { setShowMenu(false); setShowCompleteModal(true); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50"
                >
                  <CheckCircleIcon /> <span className="font-medium">Complete project</span>
                </button>
                {/* "Put it in writing" (/commit) deliberately REMOVED from this menu.
                    It is a pre-sale letter-of-intent capture — "I'd start a paid plan now", "I'd
                    commit to a paid pilot" — and this menu belongs to someone who has already
                    subscribed. Asking a paying customer whether they would consider paying reads as
                    either a bug or a pitch to the wrong person, and it exposes founder-stage
                    validation machinery inside the product they bought.
                    The page still exists and still works; it belongs where it is in the logical
                    flow, which is in front of a prospect, not behind the paywall. */}
              </div>
            </>
          )}
          <div className="flex justify-center">
            <button
              onClick={() => setShowMenu((v) => !v)}
              aria-label="More options"
              aria-expanded={showMenu}
              className="inline-flex min-h-[44px] items-center gap-2 px-4 text-sm text-gray-400 hover:text-gray-700"
            >
              <MoreIcon />
              <span className="font-medium">More</span>
            </button>
          </div>
        </footer>
      </div>

      {/* ============ REFER A FRIEND MODAL ============ */}
      <ReferModal
        isOpen={showReferModal}
        onClose={() => setShowReferModal(false)}
        userId={agentInfo?.user_id}
      />

      {/* ============ UPLOAD KNOWLEDGE MODAL ============ */}
      <UploadKnowledgeModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        agentId={agentId}
        userId={agentInfo?.user_id}
      />

      {/* ============ COMPLETE PROJECT MODAL ============ */}
      <CompleteProjectModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        agentId={agentId}
        agentName={agentInfo?.agent_name || 'Kira'}
        userId={agentInfo?.user_id}
      />
    </div>
  );
}

/* ================================================================
   REFER A FRIEND MODAL
   ================================================================ */

function ReferModal({
  isOpen,
  onClose,
  userId
}: {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}) {
  const [formData, setFormData] = useState({
    yourName: '',
    yourEmail: '',
    friendEmail: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch('/api/refer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          referrerId: userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send referral');
      }

      setStatus('sent');

      setTimeout(() => {
        onClose();
        setStatus('idle');
        setFormData({ yourName: '', yourEmail: '', friendEmail: '' });
      }, 3000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <XIcon />
        </button>

        {status === 'sent' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Invite sent! 🎉
            </h3>
            <p className="text-gray-600">
              Your friend will receive an email from you shortly.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <GiftIcon />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                Share Kira with a friend
              </h3>
              <p className="text-gray-600 text-sm">
                Think a friend could use a helpful guide? Send them an invite.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="yourName" className="block text-sm font-medium text-gray-700 mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  id="yourName"
                  required
                  value={formData.yourName}
                  onChange={(e) => setFormData(prev => ({ ...prev, yourName: e.target.value }))}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label htmlFor="yourEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Your email
                </label>
                <input
                  type="email"
                  id="yourEmail"
                  required
                  value={formData.yourEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, yourEmail: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label htmlFor="friendEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Friend's email
                </label>
                <input
                  type="email"
                  id="friendEmail"
                  required
                  value={formData.friendEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, friendEmail: e.target.value }))}
                  placeholder="friend@example.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
                />
              </div>

              {status === 'error' && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {status === 'sending' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <SendIcon />
                    Send Invite
                  </>
                )}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-4">
              We'll send them one friendly email. No spam, ever.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   UPLOAD KNOWLEDGE MODAL
   ================================================================ */

function UploadKnowledgeModal({
  isOpen,
  onClose,
  agentId,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  userId?: string;
}) {
  const [activeTab, setActiveTab] = useState<'files' | 'urls'>('files');
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>(['']);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addUrlField = () => {
    setUrls(prev => [...prev, '']);
  };

  const updateUrl = (index: number, value: string) => {
    setUrls(prev => prev.map((url, i) => i === index ? value : url));
  };

  const removeUrl = (index: number) => {
    setUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
      setUploading(true);
      setStatus('idle');
      setErrorMessage('');

      try {
        // Upload files
        if (files.length > 0) {
          for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('agentId', agentId);
            if (userId) formData.append('userId', userId);

            const response = await fetch('/api/kira/knowledge/upload', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || `Failed to upload ${file.name}`);
            }
          }
        }

        // Upload URLs separately
        const validUrls = urls.filter(url => url.trim());
        for (const url of validUrls) {
          const response = await fetch('/api/kira/knowledge/url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: url.trim(),
              agentId,
              userId,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Failed to add URL: ${url}`);
          }
        }

        setStatus('success');

        setTimeout(() => {
          setFiles([]);
          setUrls(['']);
          setStatus('idle');
          onClose();
        }, 2000);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    };

  if (!isOpen) return null;

  const hasContent = files.length > 0 || urls.some(url => url.trim());

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <XIcon />
        </button>

        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Knowledge added! 🧠
            </h3>
            <p className="text-gray-600">
              Kira will use this to give you better advice.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UploadIcon />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                Add to Kira's knowledge
              </h3>
              <p className="text-gray-600 text-sm">
                Share files or links to help Kira understand your situation better.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === 'files'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileIcon />
                Files
              </button>
              <button
                onClick={() => setActiveTab('urls')}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === 'urls'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <LinkIcon />
                URLs
              </button>
            </div>

            {/* Files Tab */}
            {activeTab === 'files' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 hover:bg-gray-50 transition"
                >
                  <UploadIcon />
                  <p className="text-sm text-gray-600 mt-2">Click to upload files</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, TXT, CSV</p>
                </button>

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FileIcon />
                          <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                          <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                          <XIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* URLs Tab */}
            {activeTab === 'urls' && (
              <div className="space-y-3">
                {urls.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateUrl(i, e.target.value)}
                      placeholder="https://example.com/resource"
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition text-sm"
                    />
                    {urls.length > 1 && (
                      <button
                        onClick={() => removeUrl(i)}
                        className="p-2.5 text-gray-400 hover:text-red-500 transition"
                      >
                        <XIcon />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addUrlField}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
                >
                  <PlusIcon />
                  Add another URL
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-4">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={uploading || !hasContent}
              className="w-full mt-6 bg-gradient-to-r from-rose-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadIcon />
                  Add to Knowledge Base
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4">
              Files are processed securely and used only to help Kira assist you better.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   COMPLETE PROJECT MODAL
   ================================================================ */

function CompleteProjectModal({
  isOpen,
  onClose,
  agentId,
  agentName,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  userId?: string;
}) {
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'idle' | 'completing' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleComplete = async () => {
    setStatus('completing');
    setErrorMessage('');

    try {
      const response = await fetch('/api/kira/agent/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          userId,
          feedback: feedback.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete project');
      }

      setStatus('completed');

      // Redirect to home after a delay
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && status !== 'completing') onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 relative">
        {status !== 'completing' && status !== 'completed' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          >
            <XIcon />
          </button>
        )}

        {status === 'completed' ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Project Complete! 🎉
            </h3>
            <p className="text-gray-600 mb-2">
              Great work finishing this one.
            </p>
            <p className="text-gray-500 text-sm">
              Redirecting you home...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArchiveIcon />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                Complete this project?
              </h3>
              <p className="text-gray-600 text-sm">
                This will archive <strong>{agentName}</strong> and mark the project as done.
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 mb-4">
              <p className="text-amber-800 text-sm">
                <strong>What happens:</strong>
              </p>
              <ul className="text-amber-700 text-sm mt-2 space-y-1">
                <li>• Your conversation history is saved</li>
                <li>• The agent will be archived (not deleted)</li>
                <li>• You can start a new project anytime</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Any final notes? (optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="How did it go? What did you accomplish?"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition resize-none"
              />
            </div>

            {status === 'error' && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={status === 'completing'}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={status === 'completing'}
                className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {status === 'completing' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon />
                    Complete Project
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
