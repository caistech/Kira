// @explanatory-header-exempt — nested workflow page; entry-point header lives on the parent surface
// app/setup/draft/[draftId]/page.tsx
// Draft Review Page - User reviews framework before creating Operational Kira
//
// FLOW:
// 1. User arrives from /start after Setup Kira saved draft
// 2. Shows editable framework
// 3. User can modify any field
// 4. User MUST enter email (required field)
// 5. User clicks "Create My Kira"
// 6. Operational Kira is created with approved framework
// 7. Redirect to /chat/[agentId]

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { createClient as createSessionBrowserClient } from '@/lib/supabase/browser';
import { Loader2, Sparkles, MapPin, Target, CheckCircle, AlertCircle, Mail, Plus, X } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface KiraDraft {
  id: string;
  user_name: string;
  first_name: string;
  location: string;
  journey_type: 'personal' | 'business';
  primary_objective: string;
  key_context: string[];
  success_definition: string | null;
  constraints: string[];
  status: string;
}

export default function DraftReviewPage() {
  const router = useRouter();
  const params = useParams();
  const draftId = params.draftId as string;

  const [draft, setDraft] = useState<KiraDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editable fields
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState(''); // Email the new Kira is attributed to
  const [authEmail, setAuthEmail] = useState<string | null>(null); // signed-in account (locks the field)
  const [emailError, setEmailError] = useState<string | null>(null); // Email validation error
  const [location, setLocation] = useState('');
  // BUSINESS, ALWAYS. The personal journey is deprecated (app/start/page.tsx resolves every
  // ?journey= to business), and this page was the last surface still able to produce a personal
  // agent — it defaulted to 'personal' and only corrected itself once the draft fetch returned.
  //
  // That is not cosmetic. A personal Kira carries the six memory tools and NONE of the eighteen
  // business ones: no email, no Drive, no contacts. On 2026-08-05 a personal agent told a paying
  // owner she had no connection to his Gmail, his Drive or his Xero, and then distilled that denial
  // into his memory as a fact about his business (app/talk/page.tsx). A paying owner must not be
  // able to reach that state by mis-tapping, and must not reach it because a fetch was slow.
  const [journeyType, setJourneyType] = useState<'personal' | 'business'>('business');
  const [primaryObjective, setPrimaryObjective] = useState('');
  const [keyContext, setKeyContext] = useState<string[]>([]);
  const [successDefinition, setSuccessDefinition] = useState('');
  const [constraints, setConstraints] = useState<string[]>([]);

  // Fetch draft
  useEffect(() => {
    async function fetchDraft() {
      try {
        const { data, error } = await supabase
          .from('kira_drafts')
          .select('*')
          .eq('id', draftId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Draft not found');

        setDraft(data);

        // Initialize form with draft data
        setUserName(data.user_name);
        setLocation(data.location);
        // NOT read from the draft, deliberately. A draft created before the personal journey was
        // deprecated still carries journey_type='personal', and honouring it here would resurrect
        // exactly the agent shape this page no longer offers. The state is initialised to
        // 'business' above and stays there.
        setPrimaryObjective(data.primary_objective);
        setKeyContext(data.key_context || []);
        setSuccessDefinition(data.success_definition || '');
        setConstraints(data.constraints || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (draftId) {
      fetchDraft();
    }
  }, [draftId]);

  // Bind the new Kira to the signed-in account: pre-fill + lock the email to the authenticated
  // user (read from the SSR cookie session, NOT the localStorage client above). /api/kira/create
  // looks the user up by email, and the auth trigger already linked the users row by email — so
  // the created agent is attributed to this user and appears on their dashboard.
  useEffect(() => {
    const authClient = createSessionBrowserClient();
    authClient.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setEmail(data.user.email);
        setAuthEmail(data.user.email);
      }
    });
  }, []);

  // Email validation
  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  // Handle email change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
  };

  // Handle email blur (validate on focus out)
  const handleEmailBlur = () => {
    validateEmail(email);
  };

  // Handle context point changes
  const updateContextPoint = (index: number, value: string) => {
    const updated = [...keyContext];
    updated[index] = value;
    setKeyContext(updated);
  };

  const addContextPoint = () => {
    setKeyContext([...keyContext, '']);
  };

  const removeContextPoint = (index: number) => {
    setKeyContext(keyContext.filter((_, i) => i !== index));
  };

  // Handle constraint changes
  const updateConstraint = (index: number, value: string) => {
    const updated = [...constraints];
    updated[index] = value;
    setConstraints(updated);
  };

  const addConstraint = () => {
    setConstraints([...constraints, '']);
  };

  const removeConstraint = (index: number) => {
    setConstraints(constraints.filter((_, i) => i !== index));
  };

  // Submit and create Operational Kira
  const handleSubmit = async () => {
    // Validate email first
    if (!validateEmail(email)) {
      // Scroll to email field
      document.getElementById('email-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update draft with any user edits and mark as approved
      const { error: updateError } = await supabase
        .from('kira_drafts')
        .update({
          user_name: userName,
          first_name: userName.split(' ')[0],
          location,
          journey_type: journeyType,
          primary_objective: primaryObjective,
          key_context: keyContext.filter(c => c.trim()),
          success_definition: successDefinition || null,
          constraints: constraints.filter(c => c.trim()),
          status: 'approved',
          approved_at: new Date().toISOString(),
          user_edits: {
            edited_at: new Date().toISOString(),
            original_draft_id: draftId,
          },
        })
        .eq('id', draftId);

      if (updateError) throw updateError;

      // Create Operational Kira - FIXED: send draftId AND email
      const response = await fetch('/api/kira/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          email,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create Kira');
      }

      const { agentId } = await response.json();

      // Redirect to chat with Operational Kira
      router.push(`/chat/${agentId}`);

    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  // Error state (draft not found)
  if (!draft) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-3" />
          <p className="text-red-700">{error || 'Draft not found'}</p>
          <a href="/start" className="text-violet-600 hover:underline mt-4 block">
            Start over
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, rgba(244, 114, 182, 0.06) 0%, transparent 50%)
          `
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/50">
              <img src="/female_avatar.jpeg" alt="Kira" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-stone-900">Check we have this right</h1>
              <p className="text-stone-600 text-sm">Change anything that is wrong, then set her up</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">

          {/* Email Field - REQUIRED AND PROMINENT */}
          <div id="email-field" className="bg-gradient-to-r from-violet-50 to-violet-100 border border-violet-200 rounded-2xl p-6">
            <label className="flex items-center gap-2 text-violet-800 mb-3">
              <Mail className="w-5 h-5" />
              <span className="font-medium">Your Email</span>
              <span className="text-red-700 text-sm">*required</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              readOnly={!!authEmail}
              className={`w-full px-4 py-3 rounded-xl bg-white border text-stone-900 placeholder-stone-400 focus:outline-none transition-colors ${
                authEmail ? 'opacity-70 cursor-not-allowed' : ''
              } ${
                emailError
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-stone-300 focus:border-violet-500'
              }`}
              placeholder="you@example.com"
              required
            />
            {emailError ? (
              <p className="text-red-700 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {emailError}
              </p>
            ) : (
              <p className="text-stone-500 text-sm mt-2">
                {authEmail
                  ? 'This Kira will be saved to your account and appear on your dashboard.'
                  : "We'll send you a link to access your Kira anytime"}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <label className="flex items-center gap-2 text-stone-600 mb-3">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <span className="font-medium">Your Name</span>
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-violet-500 focus:outline-none"
              placeholder="Your name"
            />
          </div>

          {/* Location */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <label className="flex items-center gap-2 text-stone-600 mb-3">
              <MapPin className="w-5 h-5 text-violet-600" />
              <span className="font-medium">Location</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-violet-500 focus:outline-none"
              placeholder="City, Country"
            />
          </div>

          {/* JOURNEY TYPE — no longer a choice.
              The toggle that stood here offered 🌟 Personal beside 💼 Business on a product that is
              business-only. Removed rather than disabled: a greyed-out option still tells an owner
              there is a version of this he is not getting, and there isn't one. `journeyType` is
              pinned to 'business' in state and still travels in the create payload below, so the
              API contract is unchanged. */}

          {/* Primary Objective */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <label className="flex items-center gap-2 text-stone-600 mb-3">
              <Target className="w-5 h-5 text-violet-600" />
              <span className="font-medium">What do you want to sort out?</span>
            </label>
            <textarea
              value={primaryObjective}
              onChange={(e) => setPrimaryObjective(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-violet-500 focus:outline-none resize-none"
              placeholder="In your own words — what is the thing you want off your plate?"
            />
          </div>

          {/* Key Context */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <label className="text-stone-600 font-medium mb-3 block">Anything she should know</label>
            <div className="space-y-3">
              {keyContext.map((context, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={context}
                    onChange={(e) => updateContextPoint(index, e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-violet-500 focus:outline-none"
                    placeholder="Context point..."
                  />
                  <button
                    type="button"
                    onClick={() => removeContextPoint(index)}
                    className="p-3 rounded-xl bg-white border border-stone-300 text-stone-600 hover:text-red-700 hover:border-red-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addContextPoint}
                className="flex items-center gap-2 text-violet-700 hover:text-violet-900 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add context point
              </button>
            </div>
          </div>

          {/* Success Definition */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <label className="text-stone-600 font-medium mb-3 block">What would good look like? (Optional)</label>
            <textarea
              value={successDefinition}
              onChange={(e) => setSuccessDefinition(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-violet-500 focus:outline-none resize-none"
              placeholder="How will you know you've succeeded?"
            />
          </div>

          {/* Constraints */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <label className="text-stone-600 font-medium mb-3 block">Anything that gets in the way (Optional)</label>
            <div className="space-y-3">
              {constraints.map((constraint, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={constraint}
                    onChange={(e) => updateConstraint(index, e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-violet-500 focus:outline-none"
                    placeholder="Time, money, someone you need to keep out of it..."
                  />
                  <button
                    type="button"
                    onClick={() => removeConstraint(index)}
                    className="p-3 rounded-xl bg-white border border-stone-300 text-stone-600 hover:text-red-700 hover:border-red-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addConstraint}
                className="flex items-center gap-2 text-violet-700 hover:text-violet-900 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add constraint
              </button>
            </div>
          </div>

          {/* ⚠️ SAY WHAT THE BUTTON DOES BEFORE HE PRESSES IT.
              "Create My Kira" was the only irreversible-looking control in the product with no
              statement of consequence, and the FAQ says an owner can have more than one — one per
              business. Ray, who already had a Kira and arrived here from "talk to her":
              "So am I about to create a second? Am I about to overwrite the first? Nothing on the
              screen says. I sat looking at it for a while before pressing it."
              PRODUCT_STANDARDS §9: an irreversible action names its consequence before the click. */}
          <p className="pt-4 text-base leading-relaxed text-stone-600">
            This sets up a Kira for the business described above. It does not replace or delete any
            Kira you already have — if you run more than one business, each gets its own, and you
            choose between them from your overview.
          </p>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl font-medium text-lg transition-all ${
                isSubmitting
                  ? 'bg-stone-300 text-stone-600 cursor-not-allowed'
                  : 'bg-stone-900 text-white hover:bg-stone-800'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating your Kira...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {/* Sentence case. "Create My Kira" reads as a menu command from a 1990s
                      application — Ray: "the capital M makes it look like something the software
                      does to itself rather than something I am doing." */}
                  Create my Kira
                </span>
              )}
            </button>
          </div>

          {/* Back link */}
          <div className="text-center mt-6">
            <a
              href="/start"
              className="text-stone-500 hover:text-stone-700 text-sm"
            >
              ← Start over
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}