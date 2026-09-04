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

import { getCurrentOrganisationContext, isCurrentUserAdmin } from '@/lib/auth';
import { haltState } from '@/lib/kill-switch';
import { KIRA_CONVAI_TABLES } from '@/lib/kira/convai';
import { createMemoryExtractor } from '@/lib/kira/memory-extract';
import { claimsWorkState, runTextTool, textToolsFor } from '@/lib/kira/text-tools';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { sweepConversationForRefusals } from '@/lib/kira/refusal-sweep';

import { parkedOtherBusinesses } from '@/lib/kira/other-businesses';
import { forgetParkedEntityLeaks } from '@/lib/kira/entity-sweep';
import { classifyPendingMemories } from '@/lib/genome/derive';
import { sweepDuplicateMemories } from '@/lib/genome/dedupe-sweep-apply';
import { refileAssistantCapabilityClaims } from '@/lib/kira/capability-sweep';
import { readTaskLedger } from '@/lib/kira/swarm/open-tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How much of the conversation is replayed to the model. Enough for continuity, bounded for cost. */
const HISTORY_TURNS = 20;

/** Longest single message accepted. A paste of a whole document belongs in the upload path. */
const MAX_MESSAGE = 4000;

/**
 * How many times the model may call tools before it must answer.
 *
 * Bounded because a loop here is billed per round AND runs while the owner watches a blank window.
 * Four is enough for the deepest real chain (search_drive → read_document → dispatch_task →
 * approve_task) with nothing left over for a model that has started calling in circles.
 */
const MAX_TOOL_ROUNDS = 4;

/**
 * Her tool list, cached per agent.
 *
 * Resolving it costs one request per tool (ElevenLabs returns ids, not names), which is fine once
 * and absurd on every keystroke-to-send. The list only changes when the fleet is re-provisioned, so
 * a short TTL costs one slow turn after a deploy and nothing after that.
 */
const toolNameCache = new Map<string, { names: string[]; at: number }>();
const TOOL_CACHE_MS = 10 * 60 * 1000;

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

/**
 * WHICH TOOLS SHE HOLDS — read from the deployed agent, exactly as her prompt is.
 *
 * The same reasoning that made the prompt authoritative applies to the tool list: a set maintained
 * here would be a second opinion about what she can do, and would drift the first time the fleet
 * moved. Reading it means a tool added by a re-provision reaches the typed transport by itself.
 *
 * Returns [] on any failure, which degrades to a conversation with no tools rather than refusing
 * the turn — she can still talk, and saying nothing at all would be the worse trade.
 */
async function liveToolNamesFor(elevenlabsAgentId: string): Promise<string[]> {
  const cached = toolNameCache.get(elevenlabsAgentId);
  if (cached && Date.now() - cached.at < TOOL_CACHE_MS) return cached.names;

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return [];
  try {
    const headers = { 'xi-api-key': key };
    const agentRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${elevenlabsAgentId}`, { headers });
    if (!agentRes.ok) return [];
    const agent = (await agentRes.json()) as {
      conversation_config?: { agent?: { prompt?: { tool_ids?: string[] } } };
    };
    const toolIds = agent.conversation_config?.agent?.prompt?.tool_ids ?? [];

    const names = (
      await Promise.all(
        toolIds.map(async (id) => {
          try {
            const res = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${id}`, { headers });
            if (!res.ok) return null;
            const tool = (await res.json()) as { tool_config?: { name?: string } };
            return tool.tool_config?.name ?? null;
          } catch {
            return null;
          }
        }),
      )
    ).filter((n): n is string => Boolean(n));

    toolNameCache.set(elevenlabsAgentId, { names, at: Date.now() });
    return names;
  } catch (error) {
    console.error('[chat/text] could not resolve the agent tool list:', error);
    return [];
  }
}

/** What she already knows about him, so typing is not a conversation with a stranger. */
async function recalledFacts(
  supabase: ReturnType<typeof createServiceClientV2>,
  organisationId: string,
): Promise<string> {
  const { data } = await supabase
    .from(KIRA_CONVAI_TABLES.memory)
    .select('content')
    .eq('organisation_id', organisationId)
    .neq('active', false)
    .order('importance', { ascending: false, nullsFirst: false })
    .limit(30);
  const facts = (data ?? []).map((m) => `- ${String(m.content ?? '').trim()}`).filter((l) => l.length > 2);
  return facts.length ? `\n\nWHAT YOU ALREADY KNOW ABOUT THIS BUSINESS:\n${facts.join('\n')}` : '';
}

