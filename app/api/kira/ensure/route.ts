// app/api/kira/ensure/route.ts
//
// On-demand, org-scoped provisioning of the organisation's active BUSINESS Kira.
//
// This is the "normal user opens /talk and simply gets a Kira" path (no setup draft). It is a
// POST because the first call mints a paid vendor resource. It is IDEMPOTENT: an existing active
// business agent for the organisation is returned without touching ElevenLabs.
//
// Identity is canonical + session-derived: organisation scope from
// getCurrentOrganisationContext() (401 without it), tools ?uid baked from the canonical person id,
// and kira_agents.user_id provenance stored against the legacy FK users(id) that the table still
// carries.

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServiceClientV2 } from '@/lib/supabase/server';
import {
  getCurrentOrganisationContext,
  getCurrentAppUser,
  getAuthUser,
} from '@/lib/auth';
import {
  getKiraPrompt,
  generateAgentName,
  type JourneyType,
} from '@/lib/kira/prompts';
import {
  bindWorkspaceWebhook,
  setAllowlist,
  standardAllowlist,
  setAgentTools,
  setAgentOverrides,
  getAgent,
  DEFAULT_AGENT_LLM,
} from '@caistech/elevenlabs-convai';
import { kiraAllTools, conversationContinuityPrompt } from '@/lib/kira/convai';
import { haltState } from '@/lib/kill-switch';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

// Mirror the create-route default so the two provisioning paths agree.
const ELEVENLABS_CONFIG = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',
  tts_model: 'eleven_flash_v2',
  llm: DEFAULT_AGENT_LLM,
  temperature: 0.7,
  max_duration_seconds: 3600,
};

const JOURNEY: JourneyType = 'business';

/* ------------------------------------------------------------------ */
/* Logging helper (identical shape to /api/kira/create)                 */
/* ------------------------------------------------------------------ */
async function log(
  supabase: any,
  requestId: string,
  step: string,
  status: 'start' | 'success' | 'error',
  message?: string,
  details?: Record<string, any>,
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
    console.error('[kira/ensure] Log failed:', e);
  }
}

/* ------------------------------------------------------------------ */
/* POST /api/kira/ensure                                                */
/* ------------------------------------------------------------------ */

export async function POST() {
  const requestId = randomUUID();
  const supabase = createServiceClientV2();

  try {
    await log(supabase, requestId, 'init', 'start');

    // Kill-switch gate — same chokepoint as chat/start and create: a payable vendor resource is
    // about to be minted, and a refusal must not land one more row that /talk cannot resolve.
    const halt = await haltState('conversations');
    if (halt.halted) {
      console.warn('[kill-switch] refused ensure:', halt.scope, halt.reason);
      return NextResponse.json(
        { error: 'Kira is briefly unavailable. Please try again shortly.' },
        { status: 503 },
      );
    }

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY missing');
    }

    // Session-derived identity. Never trust a body for who owns the minted agent.
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgContext = await getCurrentOrganisationContext();
    if (!orgContext) {
      return NextResponse.json({ error: 'No organisation access' }, { status: 401 });
    }

    // -----------------------------------------------------------------
    // Idempotent fast path: an active business Kira already exists.
    // -----------------------------------------------------------------
    const { data: existing } = await supabase
      .from('kira_agents')
      .select('id, elevenlabs_agent_id')
      .eq('person_id', orgContext.personId)
      .eq('journey_type', JOURNEY)
      .eq('status', 'active')
      .maybeSingle();

    if (existing?.elevenlabs_agent_id) {
      await log(
        supabase,
        requestId,
        'reuse',
        'success',
        undefined,
        { agentId: existing.elevenlabs_agent_id },
      );
      return NextResponse.json({
        success: true,
        agentId: existing.elevenlabs_agent_id,
        created: false,
      });
    }

    // -----------------------------------------------------------------
    // Resolve legacy users.id for the FK and canonical personId for tools.
    // -----------------------------------------------------------------
    let legacyUserId: string | null = null;
    const authSession = await getAuthUser();
    if (authSession) {
      const { data: legacyRow, error: legacyError  } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authSession.id)
        .maybeSingle();

      if (legacyError) {
        throw new Error(
          `Failed to resolve legacy users row: ${legacyError.message}`,
        );
      }

      legacyUserId = (legacyRow?.id as string) ?? null;
    }

    // -----------------------------------------------------------------
    // Build the minimal framework + prompt + agent name.
    //
    // No draft exists on this path. `buildFrameworkSection` deliberately
    // holds the objective out of the prompt (it goes stale), pulling
    // current focus live via get_conversation_context / recall_memory, so
    // an honest empty framework is the correct on-demand state.
    // -----------------------------------------------------------------
    const { data: person } = await supabase
      .from('persons')
      .select('first_name')
      .eq('person_id', orgContext.personId)
      .maybeSingle();

    const firstName = ((person?.first_name as string) || 'there').trim();

    const framework = {
      userName: firstName,
      firstName,
      location: '',
      journeyType: JOURNEY,
      primaryObjective: '',
      keyContext: [] as string[],
    };

    const { systemPrompt, firstMessage } = getKiraPrompt({ framework });
    const agentName = generateAgentName(
      JOURNEY,
      firstName,
      '',
      orgContext.personId,
    );

    await log(supabase, requestId, 'prompt_build', 'success', undefined, {
      agentName,
    });


