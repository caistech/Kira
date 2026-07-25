// lib/kira/knowledge-tool-def.mjs
// SINGLE SOURCE of the search_knowledge ConvAI tool shape.
//
// Two consumers that can't share a TS module: lib/kira/convai.ts (kiraKnowledgeTool, for NEW agents)
// and scripts/reprovision-kira-agents.mjs (for already-provisioned agents). A duplicated definition
// would drift on the first edit — the class of bug this session has been unpicking.
//
// The secret header is added by the caller (from env at runtime), not baked in here.

export const KIRA_KNOWLEDGE_WEBHOOK_PATH = '/api/kira/webhooks/search_knowledge';

/**
 * Build the search_knowledge webhook tool. `baseUrl` = your app's public URL; `headers` optional.
 * @param {string} baseUrl
 * @param {Record<string,string>} [headers]
 */
export function kiraKnowledgeToolDef(baseUrl, headers) {
  const hdrs = headers || { 'Content-Type': 'application/json' };
  return {
    type: 'webhook',
    name: 'search_knowledge',
    description:
      'Search the documents and links the user has shared with you (uploaded files, contracts, reports, web pages). Call this whenever they ask about something that might be in a document they gave you, or refer to "the doc / the file / that report / the link I shared". It returns relevant passages with their source — answer from those and name the source. If it returns nothing, say so plainly; do not invent an answer or claim you cannot access files.',
    webhook: { url: `${baseUrl}${KIRA_KNOWLEDGE_WEBHOOK_PATH}`, method: 'POST', headers: hdrs },
    parameters: {
      type: 'object',
      properties: {
        conversation_id: {
          type: 'string',
          description: 'The current ElevenLabs conversation ID (the server derives whose documents to search from it)',
        },
        query: {
          type: 'string',
          description: 'What to look for in their documents (e.g. "the due-diligence findings", "the pricing terms", "who signed off")',
        },
      },
      required: ['conversation_id', 'query'],
    },
  };
}
