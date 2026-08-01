// app/api/kira/webhooks/read_document/route.ts
// read_document tool → the text inside one of the owner's Drive files.
// Same guard and server-baked ?uid identity as every other tool. The file id is model-supplied, but
// it is resolved against the OWNER'S OWN Google token upstream, so a wrong or invented id can only
// ever reach a file that owner could already open themselves.
//
// @machine-callable — called by ElevenLabs, never a browser.

import { toolSecretOk } from '@/lib/kira/convai';
import { refuseThirdPartyDisclosure } from '@/lib/kira/speaking-to';
import { readDocument } from '@/lib/kira/document';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Extraction of a docx/pdf can take several seconds; the default would cut it off mid-parse.
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });

  const userId = new URL(req.url).searchParams.get('uid') || '';
  if (!userId) {
    return Response.json({ ok: false, message: 'No user identity on this request' }, { status: 200 });
  }

  let fileId = '';
  try {
    const body = await req.json();
    // The disclosure gate. She is still talking to whoever is there; his books are not.
    const refused = refuseThirdPartyDisclosure(body);
    if (refused) return refused;
    fileId = String(body?.file_id ?? '').trim();
  } catch {
    return Response.json({ ok: false, message: 'Invalid request' }, { status: 400 });
  }

  return Response.json(await readDocument(userId, fileId));
}
