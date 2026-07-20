// lib/elevenlabs/client.ts
// ElevenLabs Conversational AI client for Kira

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const BASE_URL = 'https://api.elevenlabs.io/v1';

// Kira's voice - warm, friendly female voice
const KIRA_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - warm and friendly

// =============================================================================
// TYPES
// =============================================================================

interface CreateAgentParams {
  name: string;
  systemPrompt: string;
  firstMessage: string;
  toolIds?: string[];
  webhookUrl?: string;
}

interface ConversationAgent {
  agent_id: string;
  name: string;
}

// =============================================================================
// API HELPERS
// =============================================================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs API error (${res.status}): ${text}`);
  }

  return res.json();
}

// =============================================================================
// AGENT MANAGEMENT
// =============================================================================

export async function getAgent(agentId: string): Promise<ConversationAgent | null> {
  try {
    return await apiRequest<ConversationAgent>(`/convai/agents/${agentId}`);
  } catch {
    return null;
  }
}

export async function deleteAgent(agentId: string): Promise<boolean> {
  try {
    await apiRequest(`/convai/agents/${agentId}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

export async function updateAgentPrompt(
  agentId: string,
  systemPrompt: string
): Promise<boolean> {
  try {
    await apiRequest(`/convai/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: { prompt: systemPrompt },
          },
        },
      }),
    });
    return true;
  } catch (err) {
    console.error('[elevenlabs] Failed to update agent prompt:', err);
    return false;
  }
}

// =============================================================================
// CONVERSATION MANAGEMENT
// =============================================================================

export async function getSignedUrl(agentId: string): Promise<string> {
  const response = await apiRequest<{ signed_url: string }>(
    `/convai/conversation/get_signed_url?agent_id=${agentId}`
  );
  return response.signed_url;
}

export async function getConversation(conversationId: string): Promise<unknown> {
  return apiRequest(`/convai/conversations/${conversationId}`);
}
