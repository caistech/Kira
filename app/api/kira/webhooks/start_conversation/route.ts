// app/api/kira/webhooks/start_conversation/route.ts
// get_conversation_context tool → canonical handleStartConversation. Creates/binds the
// conversation row (server-derived identity via resolveSession) and returns returning-user
// context. See lib/kira/convai.ts.

import { kiraConvaiRoutes, toolSecretOk } from '@/lib/kira/convai';
import { handleKiraContext } from '@/lib/kira/uid-tools';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  // When the tool carries the server-baked ?uid (the standard now), resolve the welcome-back context
  // from it — ElevenLabs doesn't pass the conversation/agent id. Legacy callers (no uid) fall back
  // to the canonical binding path.
  if (new URL(req.url).searchParams.get('uid')) return handleKiraContext(req);

  // INV-020: the canonical start path creates the conversation row. The published
  // @caistech/elevenlabs-convai handler does not carry organisation_id, so stamp it here from the
  // agent binding (the agent row already has organisation_id from the migration) — a brand-new
  // conversation must be organisation-owned from birth, not left for the post-call seam to backfill.
  const bodyPreview = req.clone();
  let elevenLabsAgentId = '';
  let elevenLabsConversationId = '';
  try {
    const body = (await bodyPreview.json()) as Record<string, unknown>;
    elevenLabsAgentId = String(body.elevenlabs_agent_id || '');
    elevenLabsConversationId = String(body.elevenlabs_conversation_id || '');
  } catch { /* non-fatal — the canonical handler will surface a malformed body */ }

  const response = await kiraConvaiRoutes().startConversation(req);

  if (elevenLabsAgentId && elevenLabsConversationId) {
    try {
      const supabase = createServiceClient();
      const { data: agent } = await supabase
        .from('kira_agents')
        .select('organisation_id')
        .eq('elevenlabs_agent_id', elevenLabsAgentId)
        .maybeSingle();
      if (agent?.organisation_id) {
        await supabase
          .from('conversations')
          .update({ organisation_id: agent.organisation_id })
          .eq('elevenlabs_conversation_id', elevenLabsConversationId);
      }
    } catch (stampError) {
      console.warn('[start_conversation] org stamp failed (non-fatal):', stampError);
    }
  }

  return response;
}
