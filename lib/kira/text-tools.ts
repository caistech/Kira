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
import { kiraRecordRefusalToolDef } from './refusal-tool-def.mjs';
import { handleRecordRefusal } from './refusal';
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
 * SPECULATION ABOUT WORK SHE HAS NOT CHECKED
 *
 * The defect, in her own words, from a red-team transcript: "it looks like it's already been sent."
 * Nothing had been sent. The owner had asserted a false approval, and she handed the false premise
 * back to him as probable fact — which is worse than doing the thing, because he now believes it on
 * her authority rather than his own.
 *
 * `taskLedgerSection` in prompts.ts forbids that sentence VERBATIM, quoting it as the anti-example.
 * It did not hold. That is the fourth instance of the same lesson on this product: a request is not
 * a mechanism, and every guard that has actually worked hooked something in code — declined_because
 * on record_refusal, about_business on save_memory, speaking_to on the disclosure tools, the entity
 * decorator on the memory pair.
 *
 * WHY THIS ONE CAN ONLY BE BUILT HERE. On the voice transport the decision to call a tool is made
 * inside ElevenLabs, and all we can do is ask. On the typed transport that decision runs in our own
 * loop — so instead of asking her to check before she speaks, we can decline to deliver a claim she
 * has not checked, run the check ourselves, and make her answer again with the ledger in front of
 * her. The asymmetry is real and worth stating plainly: the mechanism is cheap here and impossible
 * there, so this transport is where the behaviour is corrected and measured.
 *
 * IT GROUNDS RATHER THAN CENSORS. Nothing is deleted or rewritten by us — she is given the facts and
 * asked again. A filter that stripped the sentence would leave the owner with a reply that dodges his
 * question, which is its own kind of dishonesty.
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

/**
 * What she is told when a claim is intercepted.
 *
 * The last line is the one that matters, and it is a limit on the LEDGER rather than on her: the
 * ledger records what she was asked to do, so an absent row means she has no record of it — not that
 * it never happened. He may well have sent it himself from his own laptop. Overcorrecting a
 * speculative "it's been sent" into a confident "it has not been sent" would just swap one
 * unsupported claim for another.
 */
export const GROUNDING_INSTRUCTION =
  'STOP. You were about to tell the owner something about whether work has been done, sent or ' +
  'approved, and you had not checked. The current task ledger has just been read for you and is ' +
  'below.\n\nAnswer him again, using ONLY what the ledger shows. Be definite: say what it says. ' +
  'Never say "it looks like", "it seems", "it may already have been" or anything else that hands ' +
  'him a guess as though it were a fact — that sentence is how a false memory gets confirmed on ' +
  'your authority.\n\nIf the ledger has no record of the thing he is asking about, say exactly ' +
  'that: you have no record of it being sent, and it is not sitting here waiting. Do not say it was ' +
  'never sent — the ledger only covers what he asked YOU to do, and he may have done it himself.';

/** A Request shaped exactly like the one ElevenLabs' webhook would produce, minus the network. */
function asToolRequest(name: string, ownerId: string, args: Record<string, unknown>): Request {
  return new Request(`https://kira.internal/api/kira/webhooks/${name}?uid=${encodeURIComponent(ownerId)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
}

/**
 * Run one tool call for this owner and return what the model should see.
 *
 * IDENTITY IS NOT NEGOTIABLE. `ownerId` comes from the authenticated session's agent row in the
 * route — never from the model's arguments. Any `user_id`/`uid` the model puts in `args` rides
 * along in the body and is ignored by every handler, which is the property `redteam.test.ts` pins.
 *
 * Never throws. A tool that explodes must come back as a readable failure the model can speak,
 * because the alternative is a 502 in the middle of a sentence — and per the ok:false contract, a
 * failure must never be presentable as an empty result.
 */
export async function runTextTool(
  name: string,
  args: Record<string, unknown>,
  ownerId: string,
): Promise<unknown> {
  try {
    switch (name) {
      case 'dispatch_task':
        return await (await handleDispatchTask(asToolRequest(name, ownerId, args))).json();
      case 'approve_task':
        return await (await handleApproveTask(asToolRequest(name, ownerId, args))).json();
      case 'check_tasks':
        return await (await handleCheckTasks(asToolRequest(name, ownerId, args))).json();
      case 'record_refusal':
        return await (await handleRecordRefusal(asToolRequest(name, ownerId, args))).json();
      case 'search_knowledge':
        return await (await handleSearchKnowledge(asToolRequest(name, ownerId, args))).json();
      // Both take the owner from `?uid` exactly as the voice path does. save_memory is the same
      // handler that now refuses to store a fact it already holds, so a typed save cannot become a
      // second route into the duplicate-facts problem.
      case 'recall_memory':
        return await (await handleKiraRecall(asToolRequest(name, ownerId, args))).json();
      case 'save_memory':
        return await (await handleKiraSaveMemory(asToolRequest(name, ownerId, args))).json();

      // These libs already return the ok/message contract the descriptions promise, so they are
      // called directly rather than through a route that would only re-wrap them.
      case 'search_drive':
        return await searchDrive(ownerId, String(args.query ?? ''));
      case 'lookup_contact':
        return await lookUpContact(ownerId, String(args.name ?? ''));
      case 'read_document':
        return await readDocument(ownerId, String(args.file_id ?? ''));
      case 'keep_document':
        return await keepDocument(ownerId, String(args.file_id ?? ''));
      case 'look_up_financials':
        return await lookUpFinancials(ownerId, String(args.resource ?? ''));

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
