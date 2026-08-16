// app/api/kira/webhooks/area_agenda/route.ts
// area_agenda tool → the outstanding buyer questions for one part of his business.
// Guarded by the shared tool secret; identity server-baked as ?uid. Read-only.

import { toolSecretOk } from '@/lib/kira/convai';
import { handleAreaAgenda } from '@/lib/kira/area-agenda';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return handleAreaAgenda(req);
}
