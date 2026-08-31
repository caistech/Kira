// lib/kira/tools/conversation-tools.ts
// Kira's conversation + memory tools.
//
// The 5 continuity/memory tools (get_conversation_context, save_message,
// update_conversation_topic, recall_memory, save_memory) are now sourced from the CANONICAL
// @caistech/elevenlabs-convai loop via createConversationTools(), so their body contract
// matches the canonical webhook handlers Kira mounts at /api/kira/webhooks/* (see
// lib/kira/convai.ts). This file no longer hand-rolls those tool shapes — the hand-rolled
// versions (which sent `user_id` and diverged from the handlers) were part of the
// persistence bug.
//
// search_web + search_knowledge remain Kira-specific (not part of the canonical loop).

import { createConversationTools, conversationContinuityPrompt as canonicalContinuityPrompt } from '@caistech/elevenlabs-convai';
import type { KiraTool } from '../types';

/**
 * Get the base URL for webhooks. NEXT_PUBLIC_APP_URL is set in every deployed env, so the
 * tool webhook URLs resolve to the production app; localhost only in local dev.
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

// =============================================================================
// CANONICAL CONTINUITY + MEMORY TOOLS (single source: @caistech/elevenlabs-convai)
// Pointed at Kira's own webhook routes (/api/kira/webhooks/*).
// =============================================================================

const canonicalTools = createConversationTools(getBaseUrl(), '/api/kira/webhooks') as KiraTool[];

// Named exports preserved for backward compatibility (re-exported by lib/kira/index.ts).
// Order matches createConversationTools(): context, save_message, update_topic, recall, save.
export const getConversationContextTool: KiraTool = canonicalTools[0];
export const saveMessageTool: KiraTool = canonicalTools[1];
export const updateTopicTool: KiraTool = canonicalTools[2];
export const recallMemoryTool: KiraTool = canonicalTools[3];
export const saveMemoryTool: KiraTool = canonicalTools[4];

// =============================================================================
// RESEARCH TOOLS (Kira-specific — NOT part of the canonical memory loop)
// =============================================================================

export const searchWebTool: KiraTool = {
  type: 'webhook',
  name: 'search_web',
  description: `Search the web for information. Use during research sessions or when you need current information.
Be specific with your queries for better results.`,
  webhook: {
    url: `${getBaseUrl()}/api/kira/webhooks/search_web`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  },
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      num_results: {
        type: 'string',
        description: 'Number of results to return (default: 5)',
      },
    },
    required: ['query'],
  },
};

export const searchKnowledgeTool: KiraTool = {
  type: 'webhook',
  name: 'search_knowledge',
  description: `Search the organisation's knowledge base for relevant information.
Use this to find information from documents or URLs the organisation has shared.`,
  webhook: {
    url: `${getBaseUrl()}/api/kira/webhooks/search_knowledge`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  },
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'What you want to find in the knowledge base',
      },
    },
    required: ['query'],
  },
};

// =============================================================================
// ALL CONVERSATION TOOLS
// =============================================================================

export const conversationTools: KiraTool[] = [
  ...canonicalTools,
  searchWebTool,
  searchKnowledgeTool,
];

// =============================================================================
// CONVERSATION CONTINUITY PROMPT (single source: @caistech/elevenlabs-convai)
// =============================================================================

export const conversationContinuityPrompt = canonicalContinuityPrompt;
