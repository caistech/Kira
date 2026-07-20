// app/api/kira/webhooks/update_topic/route.ts
// update_conversation_topic tool → canonical handleUpdateTopic. See lib/kira/convai.ts.

import { kiraConvaiRoutes, toolSecretOk } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return kiraConvaiRoutes().updateTopic(req);
}
