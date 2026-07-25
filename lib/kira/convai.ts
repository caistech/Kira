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
  createConvaiWebhookRoutes,
  createConversationTools,
  conversationContinuityPrompt as canonicalContinuityPrompt,
  distillConversationToMemory,
  type ConvaiWebhookRoutes,
  type ConvAITool,
} from '@caistech/elevenlabs-convai';
import { createServiceClient } from '@/lib/supabase/server';
import { createMemoryExtractor } from '@/lib/kira/memory-extract';
import { kiraKnowledgeToolDef } from '@/lib/kira/knowledge-tool-def.mjs';
import { mnemoAdd } from '@/lib/kira/mnemo';

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
      await distillConversationToMemory(sb, {
        elevenlabsConversationId: conv.elevenlabsConversationId,
        conversationId: conv.id,
        extract: memoryExtractor,
        tables: KIRA_CONVAI_TABLES,
      });
      // Dual-write the just-distilled facts to Mnemo (the experiential/semantic lane, #7). kira_memory
      // stays the source of truth; Mnemo is the semantic index that makes cross-session, differently-
      // worded recall work ("what happened on that job six weeks ago"). Fail-soft + non-fatal: a Mnemo
      // outage never affects the post-call path — recall simply degrades to kira_memory alone.
      try {
        const { data: fresh } = await sb
          .from(KIRA_CONVAI_TABLES.memory)
          .select('user_id, content')
          .eq('source_conversation_id', conv.id);
        const userId = fresh?.[0]?.user_id as string | undefined;
        const contents = (fresh ?? []).map((r: any) => r.content).filter(Boolean);
        if (userId && contents.length) await mnemoAdd(userId, contents);
      } catch (e) {
        console.error('[kira/convai] Mnemo dual-write skipped:', e);
      }
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

// Interim shared-secret guard for the OPERATIONAL tool webhooks (kira/webhooks/*). Unlike the
// discovery tools (which resolve identity from a SIGNED session token), these resolve identity from
// the PUBLIC elevenlabs_agent_id, so an unauthenticated caller could start_conversation as a victim
// and then recall/poison their memory. The durable fix belongs in @caistech/elevenlabs-convai
// (see HANDOFF_RESPONSE.md); until it lands we require a secret header the provisioned tools carry.
export const KIRA_TOOL_SECRET_HEADER = 'x-kira-tool-secret';

/**
 * Guard for the operational tool routes. INERT when KIRA_TOOL_WEBHOOK_SECRET is unset (so a deploy
 * of the guard doesn't 401 agents that haven't been re-provisioned with the header yet) — activate
 * by setting the env AND re-running scripts/reprovision-kira-agents.mjs so agents send the header.
 */
export function toolSecretOk(req: Request): boolean {
  const secret = process.env.KIRA_TOOL_WEBHOOK_SECRET;
  if (!secret) return true;
  return req.headers.get(KIRA_TOOL_SECRET_HEADER) === secret;
}

/**
 * The canonical 5 conversation/memory tools (get_conversation_context, save_message,
 * update_conversation_topic, recall_memory, save_memory), pointed at Kira's own webhook
 * routes. This is the set attached to every operational agent at provision time. Kira's
 * search_web / search_knowledge tools are intentionally NOT included here — their routes
 * do not exist yet, and attaching a routeless tool makes the agent call a 404.
 *
 * When KIRA_TOOL_WEBHOOK_SECRET is set, each tool carries it as a request header so the
 * toolSecretOk() route guard can reject calls that don't originate from our provisioned agents.
 */
export function kiraMemoryTools(baseUrl: string): ConvAITool[] {
  const tools = createConversationTools(baseUrl, KIRA_WEBHOOK_BASE_PATH);
  const secret = process.env.KIRA_TOOL_WEBHOOK_SECRET;
  if (secret) {
    for (const t of tools) {
      if (t.webhook) {
        t.webhook.headers = { ...(t.webhook.headers ?? {}), [KIRA_TOOL_SECRET_HEADER]: secret };
      }
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
  const secret = process.env.KIRA_TOOL_WEBHOOK_SECRET;
  if (secret) headers[KIRA_TOOL_SECRET_HEADER] = secret;
  // Single-sourced from knowledge-tool-def.mjs so the new-agent + re-provision definitions can't drift.
  return kiraKnowledgeToolDef(baseUrl, headers) as ConvAITool;
}

/**
 * The full tool set attached to every operational agent: the 5 canonical memory tools + the
 * owned-RAG search_knowledge tool. Use this at provision + re-provision so knowledge retrieval is
 * present on every agent, never a routeless prompt claim.
 */
export function kiraAllTools(baseUrl: string): ConvAITool[] {
  return [...kiraMemoryTools(baseUrl), kiraKnowledgeTool(baseUrl)];
}

// Re-export the canonical continuity prompt so provisioning appends the SAME instructions
// the tools were built for (single source — no Kira-local copy to drift).
export const conversationContinuityPrompt = canonicalContinuityPrompt;
