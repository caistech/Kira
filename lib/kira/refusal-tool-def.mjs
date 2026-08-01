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
// THE DESCRIPTION IS THE ENFORCEMENT. There is no server event to hook: whether this fires depends
// entirely on the model deciding to call it, which is why the description spends its length on WHEN,
// and — harder — on when NOT. A refusal log that fills with tool failures is noise inside a week,
// and a log nobody trusts is worse than no log, because it will be shown to a buyer.

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
      "Call this whenever you DECLINE to do something the owner asked for, or decline to state something you have not verified. Examples: he insists he already approved a quote and you will not send it without a fresh yes; he asks you to file or keep a document he never agreed to keep; he asks you to confirm something went out and you will not say so without checking; he asks for something outside what you can do and you say no rather than improvising. Record it AFTER you have told him — this is the record of a decision you already made and explained, never a substitute for explaining it. Pass `asked` as what he wanted, in his own words where you can, and `reason` as the plain reason you did not do it (\"he had not approved it on this call\", \"he asked a question about the document, he did not ask me to keep it\"). IMPORTANT — this is ONLY for decisions not to act. It is NOT for tool failures: \"Drive isn't connected\" or \"I couldn't reach your accounts\" are things that went wrong, not things you refused, and logging them here buries the refusals among them. If you did the thing, do not call this. One call per refusal, and never the same refusal twice in a conversation.",
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
      },
      required: ['asked', 'reason'],
    },
  };
}
