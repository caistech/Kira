// app/api/kira/webhooks/dispatch_task/route.ts
// dispatch_task tool → the doing-slice. Guarded by the shared tool secret (same as the memory/
// knowledge tools); identity is server-baked as ?uid. Drafts only — never sends.

import { toolSecretOk } from '@/lib/kira/convai';
import { handleDispatchTask } from '@/lib/kira/swarm/tool-handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return handleDispatchTask(req);
}
