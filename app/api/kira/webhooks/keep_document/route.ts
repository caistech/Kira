// app/api/kira/webhooks/keep_document/route.ts
// keep_document tool → file a Drive document into the owner's own knowledge store, so she can
// answer from it later via search_knowledge.
//
// SHE MUST HAVE ASKED FIRST. This is the yes half of an offer, in the same shape as
// dispatch_task/approve_task: reading is free and needs no permission, keeping changes what she
// permanently knows and therefore what the Genome is built from. The prompt carries that rule;
// this route carries the identity and the guard.
//
// @machine-callable — called by ElevenLabs, never a browser.

import { toolSecretOk } from '@/lib/kira/convai';
import { keepDocument } from '@/lib/kira/document';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Extraction plus chunking plus embedding — comfortably longer than a read.
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });

  const userId = new URL(req.url).searchParams.get('uid') || '';
  if (!userId) {
    return Response.json({ ok: false, message: 'No user identity on this request' }, { status: 200 });
  }

  // Resolve organisation context from person ID
  const supabase = createServiceClient();
  const { data: membership } = await supabase
    .from('organisation_memberships')
    .select('organisation_id')
    .eq('person_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.organisation_id) {
    return Response.json({ ok: false, message: 'No organisation context' }, { status: 200 });
  }

  let fileId = '';
  try {
    const body = await req.json();
    fileId = String(body?.file_id ?? '').trim();
  } catch {
    return Response.json({ ok: false, message: 'Invalid request' }, { status: 400 });
  }

  return Response.json(await keepDocument(membership.organisation_id, fileId));
}
