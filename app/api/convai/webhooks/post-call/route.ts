// app/api/convai/webhooks/post-call/route.ts
// Discovery agent post-call: the canonical loop persists the transcript, then onConversationComplete
// pulls the transcript, distils it to the Client Profile, and runs onResult (see lib/kira/discovery.ts).
import { getDiscovery } from '@/lib/kira/discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return getDiscovery().webhookRoutes().postCall(req);
}
