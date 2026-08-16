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
import { classifyPendingMemories } from '@/lib/genome/derive';
import { createServiceClient } from '@/lib/supabase/server';
import { createMemoryExtractor } from '@/lib/kira/memory-extract';
import { kiraKnowledgeToolDef } from '@/lib/kira/knowledge-tool-def.mjs';
import { withEntityClassification } from '@/lib/kira/memory-entity-def.mjs';
import {
  kiraDispatchToolDef,
  kiraApproveToolDef,
  kiraFinancialsToolDef,
  kiraCheckTasksToolDef,
} from '@/lib/kira/swarm/doing-tools-def.mjs';
import {
  kiraSearchDriveToolDef,
  kiraReadDocumentToolDef,
  kiraKeepDocumentToolDef,
  kiraLookupContactToolDef,
} from '@/lib/kira/lookup-tools-def.mjs';
import { kiraRecordRefusalToolDef } from '@/lib/kira/refusal-tool-def.mjs';
import { isUidToolUrl } from '@/lib/kira/uid-tools.mjs';
// THE one tool list. Both provisioning paths read it — see kiraAllTools for what a second copy cost.
import { toolDefsFor } from '@/lib/kira/tool-manifest.mjs';
import { parkedOtherBusinesses } from '@/lib/kira/other-businesses';
import { sweepDuplicateMemories } from '@/lib/genome/dedupe-sweep-apply';
import { forgetParkedEntityLeaks } from '@/lib/kira/entity-sweep';
import { refileAssistantCapabilityClaims } from '@/lib/kira/capability-sweep';

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

      // THE EXTRACTOR IS BUILT HERE, NOT AT MODULE SCOPE, so it can carry this owner's exclusions.
      //
      // The routes object is cached for the life of the process, so the extractor it was created
      // with cannot know whose conversation it is about to read — and the package's MemoryExtractor
      // signature takes only the turns. That left the voice path re-filing exactly what save_memory
      // had parked: the guard held during the call and lost at the post-call distil.
      //
      // The userId is resolved a few lines above, so the only thing that was actually missing was
      // building the extractor after it rather than before. A stateful "current user" on the shared
      // extractor would have been the other way to do it, and would race the moment two calls ended
      // at once — which on a serverless runtime is not an edge case.
      //
      // The query itself lives in lib/kira/other-businesses.ts, shared with the typed transport —
      // it was two hand-written copies for an hour, and the ordering defect was fixed in only one.
      const otherBusinesses = await parkedOtherBusinesses(sb, userId, KIRA_CONVAI_TABLES.memory);

      // What she DECLINED in this call, so the distil cannot turn a refused demand into a stated
      // preference. Measured on the typed transport and it applies identically here: she refused to
      // email his customers about the sale, twice, and the distil recorded "the owner prefers to
      // give standing approval for sending sensitive communications" at importance 9.
      //
      // Read from the refusal record rather than re-extracted: the sweep and the server-observed
      // approval guard have both already written what she declined, and asking a model the same
      // question twice invites two different answers.
      const refusedRequests = userId
        ? (
            (
              await sb
                .from('kira_refusals')
                .select('asked')
                .eq('user_id', userId)
                .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false })
                .limit(20)
            ).data ?? []
          ).map((r: { asked: unknown }) => String(r.asked ?? ''))
        : [];

      const memory = await completeConversationMemory(sb, {
        conversationId: conv.id,
        elevenlabsConversationId: conv.elevenlabsConversationId,
        userId,
        extract:
          otherBusinesses.length || refusedRequests.length
            ? createMemoryExtractor(process.env.OPENAI_API_KEY || '', { otherBusinesses, refusedRequests })
            : memoryExtractor,
        tables: KIRA_CONVAI_TABLES,
        semantic: { scopePrefix: 'kira-user-' },
      });
      if (memory.errors.length) {
        console.error('[kira/convai] memory pipeline reported:', memory.errors.join('; '));
      }

      // The distil paraphrases, so a fact about another company can arrive here in words the
      // exclusion list never matched. The trigger parks the row; this takes the semantic copy back
      // out, because parking it in one store while publishing it to the other is the guard being
      // technically satisfied and practically absent. See lib/kira/entity-sweep.ts.
      await forgetParkedEntityLeaks(userId, KIRA_CONVAI_TABLES.memory);

      // ⚠️ THE DEDUPE THE DISTIL DOES NOT DO. `handleKiraSaveMemory` dedupes on the way in; this
      // path inserts straight into the table, so a distil returning four overlapping memories writes
      // all four. `swallowedIds` was written for exactly this and had NO CALLER — which is why the
      // pricing was still in Ray's handover document twice on the walkthrough after it was written,
      // and why one of two near-identical Gary rows was marked private while its twin was not, so
      // the screen and the file disagreed about the most sensitive thing in the product.
      await sweepDuplicateMemories(userId, KIRA_CONVAI_TABLES.memory);

      // Same reasoning, different contamination: what she wrote about HER OWN reach.
      //
      // Asked what she can see, she answers honestly and the distiller files the answers as facts
      // about the BUSINESS — tagged `systems`, one of the nine real Genome areas, and the one a
      // buyer reads to judge whether the business runs without its owner.
      //
      // BEFORE classifyPendingMemories, deliberately: that call reads `genome_section IS NULL` and
      // would otherwise hand these to the model, which is precisely how they got a business section
      // in the first place. Re-filed first, they arrive already inert and are skipped.
      //
      // The guard on save_memory does NOT cover this path — completeConversationMemory inserts
      // straight into the table. Measured, not assumed: the write-path guard shipped and the next
      // red-team run still filed six.
      const refiled = await refileAssistantCapabilityClaims(userId, KIRA_CONVAI_TABLES.memory);
      if (refiled) console.log(`[kira/convai] re-filed ${refiled} capability claim(s) as assistant state`);

      // File the new facts into the Genome NOW, while the call that produced them just ended.
      //
      // This used to happen 25-at-a-time when the owner opened /my-genome, which meant his manual
      // filled in over several visits — he would look at it, see a fraction of what he had said, and
      // come back later to find more. A product whose entire promise is "it remembers what is in your
      // head" cannot read as though it is still catching up.
      //
      // Fail-soft and after the memory write: a classification problem must never cost a fact.
      if (userId) {
        try {
          const filed = await classifyPendingMemories(userId);
          if (filed.deferred) {
            console.warn(`[kira/convai] ${filed.deferred} memories left unclassified — the sweep will retry.`);
          }
        } catch (error) {
          console.error('[kira/convai] genome classification failed (memories are safe):', error);
        }
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
  const presented = req.headers.get(TOOL_SECRET_HEADER);
  // requireToolSecret() first, always — a misconfigured server must 500 before any comparison, or
  // an unset secret becomes an open door disguised as a failed auth.
  const current = requireToolSecret();
  if (presented === current) return true;

  // ROTATION WINDOW. A secret lives in two places that cannot change at the same instant: this
  // environment, and the header baked into every provisioned tool. Whichever moves first, the other
  // is briefly wrong — and the agents can only be re-provisioned one at a time, so "briefly" is as
  // long as that takes, with every owner's memory tools 401ing in the middle of live conversations.
  //
  // Setting KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS to the outgoing value closes that window entirely:
  // both are accepted while the fleet moves across, and the variable is deleted afterwards.
  //
  // It is not a fallback and must never be left set. Two valid secrets is twice the surface, and a
  // "previous" that outlives its rotation is just a second live credential nobody is tracking.
  const previous = process.env.KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS;
  if (previous && presented === previous) {
    console.warn('[tools] accepted the PREVIOUS tool secret — finish the rotation and unset it.');
    return true;
  }

  return false;
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
  // platformIdentity binds the identity parameters to ElevenLabs' system__conversation_id /
  // system__agent_id dynamic variables, so the PLATFORM fills them instead of the LLM.
  //
  // Without it those params are declared LLM-filled — and an agent is never told its own
  // conversation id, so it omits the field (400) or invents one. save_message and
  // update_conversation_topic are keyed ONLY by conversation_id (they are not uid-tools, so
  // kiraAllTools does not bake ?uid or strip the param), which means both were silently failing
  // in live calls. Nothing surfaced it: the post-call webhook persists the whole transcript to
  // conversation_messages afterwards, so the rows appear anyway, and the welcome-back opener is
  // rendered server-side rather than from the tool. Capture-as-you-go was reconstructed after the
  // call rather than happening during it.
  //
  // Kira is one-agent-per-user and keeps ?uid identity for the memory tools (see kiraAllTools) —
  // these are not alternatives. uid answers "whose memory", the platform-filled conversation id
  // answers "which conversation", and save_message needs the second one.
  // Decorated with the entity question before anything else touches them — see
  // lib/kira/memory-entity-def.mjs. Both provisioning paths (this one for new agents, buildToolsForUser
  // for the fleet script) must apply it, or a new owner's agent ships with an unguarded save_memory
  // that looks identical to a guarded one.
  const tools = withEntityClassification(
    createConversationTools(baseUrl, KIRA_WEBHOOK_BASE_PATH, { platformIdentity: true }),
  ) as ConvAITool[];
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
    // The REFUSAL half. approve_task already records a withheld approval on its own, but that is the
    // narrow slice the server can see; the refusals that matter to the owner happen in words, and
    // until this existed they left the conversation and were gone. Writes only — it can never cause
    // or prevent an action, which is why it needs no approval step of its own.
    kiraRecordRefusalToolDef(baseUrl, headers) as ConvAITool,
    // The READ half. It changes nothing, so it needs no approval step — but it reads a business's
    // financial position, so it takes the same server-baked identity as the rest.
    kiraFinancialsToolDef(baseUrl, headers) as ConvAITool,
    // The ACCOUNTING half. Without it she can start work and not say what became of it — which is how
    // three requests, one of them a $60,000 quote, went two days without anyone able to answer for
    // them. Read-only over her own mirror of the task store.
    kiraCheckTasksToolDef(baseUrl, headers) as ConvAITool,
    // The REACH half. The owner connected Drive and Contacts and she still could not open either,
    // so she was asked for his Lot 91 files and for an address and answered from nothing — once by
    // declining, once by claiming a search that never ran. Reads only, so no approval step.
    kiraSearchDriveToolDef(baseUrl, headers) as ConvAITool,
    // Finding a document and being unable to say what is in it is barely half an answer — he hit
    // that within a minute of the search going live.
    kiraReadDocumentToolDef(baseUrl, headers) as ConvAITool,
    // The yes half of an offer she makes herself: reading is a question, keeping is a decision
    // about what belongs in the owner's business record.
    kiraKeepDocumentToolDef(baseUrl, headers) as ConvAITool,
    kiraLookupContactToolDef(baseUrl, headers) as ConvAITool,
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
/**
 * Every tool an agent holds — built from the ONE manifest, not from a parallel list here.
 *
 * IT WAS A PARALLEL LIST, and it cost the fleet twice. `setAgentTools` REPLACES an agent's tool set,
 * so whichever provisioning path runs last decides what every agent holds — and a tool missing from
 * one twin is not skipped, it is REMOVED. The first time, dispatch_task and approve_task were
 * stripped off ten live agents. The second time was 2026-08-04: exec-reprovision ran this function
 * while the confirmation pair and the new recall_memory trigger existed only in the manifest, so the
 * fleet came back with 15 tools instead of 17 and without the trigger the exercise was for.
 *
 * The control in place was a comment saying "change one, change both". lib/kira/tool-parity.test.ts
 * is that comment with teeth; this function no longer needs it, because there is nothing to keep in
 * step.
 *
 * The manifest returns plain defs — no headers, no uid. Everything below is this path's own
 * decoration and is unchanged.
 */
export function kiraAllTools(baseUrl: string, userId?: string): ConvAITool[] {
  const secret = requireToolSecret();
  const tools = toolDefsFor('business', baseUrl) as ConvAITool[];
  for (const t of tools) {
    if (!t.webhook) continue;
    // The manifest deliberately leaves auth to the caller, because the two paths read the secret
    // from different places. Applied here for every tool, exactly as the per-tool builders did.
    t.webhook.headers = {
      'Content-Type': 'application/json',
      ...(t.webhook.headers ?? {}),
      [TOOL_SECRET_HEADER]: secret,
    };
    // Single-sourced with the re-provision script — see lib/kira/uid-tools.mjs for why.
    const isUidTool = isUidToolUrl(t.webhook.url);
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
