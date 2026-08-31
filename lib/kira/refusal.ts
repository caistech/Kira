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

import { createServiceClientV2 } from '@/lib/supabase/server';
import { resolveOrganisationForPerson } from '@/lib/auth';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Longest text kept per field. A refusal is a sentence; a paragraph here is a model rambling. */
const MAX_FIELD = 600;

/**
 * The only kinds of refusal there are. A tool failure has no honest value here, which is the point:
 * the classification is required, so a failure cannot be logged as a refusal without the model
 * asserting one of these four is true — and the DB CHECK rejects anything invented.
 *
 * This replaced a prose prohibition that failed in production 24 minutes after shipping. See
 * lib/kira/refusal-tool-def.mjs for the full account.
 */
const DECLINED_BECAUSE = ['no_approval', 'not_asked_to_keep', 'unverified', 'outside_scope'] as const;
type DeclinedBecause = (typeof DECLINED_BECAUSE)[number];

function parseDeclinedBecause(value: unknown): DeclinedBecause | null {
  const v = String(value ?? '').trim();
  return (DECLINED_BECAUSE as readonly string[]).includes(v) ? (v as DeclinedBecause) : null;
}

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

  // THE GUARD. An unclassified or invented value is not recorded, because the overwhelmingly likely
  // cause is a tool failure being logged as a refusal — the exact contamination this log cannot
  // survive. Logged loudly server-side rather than silently dropped: if this fires often it means
  // the prompt is still teaching the confusion, and that is worth seeing.
  //
  // Still a 200 with success:true. She has already told the owner she would not do the thing; the
  // only effect of surfacing a logging problem to her here is that she interrupts a refusal to talk
  // about our database.
  const declinedBecause = parseDeclinedBecause(body.declined_because);
  if (!declinedBecause) {
    console.warn(
      '[refusal] refused to record an unclassified refusal — likely a tool failure. asked=%s reason=%s declined_because=%o',
      asked.slice(0, 120),
      (reason ?? '').slice(0, 120),
      body.declined_because,
    );
    return json(200, { success: true, recorded: false, reason: 'no_classification' });
  }

  try {
    const supabase = createServiceClientV2();
    // INV-020: refusals are organisation-owned — resolve the org from the person and scope reads
    // and the write by it (the person remains the actor who declined — provenance).
    // Fail-safe: if the org cannot be resolved (e.g. no session), proceed with person-scoped fallback.
    let organisationId: string | null = null;
    try {
      organisationId = (await resolveOrganisationForPerson(userId))?.organisationId || null;
    } catch { /* non-fatal — org resolution failure falls back to user_id scoping */ }

    // The agent is organisation-owned: resolve it through the org, never the person.
    let agentQuery = organisationId
      ? supabase.from('kira_agents').select('id').eq('organisation_id', organisationId)
      : supabase.from('kira_agents').select('id').eq('user_id', userId);
    const { data: agent } = await agentQuery.limit(1).maybeSingle();

    // DUPLICATE GUARD. The tool description says one call per refusal, but a description is a
    // request, not a mechanism — and a model that has just been pushed twice on the same point will
    // often log it twice. Three identical rows in an hour reads as three separate refusals to
    // anyone looking at the log later, which overstates what happened.
    //
    // Refusals are organisation-owned (INV-020), so the dedupe is org-scoped: the same ask refused
    // in the same org is one refusal. Falls back to the person when the org cannot be resolved.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    let recentQuery = supabase
      .from('kira_refusals')
      .select('id')
      .eq('user_id', userId)
      .eq('asked', asked);
    if (organisationId) recentQuery = recentQuery.eq('organisation_id', organisationId);
    const { data: recent } = await recentQuery.gte('created_at', since).limit(1);
    if (recent?.length) return json(200, { success: true, recorded: false, already: true });

    const { error } = await supabase.from('kira_refusals').insert({
      user_id: userId,
      ...(organisationId ? { organisation_id: organisationId } : {}),
      kira_agent_id: agent?.id ?? null,
      source: 'agent',
      asked,
      reason,
      declined_because: declinedBecause,
    });
    if (error) throw error;
    return json(200, { success: true, recorded: true });
  } catch (error) {
    console.error('[refusal] could not record a refusal:', error);
    return json(200, { success: true, recorded: false });
  }
}
