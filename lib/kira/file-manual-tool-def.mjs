// lib/kira/file-manual-tool-def.mjs
// SINGLE SOURCE of the file_manual ConvAI tool shape.
//
// The tool that ends the migration. Everything else she does moves knowledge out of his head and
// into OUR database; this puts it into HIS — a folder in his own account, which he keeps whether or
// not he keeps us.
//
// TWO AUDIENCES, AND THE PARAMETER IS REQUIRED. There is no default and there must not be. His own
// copy carries his position, his plans and anything he has said he is not ready to share; the
// buyer's copy deliberately does not. A default that guessed wrong in the buyer direction would file
// the wrong document into a folder he then shares — irreversible, and he would not know. So she has
// to ask, which is the correct behaviour anyway: nobody files a document for somebody without
// knowing who it is for.
//
// APPROVAL BEFORE THE FIRST WRITE. This creates files in a customer's own account, which is a trust
// threshold rather than a feature — the same reason nothing outbound leaves without his word. The
// description below tells her to get an explicit yes; the SERVER enforces it (see the route), because
// a request is not a mechanism and this product has already learned that twice.

export const KIRA_FILE_MANUAL_WEBHOOK_PATH = '/api/kira/webhooks/file_manual';

export function kiraFileManualToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'file_manual',
    description:
      "Call this to write the owner's operating manual into his OWN document storage — one document per area of his Genome, in a folder he owns and keeps.\n\nThis is the point of the whole exercise: everything you have captured lives with us until it lands somewhere he keeps. Offer it when a chunk of work is done, when he asks where his manual is, when he wants to give something to an accountant, a broker or a buyer, or when he asks you to write it down properly.\n\nASK WHO IT IS FOR — there is no default and you must not guess.\n  audience=\"owner\" is HIS copy. It includes things the buyer's copy leaves out: his plans, his position, what he would accept, anything he has said he is not ready to share.\n  audience=\"buyer\" is the handover. It leaves all of that out and is the one safe to give to anyone.\nIf he says \"file my manual\" without saying which, ask him. Filing the wrong one into a folder he then shares cannot be undone.\n\nGET AN EXPLICIT YES FIRST. Say what you are about to do — which copy, and that it will appear in his own documents — and wait for him to agree. It creates files in his account; that is not something to do because it seemed helpful.\n\nWhat comes back: `ok` true means EVERY section was written, and you may say it is filed. `ok` false means some or none of it landed — say the `message` as written and do not describe it as done. `written` and `total` are the counts. If a folder link comes back you may offer it.\n\nRunning it again is safe and is how he keeps it current: it UPDATES the documents already there rather than making a second set.",
    webhook: { url: `${baseUrl}${KIRA_FILE_MANUAL_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        audience: {
          type: 'string',
          enum: ['owner', 'buyer'],
          description:
            "Who the copy is for. owner: his own record, including his position and his plans. buyer: the handover, with all of that left out. Ask him — never assume, and never pick one because it seems more useful.",
        },
        approved: {
          type: 'boolean',
          description:
            "True ONLY when you have told him what you are about to file and he has said yes on this call. Not true because he asked about his manual, and not true because it seemed like what he wanted.",
        },
      },
      required: ['audience', 'approved'],
    },
  };
}
