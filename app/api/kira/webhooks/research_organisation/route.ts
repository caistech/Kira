// app/api/kira/webhooks/research_organisation/route.ts
// research_organisation tool → one bounded Practice Intelligence research pass over public sources.
//
// Guarded by the shared tool secret; identity is server-baked as ?uid, exactly like the memory,
// knowledge, doing and lookup tools. ElevenLabs does not pass a conversation id to a server tool,
// and an LLM-supplied owner id would be a way to spend another owner's research budget.
//
// READ-ONLY AND OUTWARD-FACING. It reads public web pages about a third-party business. It writes
// nothing, sends nothing, and contacts nobody — the practice never learns it was looked at. So it
// answers immediately rather than going through the dispatch/approve gate, on the same reasoning as
// search_drive and look_up_financials: a wrong read is an embarrassing answer, a wrong write is
// something a stranger received.
//
// maxDuration mirrors keep_document's 60s rather than read_document's 30s, because a pass is a
// search plus up to four page fetches plus two model calls. See the latency note in the handover:
// the route can afford this; whether the ElevenLabs webhook client will wait that long is a vendor
// limit that has not been measured.
//
// @machine-callable — called by ElevenLabs, never a browser.

import { toolSecretOk } from '@/lib/kira/convai';
import { researchOrganisation } from '@/lib/kira/practice-intelligence/research';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });

  const userId = new URL(req.url).searchParams.get('uid') || '';
  if (!userId) {
    return Response.json({ status: 'failed', message: 'No user identity on this request' }, { status: 200 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ status: 'failed', message: 'Invalid request' }, { status: 400 });
  }

  const organisation = String(body?.organisation ?? '').trim();
  if (!organisation) {
    // Said as a request rather than an error: the model can simply ask him which practice he means.
    return Response.json({
      status: 'failed',
      message: 'Tell me which organisation to look at and I will go and read what is public about them.',
    });
  }

  // researchOrganisation never throws by contract — every failure is captured into `research.failures`
  // so it can be spoken. The catch is a backstop for the genuinely unforeseen, and it too returns a
  // sentence rather than a 500: a thrown error inside a live conversation surfaces as silence.
  try {
    return Response.json(
      await researchOrganisation({
        organisation,
        sector: body?.sector ? String(body.sector) : undefined,
        location: body?.location ? String(body.location) : undefined,
        website: body?.website ? String(body.website) : undefined,
        researchQuestion: body?.research_question ? String(body.research_question) : undefined,
      }),
    );
  } catch (error) {
    console.error('[research_organisation] failed:', error);
    return Response.json({
      status: 'failed',
      message:
        "I couldn't complete that research just now — that's a problem at my end, not a finding about the practice.",
    });
  }
}
