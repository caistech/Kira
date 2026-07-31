// lib/kira/lookup-tools-def.mjs
// SINGLE SOURCE of the search_drive + lookup_contact ConvAI tool shapes — reading the Google
// surfaces the owner has already connected.
//
// Same two-consumer problem as doing-tools-def.mjs: lib/kira/convai.ts (for NEW agents) and
// scripts/reprovision-kira-agents.mjs (for already-provisioned ones) cannot share a TS module, and
// a duplicated definition drifts. Kept separate from the doing-slice defs because these change
// nothing — they are reads, and they gate on a different connection.
//
// The secret header and the ?uid identity are added by the caller at build time, not here.
//
// THE DESCRIPTIONS CARRY THE HONESTY RULE. Both tools can fail in ways that are not "nothing found",
// and the whole reason they exist is that she once reported a search she never ran. So each
// description tells her, in the place she actually reads it, to say the returned message verbatim
// on ok:false and never to turn it into an empty result.

export const KIRA_SEARCH_DRIVE_WEBHOOK_PATH = '/api/kira/webhooks/search_drive';

/**
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraSearchDriveToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'search_drive',
    description:
      "Call this whenever the owner refers to a document, a drawing, a plan, a report, a contract or a folder of theirs — \"find my Lot 91 files\", \"what have we got on the Wavecrest job?\", \"did I ever get the approval letter?\". It searches their connected Google Drive by file name AND by what is inside the files, and it only reads: it never opens, changes, moves or shares anything. Pass their own words as the query — a place name, a lot number, a client name works best. Each result has a name, a link and when it was last changed; give the count and the most relevant few by name, and offer to send the link rather than reading a URL aloud. IMPORTANT: if the response has ok=false, say the `message` back to the owner AS IT IS WRITTEN and do not describe it as nothing being found — \"Drive isn't connected\" and \"I couldn't reach Drive\" are completely different from \"there are no files\", and turning either into 'nothing found' tells him his own documents are missing. If ok=true and there are no results, then it is genuine: say you searched and found nothing matching.",
    webhook: { url: `${baseUrl}${KIRA_SEARCH_DRIVE_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'What to search for, in the owner\'s own words — e.g. "Lot 91", "Wavecrest quote", "site survey". Keep it short; it matches both file names and file contents.',
        },
      },
      required: ['query'],
    },
  };
}

export const KIRA_LOOKUP_CONTACT_WEBHOOK_PATH = '/api/kira/webhooks/lookup_contact';

/**
 * lookup_contact — the tool she was missing on 31 July, when she said she had checked the owner's
 * contacts and had not. The description is written around that: an empty result is a real answer,
 * and a failure is not an empty result.
 *
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraLookupContactToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'lookup_contact',
    description:
      "Call this whenever you need someone's email address and the owner has named a person rather than spelling one out — \"send it to Roger at Quantum Surveys\", \"what's Dave's email?\", \"do I have an address for the surveyor?\". It searches their connected Google Contacts and returns any matches with name and email. Read-only: it never adds, edits or deletes a contact. ALWAYS try this before asking the owner to spell an address out — that is the whole point of it, and a spoken address is where the wrong-letter mistakes come from. If it returns exactly one match, read the address back letter by letter and get a yes before using it. If it returns several, ask which one. IMPORTANT: if ok=false, say the `message` exactly as written and never turn it into 'I couldn't find them' — not-connected and couldn't-reach are different from not-there, and he will stop looking if you tell him the address does not exist. If ok=true with no results, that IS the honest answer: say you searched their contacts and there's no match, then ask him to read it out.",
    webhook: { url: `${baseUrl}${KIRA_LOOKUP_CONTACT_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description:
            'The person to look for, as the owner said it — a first name, a full name, or a name and company ("Roger", "Roger Quantum Surveys").',
        },
      },
      required: ['name'],
    },
  };
}
