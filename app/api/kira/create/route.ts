// app/api/kira/create/route.ts
// Creates an Operational Kira from an approved draft framework
//
// FLOW:
// 1. User completes setup with Setup Kira → draft saved to kira_drafts
// 2. User reviews/edits draft on /setup/draft/[draftId]
// 3. User submits → this endpoint is called with draftId
// 4. We fetch the draft, create ElevenLabs agent, save to kira_agents
// 5. User redirected to /chat/[agentId]
//
// IMPORTANT: Each draft creates a NEW agent. Users can have multiple agents.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentAppUser } from '@/lib/auth';
import {
  getKiraPrompt,
  generateAgentName,
  extractFirstName,
  KiraFramework,
  JourneyType,
} from '@/lib/kira/prompts';
import { bindWorkspaceWebhook, setAllowlist, standardAllowlist, setAgentTools, setAgentOverrides, DEFAULT_AGENT_LLM } from '@caistech/elevenlabs-convai';
import { kiraAllTools, conversationContinuityPrompt } from '@/lib/kira/convai';
import { buildProfileBriefing } from '@/lib/kira/discovery-schema';
import { formatMoneyApprox } from '@/lib/valuation/currency';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

// ElevenLabs Voice & Model Configuration
const ELEVENLABS_CONFIG = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',  // Sarah - warm, friendly female voice
  tts_model: 'eleven_flash_v2',       // English-only, 75ms latency, purpose-built for conversational AI
  // Take the hub default (gpt-4.1-mini) — NEVER hardcode a model here. The hub pins this
  // specifically because gpt-4o-mini DROPS TOOL CALLS as a conversation runs long, which silently
  // disables the whole memory loop: the agent simply stops calling get_conversation_context /
  // recall_memory / save_memory and there is no error anywhere to see. Overriding this is how a
  // correctly-wired loop still ends up with an agent that "doesn't remember".
  llm: DEFAULT_AGENT_LLM,
  temperature: 0.7,                    // Balanced creativity
  max_duration_seconds: 3600,          // 1 hour max conversation
};

