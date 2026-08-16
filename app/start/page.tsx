// app/start/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Loader2, FileEdit, CheckCircle, Sparkles, Briefcase, ArrowLeft } from 'lucide-react';
import { VoiceWidget } from '@caistech/elevenlabs-convai/react';
import { startFraming, type StartFraming } from '@/lib/kira/start-framing';

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
  //
  // WHO SENT HIM, AND WHAT TO SAY, ARE TWO QUESTIONS. They were one flag, and that is what broke.
  //
  // `from=paid` marks the owner who has just paid and is being brought here as step 2 of onboarding.
  // `from=app`  marks an owner already inside the product who arrived by the dashboard's recovery
  //             route — the same convention the valuation result page already uses for "he is
  //             already a customer, do not sell to him".
  //
  // The dashboard was passing `from=paid`, so a signed-in owner clicking "Talk to Kira" months
  // later was greeted with "Last step — let's set up your Kira. About three minutes." — the copy
  // for a man who had just handed over a card. The two comments describing this had drifted into
  // contradicting each other: this file said `from=paid` meant "rather than arriving by a dashboard
  // fallback", while `app/dashboard/page.tsx` described its own branch as "the recovery route" and
  // passed `from=paid` anyway.
  //
  // Splitting them keeps both behaviours that were wanted: BOTH go back to the dashboard rather than
  // the marketing home page, and ONLY the paid arrival is told this is the last step.
  // The resolution itself lives in `lib/kira/start-framing.ts` — a pure function, because /start is
  // behind auth and a browser check therefore needs a real session and does not run in CI. This is
  // the one piece here that a person notices when it is wrong.
  const [framing, setFraming] = useState<StartFraming>({ isPaidArrival: false, cameFromApp: false });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('journey')) setSelectedJourney('business');
    setFraming(startFraming(params.get('from')));
  }, []);

  // ⚠️ `fromPaid` IS NOW DEAD AND KEPT DELIBERATELY, because deleting it would erase why.
  //
  // It framed this page as "Last step — let's set up your Kira", which was right while the paid
  // path landed here directly. Since 2026-08-15 BOTH entry paths land on /dashboard and the gate
  // sends him on with `from=app`, so nothing produces `from=paid` any more and the branch was
  // rendering copy nobody could reach. The framing now lives on the gate, which is the surface that
  // knows what he has just done.
  //
  // Left as a read so the shape of the old contract is visible to the next reader, and so the
  // resume banner below (which also keys off `framing`) is not disturbed by a half-removal.
  void framing.isPaidArrival;
  const cameFromApp = framing.cameFromApp;

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-md text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 font-sans">
      {/* BACKGROUND GRADIENT — decoration only, and it must never receive a click.
          It is `absolute inset-0` with no stacking of its own, so it painted over the nav that
          `UserShell` renders around this page and swallowed every link on it. The page's own content
          escaped because the div below is `relative`; the shell's nav had no such protection, so the
          links rendered, looked fine, and did nothing.
          `pointer-events-none` is the fix and `-z-10` is the belt: a full-bleed decorative layer
          should be incapable of intercepting input, not merely arranged so that it currently does
          not. Reported by the operator, 2026-08-12. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, rgba(244, 114, 182, 0.05) 0%, transparent 50%)
          `
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 py-12">
        {/* Back link.
            "Back to selection" used to stand here whenever a journey was set — a way back to a
            chooser that has had one option since the personal journey was deprecated (see the
            ?journey= resolution above). Removed: offering a way back to a choice that no longer
            exists is how this page kept reading as the pre-Exec product. */}
        <div className="mb-8">
          <a href={cameFromApp ? '/dashboard' : '/'}
            className="text-stone-600 hover:text-stone-900 text-sm transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {cameFromApp ? 'Back to your Overview' : 'Back to home'}
          </a>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          {/* ⚠️ HER FACE APPEARS ONCE ON THIS PAGE. IT USED TO APPEAR TWICE.
              This header carried a 64px circle of /female_avatar.jpeg, and the VoiceWidget below
              renders the SAME file at its own size. Same photograph, two different crops —
              `object-cover` inside a small circle takes the face, the widget's larger frame keeps
              the shoulders and the headset — and the two read as two people.

              Ray, 2026-08-16: "The avatar at the top of the setup page and the big picture in the
              card below it are not the same photograph — one's wearing a headset and one isn't, and
              the faces differ. If she's a person, she has one face."

              He was looking at one file. Matching the crops would fix the symptom and leave the
              duplication; removing the copy fixes both, and the name and the role are already said
              in words directly underneath. */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-stone-900">Kira</h1>
            <p className="text-stone-600 text-sm">Your part-time general manager</p>
          </div>

          {/* THE PAID OWNER IS BEING SET UP, NOT BROWSING.
              He has just paid and been sent here as step 2. Naming that is the difference between
              "one more page" and "the bit that makes her yours" — and it is the honest description,
              because until this conversation happens he has no agent at all. */}
          <h2 className="text-3xl font-bold text-stone-900 mb-2">
            {selectedJourney ? 'Talk to Kira' : 'What brings you here today?'}
          </h2>
          <p className="text-stone-600">
            {selectedJourney
              ? 'Tell her how the work actually gets done. She writes it up for you to check.'
              : "Choose your path and let's have a conversation"}
          </p>
        </div>

        {/* JOURNEY SELECTION (before widget) — business-only; personal is deprecated */}
        {!selectedJourney && (
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => selectJourney('business')}
              className="w-full bg-white border border-stone-200 hover:border-violet-300 rounded-2xl p-6 text-left transition-all hover:bg-stone-50 group"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4 group-hover:bg-pink-500/30 transition-colors">
                <Briefcase className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Tell Kira about your business</h3>
              <p className="text-stone-600 text-sm mb-4">
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
          <div className="bg-white border border-stone-200 rounded-3xl p-8">
            {/* ⚠️ THE FOUR-STEP "How it works" BOX WAS REMOVED HERE — 2026-08-15.
                The operator arrived on this page by pressing "Talk to Kira" and objected to the
                text as well as the palette. He is right, and the box was the worst of it: a man who
                asked to TALK to someone was met by a numbered list explaining a process, in an
                amber panel, on a page that looked like a different product. It read as a form to be
                completed rather than a person to be spoken to — which is the one thing this product
                promises it is not.
                What survives is the single sentence that is genuinely useful and could not be
                guessed: nothing is kept until he approves it. That is a reassurance, not an
                instruction, and it belongs next to the mic rather than above it. */}
            <p className="mb-6 text-base leading-relaxed text-stone-600">
              Just talk to her the way you would to a person — she will ask as she goes. Nothing is
              kept until you have read it back and approved it.
            </p>

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
                /* NO autoConnect — deliberately.
                   With it, the widget skipped its pre-connect state and dropped the owner straight
                   into a live session: "Mute / End / Listening for your framework…", with nothing
                   on screen inviting him to begin. The launcher it skipped is the button every
                   other surface in the product shows — `greeting` mode, "Talk to the assistant"
                   (@caistech/elevenlabs-convai widget-logic.js:28). Restoring it means a 66-year-old
                   presses something to start talking instead of finding a microphone already open,
                   which is also the difference between a page that reads as his and one that reads
                   as already running. */
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

            {/* ⚠️ "FRAMEWORK" IS A WORD HE WOULD NEVER USE.
                Ray, 2026-08-16: "The button says Review Framework. I don't know what a Framework is
                and I'm not going to guess." He is 66, has run a contracting business for 35 years,
                and will not press a control whose noun he cannot picture. The screen it opens is
                headed "Check we have this right", which is already the plain-English version — so
                the button now says what that screen does. */}
            <div className="flex justify-center">
              <button
                onClick={goToReviewDraft}
                disabled={!draftReady}
                className={`
                  inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg
                  transition-all duration-300 transform
                  ${draftReady
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-900 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 cursor-pointer'
                    : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                  }
                `}
              >
                {draftReady ? (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    Check what she wrote down
                  </>
                ) : (
                  <>
                    <FileEdit className="w-6 h-6" />
                    Check what she wrote down
                    <span className="text-sm font-normal opacity-50">(talk to Kira first)</span>
                  </>
                )}
              </button>
            </div>

            {/* ⚠️ TYPING IS A ROUTE, NOT A FAILURE PATH — AND IT IS BILLED LIKE ONE.
                It was small underlined text reading "No microphone, or prefer to type?" beneath a
                greyed button: an apology, offered to a man presumed to be broken.

                Ray, 2026-08-16: "the typed-brief route worked well and I'd guess more of your ICP
                will use it than you think… Give it equal billing. Half of us are in a truck with
                the radio on, and the other half don't want the office hearing."

                He is the ICP, and both of his reasons are about the ROOM rather than the equipment.
                So: a real button, sized like the one above it, offering the choice rather than
                excusing it. The word "instead" is gone — it framed this as the second-best thing. */}
            <div className="mt-6 border-t border-stone-200 pt-6">
              {!showTextForm ? (
                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowTextForm(true);
                      setTextError(null);
                    }}
                    className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center rounded-full border-2 border-stone-300 px-6 py-3 text-base font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-50"
                  >
                    Type it instead
                  </button>
                  <p className="mt-2 text-sm text-stone-600">
                    Just as good, and often easier — in a vehicle, or anywhere you would rather not
                    be overheard.
                  </p>
                </div>
              ) : (
                <div className="max-w-xl mx-auto space-y-4">
                  <div>
                    <h3 className="text-stone-900 font-semibold">Type your brief</h3>
                    <p className="text-stone-600 text-sm">
                      A few lines is enough — you can refine everything on the next screen before creating your Kira.
                    </p>
                  </div>
                  <div>
                    <label className="block text-stone-700 text-sm mb-1">Your name</label>
                    <input
                      type="text"
                      value={textName}
                      onChange={(e) => setTextName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-violet-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 text-sm mb-1">Location</label>
                    <input
                      type="text"
                      value={textLocation}
                      onChange={(e) => setTextLocation(e.target.value)}
                      placeholder="City, Country"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-violet-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 text-sm mb-1">What do you want to work on?</label>
                    <textarea
                      value={textObjective}
                      onChange={(e) => setTextObjective(e.target.value)}
                      rows={3}
                      placeholder="What are you trying to figure out or achieve?"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-violet-400 focus:outline-none resize-none"
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
                      className="text-stone-600 hover:text-stone-900 text-sm transition-colors"
                    >
                      Back to talking
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ⚠️ ONLY WHEN SOMETHING IS ACTUALLY LISTENING.
                sessionStartTime is set when the WIDGET LOADS, not when a call connects, so this sat
                on screen permanently — including on the typed-brief form, where nothing is listening
                to anything. Ray, 2026-08-16: "On a product whose entire pitch to me is she is
                recording what I say, a permanent Listening... with no way to stop it is not a
                cosmetic bug. I looked at it twice."
                Hidden once he chooses to type, and the wording no longer claims an ear that is not
                open. */}
            {sessionStartTime && !draftReady && !showTextForm && (
              <p className="text-center text-stone-500 text-sm mt-4">
                <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                Listening — talk whenever you are ready
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
