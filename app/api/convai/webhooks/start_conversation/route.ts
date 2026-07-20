// app/api/convai/webhooks/start_conversation/route.ts
// Discovery agent's get_conversation_context tool → the canonical loop, with identity resolved
// from the signed discovery session token. See lib/kira/discovery.ts.
import { getDiscovery } from '@/lib/kira/discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return getDiscovery().webhookRoutes().startConversation(req);
}