//        await log(supabase, requestId, 'prompt_build', 'success', undefined, {
//          agentName,
//        });

        // -----------------------------------------------------------------
        // FINAL IDENTITY GUARD — do not mint a paid ElevenLabs resource
        // until the legacy users.id required by kira_agents.user_id is
        // confirmed for the authenticated session.
        //
        // Canonical identity remains:
        //   orgContext.personId     → canonical Person
        //   orgContext.organisationId → canonical Organisation
        //
        // kira_agents.user_id is currently a NOT NULL compatibility/provenance
        // column, so we must resolve it BEFORE creating the external agent.
        // -----------------------------------------------------------------
        if (!legacyUserId) {
          await log(
            supabase,
            requestId,
            'identity_validation',
            'error',
            'Authenticated user has no legacy users row required by kira_agents.user_id',
            {
              authUserId: authSession?.id ?? null,
              personId: orgContext.personId,
              organisationId: orgContext.organisationId,
            },
          );

          return NextResponse.json(
            {
              error: 'Account identity is incomplete. Kira cannot be provisioned yet.',
              requestId,
            },
            { status: 409 },
          );
        }


    // -----------------------------------------------------------------
    // Mint the ElevenLabs agent.
    // -----------------------------------------------------------------
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
          // ignored — the workspace-scoped post-call webhook is bound after creation
          // via bindWorkspaceWebhook() below.
        }),
      },
    );

    if (!elevenRes.ok) {
      const text = await elevenRes.text();
      await log(
        supabase,
        requestId,
        'elevenlabs_create',
        'error',
        'ElevenLabs HTTP error',
        { status: elevenRes.status, response: text },
      );
      throw new Error(`ElevenLabs create failed: ${elevenRes.status}`);
    }

    const elevenData = await elevenRes.json();
    const agentId = elevenData.agent_id as string;

    await log(supabase, requestId, 'elevenlabs_create', 'success', undefined, {
      agentId,
    });

    // -----------------------------------------------------------------
    // Post-create binding — webhook + allowlist first, THEN tools.
    //
    // The sequencing matches /api/kira/create exactly. Webhook and
    // allowlist are independent and run concurrently; the tool attach
    // (a read-modify-write on the agent object) runs AFTER both have
    // landed to remove the measured write-window race. See the create
    // route's extensive comment block for the full race account.
    // -----------------------------------------------------------------
    await Promise.allSettled([
      // Workspace-scoped post-call webhook.
      (async () => {
        try {
          const { webhookSecret } = await bindWorkspaceWebhook(
            ELEVENLABS_API_KEY,
            agentId,
            {
              name: 'Kira post-call',
              url: `${APP_URL}/api/kira/webhooks/post-call`,
            },
          );
          await log(
            supabase,
            requestId,
            'webhook_bind',
            'success',
            webhookSecret
              ? 'workspace webhook created — set ELEVENLABS_WEBHOOK_SECRET to the returned secret (shown once)'
              : 'reused existing workspace webhook',
            { secretReturned: Boolean(webhookSecret) },
          );
          if (webhookSecret) {
            console.warn(
              '[kira/ensure] Workspace post-call webhook CREATED — set ELEVENLABS_WEBHOOK_SECRET env to the returned secret (ElevenLabs shows it once).',
            );
          }
        } catch (e: any) {
          await log(
            supabase,
            requestId,
            'webhook_bind',
            'error',
            e?.message ?? 'webhook bind failed',
          );
          console.error('[kira/ensure] webhook bind failed:', e);
        }
      })(),
      // Lock the agent's origin allowlist (VOICE AI rule).
      (async () => {
        try {
          await setAllowlist(
            ELEVENLABS_API_KEY,
            agentId,
            standardAllowlist(new URL(APP_URL).hostname),
          );
          await log(supabase, requestId, 'allowlist_set', 'success');
        } catch (e: any) {
          await log(
            supabase,
            requestId,
            'allowlist_set',
            'error',
            e?.message ?? 'allowlist set failed',
          );
          console.error('[kira/ensure] allowlist set failed (non-fatal):', e);
        }
      })(),
    ]);

    // Attach the canonical memory/continuity tools AFTER the platform_settings writes so their
    // patches cannot land inside setAgentTools's read-modify-write window.
    await (async () => {
      const desired = kiraAllTools(APP_URL, orgContext.personId);
      const attachedCount = async (): Promise<number> => {
        const live: any = await getAgent(ELEVENLABS_API_KEY, agentId);
        return (live?.conversation_config?.agent?.prompt?.tool_ids ?? []).length;
      };

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          await setAgentTools(ELEVENLABS_API_KEY, agentId, desired);
          await setAgentOverrides(ELEVENLABS_API_KEY, agentId);
          const observed = await attachedCount();
          if (observed >= desired.length) {
            await log(
              supabase,
              requestId,
              'tools_attach',
              'success',
              undefined,
              { observed, expected: desired.length, attempt },
            );
            return;
          }
          if (attempt === 2) {
            await log(
              supabase,
              requestId,
              'tools_attach',
              'error',
              `attached ${observed} of ${desired.length} tools after 2 attempts — memory will not work`,
              { observed, expected: desired.length },
            );
            console.error(
              `[kira/ensure] agent ${agentId} has ${observed}/${desired.length} tools after retry`,
            );
          }
        } catch (e: any) {
          if (attempt === 2) {
            await log(
              supabase,
              requestId,
              'tools_attach',
              'error',
              e?.message ?? 'tool attach failed',
            );
            console.error('[kira/ensure] tool attach failed (non-fatal):', e);
          }
        }
      }
    })();

    // -----------------------------------------------------------------
    // Save to kira_agents — live columns only, NEVER swallowed on failure.
    //
    // A row write failure is loud: an ElevenLabs agent with no row is an
    // orphan no server-side lookup resolves (the exact 08-05 failure mode
    // the create route's extensive comment block documents).
    //
    // On 23505 (unique violation from the org+journey partial index):
    // a concurrent ensure or a draft approval won the race between our
    // initial lookup and our insert. Keep the winner, best-effort delete
    // the just-minted ElevenLabs agent to avoid a second paid orphan,
    // and return the winner.
    // -----------------------------------------------------------------
    const { data: saved, error: insertError } = await supabase
      .from('kira_agents')
      .insert({
        person_id: orgContext.personId,
        organisation_id: orgContext.organisationId,
        // Provenance against the legacy FK users(id), NOT NULL, still carried.
        user_id: legacyUserId,
        agent_name: agentName,
        journey_type: JOURNEY,
        elevenlabs_agent_id: agentId,
        status: 'active',
        voice_id: ELEVENLABS_CONFIG.voice_id,
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        await log(
          supabase,
          requestId,
          'agent_save',
          'error',
          'duplicate on insert — reconciling to the winner',
          { race: true },
        );
        const { data: winner } = await supabase
          .from('kira_agents')
          .select('id, elevenlabs_agent_id')
          .eq('person_id', orgContext.personId)
          .eq('journey_type', JOURNEY)
          .eq('status', 'active')
          .maybeSingle();
        // Best-effort delete the just-minted orphan (avoids a second paid agent under the org).
        await fetch(
          `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
          {
            method: 'DELETE',
            headers: { 'xi-api-key': ELEVENLABS_API_KEY },
          },
        ).catch(() => {});
        if (winner?.elevenlabs_agent_id) {
          return NextResponse.json({
            success: true,
            agentId: winner.elevenlabs_agent_id,
            created: false,
          });
        }
      }
      await log(
        supabase,
        requestId,
        'agent_save',
        'error',
        'Failed to save agent — the live agent has no row',
        { error: insertError, agentId },
      );
      console.error(
        '[kira/ensure] agent %s has NO kira_agents row:',
        agentId,
        insertError,
      );
      return NextResponse.json(
        { error: 'Failed to save agent' },
        { status: 502 },
      );
    }

    await log(supabase, requestId, 'agent_save', 'success', undefined, {
      rowId: saved?.id,
    });

    return NextResponse.json({ success: true, agentId, created: true });
  } catch (err: any) {
    console.error('[kira/ensure] Error:', err);
    await log(supabase, requestId, 'fatal', 'error', err?.message ?? 'Unknown error');
    return NextResponse.json(
      { error: err?.message || 'Provisioning failed', requestId },
      { status: 500 },
    );
  }
}
