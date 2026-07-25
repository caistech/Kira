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
      "When the owner asks you to actually DO something — draft a quote, write a follow-up email to a client, set a reminder — call this to prepare it. It drafts the thing but does NOT send it. Read the returned summary back to the owner and ask if you should send/set it; then call approve_task. Do NOT call this for general questions or advice — only when there is a concrete task to prepare. If it comes back 'unsupported', tell the owner you've noted it and can't do that one yourself yet.",
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
      "Call this ONLY after the owner has heard the drafted task (from dispatch_task) and clearly said to go ahead. Pass the task_id you got back from dispatch_task and approve=true. If they say no or want changes, do NOT call this with approve=true. Nothing is sent until you call this with approve=true.",
    webhook: { url: `${baseUrl}${KIRA_APPROVE_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'The task_id returned by dispatch_task.' },
        approve: {
          type: 'boolean',
          description: 'true only if the owner explicitly approved sending/setting it; false to discard.',
        },
      },
      required: ['task_id', 'approve'],
    },
  };
}
