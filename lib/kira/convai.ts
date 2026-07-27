// lib/kira/convai.ts
// SINGLE SOURCE of Kira's voice-memory loop.
//
// This adopts the canonical @caistech/elevenlabs-convai loop (the "canonical Kira") and
// mounts it against Kira's own tables. It replaces the three forked implementations that
// caused the persistence failure:
//   - app/api/kira/webhook/route.ts        (wrote phantom kira_conversations/kira_messages)
//   - app/api/webhooks/elevenlabs-router   (parallel handlers on the phantom tables)
//   - app/api/kira/tools/route.ts          (a third, agent-identity memory handler)
//
// The canonical handlers own the loop logic, the server-derived identity model, and the
// exactly-once post-call processing. Kira only supplies: (a) the table mapping, (b) how to
// resolve a verified user from an incoming start-conversation request, and (c) the service
// client. Column reconciliation lives in
// supabase/migrations/20260720000000_convai_canonical_reconcile.sql.

import {
  completeConversationMemory,
  createConvaiWebhookRoutes,
  createConversationTools,
  conversationContinuityPrompt as canonicalContinuityPrompt,
  CONVAI_TOOL_SECRET_HEADER,
  type ConvaiWebhookRoutes,
  type ConvAITool,
} from '@caistech/elevenlabs-convai';
import { accrueVoiceCost } from '@/lib/billing';
import { createServiceClient } from '@/lib/supabase/server';
import { createMemoryExtractor } from '@/lib/kira/memory-extract';
import { kiraKnowledgeToolDef } from '@/lib/kira/knowledge-tool-def.mjs';
import { kiraDispatchToolDef, kiraApproveToolDef } from '@/lib/kira/swarm/doing-tools-def.mjs';

// Kira's real tables mapped onto the canonical TableNames contract. The reconcile
// migration adds the columns the handlers need (agent_id, anon_session_id, processed_at)
// + the (conversation_id, message_index) unique index.
export const KIRA_CONVAI_TABLES = {
  agents: 'kira_agents',
  conversations: 'conversations',
  messages: 'conversation_messages',
  memory: 'kira_memory',
} as const;

// Base path Kira's conversation tools already point at (kept so tool URLs and mounted
// route files line up 1:1).
export const KIRA_WEBHOOK_BASE_PATH = '/api/kira/webhooks';

let cachedRoutes: ConvaiWebhookRoutes | null = null;

/**
 * The canonical webhook routes, built lazily so createServiceClient() (which throws when
 * SUPABASE_SERVICE_ROLE_KEY is missing) is never called at import/build time — only on the
 * first real request.
 */
export function kiraConvaiRoutes(): ConvaiWebhookRoutes {
  if (cachedRoutes) return cachedRoutes;

  const supabase = createServiceClient();
  const memoryExtractor = createMemoryExtractor(process.env.OPENAI_API_KEY || '');

  cachedRoutes = createConvaiWebhookRoutes({
    supabase,
    tableNames: KIRA_CONVAI_TABLES,
    // Post-call payloads must carry a valid HMAC signature (rule 19).
    postCallSecret: process.env.ELEVENLABS_WEBHOOK_SECRET,
    // After the transcript is persisted, distil it into durable kira_memory so recall_memory has
    // facts to pull (get_conversation_context already gives conversation continuity; this is the
    // distilled "important facts" layer). Degrade-don't-fake: a failing distil is logged + skipped,
    // never thrown out of the post-call path (canonical distillConversationToMemory guarantees this).
    onConversationComplete: async (conv, sb) => {
      // The whole post-call memory job — snapshot prior facts, distil, dedupe, then dual-write only
      // the NET-NEW facts to Mnemo — is now the canonical sequence in @caistech/elevenlabs-convai.
      //
      // Kira assembled these four steps by hand, and the ordering is the trap: the snapshot must be
      // taken BEFORE the distil, or every fact looks pre-existing and nothing is ever indexed. That
      // is far too easy to get wrong to keep re-implementing per product — and the evidence was that
      // of the two products on this package, only this one had assembled it at all.
      //
      // scopePrefix MUST stay 'kira-user-'. The Mnemo scope id IS the container; changing it would
      // orphan every fact already written for every Kira user.
      let userId: string | undefined;
      let durationSeconds = 0;
      try {
        const { data: crow } = await sb
          .from(KIRA_CONVAI_TABLES.conversations)
          .select('user_id, duration_seconds')
          .eq('id', conv.id)
          .single();
        userId = crow?.user_id as string | undefined;
        durationSeconds = Number(crow?.duration_seconds ?? 0);
      } catch { /* non-fatal */ }

      const memory = await completeConversationMemory(sb, {
        conversationId: conv.id,
        elevenlabsConversationId: conv.elevenlabsConversationId,
        userId,
        extract: memoryExtractor,
        tables: KIRA_CONVAI_TABLES,
        semantic: { scopePrefix: 'kira-user-' },
      });
      if (memory.errors.length) {
        console.error('[kira/convai] memory pipeline reported:', memory.errors.join('; '));
      }

      // Accrue this call's estimated cost against the free month's fair-use budget. Records only —
      // the call already happened, so it can never cut anyone off mid-sentence (Workstream B:
      // warn, don't hard-cut). Fail-soft inside accrueVoiceCost.
      if (userId) await accrueVoiceCost(userId, durationSeconds);
    },
    // Identity is SERVER-DERIVED from the agent binding, never from an agent-supplied
    // user_id. Kira provisions one agent per user, so the agent's owner IS the session
    // user. Only start_conversation calls this; save/recall derive identity from the
    // conversation row it binds.
    resolveSession: async (_req, body) => {
      const elevenlabsAgentId = String(body.elevenlabs_agent_id || '');
      if (!elevenlabsAgentId) return null;
      const { data: agent } = await supabase
        .from(KIRA_CONVAI_TABLES.agents)
        .select('user_id')
        .eq('elevenlabs_agent_id', elevenlabsAgentId)
        .single();
      if (!agent?.user_id) return null;
      return { userId: agent.user_id as string };
    },
  });

  return cachedRoutes;
}

