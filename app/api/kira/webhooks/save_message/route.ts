// app/api/kira/webhooks/save_message/route.ts
// save_message tool → canonical handleSaveMessage. Identity derived from the bound
// conversation row (never an agent-supplied user_id). See lib/kira/convai.ts.

import { kiraConvaiRoutes } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return kiraConvaiRoutes().saveMessage(req);
}
