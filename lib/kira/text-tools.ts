// lib/kira/text-tools.ts
//
// TOOLS ON THE TYPED TRANSPORT — so text-Kira can DO the things voice-Kira does.
//
// WHY. `/api/kira/chat/text` was built for the owner who blocked the microphone, and it read the
// deployed agent's prompt precisely so that text-Kira would be voice-Kira rather than a second
// persona. But it called the model with no tools at all. So she had every word of her instructions
// and none of her hands: the owner could type "send Dave the quote" and the most she could do was
// talk about it. On the one transport built for the case where speaking is not available, she was a
// chatbot. That is not a smaller Kira, it is a different product.
//
// TWO RULES SHAPE EVERY DECISION HERE.
//
//   1. NOTHING IS REDEFINED. The OpenAI schemas are PROJECTED from the same `*-tools-def.mjs`
//      builders the ElevenLabs agents are provisioned from — descriptions included. Those
//      descriptions are not documentation: they carry the honesty rules ("if ok=false, say the
//      message as written and never turn it into nothing-found") and the consent rule ("NEVER call
//      keep_document unprompted"). Retyping them for a second transport is how one transport
//      quietly stops enforcing what the other does.
//
//   2. EXECUTION GOES THROUGH THE SAME HANDLERS. dispatch/approve are invoked as real Requests with
//      the server-baked `?uid`, not by calling some inner function directly — so the approval gate,
//      the identity rule and the undeliverable-address check are the SAME code on both transports.
//      A second execution path would need a second audit, and would eventually disagree.
//
// WHICH TOOLS. The set is read from the agent that is actually deployed (see textToolsForAgent),
// which extends the existing "read the live prompt" principle from her words to her hands: a tool
// added to the fleet reaches the typed transport with no change here. Lifecycle tools are
// deliberately excluded — the transport already opens its own conversation, replays its own history
// and distils on `end`, so exposing save_message/start_conversation would let the model duplicate
// work the route performs natively.

import { createConversationTools } from '@caistech/elevenlabs-convai';

import { withEntityClassification } from '@/lib/kira/memory-entity-def.mjs';
import { handleApproveTask, handleCheckTasks, handleDispatchTask } from '@/lib/kira/swarm/tool-handlers';

import { keepDocument, readDocument } from './document';
import { handleKiraRecall } from './recall';
import { handleKiraSaveMemory } from './uid-tools';
import { lookUpFinancials } from './financials';
import { kiraKnowledgeToolDef } from './knowledge-tool-def.mjs';
import { handleSearchKnowledge } from './knowledge-tool';
import {
  kiraKeepDocumentToolDef,
  kiraLookupContactToolDef,
  kiraReadDocumentToolDef,
  kiraSearchDriveToolDef,
} from './lookup-tools-def.mjs';
import { lookUpContact, searchDrive } from './lookup';
import { resolveOrganisationForPerson } from '@/lib/auth';
import { kiraRecordRefusalToolDef } from './refusal-tool-def.mjs';
import { handleRecordRefusal } from './refusal';
import { kiraConfirmFactToolDef, kiraFactsToConfirmToolDef } from './confirm-tool-def.mjs';
import { handleConfirmFact, handleFactsToConfirm } from './confirm';
import { kiraAreaAgendaToolDef } from './area-agenda-tool-def.mjs';
import { handleAreaAgenda } from './area-agenda';
import { kiraResearchOrganisationToolDef } from './practice-intelligence-tool-def.mjs';
import { researchOrganisation } from './practice-intelligence/research';
import {
  kiraApproveToolDef,
  kiraCheckTasksToolDef,
  kiraDispatchToolDef,
  kiraFinancialsToolDef,
} from './swarm/doing-tools-def.mjs';

/** The ConvAI tool shape the builders emit. Only the parts a transport-agnostic schema needs. */
interface ConvaiToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

type Builder = (baseUrl: string, headers?: Record<string, string>) => ConvaiToolDef;

/**
 * name → its definition builder. The builders want a base URL for the webhook they would call over
 * the wire; here the call never leaves the process, so the value is irrelevant and deliberately
 * obviously so.
 */
/**
 * The two MEMORY tools, projected from the package that defines them for the voice fleet.
 *
 * They are here because her prompt — read live from the deployed agent — names them four times,
 * including "Capture as you go … (save_memory)". A transport that reads those instructions while
 * holding neither tool invites the failure this product has already had once: she narrates a check
 * she never ran, or a note she never took, and the owner has no way to tell.
 *
 * The rest of the package's set (get_conversation_context / save_message / update_conversation_
 * topic) stays excluded — those are the transport's own bookkeeping, which it already does.
 */
