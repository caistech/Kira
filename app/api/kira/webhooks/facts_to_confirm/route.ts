// app/api/kira/webhooks/facts_to_confirm/route.ts
// facts_to_confirm tool → a couple of facts he has never been asked to confirm, with handles.
// Guarded by the shared tool secret; identity server-baked as ?uid. Read-only.

import { toolSecretOk } from '@/lib/kira/convai';
import { handleFactsToConfirm } from '@/lib/kira/confirm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return handleFactsToConfirm(req);
}
