// app/api/kira/webhooks/confirm_fact/route.ts
// confirm_fact tool → records what he said when a fact was read back to him, and parks the fact if
// he denied or corrected it. Guarded by the shared tool secret; identity server-baked as ?uid.
//
// This one WRITES and can remove a fact from the Genome, so the secret guard is load-bearing rather
// than routine: an unauthenticated caller could otherwise mark another owner's facts confirmed —
// manufacturing exactly the evidence a buyer is meant to rely on.

import { toolSecretOk } from '@/lib/kira/convai';
import { handleConfirmFact } from '@/lib/kira/confirm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return handleConfirmFact(req);
}
