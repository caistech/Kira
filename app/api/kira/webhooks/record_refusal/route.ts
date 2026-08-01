// app/api/kira/webhooks/record_refusal/route.ts
// record_refusal tool → the conversational half of the refusal record. Guarded by the shared tool
// secret; identity server-baked as ?uid. Writes only — it can never cause or prevent an action.

import { toolSecretOk } from '@/lib/kira/convai';
import { handleRecordRefusal } from '@/lib/kira/refusal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return handleRecordRefusal(req);
}
