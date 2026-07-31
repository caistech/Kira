// app/api/kira/chat/text/route.ts
//
// TALKING TO KIRA BY TYPING — the second way in.
//
// WHY THIS EXISTS, and it is two reasons, not one:
//
//   1. A microphone is not a given. The commonest cause of "no mic" is not a missing device, it is
//      an owner clicking Block on the permission prompt — which for a sixty-something who has told
//      nobody he is selling is a likely first move, not an edge case. Until now that ended the
//      product: the entire interface is voice.
//   2. He has asked for this repeatedly in his own words — he cannot paste a URL or a message, only
//      upload a file. Four separate memories say so. It was never a fallback request.
//
// ONE KIRA, TWO TRANSPORTS. The system prompt is READ FROM THE LIVE ELEVENLABS AGENT rather than
// rebuilt here. A second persona assembled from the same ingredients is a second persona: it drifts
// the first time either side is edited, and the drift shows up as her being a slightly different
// person depending on how you spoke to her. Reading the deployed prompt means text-Kira is voice-
// Kira, including every patch applied to live agents that never went through this repo.
//
// IT WRITES TO THE SAME MEMORY. Turns are persisted into the same conversations/messages tables the
// voice path uses, against a conversation row marked `text`. That is what makes this a real second
// interface rather than a chat toy: what he types builds the Genome exactly as what he says does.
// Distillation runs on `end`, which is the text equivalent of the post-call webhook.
//
// @machine-callable — no, deliberately: this is called by the owner's browser and authenticates as
// the owner. It is listed here only to stop someone marking it machine-callable by pattern-matching
// on /api.

import { NextRequest, NextResponse } from 'next/server';
import { completeConversationMemory } from '@caistech/elevenlabs-convai';

import { getCurrentAppUser, isCurrentUserAdmin } from '@/lib/auth';
import { haltState } from '@/lib/kill-switch';
import { KIRA_CONVAI_TABLES } from '@/lib/kira/convai';
import { createMemoryExtractor } from '@/lib/kira/memory-extract';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How much of the conversation is replayed to the model. Enough for continuity, bounded for cost. */
const HISTORY_TURNS = 20;

/** Longest single message accepted. A paste of a whole document belongs in the upload path. */
const MAX_MESSAGE = 4000;

/**
 * Her prompt, taken from the agent that is actually deployed.
 *
 * Returns null rather than a default on any failure, and the caller refuses the turn. Answering with
 * a generic assistant persona would be the worst outcome available: the owner would be talking to
 * something that is not Kira, in Kira's window, with no way to tell.
 */