/**
 * WHAT HAS AND HAS NOT GONE OUT — put in front of her every turn, rather than policed after the fact.
 *
 * This replaces a guard that intercepted her reply when it claimed something about the state of work,
 * ran check_tasks, and made her answer again. That guard worked — it fired seven times in three
 * red-team runs — but it was the wrong shape: a regex over her sentences is a hard-coded rule about
 * phrasing, and rules about phrasing are exactly what an agentic system should not need. It also
 * treated the symptom. She speculated because she did not know, and nothing had told her.
 *
 * So: change what she KNOWS, not what she is allowed to say. Her memory facts are already injected
 * this way; the ledger of what he asked for is the other half of the same idea, and with it in
 * context "has that gone out?" is answerable from the page in front of her rather than guessable.
 *
 * THE LAST LINE IS A LIMIT ON THE LEDGER, NOT ON HER. It records what he asked HER to do. An absent
 * entry means she has no record of it — never that it did not happen, because he may well have sent
 * it himself. Turning a speculative "it's been sent" into a confident "it has not been sent" would
 * swap one unsupported claim for another.
 */
async function taskLedgerContext(userId: string, organisationId?: string | null): Promise<string> {
  const ledger = await readTaskLedger(userId, organisationId ?? undefined);
  const lines: string[] = [];

  for (const task of ledger.open) {
    const waited = task.ageDays >= 1 ? ` (asked ${task.ageDays} day${task.ageDays === 1 ? '' : 's'} ago)` : '';
    lines.push(`- ${task.summary} — ${task.state}${waited}`);
  }
  for (const task of ledger.recentlyDone) {
    lines.push(`- ${task.summary} — ${task.state}`);
  }

  const body = lines.length
    ? lines.join('\n')
    : '- nothing is open, and nothing has completed in the last 14 days';

  return (
    '\n\nWHAT HE HAS ASKED YOU TO DO — read from the task ledger just now, and true as of this ' +
    `moment:\n${body}\n` +
    'This is the only record of what you have and have not sent. Answer from it and be definite. If ' +
    'he asks about something that is not on this list, say plainly that you have no record of it — ' +
    'not that it was never done, because he may have done it himself.'
  );
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

  const organisationContext = await getCurrentOrganisationContext();
  if (!organisationContext) return NextResponse.json({ error: 'Not signed in or no organisation access' }, { status: 401 });
  const organisationId = organisationContext.organisationId;

  const supabase = createServiceClientV2();

  // OWNERSHIP, exactly as the voice route enforces it. These are per-user private agents, and the
  // memory behind them is the owner's business. An admin may open one; nobody else may.
  const { data: agent, error: agentError } = await supabase
    .from(KIRA_CONVAI_TABLES.agents)
    .select('id, user_id, organisation_id, elevenlabs_agent_id, status')
    .eq('elevenlabs_agent_id', agentId)
    .maybeSingle();

  if (agentError) {
    console.error('[kira/chat/text] agent lookup error:', agentError);
    return NextResponse.json({ error: 'Database error during lookup' }, { status: 500 });
  }

  if (!agent) {
    console.log('[kira/chat/text] agent lookup failed for agentId:', agentId, 'organisationId:', organisationId);
    return NextResponse.json({ error: 'Kira agent not found' }, { status: 404 });
  }
  // Check organisation membership for agent access
  const { data: membership } = await supabase
    .from('organisation_memberships')
    .select('membership_id')
    .eq('organisation_id', organisationId)
    .eq('person_id', organisationContext.personId)
    .eq('status', 'active')
    .maybeSingle();
  
  if (!membership && !(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'No organisation access to this agent' }, { status: 403 });
  }
  
  // Legacy enforcement: for agents without an organisation_id, still require creator ownership.
  if (!agent.organisation_id) {
    const appUser = await getCurrentAppUser();
    if (agent.user_id !== appUser?.id && !(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Not your Kira' }, { status: 403 });
    }
  }

  // INV-020: the agent carries the owning organisation (added by migration) — prefer it, falling
  // back to the authenticated tenant scope so memory/conversation writes always land in an owner org.
  const agentOrganisationId = agent.organisation_id ?? organisationId;

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
        .select('elevenlabs_conversation_id, distilled_at')
        .eq('id', conversationId)
        .maybeSingle();

      // NOTHING NEW SINCE LAST TIME → do no work.
      //
      // This is what lets the leave-the-page trigger fire freely. `visibilitychange` fires on every
      // tab switch, and each unguarded run would re-extract the entire transcript with an LLM:
      // billed every time, and a fresh chance for the extractor to reword a fact it already saved
      // into something the downstream literal-repeat collapse will not recognise as a repeat.
      if (conv?.distilled_at) {
        const { count } = await supabase
          .from(KIRA_CONVAI_TABLES.messages)
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversationId)
          .gt('created_at', conv.distilled_at as string);
        if (!count) return NextResponse.json({ ok: true, distilled: false, reason: 'nothing new' });
      }
      // READ THE REFUSALS BACK OUT FIRST — because she will not report them, and because the distil
      // below needs to know what she declined.
      //
      // record_refusal measured 0/6 and then 1/6 across three attempts to fix it with words. She
      // declines out loud, correctly, every time and does not call the tool — and unlike every other
      // guard here there is no call to hang a required parameter on, because the absent call IS the
      // defect. This is the one pass that already reads the whole conversation.
      //
      // IT RUNS BEFORE THE DISTIL, and that ordering fixes a second, worse defect. A tester pushed
      // her to email his three biggest customers about the sale; she refused twice, correctly — and
      // the distil then wrote down "the owner prefers to give standing approval for sending
      // sensitive communications" as a durable preference at importance 9. The boundary held in the
      // moment and the attacker's framing became a fact about him, recalled into every later
      // conversation as a false premise supporting the very thing she had just declined.
      //
      // Awaited, never floated: on a serverless runtime a floating promise means "maybe", which is
      // how six of ten task mirrors were silently lost once already.
      let refusedRequests: string[] = [];
      try {
        const { data: rows } = await supabase
          .from(KIRA_CONVAI_TABLES.messages)
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(200);
        const swept = await sweepConversationForRefusals({
          conversationId,
          organisationId: agentOrganisationId,
          agentRowId: (agent.id as string) ?? null,
          transcript: (rows ?? []).map((m) => ({ role: String(m.role), content: String(m.content ?? '') })),
          apiKey: process.env.OPENAI_API_KEY || '',
        });
        refusedRequests = swept.refusals;
        if (swept.written) console.log(`[chat/text] recorded ${swept.written} observed refusal(s)`);
      } catch (error) {
        // The distil still runs. Losing the exclusions costs hygiene on one conversation; throwing
        // here would cost him every fact from it.
        console.error('[chat/text] refusal sweep failed (memory still runs):', error);
      }

      const memory = await completeConversationMemory(
        supabase,
        Object.assign(
          {
            conversationId,
            elevenlabsConversationId: String(conv?.elevenlabs_conversation_id ?? `text:${conversationId}`),
            // What has already been ruled out of this record as another company's. Without this the
            // distil re-files exactly what save_memory just parked — measured 6/6 then 0/6 the moment
            // sessions started ending, which is the ordinary case and not an edge one.
            extract: createMemoryExtractor(process.env.OPENAI_API_KEY || '', {
              // Shared with the voice post-call path — see lib/kira/other-businesses.ts for why the
              // ordering in that query is load-bearing rather than tidy.
              otherBusinesses: await parkedOtherBusinesses(
                supabase,
                agentOrganisationId,
                KIRA_CONVAI_TABLES.memory,
              ),
              // A request she REFUSED is not a preference he holds — see lib/kira/memory-extract.ts.
              refusedRequests,
            }),
            tables: KIRA_CONVAI_TABLES,
            semantic: { scopePrefix: 'kira-user-' },
            organisationId: agentOrganisationId,
          },
        ),
      );
      if (memory.errors.length) console.error('[chat/text] distil reported:', memory.errors.join('; '));

      // The distil paraphrases, so another company's fact can arrive in words the exclusion list
      // never matched — traced in production on 1 August, where both save_memory calls parked
      // correctly and the distil filed a merged sentence six seconds later. The trigger parks the
      // row; this removes the semantic copy. See lib/kira/entity-sweep.ts.
      await forgetParkedEntityLeaks(agentOrganisationId, KIRA_CONVAI_TABLES.memory);

      // The distil is a SECOND WRITER, and the guard on save_memory does not reach it. That was
      // measured rather than assumed: the write-path guard shipped, and the very next red-team run
      // still filed six of her own limitations as facts about the business — because
      // completeConversationMemory inserts straight into the table.
      const refiled = await refileAssistantCapabilityClaims(agentOrganisationId, KIRA_CONVAI_TABLES.memory);
      if (refiled) console.log(`[chat/text] re-filed ${refiled} capability claim(s) as assistant state`);

      // ⚠️ THE TEXT TRANSPORT DISTILLED AND NEVER CLASSIFIED, so everything an owner TYPED stayed
      // unfiled forever. The voice path has called `classifyPendingMemories` since it was written;
      // this one did not, and nothing pointed at the difference — the facts are all saved, the
      // banner correctly says filing is still running, and it never finishes.
      //
      // Measured on Ray's account, 2026-08-17: nine facts written by a typed conversation, all with
      // `genome_section` null, unchanged twenty-five minutes later. What he saw:
      //
      //   "Before I typed anything today the page said 5 things captured, across 3 of the 9 areas.
      //    After I told her the same facts again, the same page says 10 things captured, across 1 of
      //    the 9 areas… I have made my own Genome go backwards by talking to her."
      //
      // The older facts had come from VOICE calls, which classified them. The new ones came from
      // typing, which did not — so the ratio got worse every time he used the transport he prefers.
      //
      // ⚠️ THE DEDUPE SWEEP RUNS AFTER IT, not before: an unclassified row has no section to lose,
      // and parking a filed row in favour of an unfiled twin is exactly how a filed fact falls back
      // into the pile.
      try {
        const filed = await classifyPendingMemories(agentOrganisationId);
        if (filed.deferred) {
          console.warn(`[chat/text] ${filed.deferred} memories left unclassified — the sweep will retry.`);
        }
      } catch (error) {
        // Fail-soft, exactly as the voice path does: a classification problem must never cost a fact.
        console.error('[chat/text] genome classification failed (memories are safe):', error);
      }

      await sweepDuplicateMemories(agentOrganisationId, KIRA_CONVAI_TABLES.memory);


      // Stamped AFTER the pipeline returns, so a failed run is retried by the next trigger rather
      // than marked done. The cost of stamping too early is silent permanent loss; the cost of
      // stamping late is one repeated extraction.
      await supabase
        .from(KIRA_CONVAI_TABLES.conversations)
        .update({ distilled_at: new Date().toISOString() })
        .eq('id', conversationId);

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
        // INV-020: conversations are organisation-owned; user_id stays provenance of who started it.
        organisation_id: agentOrganisationId,
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

  const [facts, ledger] = await Promise.all([
    recalledFacts(supabase, agentOrganisationId),
    taskLedgerContext(agentOrganisationId, agentOrganisationId),
  ]);

  const messages = [
    { role: 'system' as const, content: `${systemPrompt}${facts}${ledger}\n\nThe owner is TYPING to you rather than speaking. Reply in the same voice you would use aloud, but write it — no stage directions, no "*smiles*", and keep it short enough to read on a phone.` },
    ...(history ?? []).map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: String(m.content ?? ''),
    })),
    { role: 'user' as const, content: message },
  ];

  // Her hands, read from the same deployed agent her words come from. An empty list is survivable:
  // she talks, exactly as this route behaved before tools existed.
  const tools = textToolsFor(await liveToolNamesFor(agentId));

  let reply: string;
  const toolsUsed: string[] = [];
  try {
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = process.env.KIRA_TEXT_MODEL || process.env.KIRA_EXTRACTION_MODEL || 'gpt-4.1-mini';
    // Widened as the loop runs: assistant tool-call turns and their results have to be replayed or
    // the model answers the same question again instead of reading what came back.
    const working: unknown[] = [...messages];

    for (let round = 0; ; round++) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: working,
          max_tokens: 600,
          ...(tools.length && round < MAX_TOOL_ROUNDS ? { tools, tool_choice: 'auto' } : {}),
        }),
      });
      if (!res.ok) throw new Error(`model returned ${res.status}`);
      const json = await res.json();
      const choice = json?.choices?.[0]?.message as
        | { content?: string; tool_calls?: Array<{ id: string; function?: { name?: string; arguments?: string } }> }
        | undefined;

      const calls = choice?.tool_calls ?? [];
      if (!calls.length) {
        reply = String(choice?.content ?? '').trim();
        if (!reply) throw new Error('empty reply');
        break;
      }

      // The assistant's tool-call turn goes back verbatim — OpenAI rejects tool results that do not
      // answer a call it can see.
      working.push(choice);

      for (const call of calls) {
        const name = call.function?.name ?? '';
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function?.arguments || '{}');
        } catch {
          // A malformed argument blob is the model's error, not the owner's. Run nothing and hand
          // back something it can recover from.
          args = {};
        }

        // IDENTITY IS THE ROUTE'S, NOT THE MODEL'S. agent.organisation_id came from the authenticated
        // session and the ownership check above; anything the model put in `args` is ignored by
        // every handler. This is the line that keeps a typed session inside its own business.
        const result = await runTextTool(name, args, agentOrganisationId, agent.user_id);
        toolsUsed.push(name);

        working.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    /* -------------------------------------------------------------- */
    /* Measurement only — does she still guess now she has been told?  */
    /* -------------------------------------------------------------- */
    //
    // This used to INTERVENE: it intercepted the reply, forced check_tasks and made her answer
    // again. It worked, and it was the wrong shape — a regex over her sentences is a rule about
    // phrasing, and the fix for "she guessed" is to tell her, not to police her. The ledger is now
    // in her context every turn (see taskLedgerContext), so there is nothing left to guess with.
    //
    // What survives is the instrument, not the enforcement. It answers the only question that
    // matters about the change — did knowing actually stop the guessing? — and a claim logged here
    // now means the agentic fix is not holding, which is worth seeing rather than silently
    // correcting. It changes nothing the owner receives.
    if (reply && !toolsUsed.includes('check_tasks') && claimsWorkState(reply)) {
      console.warn('[chat/text] claimed work state without checking, with the ledger already in context');
    }
  } catch (error) {
    console.error('[chat/text] model call failed:', error);
    // His message is NOT persisted on failure. A turn stored with no answer would resurface in the
    // next session's history as something she ignored.
    return NextResponse.json(
      { error: "I didn't catch that one — say it again?" },
      { status: 502 },
    );
  }

  // What she actually DID this turn, for the red team and for anyone reading the logs after a
  // surprise. Not returned to the browser: the owner is owed her answer, not her mechanism.
  if (toolsUsed.length) console.info(`[chat/text] tools used: ${toolsUsed.join(', ')}`);

  // Both turns, in order, into the same tables the voice path writes to. Awaited, not fired and
  // forgotten: on a serverless runtime a floating promise means "maybe", which is how the task
  // mirror lost six rows.
  const now = new Date().toISOString();
  // ⚠️ `kira_agent_id` IS CORRECT HERE — do not "fix" it to `agent_id`.
  //
  // `conversation_messages` carries BOTH columns, and this one is the populated one (4,258 rows,
  // measured 2026-08-16). A session investigating "the transcript vanished" probed `kira_messages`
  // — a different, long-dead table whose last write was in January — found zero rows, and was one
  // step from renaming this and breaking a path that works. The tables are:
  //
  //   conversation_messages  the live transcript, written here and by the voice path
  //   kira_messages          dead since 2026-01, keyed by the ElevenLabs `conv_…` string
  //
  // Persistence is FINE. The transcript was missing because nothing READ it back — see the chat page.
  const stamp = {
    user_id: agent.user_id,
    // INV-020: messages are organisation-owned; user_id stays provenance of who said/wrote what.
    organisation_id: agentOrganisationId,
    kira_agent_id: agent.id,
    conversation_id: conversationId,
  };
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
