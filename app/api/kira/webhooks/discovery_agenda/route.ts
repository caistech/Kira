// app/api/kira/webhooks/discovery_agenda/route.ts
// discovery_agenda tool → the mandatory, one-time, first-conversation interview state.
// Guarded by the shared tool secret; identity server-baked as ?uid. Read-only.

import { toolSecretOk } from '@/lib/kira/convai';
import { handleDiscoveryAgenda } from '@/lib/kira/discovery-agenda';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return handleDiscoveryAgenda(req);
}
