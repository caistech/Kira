// app/api/kira/webhooks/approve_task/route.ts
// approve_task tool → the owner's decision on a drafted task. Guarded by the shared tool secret;
// identity server-baked as ?uid. approve=true is the ONLY path that executes (sends/schedules).

import { toolSecretOk } from '@/lib/kira/convai';
import { handleApproveTask } from '@/lib/kira/swarm/tool-handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return handleApproveTask(req);
}
