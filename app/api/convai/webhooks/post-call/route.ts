// app/api/convai/webhooks/post-call/route.ts
// Discovery agent post-call: the canonical loop persists the transcript, then onConversationComplete
// pulls the transcript, distils it to the Client Profile, and runs onResult (see lib/kira/discovery.ts).
import { getDiscovery } from '@/lib/kira/discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  // Fail CLOSED (see app/api/kira/webhook/route.ts): the canonical postCall handler skips HMAC
  // verification when the secret is falsy, so an unset DISCOVERY_POSTCALL_SECRET would accept
  // forged transcripts — which for discovery also triggers a paid-LLM distill into client_profiles.
  if (!process.env.DISCOVERY_POSTCALL_SECRET) {
    return new Response('Discovery post-call webhook not configured (DISCOVERY_POSTCALL_SECRET unset)', {
      status: 503,
    });
  }
  return getDiscovery().webhookRoutes().postCall(req);
}
