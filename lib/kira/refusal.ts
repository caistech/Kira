// lib/kira/refusal.ts
// record_refusal — the conversational half of the refusal record.
//
// Identity comes from the server-baked ?uid, exactly like every other operational tool: ElevenLabs
// does not pass the conversation id to a server tool, so the owner is fixed at provision time.
//
// It ALWAYS answers 200 with success:true, even when the write fails. Deliberate: the agent has
// already told the owner it will not do the thing, and the only effect of surfacing a logging
// failure here is that she interrupts a refusal to talk about her own database. The refusal itself
// is not in doubt — this only records it.

import { createServiceClient } from '@/lib/supabase/server';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Longest text kept per field. A refusal is a sentence; a paragraph here is a model rambling. */
const MAX_FIELD = 600;

export async function handleRecordRefusal(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: 'Invalid JSON' });
  }

  const userId = new URL(req.url).searchParams.get('uid') || '';
  if (!userId) return json(200, { success: false, error: 'No user identity on this request' });

  const asked = String(body.asked ?? '').trim().slice(0, MAX_FIELD);
  const reason = String(body.reason ?? '').trim().slice(0, MAX_FIELD) || null;
  // No `asked`, no record. A row that cannot say what was refused is not evidence of anything, and
  // one of those in the log is enough to make a buyer distrust the rest of it.
  if (!asked) return json(200, { success: true, recorded: false });

  try {
    const supabase = createServiceClient();
    const { data: agent } = await supabase
      .from('kira_agents')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    // DUPLICATE GUARD. The tool description says one call per refusal, but a description is a
    // request, not a mechanism — and a model that has just been pushed twice on the same point will
    // often log it twice. Three identical rows in an hour reads as three separate refusals to
    // anyone looking at the log later, which overstates what happened.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('kira_refusals')
      .select('id')
      .eq('user_id', userId)
      .eq('asked', asked)
      .gte('created_at', since)
      .limit(1);
    if (recent?.length) return json(200, { success: true, recorded: false, already: true });

    const { error } = await supabase.from('kira_refusals').insert({
      user_id: userId,
      kira_agent_id: agent?.id ?? null,
      source: 'agent',
      asked,
      reason,
    });
    if (error) throw error;
    return json(200, { success: true, recorded: true });
  } catch (error) {
    console.error('[refusal] could not record a refusal:', error);
    return json(200, { success: true, recorded: false });
  }
}