async function livePromptFor(elevenlabsAgentId: string): Promise<string | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${elevenlabsAgentId}`, {
      headers: { 'xi-api-key': key },
    });
    if (!res.ok) {
      console.error(`[chat/text] could not read agent prompt (${res.status})`);
      return null;
    }
    const json = (await res.json()) as {
      conversation_config?: { agent?: { prompt?: { prompt?: string } } };
    };
    const prompt = json.conversation_config?.agent?.prompt?.prompt;
    return typeof prompt === 'string' && prompt.trim() ? prompt : null;
  } catch (error) {
    console.error('[chat/text] agent prompt fetch failed:', error);
    return null;
  }
}

/** What she already knows about him, so typing is not a conversation with a stranger. */
async function recalledFacts(supabase: ReturnType<typeof createServiceClient>, userId: string): Promise<string> {
  const { data } = await supabase
    .from(KIRA_CONVAI_TABLES.memory)
    .select('content')
    .eq('user_id', userId)
    .neq('active', false)
    .order('importance', { ascending: false, nullsFirst: false })
    .limit(30);
  const facts = (data ?? []).map((m) => `- ${String(m.content ?? '').trim()}`).filter((l) => l.length > 2);
  return facts.length ? `\n\nWHAT YOU ALREADY KNOW ABOUT THIS BUSINESS:\n${facts.join('\n')}` : '';
}

export async function POST(req: NextRequest) {
  // Same chokepoint as the voice start route. Halting one and not the other would be a control that
  // only appears to work.
  const halt = await haltState('conversations');
  if (halt.halted) {
    console.warn('[kill-switch] refused text turn:', halt.scope, halt.reason);
    return NextResponse.json(
      { error: 'Kira is briefly unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }

  let body: { agentId?: string; message?: string; conversationId?: string; end?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const agentId = String(body.agentId ?? '').trim();
  if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });

  const appUser = await getCurrentAppUser();
  if (!appUser?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const supabase = createServiceClient();

  // OWNERSHIP, exactly as the voice route enforces it. These are per-user private agents, and the
  // memory behind them is the owner's business. An admin may open one; nobody else may.
  const { data: agent } = await supabase
    .from(KIRA_CONVAI_TABLES.agents)
    .select('id, user_id, elevenlabs_agent_id, status')
    .eq('elevenlabs_agent_id', agentId)
    .maybeSingle();
  if (!agent) return NextResponse.json({ error: 'Kira agent not found' }, { status: 404 });
  if (agent.user_id !== appUser.id && !(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'Not your Kira' }, { status: 403 });
  }

  /* ---------------------------------------------------------------- */
  /* End of session — distil, exactly as the post-call webhook does.   */
  /* ---------------------------------------------------------------- */
  if (body.end) {
    const conversationId = String(body.conversationId ?? '').trim();
    if (!conversationId) return NextResponse.json({ ok: true, distilled: false });
    try {
      // The synthetic id this session was opened with. The canonical pipeline requires one; text
      // sessions have no ElevenLabs conversation, so they carry a `text:` id of our own.
      const { data: conv } = await supabase
        .from(KIRA_CONVAI_TABLES.conversations)
        .select('elevenlabs_conversation_id')
        .eq('id', conversationId)
        .maybeSingle();
      const memory = await completeConversationMemory(supabase, {
        conversationId,
        elevenlabsConversationId: String(conv?.elevenlabs_conversation_id ?? `text:${conversationId}`),
        userId: agent.user_id as string,
        extract: createMemoryExtractor(process.env.OPENAI_API_KEY || ''),
        tables: KIRA_CONVAI_TABLES,
        semantic: { scopePrefix: 'kira-user-' },
      });
      if (memory.errors.length) console.error('[chat/text] distil reported:', memory.errors.join('; '));
      return NextResponse.json({ ok: true, distilled: true });
    } catch (error) {
      // Never fatal to the owner. He has finished typing; the worst outcome is that this turn's
      // facts wait for the next distil rather than that his session ends in an error.
      console.error('[chat/text] distil failed (messages are safe):', error);
      return NextResponse.json({ ok: true, distilled: false });
    }
  }

  const message = String(body.message ?? '').trim();
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 });
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: 'That is longer than I can take in one message — send it in parts, or upload it as a file.' },
      { status: 413 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Degrade honestly: say we cannot answer, rather than answering as something that is not her.
    return NextResponse.json({ error: 'Typing to Kira is not available right now.' }, { status: 503 });
  }

  const systemPrompt = await livePromptFor(agentId);
  if (!systemPrompt) {
    return NextResponse.json(
      { error: "I couldn't reach Kira just now — nothing has been lost, try again in a moment." },
      { status: 503 },
    );
  }

  /* ---------------------------------------------------------------- */
  /* The conversation row — one per typing session, reused per turn.   */
  /* ---------------------------------------------------------------- */
  let conversationId = String(body.conversationId ?? '').trim();
  if (!conversationId) {
    const { data: created, error: convError } = await supabase
      .from(KIRA_CONVAI_TABLES.conversations)
      .insert({
        user_id: agent.user_id,
        // The INTERNAL agent id — this table keys on kira_agents.id, not the ElevenLabs one.
        kira_agent_id: agent.id,
        // Marked so a typed session is distinguishable from a spoken one everywhere downstream —
        // in the Genome's provenance, and when someone later asks how he actually uses her.
        elevenlabs_conversation_id: `text:${crypto.randomUUID()}`,
        started_at: new Date().toISOString(),
        status: 'active',
      })
      .select('id')
      .single();
    if (convError || !created) {
      console.error('[chat/text] could not open a conversation:', convError);
      return NextResponse.json({ error: 'Could not start that just now.' }, { status: 500 });
    }
    conversationId = created.id as string;
  }

  const { data: history } = await supabase
    .from(KIRA_CONVAI_TABLES.messages)
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(HISTORY_TURNS);

  const facts = await recalledFacts(supabase, agent.user_id as string);

  const messages = [
    { role: 'system' as const, content: `${systemPrompt}${facts}\n\nThe owner is TYPING to you rather than speaking. Reply in the same voice you would use aloud, but write it — no stage directions, no "*smiles*", and keep it short enough to read on a phone.` },
    ...(history ?? []).map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: String(m.content ?? ''),
    })),
    { role: 'user' as const, content: message },
  ];

  let reply: string;
  try {
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.KIRA_TEXT_MODEL || process.env.KIRA_EXTRACTION_MODEL || 'gpt-4.1-mini',
        messages,
        max_tokens: 600,
      }),
    });
    if (!res.ok) throw new Error(`model returned ${res.status}`);
    const json = await res.json();
    reply = String(json?.choices?.[0]?.message?.content ?? '').trim();
    if (!reply) throw new Error('empty reply');
  } catch (error) {
    console.error('[chat/text] model call failed:', error);
    // His message is NOT persisted on failure. A turn stored with no answer would resurface in the
    // next session's history as something she ignored.
    return NextResponse.json(
      { error: "I didn't catch that one — say it again?" },
      { status: 502 },
    );
  }

  // Both turns, in order, into the same tables the voice path writes to. Awaited, not fired and
  // forgotten: on a serverless runtime a floating promise means "maybe", which is how the task
  // mirror lost six rows.
  const now = new Date().toISOString();
  const stamp = { user_id: agent.user_id, kira_agent_id: agent.id, conversation_id: conversationId };
  const { error: writeError } = await supabase.from(KIRA_CONVAI_TABLES.messages).insert([
    { ...stamp, role: 'user', content: message, created_at: now },
    { ...stamp, role: 'assistant', content: reply, created_at: new Date(Date.now() + 1).toISOString() },
  ]);
  if (writeError) {
    // Answered but unrecorded. He gets his reply — refusing it would be a worse outcome than a gap
    // in the transcript — and the failure is logged loudly, because a Genome built from a lossy
    // record is the quiet version of this product not working.
    console.error('[chat/text] could not persist the turn:', writeError);
  }

  return NextResponse.json({ reply, conversationId });
}