/* ------------------------------------------------------------------ */
/* Logging helper                                                      */
/* ------------------------------------------------------------------ */
async function log(
  supabase: any,
  requestId: string,
  step: string,
  status: 'start' | 'success' | 'error',
  message?: string,
  details?: Record<string, any>
) {
  try {
    await supabase.from('kira_logs').insert({
      request_id: requestId,
      step,
      status,
      message,
      details,
    });
  } catch (e) {
    console.error('[kira/create] Log failed:', e);
  }
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const supabase = createServiceClient();

  try {
    await log(supabase, requestId, 'init', 'start');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY missing');
    }

    await log(supabase, requestId, 'env_check', 'success');

    const body = await req.json();
    const { draftId } = body as { draftId: string };

    if (!draftId) {
      throw new Error('draftId missing');
    }

    // Identity is SESSION-derived, never a body-supplied email. This route mints a paid ElevenLabs
    // agent and seeds the user's profile; trusting a caller-supplied email let any caller attribute
    // an agent to another user (and /api/* is NOT covered by the auth middleware). The /setup/draft
    // caller is a USER_PROTECTED route, so an authenticated session is present here.
    const appUser = await getCurrentAppUser();
    if (!appUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await log(supabase, requestId, 'request_parsed', 'success', undefined, {
      draftId,
      userId: appUser.id,
    });

    /* ---------------- Draft ---------------- */
    await log(supabase, requestId, 'draft_load', 'start');

    const { data: draft, error: draftError } = await supabase
      .from('kira_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    // Check if draft was already used
    if (draft.status === 'used') {
      await log(supabase, requestId, 'draft_load', 'error', 'Draft already used');

      // Find the agent that was created from this draft
      const { data: existingAgent } = await supabase
        .from('kira_agents')
        .select('elevenlabs_agent_id, agent_name')
        .eq('draft_id', draftId)
        .single();

      if (existingAgent) {
        return NextResponse.json({
          success: true,
          agentId: existingAgent.elevenlabs_agent_id,
          agentName: existingAgent.agent_name,
          isExisting: true,
          message: 'This draft was already used to create an agent',
        });
      }

      throw new Error('Draft already used but no agent found');
    }

    await log(supabase, requestId, 'draft_load', 'success', undefined, {
      status: draft.status,
      objective: draft.primary_objective,
    });

    /* ---------------- Atomically claim the draft (idempotency) ---------------- */
    // Minting an agent is a ~10s multi-call flow, so a slow client can time out and RETRY (or two
    // tabs submit) — and without a guard each attempt would create a SEPARATE paid ElevenLabs agent.
    // Compare-and-set the draft to 'used' on the exact status we just read: exactly one caller wins.
    // Losers wait briefly for the winner's agent row and return it (idempotent). This replaces the
    // old mark-used-at-the-end step. If agent creation then fails, the ElevenLabs error path releases
    // the claim so the user can retry.
    const { data: claimedDraft } = await supabase
      .from('kira_drafts')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('id', draftId)
      .eq('status', draft.status)
      .select('id')
      .maybeSingle();

    if (!claimedDraft) {
      await log(supabase, requestId, 'draft_claim', 'error', 'Draft already claimed by a concurrent request');
      for (let attempt = 0; attempt < 12; attempt++) {
        const { data: existingAgent } = await supabase
          .from('kira_agents')
          .select('elevenlabs_agent_id, agent_name')
          .eq('draft_id', draftId)
          .maybeSingle();
        if (existingAgent) {
          return NextResponse.json({
            success: true,
            agentId: existingAgent.elevenlabs_agent_id,
            agentName: existingAgent.agent_name,
            isExisting: true,
            message: 'This draft is already being turned into a Kira.',
          });
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      return NextResponse.json(
        { error: 'Your Kira is still being created. Please wait a moment and try again.', requestId },
        { status: 409 },
      );
    }
    await log(supabase, requestId, 'draft_claim', 'success');

    /* ---------------- User (session-derived, not from the request body) ---------------- */
    const firstName = extractFirstName(draft.user_name);
    // The authenticated app-user row already exists (created by the auth-link trigger at signup),
    // so there is no lookup-or-create by email anymore — we attribute the agent to the session user.
    const user = appUser;

    await log(supabase, requestId, 'user_lookup', 'success', undefined, {
      userId: user.id,
    });

    /* ---------------- Build Framework & Prompt ---------------- */
    await log(supabase, requestId, 'prompt_build', 'start');

    const framework: KiraFramework = {
      userName: draft.user_name,
      firstName,
      location: draft.location,
      journeyType: draft.journey_type as JourneyType,
      primaryObjective: draft.primary_objective,
      keyContext: draft.key_context ?? [],
      successDefinition: draft.success_definition,
      constraints: draft.constraints,
    };

    const { systemPrompt, firstMessage } = getKiraPrompt({ framework });

    // Generate agent name with topic for clarity
    // Format: Kira_Dennis_ChocolateCake_7f1c
    const agentName = generateAgentName(
      draft.journey_type,
      firstName,
      draft.primary_objective,
      user.id
    );

    await log(supabase, requestId, 'prompt_build', 'success', undefined, {
      agentName,
      objective: draft.primary_objective,
    });

    /* ---------------- Create ElevenLabs Agent ---------------- */
    await log(supabase, requestId, 'elevenlabs_create', 'start');

    const elevenRes = await fetch(
      'https://api.elevenlabs.io/v1/convai/agents/create',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          name: agentName,
          conversation_config: {
            agent: {
              prompt: {
                // Append the canonical continuity instructions so the agent actually calls
                // get_conversation_context / save_memory / recall_memory (attached below).
                prompt: `${systemPrompt}\n\n${conversationContinuityPrompt}`,
                llm: ELEVENLABS_CONFIG.llm,
                temperature: ELEVENLABS_CONFIG.temperature,
              },
              first_message: firstMessage,
              language: 'en',
            },
            tts: {
              model_id: ELEVENLABS_CONFIG.tts_model,
              voice_id: ELEVENLABS_CONFIG.voice_id,
            },
            conversation: {
              max_duration_seconds: ELEVENLABS_CONFIG.max_duration_seconds,
            },
          },
          // NOTE: the per-agent platform_settings.webhook is deprecated + silently
          // ignored by ElevenLabs — the workspace-scoped post-call webhook is bound
          // after creation via bindWorkspaceWebhook() below.
        }),
      }
    );

    if (!elevenRes.ok) {
      const text = await elevenRes.text();
      await log(
        supabase,
        requestId,
        'elevenlabs_create',
        'error',
        'ElevenLabs HTTP error',
        { status: elevenRes.status, response: text }
      );
      // No agent was created — release the claim so the user (or a retry) can create it again,
      // instead of the draft being stranded 'used' with no agent behind it.
      await supabase
        .from('kira_drafts')
        .update({ status: draft.status, used_at: null })
        .eq('id', draftId);
      throw new Error(`ElevenLabs create failed: ${elevenRes.status}`);
    }

    const elevenData = await elevenRes.json();
    const agentId = elevenData.agent_id;

    await log(supabase, requestId, 'elevenlabs_create', 'success', undefined, {
      agentId,
    });

    /* ---------------- Post-create ElevenLabs binding (parallel, all non-fatal) ---------------- */
    // webhook bind + origin allowlist + tool attach are independent ElevenLabs round-trips. Running
    // them sequentially added ~15s to the request (allowlist ~7s, tools ~5s) — enough for a slow
    // client to time out and retry. They're all non-fatal, so run them concurrently; a failure in one
    // never blocks the others or the response.
    await Promise.allSettled([
      // Bind the workspace-scoped post-call webhook (the per-agent platform_settings.webhook shape is
      // deprecated + silently ignored). The signing secret is returned only on first creation —
      // capture it into ELEVENLABS_WEBHOOK_SECRET.
      (async () => {
        try {
          const { webhookSecret } = await bindWorkspaceWebhook(ELEVENLABS_API_KEY, agentId, {
            name: 'Kira post-call',
            url: `${APP_URL}/api/kira/webhook`,
          });
          await log(
            supabase,
            requestId,
            'webhook_bind',
            'success',
            webhookSecret
              ? 'workspace webhook created — set ELEVENLABS_WEBHOOK_SECRET to the returned secret (shown once)'
              : 'reused existing workspace webhook',
            { secretReturned: Boolean(webhookSecret) }   // never log the secret value
          );
          if (webhookSecret) {
            console.warn('[kira/create] Workspace post-call webhook CREATED — set ELEVENLABS_WEBHOOK_SECRET env to the returned secret (ElevenLabs shows it once).');
          }
        } catch (e: any) {
          await log(supabase, requestId, 'webhook_bind', 'error', e?.message ?? 'webhook bind failed');
          console.error('[kira/create] webhook bind failed:', e);
        }
      })(),
      // Lock the agent's origin allowlist — without it, anyone who reads the agent ID from the client
      // bundle can run free voice calls on the workspace key (VOICE AI rule).
      (async () => {
        try {
          await setAllowlist(ELEVENLABS_API_KEY, agentId, standardAllowlist(new URL(APP_URL).hostname));
          await log(supabase, requestId, 'allowlist_set', 'success');
        } catch (e: any) {
          await log(supabase, requestId, 'allowlist_set', 'error', e?.message ?? 'allowlist set failed');
          console.error('[kira/create] allowlist set failed (non-fatal):', e);
        }
      })(),
      // Attach the canonical memory/continuity tools (an agent created without tools can't call
      // get_conversation_context / save_memory / recall_memory) as workspace entities on
      // prompt.tool_ids + enable per-session overrides.
      (async () => {
        try {
          await setAgentTools(ELEVENLABS_API_KEY, agentId, kiraAllTools(APP_URL, user.id));
          await setAgentOverrides(ELEVENLABS_API_KEY, agentId);
          await log(supabase, requestId, 'tools_attach', 'success');
        } catch (e: any) {
          await log(supabase, requestId, 'tools_attach', 'error', e?.message ?? 'tool attach failed');
          console.error('[kira/create] tool attach failed (non-fatal):', e);
        }
      })(),
    ]);

    /* ---------------- Save Agent to Database ---------------- */
    await log(supabase, requestId, 'agent_save', 'start');

    const { data: savedAgent, error: agentError } = await supabase
      .from('kira_agents')
      .insert({
        user_id: user.id,
        agent_name: agentName,
        journey_type: draft.journey_type,
        elevenlabs_agent_id: agentId,
        framework,
        draft_id: draftId,
        status: 'active',
        voice_id: ELEVENLABS_CONFIG.voice_id,
      })
      .select('id')
      .single();

    if (agentError) {
      await log(supabase, requestId, 'agent_save', 'error', 'Failed to save agent', { error: agentError });
      // Don't throw - agent was created in ElevenLabs, we should still return it
      console.error('[kira/create] Failed to save agent to DB:', agentError);
    } else {
      await log(supabase, requestId, 'agent_save', 'success');
    }

    /* ---------------- Brief the new Kira from the Client Profile (if discovery ran) ---------- */
    // A Kira created AFTER discovery should walk in already knowing the person. Seed the
    // operational agent's memory with the profile briefing so its recall surfaces it from the
    // first conversation. Non-fatal.
    if (savedAgent?.id) {
      try {
        const { data: cp } = await supabase
          .from('client_profiles')
          .select('profile')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cp?.profile) {
          await supabase.from('kira_memory').insert({
            user_id: user.id,
            kira_agent_id: savedAgent.id,
            memory_type: 'context',
            content: buildProfileBriefing(cp.profile),
            importance: 9,
            tags: ['client_profile', 'discovery'],
          });
          await log(supabase, requestId, 'profile_brief', 'success');
        }
      } catch (e: any) {
        console.error('[kira/create] profile briefing seed failed (non-fatal):', e?.message ?? e);
      }
    }

    /* ---------------- Seed her with what he just told us ---------------------------------- */
    //
    // "THIS IS OUR FIRST CONVERSATION" — the worst sentence in the product, and the cause is half a
    // design.
    //
    // Ray, 7 August, having answered eleven questions, typed thirty-five years of history and "I
    // haven't told my staff or my family" into a screen headed CREATE MY KIRA, and pressed the
    // button. His first question to her was what she already knew. She said: "I don't have any
    // details about your business yet. This is our first conversation." The landing page promises
    // the opposite twice.
    //
    // WHY. `buildFrameworkSection` deliberately keeps the brief OUT of the prompt, and that decision
    // is correct — a profile baked in at signup freezes on the day the account was made, which is
    // how an agent came to describe a months-old objective as today's work. The section says so, and
    // points at the replacement: "everything about what he is WORKING ON comes from
    // get_conversation_context and recall_memory."
    //
    // Nothing ever wrote it there. The prompt correctly defers to memory and memory is empty. So the
    // fix is not to re-bake it into the prompt — it is to finish the half that was designed and
    // never built, which is also what the /start retirement decision says: let it persist through
    // the memory tools rather than a provisioning-time prompt, so it stays updatable as the business
    // changes.
    //
    // Non-fatal throughout: a failed seed must never cost him the agent he just paid for and waited
    // eight seconds to meet.
    if (savedAgent?.id) {
      const seeds: Array<{ content: string; tags: string[]; importance: number }> = [];

      // What he typed, in his words. `primary_objective` is the paragraph from the brief form.
      const brief = String(draft.primary_objective ?? '').trim();
      if (brief) {
        seeds.push({
          content: `What he said he wants to work on, in his own words when he set me up: ${brief}`,
          tags: ['setup_brief', 'owner'],
          importance: 9,
        });
      }
      for (const point of (draft.key_context ?? []) as string[]) {
        const text = String(point ?? '').trim();
        if (text) seeds.push({ content: text, tags: ['setup_brief', 'owner'], importance: 8 });
      }
      const success = String(draft.success_definition ?? '').trim();
      if (success) {
        seeds.push({
          content: `What he said good looks like: ${success}`,
          tags: ['setup_brief', 'owner'],
          importance: 8,
        });
      }

      // The valuation he ran before signing up. He watched the product compute it and put it on his
      // own dashboard; being asked to UPLOAD it to her is the version of this that reads worst.
      try {
        const { data: val } = await supabase
          .from('business_valuations')
          .select('worth_today, worth_potential, gap, industry')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (val) {
          seeds.push({
            content:
              `His own valuation, from the eleven questions he answered before signing up` +
              `${val.industry ? ` (${val.industry})` : ''}: worth today ${formatMoneyApprox(Number(val.worth_today) || 0)}, ` +
              `worth once his knowledge is captured ${formatMoneyApprox(Number(val.worth_potential) || 0)}, ` +
              `so the gap is ${formatMoneyApprox(Number(val.gap) || 0)}. ` +
              `These are HIS figures from HIS answers — never ask him to send them to me.`,
            tags: ['valuation', 'owner'],
            importance: 9,
          });
        }
      } catch (e: any) {
        console.error('[kira/create] valuation seed lookup failed (non-fatal):', e?.message ?? e);
      }

      if (seeds.length) {
        try {
          await supabase.from('kira_memory').insert(
            seeds.map((s) => ({
              user_id: user.id,
              kira_agent_id: savedAgent.id,
              memory_type: 'context',
              content: s.content,
              importance: s.importance,
              tags: s.tags,
            })),
          );
          await log(supabase, requestId, 'setup_brief_seed', 'success', undefined, { count: seeds.length });
        } catch (e: any) {
          console.error('[kira/create] setup brief seed failed (non-fatal):', e?.message ?? e);
        }
      }
    }

    // (The draft was already claimed as 'used' up front — no separate mark-used step needed.)

    await log(supabase, requestId, 'complete', 'success', undefined, {
      agentId,
      agentName,
    });

    return NextResponse.json({
      success: true,
      agentId,
      agentName,
      requestId,
    });

  } catch (err: any) {
    console.error('[kira/create] Error:', err);

    await log(
      supabase,
      requestId,
      'fatal',
      'error',
      err?.message ?? 'Unknown error'
    );

    return NextResponse.json(
      { error: err?.message || 'Create failed', requestId },
      { status: 500 }
    );
  }
}