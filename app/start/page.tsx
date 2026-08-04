// app/start/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Loader2, FileEdit, CheckCircle, Sparkles, Briefcase, ArrowLeft } from 'lucide-react';
import { VoiceWidget } from '@caistech/elevenlabs-convai/react';

interface Draft {
  id: string;
  user_name: string;
  primary_objective: string;
  created_at: string;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Setup Kira's ElevenLabs agent ID
const SETUP_KIRA_AGENT_ID = process.env.NEXT_PUBLIC_SETUP_KIRA_AGENT_ID;

type JourneyType = 'personal' | 'business' | null;

export default function StartPage() {
  const router = useRouter();

  // Journey selection state
  const [selectedJourney, setSelectedJourney] = useState<JourneyType>(null);

  // Widget state
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft detection state
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  // This session's ElevenLabs conversation id (from the widget's conversation-started event). When
  // known, the draft poll is scoped to THIS conversation so it can't surface another concurrent
  // user's draft. Falls back to the time-window poll until it's available (no onboarding regression).
  const [convId, setConvId] = useState<string | null>(null);

  // Text fallback state (for users with no mic / who'd rather type) — PRODUCT_STANDARDS "degrade,
  // don't fake". Produces the same kira_drafts row the voice path does, then goes to the review page.
  const [showTextForm, setShowTextForm] = useState(false);
  const [textName, setTextName] = useState('');
  const [textLocation, setTextLocation] = useState('');
  const [textObjective, setTextObjective] = useState('');
  const [textSubmitting, setTextSubmitting] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  // Refs for cleanup
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Check if agent ID is configured
  useEffect(() => {
    if (!SETUP_KIRA_AGENT_ID) {
      setError('Setup Kira agent not configured. Please set NEXT_PUBLIC_SETUP_KIRA_AGENT_ID.');
    }
  }, []);

  // Load ElevenLabs widget script
  useEffect(() => {
    if (!SETUP_KIRA_AGENT_ID || !selectedJourney) return;

    // No CDN script to wait for any more — the canonical widget is a React component, bundled.
    // `widgetLoaded` is kept because the draft poll and the session clock gate on it; it now means
    // "the conversation surface is mounted" rather than "a third-party script finished loading".
    setWidgetLoaded(true);
  }, [selectedJourney]);

  /**
   * The signed URL for the setup conversation — the canonical path, as /chat/[agentId] does it.
   *
   * The CDN embed took a public `agent-id`, which connects over WEBRTC, and that is the transport
   * failing in production with a DataChannel error. GET /api/kira/start?journey= mints a signed
   * ElevenLabs URL server-side; the widget resolves it fresh at connect time and connects over
   * WEBSOCKET. Verified live: the socket opens and the agent sends conversation_initiation_metadata.
   */
  const getSignedUrl = useCallback(async (): Promise<string> => {
    const res = await fetch(`/api/kira/start?journey=${selectedJourney ?? 'business'}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Could not start the conversation');
    }
    const { signedUrl } = await res.json();
    return signedUrl as string;
  }, [selectedJourney]);

  // Set session start time when widget loads
  useEffect(() => {
    if (widgetLoaded && !sessionStartTime) {
      setSessionStartTime(new Date());
      console.log('[StartPage] Session started, listening for drafts...');
    }
  }, [widgetLoaded, sessionStartTime]);

  // POLLING FUNCTION: Check for new drafts
  const checkForDraft = useCallback(async () => {
    if (!sessionStartTime || draftReady) return;

    try {
      let query = supabase
        .from('kira_drafts')
        .select('id, user_name, primary_objective, created_at')
        .eq('status', 'draft');
      // Scoped to this conversation when we have its id (secure); otherwise the time window.
      query = convId
        ? query.eq('elevenlabs_conversation_id', convId)
        : query.gte('created_at', sessionStartTime.toISOString());
      const { data: drafts, error } = await query.order('created_at', { ascending: false }).limit(1);

      if (error) {
        console.error('[StartPage] Poll error:', error);
        return;
      }

      if (drafts && drafts.length > 0) {
        const draft = drafts[0];
        console.log('[StartPage] Draft found:', draft.user_name);
        setCurrentDraft(draft);
        setDraftReady(true);

        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error('[StartPage] Poll exception:', err);
    }
  }, [sessionStartTime, draftReady, convId]);

  // DUAL DETECTION: Real-time subscription + Polling fallback
  useEffect(() => {
    if (!widgetLoaded || !sessionStartTime) return;

    console.log('[StartPage] Starting draft detection...');

    const channel = supabase
      .channel('kira-draft-detection-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kira_drafts'
        },
        (payload) => {
          console.log('[StartPage] Real-time: New draft detected!', payload);

          const newDraft = payload.new as Draft & { elevenlabs_conversation_id?: string };
          const draftCreatedAt = new Date(newDraft.created_at);
          // Scope to this conversation when known; otherwise the time window.
          const belongsToThisSession = convId
            ? newDraft.elevenlabs_conversation_id === convId
            : draftCreatedAt >= sessionStartTime;

          if (belongsToThisSession) {
            console.log('[StartPage] Draft verified:', newDraft.user_name);
            setCurrentDraft(newDraft);
            setDraftReady(true);

            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[StartPage] Subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    pollIntervalRef.current = setInterval(() => {
      checkForDraft();
    }, 3000);

    checkForDraft();

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [widgetLoaded, sessionStartTime, checkForDraft, convId]);

  const goToReviewDraft = () => {
    if (currentDraft) {
      router.push(`/setup/draft/${currentDraft.id}`);
    }
  };

  // Text fallback: create the same draft the voice agent would, then go straight to the review page.
  const submitTextBrief = async () => {
    if (!selectedJourney) return;
    setTextError(null);
    if (!textName.trim() || !textLocation.trim() || !textObjective.trim()) {
      setTextError('Please add your name, your location, and what you want to work on.');
      return;
    }
    setTextSubmitting(true);
    try {
      const res = await fetch('/api/kira/draft/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: textName.trim(),
          location: textLocation.trim(),
          journey_type: selectedJourney,
          primary_objective: textObjective.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save your brief.');
      router.push(`/setup/draft/${data.draftId}`);
    } catch (err) {
      setTextError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setTextSubmitting(false);
    }
  };

  const selectJourney = (journey: JourneyType) => {
    setSelectedJourney(journey);
  };

  // Kira is business-only now — the personal journey is deprecated. Any ?journey= param (including a
  // stale ?journey=personal from an old link) resolves to business; a direct visitor picks the single
  // Business card below. Read from location directly to avoid a Suspense boundary.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('journey');
    if (param) setSelectedJourney('business');
  }, []);

  const goBack = () => {
    setSelectedJourney(null);
    setWidgetLoaded(false);
    setSessionStartTime(null);
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-md text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 font-sans">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, rgba(244, 114, 182, 0.06) 0%, transparent 50%)
          `
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 py-12">
        {/* Back link */}
        <div className="mb-8">
          {selectedJourney ? (
            <button
              onClick={goBack}
              className="text-stone-500 hover:text-stone-300 text-sm transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to selection
            </button>
          ) : (

            <a href="/"
              className="text-stone-500 hover:text-stone-300 text-sm transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </a>
          )}
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400/50">
              <img src="/female_avatar.jpeg" alt="Kira" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">Kira</h1>
              <p className="text-stone-400 text-sm">Your part-time general manager</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">
            {selectedJourney ? (
              selectedJourney === 'personal' ? "Let's talk about life stuff" : "Tell her how the business actually runs"
            ) : (
              "What brings you here today?"
            )}
          </h2>
          <p className="text-stone-400">
            {selectedJourney
              ? "Have a quick chat and Kira will create a brief for you to review."
              : "Choose your path and let's have a conversation"
            }
          </p>
        </div>

        {/* JOURNEY SELECTION (before widget) — business-only; personal is deprecated */}
        {!selectedJourney && (
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => selectJourney('business')}
              className="w-full bg-stone-900/50 border border-stone-800 hover:border-pink-500/50 rounded-2xl p-6 text-left transition-all hover:bg-stone-900/80 group"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4 group-hover:bg-pink-500/30 transition-colors">
                <Briefcase className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Tell Kira about your business</h3>
              <p className="text-stone-400 text-sm mb-4">
                What you do, how it runs, what you&apos;re trying to sort out. Have a quick chat and Kira
                builds a brief for you to review — then becomes your part-time general manager.
              </p>
              <span className="text-pink-400 text-sm font-medium inline-flex items-center gap-1">
                Start talking
              </span>
            </button>
          </div>
        )}

        {/* CONVERSATION INTERFACE (after journey selected) */}
        {selectedJourney && (
          <div className="bg-stone-900/50 border border-stone-800 rounded-3xl p-8">
            {/* Instructions */}
            <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-200 font-medium mb-1">How it works:</p>
                  <ol className="text-amber-200/70 text-sm space-y-1 list-decimal list-inside">
                    <li>Kira starts talking — just answer as you would to a person</li>
                    <li>Tell her how the work gets done, and what only you know</li>
                    <li>She writes it up for you to check before anything is kept</li>
                    <li>The button below turns green when there is something to read</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* THE CANONICAL WIDGET — the migration this page was skipped by.
                a4f0ee2 ("migrate coach + PubGuard voice onto canonical Morgan VoiceWidget") moved
                /chat/[agentId] and PubGuard because both were throwing under @elevenlabs/react
                1.10. /start was not throwing, so it was left on the raw CDN embed it has carried
                since fbd3507 — `git log -S VoiceWidget` on this file returns nothing. Not a
                regression; a migration that never happened, which is why it still looked like the
                pre-Exec product.
                Follows /chat/[agentId] exactly: a signed URL resolved at connect time over
                WebSocket, rather than a public agent id over WebRTC — the transport that has been
                failing in production with a DataChannel error. */}
            <div className="flex justify-center mb-8">
              <VoiceWidget
                placement="inline"
                avatarUrl="/female_avatar.jpeg"
                coachName="Kira"
                transcript
                autoConnect
                getSignedUrl={getSignedUrl}
                /* Replaces the CDN's `conversation-started` DOM listener. The draft poll scopes to
                   this id, so losing it would let one owner's poll see another's draft — the exact
                   content-exposure window closed by 264c7b0. */
                onConnect={(conversationId) => {
                  if (conversationId) setConvId(String(conversationId));
                  if (!sessionStartTime) setSessionStartTime(new Date());
                }}
              />
            </div>

            {/* Review Framework Button */}
            <div className="flex justify-center">
              <button
                onClick={goToReviewDraft}
                disabled={!draftReady}
                className={`
                  inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg
                  transition-all duration-300 transform
                  ${draftReady
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-900 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 cursor-pointer'
                    : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                  }
                `}
              >
                {draftReady ? (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    Review Framework
                  </>
                ) : (
                  <>
                    <FileEdit className="w-6 h-6" />
                    Review Framework
                    <span className="text-sm font-normal opacity-50">(talk to Kira first)</span>
                  </>
                )}
              </button>
            </div>

            {/* Text fallback — no mic, noisy room, or just prefer to type */}
            <div className="mt-6 border-t border-stone-800 pt-6">
              {!showTextForm ? (
                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowTextForm(true);
                      setTextError(null);
                    }}
                    className="text-stone-400 hover:text-amber-300 text-sm underline underline-offset-4 transition-colors"
                  >
                    No microphone, or prefer to type? Write your brief instead
                  </button>
                </div>
              ) : (
                <div className="max-w-xl mx-auto space-y-4">
                  <div>
                    <h3 className="text-white font-semibold">Type your brief</h3>
                    <p className="text-stone-400 text-sm">
                      A few lines is enough — you can refine everything on the next screen before creating your Kira.
                    </p>
                  </div>
                  <div>
                    <label className="block text-stone-300 text-sm mb-1">Your name</label>
                    <input
                      type="text"
                      value={textName}
                      onChange={(e) => setTextName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl bg-stone-800/60 border border-stone-600/40 text-stone-100 placeholder-stone-500 focus:border-amber-400/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-300 text-sm mb-1">Location</label>
                    <input
                      type="text"
                      value={textLocation}
                      onChange={(e) => setTextLocation(e.target.value)}
                      placeholder="City, Country"
                      className="w-full px-4 py-3 rounded-xl bg-stone-800/60 border border-stone-600/40 text-stone-100 placeholder-stone-500 focus:border-amber-400/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-300 text-sm mb-1">What do you want to work on?</label>
                    <textarea
                      value={textObjective}
                      onChange={(e) => setTextObjective(e.target.value)}
                      rows={3}
                      placeholder="What are you trying to figure out or achieve?"
                      className="w-full px-4 py-3 rounded-xl bg-stone-800/60 border border-stone-600/40 text-stone-100 placeholder-stone-500 focus:border-amber-400/50 focus:outline-none resize-none"
                    />
                  </div>
                  {textError && <p className="text-red-400 text-sm">{textError}</p>}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={submitTextBrief}
                      disabled={textSubmitting}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-stone-900 hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {textSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating your brief...
                        </>
                      ) : (
                        <>
                          <FileEdit className="w-5 h-5" />
                          Continue to review
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowTextForm(false)}
                      className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
                    >
                      Back to talking
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status indicator */}
            {sessionStartTime && !draftReady && (
              <p className="text-center text-stone-500 text-sm mt-4">
                <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                Listening for your framework...
              </p>
            )}

            {/* Draft preview when ready */}
            {draftReady && currentDraft && (
              <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                <p className="text-amber-200">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Framework ready for <strong>{currentDraft.user_name}</strong>
                </p>
                <p className="text-amber-200/70 text-sm mt-1">
                  {currentDraft.primary_objective}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// TypeScript declaration for ElevenLabs widget
// The `<elevenlabs-convai>` JSX declaration that used to live here is gone with the CDN embed.
// Leaving it would advertise a custom element this page no longer renders, and the next person to
// read it would reasonably conclude the raw embed was still in use.
