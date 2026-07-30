// lib/kira/swarm/doing-tools-def.mjs
// SINGLE SOURCE of the dispatch_task + approve_task ConvAI tool shapes — the doing-slice tools.
//
// Two consumers that can't share a TS module: lib/kira/convai.ts (kiraAllTools, for NEW agents) and
// scripts/reprovision-kira-agents.mjs (for already-provisioned agents). Duplicating would drift.
//
// The secret header + the ?uid identity are added by the caller (convai.ts) at build time, not here.

export const KIRA_DISPATCH_WEBHOOK_PATH = '/api/kira/webhooks/dispatch_task';
export const KIRA_APPROVE_WEBHOOK_PATH = '/api/kira/webhooks/approve_task';

/**
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraDispatchToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'dispatch_task',
    description:
      "When the owner asks you to actually DO something — draft a quote, write a follow-up email to a client, set a reminder — call this to prepare it. It drafts the thing but does NOT send it. Read the returned summary back to the owner and ask if you should send/set it; then call approve_task. IMPORTANT: if the response has needs_recipient_email=true, you do NOT have a usable email address for the recipient — ask the owner for it (e.g. \"what's Dave's email and I'll send it?\") and pass it to approve_task as recipient_email. ALSO IMPORTANT: if the response has confirm_recipient=true, read the recipient_email back to the owner LETTER BY LETTER and get a yes before you call approve_task — an address you mis-heard by one character looks perfectly fine to everyone except the person who never receives it. NEVER spell an address out into the request field yourself. Do NOT call this for general questions or advice — only when there is a concrete task to prepare. If it comes back 'unsupported', tell the owner you've noted it and can't do that one yourself yet.",
    webhook: { url: `${baseUrl}${KIRA_DISPATCH_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        request: {
          type: 'string',
          description:
            'The task in the owner\'s words, with any detail they gave (who it\'s for, the gist, timing). E.g. "follow up with Dave about the Wavecrest quote", "remind me to call the plumber tomorrow morning".',
        },
      },
      required: ['request'],
    },
  };
}

/**
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraApproveToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'approve_task',
    description:
      "Call this ONLY after the owner has heard the drafted task (from dispatch_task) AND confirmed the recipient's address, and clearly said to go ahead. Pass the task_id you got back from dispatch_task and approve=true. For an email or quote, if you had to ask the owner for the recipient's email address, pass it as recipient_email — otherwise the send can't complete. If the response comes back with needs_recipient_email=true, the address was not usable and NOTHING was sent — ask the owner for it again and call this once more. If they say no or want changes, do NOT call this with approve=true. Nothing is sent until you call this with approve=true.",
    webhook: { url: `${baseUrl}${KIRA_APPROVE_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'The task_id returned by dispatch_task.' },
        approve: {
          type: 'boolean',
          description: 'true only if the owner explicitly approved sending/setting it; false to discard.',
        },
        recipient_email: {
          type: 'string',
          description: "The recipient's email address, if the owner gave it to you for an email/quote send. Omit if not applicable or already known.",
        },
      },
      required: ['task_id', 'approve'],
    },
  };
}

export const KIRA_CHECK_TASKS_WEBHOOK_PATH = '/api/kira/webhooks/check_tasks';

/**
 * check_tasks — the third verb. She could ask her team to do something, and could not say what had
 * become of it. Read-only, no parameters: identity is the server-baked ?uid, so there is nothing for
 * the model to fill in and nothing it can get wrong.
 *
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraCheckTasksToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'check_tasks',
    description:
      "Call this whenever the owner asks what happened to something they asked you for — \"did that quote go out?\", \"what are you still working on?\", \"anything waiting on me?\" — and ALSO call it early in a conversation if you have not checked this session, so you can raise anything that has been waiting. It returns open_count, an `open` list (each with a plain-language `state` and how many days it has been waiting), a `recently_done` list, and a ready-to-say `summary`. It only reads — it never sends, approves or changes anything. Say what it returns and nothing more: if a task is 'drafted and waiting on your go-ahead', it has NOT been sent, and you must not imply it has. To move one forward, confirm the recipient and call approve_task with its id.",
    webhook: { url: `${baseUrl}${KIRA_CHECK_TASKS_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: { type: 'object', properties: {}, required: [] },
  };
}

export const KIRA_FINANCIALS_WEBHOOK_PATH = '/api/kira/webhooks/look_up_financials';

/**
 * look_up_financials — the READ half. Answers immediately, changes nothing, holds nothing.
 *
 * The resource is an enum rather than free text on purpose: the model names a question, it never
 * composes a query. A model-supplied filter or URL against a business's accounting system is an
 * injection surface over its complete financial position.
 *
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraFinancialsToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'look_up_financials',
    description:
      "Call this when the owner asks a question about their own accounts — what's in the bank, who owes them money, what they owe, how the business is doing on paper. It READS their accounting system and answers straight away; it changes nothing and needs no approval. Say the figures out loud. Do NOT save them to memory: you may remember what the numbers MEAN (\"money owed is concentrated in a few clients\") but never the amounts, balances, invoice numbers or client names. If it comes back ok=false, say exactly what it tells you — \"not connected\" and \"couldn't look\" are different from \"nothing owing\", and you must never turn either into a zero.",
    webhook: { url: `${baseUrl}${KIRA_FINANCIALS_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        resource: {
          type: 'string',
          enum: ['bank_balances', 'invoices_owed_to_you', 'bills_you_owe', 'profit_and_loss', 'organisation'],
          description:
            'Which question. bank_balances = what is in the accounts. invoices_owed_to_you = who owes them and how much is overdue. bills_you_owe = what they owe. profit_and_loss = how the business is trading. organisation = the business details Xero holds.',
        },
      },
      required: ['resource'],
    },
  };
}
