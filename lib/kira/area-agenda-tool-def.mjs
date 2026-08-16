// lib/kira/area-agenda-tool-def.mjs
// SINGLE SOURCE of the area_agenda tool — the thing that gives her something to ask.
//
// THE FAILURE IT FIXES, measured on the operator's own account 2026-08-15/16. 96 filed memories;
// ZERO answers to the questions a buyer asks about Customers; zero across 28 Operations entries;
// `people` and `assets` empty. Then a conversation opened deliberately to work on a Genome area, in
// which she opened on the Herrings plumbing quote for the third day running and filed *"The business
// includes a 'genome area' with categories that can be worked on"* as a fact about his business.
//
// She was not being dim. She had no agenda, so she talked about the last live thing — and the last
// live thing is always the job in front of him. A biographer with no questions writes down whatever
// is said in the room.
//
// ⚠️ THE DESCRIPTION NAMES AN OBSERVABLE TRIGGER, deliberately, and this is the lesson from
// `recall_memory` in tool-manifest.mjs: a description that says "use this when you need to know what
// is missing" asks her first to NOTICE that she does not know, and a model holding ten confident
// facts never notices. So it names the moment instead — he opens a part of the business, or arrives
// from that page.

export const KIRA_AREA_AGENDA_WEBHOOK_PATH = '/api/kira/webhooks/area_agenda';

/**
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraAreaAgendaToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'area_agenda',
    description:
      "Get the questions a buyer asks about one part of his business that his record does NOT yet answer.\n\nCall it WHENEVER a part of the business comes up — he says he wants to work on his people, or his pricing, or his customers; he arrives from the page showing the nine areas; you have just finished a topic and are looking for where to go next. Do not wait until you feel you are missing something: you will not feel it. He has told you a great deal about the job in front of him and almost nothing about how the business runs, and the difference is invisible from inside the conversation.\n\nPass one of: demand, pricing, operations, cash, customers, people, compliance, assets, systems. If he said it another way — \"staff\", \"the money side\" — pass your best guess and you will get the right one back.\n\nWhat comes back is up to three questions. ASK ONE. Not three, and never as a list — he is talking to you, not filling in a form, and a run of questions is the fastest way to make him stop. Take his answer, save it, and let the conversation go where it goes; the other two will still be there next time.\n\nSome questions come back with `why_it_is_not_enough`. That means he HAS answered it and the answer was too thin for a buyer to use — so this is not a new question, it is you going back to something he already told you. Say why, in his terms, and ask the sharper version. That is uncomfortable and it is the single most valuable thing you do.\n\n`sounds_like` is an example of a full answer, for you to aim at. NEVER read it out — it is somebody else's business, and reading it to him tells him what to say instead of finding out what is true.\n\nWhen `needs_a_change` is true, no answer he gives closes that gap: the business itself has to change. Get the honest picture first, then say so plainly — writing down that only he can run a job does not make it less true — and offer to map out what would actually move it.",
    webhook: { url: `${baseUrl}${KIRA_AREA_AGENDA_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          description:
            "Which part of the business: demand, pricing, operations, cash, customers, people, compliance, assets, or systems. Your best guess is fine — if it does not match you get the list back rather than a wrong answer.",
        },
      },
      required: ['area'],
    },
  };
}
