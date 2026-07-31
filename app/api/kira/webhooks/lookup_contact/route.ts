// app/api/kira/webhooks/lookup_contact/route.ts
// lookup_contact tool → a read-only search of the owner's connected Google Contacts.
// Same guard and same server-baked ?uid identity as the other tools: a contact book is a business's
// client list, and an LLM-supplied owner id would be a way to read someone else's.
//
// This is the tool she did not have on 31 July, when she said she had checked contacts and had not.
//
// @machine-callable — called by ElevenLabs, never a browser.

import { toolSecretOk } from '@/lib/kira/convai';
import { lookUpContact } from '@/lib/kira/lookup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });

  const userId = new URL(req.url).searchParams.get('uid') || '';
  if (!userId) {
    return Response.json({ ok: false, message: 'No user identity on this request' }, { status: 200 });
  }

  let name = '';
  try {
    const body = await req.json();
    name = String(body?.name ?? '').trim();
  } catch {
    return Response.json({ ok: false, message: 'Invalid request' }, { status: 400 });
  }

  return Response.json(await lookUpContact(userId, name));
}
