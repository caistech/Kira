// app/api/kira/webhooks/look_up_financials/route.ts
// look_up_financials tool → a read-only question against the owner's connected accounting system.
// Guarded by the shared tool secret; identity is server-baked as ?uid, exactly like the memory,
// knowledge and doing tools — the agent never states whose accounts to open, because ElevenLabs
// does not pass a conversation id to a server tool and an LLM-supplied owner id is a way to read
// somebody else's books.

import { toolSecretOk } from '@/lib/kira/convai';
import { lookUpFinancials } from '@/lib/kira/financials';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });

  const userId = new URL(req.url).searchParams.get('uid') || '';
  if (!userId) {
    return Response.json({ ok: false, message: 'No user identity on this request' }, { status: 200 });
  }

  let resource = '';
  try {
    const body = await req.json();
    resource = String(body?.resource ?? '').trim();
  } catch {
    return Response.json({ ok: false, message: 'Invalid request' }, { status: 400 });
  }

  return Response.json(await lookUpFinancials(userId, resource));
}
