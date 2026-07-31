// lib/kira/uid-tools.mjs
// WHICH TOOLS CARRY A SERVER-BAKED OWNER — single-sourced, because this list had to be kept in step
// by hand in two files and the comment in reprovision-kira-agents.mjs literally reads "change one,
// change both".
//
// A tool omitted here is not a smaller migration, it is a regression: it gets provisioned without
// `?uid`, so at call time the route finds no identity and answers "No user identity on this
// request" — a tool that exists, is attached, and can never work. That has already happened once on
// this fleet from a list that fell out of step.
//
// .mjs so both lib/kira/convai.ts (TypeScript, new agents) and scripts/reprovision-kira-agents.mjs
// (a plain script, live agents) can consume the same source.

/** Every tool whose handler resolves the owner from `?uid` rather than a conversation binding. */
export const UID_TOOL_NAMES = [
  'recall_memory',
  'search_knowledge',
  'save_memory',
  'start_conversation',
  'dispatch_task',
  'approve_task',
  'look_up_financials',
  'check_tasks',
  'search_drive',
  'read_document',
  'lookup_contact',
];

const UID_TOOL_URL = new RegExp(`/(${UID_TOOL_NAMES.join('|')})$`);

/**
 * Does this webhook URL belong to a uid-identified tool? Matched on the path END, so it must be
 * called BEFORE `?uid=` is appended.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isUidToolUrl(url) {
  return UID_TOOL_URL.test(url);
}