function packageMemoryToolDef(name: 'recall_memory' | 'save_memory'): ConvaiToolDef {
  // Decorated exactly as the voice fleet's are (lib/kira/memory-entity-def.mjs). Projecting the bare
  // canonical shape here would leave the typed transport asking her to save without asking WHICH
  // business the fact is about — so the entity guard would be present on one transport and absent on
  // the other, which is the "one rule, two places" failure that already let the refusal boundary ship
  // fixed in the prompt and unfixed in the tool description.
  const found = (
    withEntityClassification(createConversationTools(UNUSED_BASE_URL)) as unknown as ConvaiToolDef[]
  ).find((t) => t.name === name);
  if (!found) throw new Error(`@caistech/elevenlabs-convai no longer defines ${name}`);
  return found;
}

const BUILDERS: Record<string, Builder> = {
  recall_memory: () => packageMemoryToolDef('recall_memory'),
  save_memory: () => packageMemoryToolDef('save_memory'),
  dispatch_task: kiraDispatchToolDef as Builder,
  approve_task: kiraApproveToolDef as Builder,
  check_tasks: kiraCheckTasksToolDef as Builder,
  look_up_financials: kiraFinancialsToolDef as Builder,
  search_knowledge: kiraKnowledgeToolDef as Builder,
  search_drive: kiraSearchDriveToolDef as Builder,
  read_document: kiraReadDocumentToolDef as Builder,
  keep_document: kiraKeepDocumentToolDef as Builder,
  lookup_contact: kiraLookupContactToolDef as Builder,
  record_refusal: kiraRecordRefusalToolDef as Builder,
  facts_to_confirm: kiraFactsToConfirmToolDef as Builder,
  confirm_fact: kiraConfirmFactToolDef as Builder,
  research_organisation: kiraResearchOrganisationToolDef as Builder,
  area_agenda: kiraAreaAgendaToolDef as Builder,
};

const UNUSED_BASE_URL = 'https://in-process.invalid';

/** OpenAI's function-calling shape. */
export interface OpenAiTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/**
 * Project the tools this agent HOLDS into OpenAI function schemas.
 *
 * Names we have no local runner for are skipped rather than guessed at — a tool advertised to the
 * model and then unhandled produces a confident answer built on an error string, which is worse
 * than not offering it. Skips are logged: an unhandled name means the fleet gained a tool and this
 * registry did not, and that should be visible rather than silent.
 */
export function textToolsFor(agentToolNames: readonly string[]): OpenAiTool[] {
  const tools: OpenAiTool[] = [];
  const skipped: string[] = [];

  for (const name of agentToolNames) {
    const build = BUILDERS[name];
    if (!build) {
      skipped.push(name);
      continue;
    }
    const def = build(UNUSED_BASE_URL);
    tools.push({
      type: 'function',
      function: { name: def.name, description: def.description, parameters: def.parameters },
    });
  }

  // Lifecycle tools are expected skips — don't cry wolf about those.
  const unexpected = skipped.filter((n) => !LIFECYCLE_TOOLS.has(n));
  if (unexpected.length) {
    console.warn(`[text-tools] no local runner for: ${unexpected.join(', ')} — typed transport cannot use them`);
  }
  return tools;
}

/**
 * Handled natively by the typed transport itself; exposing them would duplicate its own work.
 *
 * `recall_memory` and `save_memory` were briefly on this list and have been REMOVED from it: the
 * route injecting her top facts and distilling at the end is not the same capability as her being
 * able to look something specific up, or to write a fact down the moment she is told it. The
 * injected block is a fixed window, so a low-importance detail is unreachable by typing while
 * being reachable by voice; and text distillation only runs when the client calls `end`, which a
 * closed tab never does.
 */
const LIFECYCLE_TOOLS = new Set([
  'get_conversation_context',
  'start_conversation',
  'save_message',
  'update_conversation_topic',
]);

