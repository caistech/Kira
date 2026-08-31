// app/api/kira/webhooks/search_drive/route.ts
// search_drive tool → a read-only search of the owner's connected Google Drive.
// Guarded by the shared tool secret; identity is server-baked as ?uid, exactly like the memory,
// knowledge, doing and financials tools — ElevenLabs does not pass a conversation id to a server
// tool, and an LLM-supplied owner id would be a way to read somebody else's documents.
//
// @machine-callable — called by ElevenLabs, never a browser.

import { toolSecretOk } from '@/lib/kira/convai';
import { refuseThirdPartyDisclosure } from '@/lib/kira/speaking-to';
import { searchDrive } from '@/lib/kira/lookup';
import { resolveOrganisationForPerson } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });

  const userId = new URL(req.url).searchParams.get('uid') || '';
  if (!userId) {
    return Response.json({ ok: false, message: 'No user identity on this request' }, { status: 200 });
  }

  // Resolve organisation from person at the auth boundary
  const orgContext = await resolveOrganisationForPerson(userId);
  if (!orgContext?.organisationId) {
    return Response.json({ ok: false, message: 'No organisation context for this user' }, { status: 200 });
  }
  const organisationId = orgContext.organisationId;

  let query = '';
  try {
    const body = await req.json();
    // The disclosure gate. She is still talking to whoever is there; his books are not.
    const refused = refuseThirdPartyDisclosure(body);
    if (refused) return refused;
    query = String(body?.query ?? '').trim();
  } catch {
    return Response.json({ ok: false, message: 'Invalid request' }, { status: 400 });
  }

  return Response.json(await searchDrive(organisationId, query));
}
