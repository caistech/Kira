// app/api/kira/webhooks/check_tasks/route.ts
// check_tasks tool → the task ledger. Guarded by the shared tool secret (same as the memory/
// knowledge/doing tools); identity is server-baked as ?uid, so one owner can never read another's
// outstanding work. Read-only: it accounts for tasks, it never moves them.
//
// @machine-callable — called by ElevenLabs, never a browser.

import { toolSecretOk } from '@/lib/kira/convai';
import { handleCheckTasks } from '@/lib/kira/swarm/tool-handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return handleCheckTasks(req);
}