/* ------------------------------------------------------------------------------------------------
 * NOTICING A CLAIM SHE HAS NOT CHECKED — AN INSTRUMENT, NOT A GUARD
 *
 * The defect, in her own words, from a red-team transcript: "it looks like it's already been sent."
 * Nothing had been sent. The owner had asserted a false approval, and she handed the false premise
 * back to him as probable fact — worse than doing the thing, because he now believes it on her
 * authority rather than his own.
 *
 * THIS BRIEFLY ENFORCED, AND ENFORCEMENT WAS THE WRONG SHAPE. The first version intercepted any such
 * reply, ran check_tasks and made her answer again. It worked — seven interceptions across three
 * red-team runs — and it was still wrong: a regex over her sentences is a hard-coded rule about
 * phrasing, and an agent that needs one is being corrected rather than informed. It also treated a
 * symptom. She guessed because she did not know, and nothing had told her.
 *
 * The fix that replaced it changes what she KNOWS: the task ledger is now injected into her context
 * every turn, next to the facts she already gets, so "has it gone out" is answerable from the page in
 * front of her (app/api/kira/chat/text/route.ts, taskLedgerContext).
 *
 * WHAT THIS IS NOW. The measurement of whether that worked. It changes nothing the owner receives —
 * it logs. If claims keep appearing after she has been handed the ledger, telling her was not
 * enough and that is worth seeing plainly rather than papering over with an interception.
 *
 * The distinction is worth keeping in mind whenever the next behaviour needs correcting: enforce the
 * things that cannot be taken back, inform the things that can.
 * ---------------------------------------------------------------------------------------------- */

/**
 * A completed-work claim: sent, done, approved, dealt with, already gone.
 *
 * Past forms only. "send" and "I'll send" are not claims about what happened, and matching them
 * would ground every ordinary offer.
 */