// Shared-secret guard for the OPERATIONAL tool webhooks (kira/webhooks/*). Unlike the discovery
// tools (which resolve identity from a SIGNED session token), these resolve identity from the
// PUBLIC elevenlabs_agent_id — an id that is shipped to the browser — so without this guard an
// unauthenticated caller could start_conversation as a victim and then recall or poison their
// memory.
//
// THE HEADER IS THE PACKAGE'S, NOT OURS. Kira previously defined its own `x-kira-tool-secret`
// while @caistech/elevenlabs-convai already exported a canonical `x-convai-tool-secret`. A local
// header name for a portfolio-wide mechanism is a fork, and this one had already bent shared
// tooling: portfolio-gate's memory-loop probe 401'd against Kira, and gained a `toolSecretHeader`
// config option to accommodate one repo's divergence. Removing the fork is the fix; the config
// option stays for products that genuinely need a different name.
export const TOOL_SECRET_HEADER = CONVAI_TOOL_SECRET_HEADER;

/**
 * The configured secret.
 *
 * Resolved lazily — on the first REQUEST, never at module load. A module-load throw would break
 * `next build`, which runs with placeholder env in CI, turning a security improvement into a
 * broken pipeline.
 *
 * FAILS CLOSED. This used to return `true` when the secret was unset, so an environment that
 * lost the variable silently lost the guard while every route kept answering 200. That is the
 * worst shape a security control can have: indistinguishable, from the outside, from one that is
 * working.
 */
function requireToolSecret(): string {
  const secret = process.env.KIRA_TOOL_WEBHOOK_SECRET ?? process.env.CONVAI_TOOL_SECRET;
  if (!secret) {
    throw new Error(
      'KIRA_TOOL_WEBHOOK_SECRET (or CONVAI_TOOL_SECRET) is not set. The Kira tool webhooks resolve ' +
        'identity from a public agent id, so serving them unauthenticated would expose every ' +
        "user's conversation memory. Refusing to serve.",
    );
  }
  return secret;
}

/**
 * Guard for the operational tool routes.
 *
 * Throws (→ 500) when the server is misconfigured, and returns false (→ 401) when the caller
 * simply did not present the secret. Those are different failures and deserve different answers:
 * a 401 tells an attacker they guessed wrong, a 500 tells the operator to fix their environment.
 *
 * The canonical header is now the ONLY one accepted. The legacy `x-kira-tool-secret` was removed
 * once the audit showed zero callers presenting it: 13/13 operational agents re-provisioned onto
 * the canonical header, and all 41 Kira-pointing workspace tools migrated — including 15 DETACHED
 * ones that reprovision could never reach, because it only touches tools bound to a live agent.
 * Those were harmless while unreferenced and would have become a 401 the moment anyone re-attached
 * one. `scripts/patch-tool-secret-headers.mjs` is what reaches them.
 */
export function toolSecretOk(req: Request): boolean {
  return req.headers.get(TOOL_SECRET_HEADER) === requireToolSecret();
}

