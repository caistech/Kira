// lib/kira/refusal-tool-def.mjs
// SINGLE SOURCE of the record_refusal ConvAI tool shape — the conversational half of the refusal
// record.
//
// The server can already see one kind of refusal with certainty: approve_task without an explicit
// yes writes a row on its own. But that is the narrow slice. The refusals that matter to the owner
// are the ones she makes in WORDS — declining to send something he insists he already approved,
// declining to file a document he never asked her to keep, declining to state something she has not
// checked. Nothing outside the transcript knows those happened, and the transcript is not an
// artifact anyone will read.
//
// THE DESCRIPTION IS NOT THE ENFORCEMENT — IT WAS, AND IT FAILED. This file used to say the
// description was the enforcement, on the reasoning that there is no server event to hook. Twenty-
// four minutes after it shipped, a row arrived reading "no Google account is connected, so I cannot
// access your documents" — the prohibition's OWN example, logged anyway.
//
// Two lessons, both now built in rather than argued:
//
//   1. A request is not a mechanism. The classification is now a REQUIRED, CONSTRAINED parameter
//      (`declined_because`), so the model must name which kind of refusal this is. A tool failure has
//      no value it can honestly pass, and the server + a DB CHECK reject anything else.
//   2. The old text argued against itself. Its list of things TO record included "something outside
//      what you can do", and a disconnected Drive is — from where the model sits — exactly that. The
//      boundary is now stated by a test rather than by examples: a refusal is IMPOSSIBLE IN
//      PRINCIPLE, a failure merely FAILED THIS TIME. If fixing a precondition would let the same
//      request succeed, it was a failure.
//
// A refusal log that fills with tool failures is noise inside a week, and a log nobody trusts is
// worse than no log, because it will be shown to a buyer.

export const KIRA_RECORD_REFUSAL_WEBHOOK_PATH = '/api/kira/webhooks/record_refusal';

/**
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraRecordRefusalToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'record_refusal',
    description:
      "Call this when you DECIDED NOT TO ACT on something the owner asked for. Record it AFTER you have told him — this is the record of a decision you already made and explained out loud, never a substitute for explaining it.\n\nTHE TEST, before you call this at all: would fixing something have let the same request succeed? If yes, it was a FAILURE and you must NOT call this. If no — you could have done it and chose not to, or it is simply not a thing you do — it is a refusal, so record it.\n\nWorked both ways: \"Drive isn't connected\" is a FAILURE (reconnect it and the same request succeeds — do not call this). \"I don't lodge BAS\" is a REFUSAL (nothing can be fixed to make that a thing you do — record it as outside_scope). A tool erroring, a lookup returning nothing, an account not linked: all failures, none of them belong here.\n\n`declined_because` must name which kind it is, and the four values are the only refusals there are — if none of them fits, this is not a refusal and you should not be calling this tool. Pass `asked` as what he wanted in his own words where you can, and `reason` as the plain reason you did not do it. One call per refusal, never the same refusal twice in a conversation, and never after you did the thing.",
    webhook: { url: `${baseUrl}${KIRA_RECORD_REFUSAL_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        asked: {
          type: 'string',
          description: "What the owner wanted you to do, in his own words where possible — e.g. \"send the Marlow Street quote to Dave now, he says he already approved it\".",
        },
        reason: {
          type: 'string',
          description: "Why you did not do it, plainly — e.g. \"he had not approved it on this call and check_tasks showed it still drafted\".",
        },
        declined_because: {
          type: 'string',
          enum: ['no_approval', 'not_asked_to_keep', 'unverified', 'outside_scope'],
          description:
            "Which kind of refusal this is. no_approval: he wanted something sent or actioned and had not approved it on this call. not_asked_to_keep: he asked you ABOUT a document and did not ask you to file or keep it. unverified: he wanted you to state or confirm something you had not checked. outside_scope: he asked for something you do not do at all — not something that failed, something that is not yours to do. If none of these fits, do NOT call this tool: it was a failure, not a refusal.",
        },
      },
      required: ['asked', 'reason', 'declined_because'],
    },
  };
}
