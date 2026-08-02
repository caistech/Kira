// lib/kira/confirm-tool-def.mjs
// SINGLE SOURCE of the two confirmation tools — the mechanism behind the Genome's verifiable axis.
//
// WHY TWO TOOLS AND NOT ONE. She cannot confirm a fact she cannot name. recall_memory returns
// contents without ids, so there is nothing for her to cite — and a tool that asked her to pass a
// fact id would get an invented one, which is the worst outcome available here: a confirmation
// attached to the wrong fact is a false claim about his business wearing the strongest label the
// document has.
//
// So `facts_to_confirm` hands her real facts with real handles, and `confirm_fact` takes one of
// those handles back. The pairing is the same shape as search_drive -> read_document, and for the
// same reason: the id must come from us, never from her.
//
// WHAT SHE MUST NOT DO WITH THEM, stated in the descriptions because it is a matter of manners
// rather than of consequence: this is a conversation, not an audit. Reading twenty facts back in a
// row would turn the one part of the product he enjoys into a compliance interview. The instruction
// is one or two, woven in where they fit.
//
// THE HONEST ASYMMETRY. `confirm_fact` with outcome `denied` or `corrected` PARKS the fact — it stops
// being asserted in his name the moment he says it is wrong. That is a real consequence, and it is
// the right one: the cost of parking a fact he actually agreed with is a re-ask, and the cost of
// continuing to assert something he has told us is untrue, in a document shown to a buyer, is the
// product's credibility.

export const KIRA_FACTS_TO_CONFIRM_WEBHOOK_PATH = '/api/kira/webhooks/facts_to_confirm';
export const KIRA_CONFIRM_FACT_WEBHOOK_PATH = '/api/kira/webhooks/confirm_fact';

/**
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraFactsToConfirmToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'facts_to_confirm',
    description:
      "Get a couple of things he has told you that he has NOT yet confirmed, so you can read one back to him and check you have it right.\n\nWhy this matters, and it is worth understanding rather than just doing: anything he has told you once is, to a buyer, hearsay. A fact he has heard back and agreed with is evidence. Checking is not you doubting him or being forgetful — it is the difference between a note and a record, and it is most of what he is paying for.\n\nUse it when there is a natural gap: the start of a conversation, after you have finished a topic, or when he asks what you have got. Each fact comes back with a `handle` — pass that exact handle to confirm_fact afterwards. Never invent one.\n\nONE OR TWO AT A TIME, woven into the conversation. Do not work through the list. Reading fact after fact back at him turns a conversation into an audit, and he will stop talking to you.",
    webhook: { url: `${baseUrl}${KIRA_FACTS_TO_CONFIRM_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        about: {
          type: 'string',
          description:
            "OPTIONAL. A word or two to steer which facts come back, when you are already on a topic — \"pricing\", \"suppliers\", \"the Marlow job\". Leave it out to get whatever is oldest and unconfirmed, which is the right default at the start of a conversation.",
        },
      },
      required: [],
    },
  };
}

/**
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraConfirmFactToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'confirm_fact',
    description:
      "Record what he said when you read a fact back to him. Call this AFTER he has answered — never before, and never to record your own opinion of whether something is right.\n\nThe three outcomes are the only three there are:\n\n- confirmed: he agreed it is right.\n- corrected: he said it is wrong AND told you what it actually is. The old fact is taken out of his record, and you should then save the corrected version with save_memory as you would any new fact.\n- denied: he said it is wrong, or no longer true, without giving you a replacement. The old fact is taken out of his record.\n\nBoth corrected and denied REMOVE the fact from his record, so use them only when he has actually said it is wrong. \"I'm not sure\" is not denied — leave it alone and move on; an unconfirmed fact is honest, and a wrongly-denied one loses something true he told you.\n\n`handle` must be one you were given by facts_to_confirm in this conversation. If you do not have one, call that first. Never guess a handle: a confirmation attached to the wrong fact is worse than no confirmation at all.\n\nPut what he actually SAID in `said`, in his words where you can — that sentence is the whole value of the record to anyone reading it later.",
    webhook: { url: `${baseUrl}${KIRA_CONFIRM_FACT_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description:
            'The handle of the fact you read back, exactly as facts_to_confirm gave it to you. Never invent or guess one.',
        },
        outcome: {
          type: 'string',
          enum: ['confirmed', 'corrected', 'denied'],
          description:
            "What he said. confirmed: he agreed. corrected: he said it is wrong and gave you the right version (save that separately with save_memory). denied: he said it is wrong or no longer true, with no replacement. If he was unsure or did not really answer, do NOT call this at all.",
        },
        said: {
          type: 'string',
          description:
            'What he actually said, in his own words where possible — e.g. "yeah that\'s right, though it\'s gone up to $95 an hour since". This is the part a buyer reads.',
        },
      },
      required: ['handle', 'outcome', 'said'],
    },
  };
}
