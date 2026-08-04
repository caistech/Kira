// lib/kira/tool-manifest.mjs
//
// THE ONE LIST OF TOOLS AN AGENT HOLDS — and, from the same list, the one description of them the
// prompt is allowed to give her.
//
// WHY THIS FILE EXISTS. The prompt's `## TOOLS` section was hand-written. Measured on the live fleet
// 2026-08-04, it named three tools the agent does not have — `start_research_session`,
// `save_finding`, `search_web` — alongside a "COLLABORATIVE RESEARCH" flow built on them. The agent
// reaches for a tool that isn't there, the call fails, and she reports it to the owner as something
// she "can't access" — which reads as a broken product rather than an unbuilt one.
//
// This is a RECURRENCE. The bug knowledge already carries it from 2026-07-25, with the lesson
// written down at the time: *"The prompt's tool list must be GENERATED from the attached tool set,
// never hand-written — a hand-written list drifts into a lie the moment attachment changes."* It was
// still hand-written. So this is that lesson given a mechanism instead of a sentence.
//
// The manifest is the source for BOTH sides, which is the whole point: `buildToolsForUser` pushes
// these defs to ElevenLabs, and `toolsSection()` renders the prompt copy from the same array. A tool
// cannot be described to her without being attached, and cannot be attached without being described,
// because there is only one list.

import { createConversationTools } from '@caistech/elevenlabs-convai';

import { kiraKnowledgeToolDef } from './knowledge-tool-def.mjs';
import { withEntityClassification } from './memory-entity-def.mjs';
import {
  kiraKeepDocumentToolDef,
  kiraLookupContactToolDef,
  kiraReadDocumentToolDef,
  kiraSearchDriveToolDef,
} from './lookup-tools-def.mjs';
import {
  kiraApproveToolDef,
  kiraCheckTasksToolDef,
  kiraDispatchToolDef,
  kiraFinancialsToolDef,
} from './swarm/doing-tools-def.mjs';
import { kiraRecordRefusalToolDef } from './refusal-tool-def.mjs';
import { kiraConfirmFactToolDef, kiraFactsToConfirmToolDef } from './confirm-tool-def.mjs';

/**
 * `recall_memory` gets its description REWRITTEN here, and this is the fix for a specific failure.
 *
 * The owner asked her about a conversation held hours earlier and she said she had no recollection.
 * Verified against production: the memory was there, and the pull path returns it for a
 * natural-language question with no keyword overlap. She simply never called the tool.
 *
 * The reason is visible the moment the descriptions are read side by side. Every tool she reliably
 * calls names an OBSERVABLE TRIGGER — "call this whenever the owner refers to a document", "whenever
 * you need someone's email address", "at the VERY START of every conversation". The package's
 * description for recall_memory is "use this when you need to remember something", which asks her
 * first to NOTICE that she does not know — and a model holding ten confident facts never notices.
 *
 * Overridden locally rather than in @caistech/elevenlabs-convai because the trigger has to reference
 * something product-specific (the facts handed over at connect). It is a strong extraction candidate
 * once a second consumer wants it.
 */
const RECALL_DESCRIPTION =
  'Call this WHENEVER the owner refers to anything you were not just handed at the start of this ' +
  'conversation — a project, a job, a person, a document, a place, a date, a number, or any "remember ' +
  'when / last time / what did we say about". Do NOT wait until you feel unsure: you will often feel ' +
  'certain and still be missing it, because you are given only a slice of what is stored. Searching ' +
  'costs a second and saying "I do not recall" to something you actually hold costs his trust. Pass ' +
  'the words HE used as the query.';

/**
 * Every tool this journey's agent should hold, as plain defs — no uid, no secret.
 *
 * Callers that PUSH tools add those (see scripts/lib/redteam-tools.mjs). Callers that merely DESCRIBE
 * them do not need either, which is why the split exists.
 *
 * @param {string} journeyType  'business' gets the doing slice + the Google slice; personal does not
 * @param {string} appUrl       base URL the webhooks point at
 */
export function toolDefsFor(journeyType, appUrl) {
  const tools = [
    ...withEntityClassification(createConversationTools(appUrl, '/api/kira/webhooks', { platformIdentity: true })),
    kiraKnowledgeToolDef(appUrl),
    ...(journeyType === 'business'
      ? [
          kiraDispatchToolDef(appUrl),
          kiraApproveToolDef(appUrl),
          kiraFinancialsToolDef(appUrl),
          kiraCheckTasksToolDef(appUrl),
          kiraSearchDriveToolDef(appUrl),
          kiraReadDocumentToolDef(appUrl),
          kiraKeepDocumentToolDef(appUrl),
          kiraLookupContactToolDef(appUrl),
          kiraRecordRefusalToolDef(appUrl),
          kiraFactsToConfirmToolDef(appUrl),
          kiraConfirmFactToolDef(appUrl),
        ]
      : []),
  ];

  for (const t of tools) {
    if (t?.name === 'recall_memory') t.description = RECALL_DESCRIPTION;
  }
  return tools;
}

/**
 * The prompt's `## TOOLS` section — an INVENTORY, not a second copy of the descriptions.
 *
 * NAMES ONLY, and the reason is measurable. Rendered with full descriptions this section was 15,562
 * characters — 39.5% of the entire system prompt, ~3,900 tokens — and every one of those
 * descriptions is ALREADY sent to the model as the tool schema, because that is how function
 * calling works. The prompt was carrying a second copy of something the model receives anyway.
 *
 * Two copies is also worse than one on correctness, not just on size: the prompt copy and the tool
 * copy can disagree, and the disagreement is invisible from either side. The description belongs
 * where she reads it at the moment of choosing — on the tool.
 *
 * The inventory itself stays, for two reasons that are worth the ~400 characters it now costs:
 * it lets the guard in tool-manifest.test.ts fail a prompt that names a tool she does not have,
 * and it is the honest answer to an agent telling an owner she "can't access" his email while
 * holding fourteen Google tools — she can see exactly what she has.
 */
export function toolsSection(journeyType, appUrl = 'https://kira-rho.vercel.app') {
  const names = toolDefsFor(journeyType, appUrl)
    .filter((t) => t?.name)
    .map((t) => t.name);

  return `## TOOLS

These are the tools you have, and there are no others: ${names.join(', ')}.

Each one tells you what it is for and when to call it — read that, and follow it. If something you
want to do is not in this list you cannot do it, and you must say so plainly rather than implying it
happened. Call them when they help; never announce that you are calling one.`;
}