/**
 * The canonical 5 conversation/memory tools (get_conversation_context, save_message,
 * update_conversation_topic, recall_memory, save_memory), pointed at Kira's own webhook
 * routes. This is the set attached to every operational agent at provision time. Kira's
 * search_web / search_knowledge tools are intentionally NOT included here — their routes
 * do not exist yet, and attaching a routeless tool makes the agent call a 404.
 *
 * Each tool carries the secret as a request header so the toolSecretOk() route guard can reject
 * calls that don't originate from our provisioned agents. Unconditional: provisioning an agent
 * without the header would produce one that cannot talk to its own webhooks now that the guard
 * fails closed, which is worse than refusing to provision it.
 */
export function kiraMemoryTools(baseUrl: string): ConvAITool[] {
  const tools = createConversationTools(baseUrl, KIRA_WEBHOOK_BASE_PATH);
  const secret = requireToolSecret();
  for (const t of tools) {
    if (t.webhook) {
      t.webhook.headers = { ...(t.webhook.headers ?? {}), [TOOL_SECRET_HEADER]: secret };
    }
  }
  return tools;
}

/**
 * The owned-RAG retrieval tool (#11) — search over the documents/links the user has shared, from
 * OUR store (kira_knowledge_chunks), cited. Not part of the canonical conversation-tools set (that's
 * memory); this is Kira-specific. Carries the same tool-secret header as the memory tools so the
 * route guard accepts it. It replaces the old, never-built search_knowledge/search_web CLAIMS the
 * prompt used to make — this one is real and attached.
 */
export function kiraKnowledgeTool(baseUrl: string): ConvAITool {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  headers[TOOL_SECRET_HEADER] = requireToolSecret();
  // Single-sourced from knowledge-tool-def.mjs so the new-agent + re-provision definitions can't drift.
  return kiraKnowledgeToolDef(baseUrl, headers) as ConvAITool;
}

/**
 * The doing-slice tools (#12): dispatch_task (draft an owned task) + approve_task (execute on the
 * owner's yes). Single-sourced from swarm/doing-tools-def.mjs. Same tool-secret header as the memory
 * tools; identity is server-baked as ?uid by kiraAllTools (dispatch/approve resolve the owner from it).
 */
export function kiraDoingTools(baseUrl: string): ConvAITool[] {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  headers[TOOL_SECRET_HEADER] = requireToolSecret();
  return [
    kiraDispatchToolDef(baseUrl, headers) as ConvAITool,
    kiraApproveToolDef(baseUrl, headers) as ConvAITool,
  ];
}

/**
 * The full tool set attached to an operational agent: the 5 canonical memory tools + the owned-RAG
 * search_knowledge tool.
 *
 * IDENTITY: pass the agent owner's `userId` and it is baked into the recall_memory + search_knowledge
 * webhook URLs as `?uid=<userId>`. This is how those tools know whose memory/documents to read —
 * ElevenLabs does NOT pass the conversation id to server-tool webhooks (proven from the live
 * conversation record: the agent sends only the LLM-filled params). Kira provisions one agent per
 * user, so the owner is known at provision and baked in; the agent never has to identify anyone, and
 * the handlers resolve the user from `?uid` (falling back to the conversation binding for legacy).
 * The `x-convai-tool-secret` header still gates the routes, so a baked uid is not a bare-param hole.
 */
export function kiraAllTools(baseUrl: string, userId?: string): ConvAITool[] {
  const tools = [...kiraMemoryTools(baseUrl), kiraKnowledgeTool(baseUrl), ...kiraDoingTools(baseUrl)];
  for (const t of tools) {
    if (!t.webhook) continue;
    const isUidTool = /\/(recall_memory|search_knowledge|save_memory|start_conversation|dispatch_task|approve_task)$/.test(t.webhook.url);
    if (userId && isUidTool) {
      t.webhook.url = `${t.webhook.url}?uid=${encodeURIComponent(userId)}`;
    }
    // recall_memory + search_knowledge identify the user from ?uid, so their conversation_id param
    // is dead weight the LLM fills with junk — strip it. (The other memory tools still use it.)
    if (isUidTool && t.parameters?.properties && 'conversation_id' in t.parameters.properties) {
      delete (t.parameters.properties as Record<string, unknown>).conversation_id;
      if (Array.isArray(t.parameters.required)) {
        t.parameters.required = t.parameters.required.filter((r: string) => r !== 'conversation_id');
      }
    }
  }
  return tools;
}

// Re-export the canonical continuity prompt so provisioning appends the SAME instructions
// the tools were built for (single source — no Kira-local copy to drift).
export const conversationContinuityPrompt = canonicalContinuityPrompt;
