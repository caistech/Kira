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
//      what you can do", and a disconnected Drive is — from where the model sits — exactly that.
//
// AND THE REPLACEMENT TEST WAS WRONG TOO, for a subtler reason worth keeping. It asked "would fixing
// something have let the same request succeed?" — which invites her to imagine a fix that does not
// exist. Asked to send an invoice she reasoned "an invoicing connector could be connected", called it
// a failure and recorded nothing; there is no invoicing connector, so it was outside_scope all along.
// The test is therefore anchored to WHAT EXISTS.
//
// That correction shipped to lib/kira/prompts.ts in d6f3052 and NOT to this file, so for the days
// afterwards her prompt carried the fixed boundary while the tool description she reads at call time
// still carried the wording that caused the regression — the two in direct contradiction, with the
// closer one wrong. A rule that lives in two places is a rule that will be half-updated.
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
      "Call this when you DECIDED NOT TO ACT on something the owner asked for. Record it AFTER you have told him — this is the record of a decision you already made and explained out loud, never a substitute for explaining it.\n\nTHE TEST, before you call this at all, is WHAT EXISTS — never what you can imagine someone fixing:\n\n- You HAVE a tool for it and it is simply not available right now (Drive isn't connected, a lookup errored, an account isn't linked). That is a FAILURE. Say it plainly and do NOT call this.\n- There is NO tool for it at all (you don't lodge BAS, you don't log into an invoicing system, it is not a thing you do). That is a REFUSAL — record it as outside_scope.\n\nDo not talk yourself out of the second by inventing the first. \"He could connect one\" does not make it a failure when no such connector exists. Look at the tools you actually have: if nothing there could ever do this, it is a refusal and it belongs in the record.\n\n`declined_because` must name which kind it is, and the four values are the only refusals there are — if none of them fits, this is not a refusal and you should not be calling this tool. Pass `asked` as what he wanted in his own words where you can, and `reason` as the plain reason you did not do it. One call per refusal, never the same refusal twice in a conversation, and never after you did the thing.",
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
