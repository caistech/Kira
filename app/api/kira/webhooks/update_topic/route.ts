// app/api/kira/webhooks/update_topic/route.ts
// update_conversation_topic tool → canonical handleUpdateTopic. See lib/kira/convai.ts.

import { kiraConvaiRoutes } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return kiraConvaiRoutes().updateTopic(req);
}
