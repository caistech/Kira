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
      "Call this whenever the owner refers to a document, a drawing, a plan, a report, a contract or a folder of theirs — \"find my Lot 91 files\", \"what have we got on the Wavecrest job?\", \"did I ever get the approval letter?\". It searches their connected Google Drive by file name AND by what is inside the files, and it only reads: it never opens, changes, moves or shares anything. Pass their own words as the query — a place name, a lot number, a client name works best. Each result has a name, an `id`, a link and when it was last changed; give the count and the most relevant few by name, and offer to send the link rather than reading a URL aloud. To answer anything about what a document CONTAINS, pass its `id` to read_document — the search gives you names, not contents, so never describe what is inside a file you have only searched for. IMPORTANT: if the response has ok=false, say the `message` back to the owner AS IT IS WRITTEN and do not describe it as nothing being found — \"Drive isn't connected\" and \"I couldn't reach Drive\" are completely different from \"there are no files\", and turning either into 'nothing found' tells him his own documents are missing. If ok=true and there are no results, then it is genuine: say you searched and found nothing matching.",
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

export const KIRA_READ_DOCUMENT_WEBHOOK_PATH = '/api/kira/webhooks/read_document';

/**
 * read_document — the other half of search_drive.
 *
 * Written after the first live call: he found his Lot 109 quote in seconds, then asked which of the
 * two documents was the one sent to the client. She offered to "check inside", could not, and had to
 * withdraw it. The description here is deliberately explicit that the id comes from a previous
 * search result, because the failure mode of a model-supplied opaque id is inventing one.
 *
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraReadDocumentToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'read_document',
    description:
      "Call this to read what is actually INSIDE one of the owner's Drive documents — after search_drive has found it. Pass the `id` from that search result; never invent one, and if you do not have an id yet, run search_drive first. Use it whenever answering needs the content rather than the filename: \"which of those is the one we sent?\", \"what did we quote?\", \"what are the terms?\", or when you are about to draft something new based on an existing document. It returns `text` (the document's contents) and `name`. If `truncated` is true you are seeing only the FIRST PART of a longer document — say so rather than describing it as the whole. If `pending` is true the file arrived but is still being read: say so and offer to try again in a moment. If ok=false, say the `message` exactly as written — some files (scans, images, unusual formats) genuinely have no text to read, and that is different from the document being empty or from you not looking.",
    webhook: { url: `${baseUrl}${KIRA_READ_DOCUMENT_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        file_id: {
          type: 'string',
          description:
            'The `id` of the file, taken from a previous search_drive result. Not the file name, not the link.',
        },
      },
      required: ['file_id'],
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