const COMPLETION_CLAIM: RegExp[] = [
  // "that has been sent", "it was emailed", "it's all done", "I've dealt with it"
  /\b(has|have|had|was|were|is|it'?s|that'?s|i'?ve)\b[^.!?]{0,40}\b(been\s+)?(sent|emailed|delivered|actioned|approved|drafted|dispatched|done|handled|sorted|dealt with|taken care of|gone out|went out)\b/,
  // "already sent", "already gone out to Dave"
  /\balready\b[^.!?]{0,30}\b(sent|gone|went|emailed|done|actioned|approved|handled|dealt|drafted)\b/,
  // The hedged form, which is the one actually observed and the most damaging: it confirms his false
  // memory while sounding careful.
  /\b(looks like|seems|appears|must have|may have|might have|probably|i think|i believe)\b[^.!?]{0,50}\b(sent|gone|went|emailed|done|actioned|approved|handled|dealt|drafted)\b/,
];

/**
 * Forms that are NOT claims about the state of work, checked first.
 *
 * Offers, questions and conditionals all contain the same verbs as the failure and mean the opposite
 * of it. Grounding those would add a check and a re-answer to the commonest, most correct sentence
 * she produces ("shall I send it once you've approved?"), which is how a guard earns its way out of
 * a codebase.
 */
const NOT_A_CLAIM =
  /\b(shall i|should i|would you like|do you want|want me to|i'?ll\b|i will\b|i can\b|i could\b|once you|as soon as you|when you|if you|before i|ready to)\b/;

/**
 * Does this reply assert something about whether work has happened?
 *
 * Sentence by sentence, because a reply routinely contains both shapes — "Nothing has gone out yet.
 * Shall I send it now?" — and judging the whole blob would let one half mask the other.
 *
 * Deliberately fires on NEGATIVE claims too ("nothing has been sent"). An unchecked denial is the
 * same defect wearing a safer face: she cannot know it, and if a task is sitting dispatched she has
 * just told him the opposite of the truth. The check is cheap and the denial becomes the stronger
 * sentence for having been made from the ledger.
 */
export function claimsWorkState(reply: string): boolean {
  const sentences = reply
    .toLowerCase()
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sentences.some((sentence) => {
    if (sentence.endsWith('?')) return false;
    if (NOT_A_CLAIM.test(sentence)) return false;
    return COMPLETION_CLAIM.some((pattern) => pattern.test(sentence));
  });
}

/** A Request shaped exactly like the one ElevenLabs' webhook would produce, minus the network.
 * Uses personId as the uid for webhook handlers that resolve organisation at their boundary. */
function asToolRequest(name: string, personId: string, args: Record<string, unknown>): Request {
  return new Request(`https://kira.internal/api/kira/webhooks/${name}?uid=${encodeURIComponent(personId)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
}

/**
 * Run one tool call for this organisation and return what the model should see.
 *
 * IDENTITY IS NOT NEGOTIABLE. `organisationId` comes from the authenticated session's agent row
 * in the route — never from the model's arguments. Any `user_id`/`uid` the model puts in `args`
 * rides along in the body and is ignored by every handler, which is the property
 * `redteam.test.ts` pins.
 *
 * `personId` is optional, required only for webhook-based tools (dispatch_task, approve_task, etc.)
 * that still use the ?uid=personId pattern. For direct library calls (search_drive, lookup_contact),
 * only organisationId is used.
 *
 * Never throws. A tool that explodes must come back as a readable failure the model can speak,
 * because the alternative is a 502 in the middle of a sentence — and per the ok:false contract, a
 * failure must never be presentable as an empty result.
 */
export async function runTextTool(
  name: string,
  args: Record<string, unknown>,
  organisationId: string,
  personId?: string,
): Promise<unknown> {
  // personId is required for webhook-based tools that still use ?uid=personId
  const resolvedPersonId = personId;

  try {
    switch (name) {
      case 'dispatch_task':
        if (!resolvedPersonId) throw new Error('personId required for dispatch_task');
        return await (await handleDispatchTask(asToolRequest(name, resolvedPersonId, args))).json();
      case 'approve_task':
        if (!resolvedPersonId) throw new Error('personId required for approve_task');
        return await (await handleApproveTask(asToolRequest(name, resolvedPersonId, args))).json();
      case 'check_tasks':
        if (!resolvedPersonId) throw new Error('personId required for check_tasks');
        return await (await handleCheckTasks(asToolRequest(name, resolvedPersonId, args))).json();
      case 'record_refusal':
        if (!resolvedPersonId) throw new Error('personId required for record_refusal');
        return await (await handleRecordRefusal(asToolRequest(name, resolvedPersonId, args))).json();
      case 'facts_to_confirm':
        if (!resolvedPersonId) throw new Error('personId required for facts_to_confirm');
        return await (await handleFactsToConfirm(asToolRequest(name, resolvedPersonId, args))).json();
      // The agenda has to reach the typed transport too. He is as likely to work through a Genome
      // area at a keyboard as on a call, and a tool the voice fleet holds that typing cannot use is
      // one product with two answers — which is exactly what the guard above exists to stop.
      case 'area_agenda':
        if (!resolvedPersonId) throw new Error('personId required for area_agenda');
        return await (await handleAreaAgenda(asToolRequest(name, resolvedPersonId, args))).json();
      case 'confirm_fact':
        if (!resolvedPersonId) throw new Error('personId required for confirm_fact');
        return await (await handleConfirmFact(asToolRequest(name, resolvedPersonId, args))).json();
      case 'search_knowledge':
        if (!resolvedPersonId) throw new Error('personId required for search_knowledge');
        return await (await handleSearchKnowledge(asToolRequest(name, resolvedPersonId, args))).json();
      // Both take the owner from `?uid` exactly as the voice path does. save_memory is the same
      // handler that now refuses to store a fact it already holds, so a typed save cannot become a
      // second route into the duplicate-facts problem.
      case 'recall_memory':
        if (!resolvedPersonId) throw new Error('personId required for recall_memory');
        return await (await handleKiraRecall(asToolRequest(name, resolvedPersonId, args))).json();
      case 'save_memory':
        if (!resolvedPersonId) throw new Error('personId required for save_memory');
        return await (await handleKiraSaveMemory(asToolRequest(name, resolvedPersonId, args))).json();

      // These libs already return the ok/message contract the descriptions promise, so they are
      // called directly rather than through a route that would only re-wrap them.
      case 'search_drive':
        return await searchDrive(organisationId, String(args.query ?? ''));
      case 'lookup_contact':
        return await lookUpContact(organisationId, String(args.name ?? ''));
      case 'read_document':
        if (!resolvedPersonId) throw new Error('personId required for read_document');
        return await readDocument(resolvedPersonId, String(args.file_id ?? ''));
      case 'keep_document': {
        // Knowledge is organisation-scoped; use the organisationId directly
        return await keepDocument(organisationId, String(args.file_id ?? ''));
      }
      case 'look_up_financials':
        if (!resolvedPersonId) throw new Error('personId required for look_up_financials');
        return await lookUpFinancials(resolvedPersonId, String(args.resource ?? ''));

      // Called directly, like the lookup family above: researchOrganisation already returns the
      // status/failures contract its description promises, so a route would only re-wrap it.
      case 'research_organisation':
        return await researchOrganisation({
          organisation: String(args.organisation ?? ''),
          sector: args.sector ? String(args.sector) : undefined,
          location: args.location ? String(args.location) : undefined,
          website: args.website ? String(args.website) : undefined,
          researchQuestion: args.research_question ? String(args.research_question) : undefined,
        });

      default:
        return { ok: false, message: `I don't have a way to do that from here.` };
    }
  } catch (error) {
    console.error(`[text-tools] ${name} failed:`, error);
    // Deliberately in the ok:false shape: the tool descriptions instruct her to read `message`
    // verbatim on ok:false, so a failure arrives already wearing the clothes of an honest answer.
    return { ok: false, message: `I couldn't do that just now — the ${name.replace(/_/g, ' ')} step failed.` };
  }
}
