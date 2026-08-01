// lib/kira/refusal-sweep.ts
// Reading refusals back out of the transcript, because she will not report them.
//
// THE THREE THINGS THAT FAILED FIRST, so nobody re-tries them. The tool description was rewritten in
// the strongest terms available; the boundary was re-anchored to what EXISTS rather than what is
// imaginable (she was reasoning "an invoicing connector could be connected" and classifying a
// refusal as a failure); and her own hedge — "that's not something I can reach YET" — was named and
// forbidden verbatim. Measured after each: 0/6, then 1/6. She declines out loud, correctly, every
// single time, and does not call the tool.
//
// WHY THE USUAL FIX DOES NOT APPLY. Every mechanism that has worked on this product hooked a call
// she already makes — declined_because on record_refusal, about_business on save_memory, speaking_to
// on the disclosure tools. Here the failure IS the absent call. There is nothing to attach a
// required parameter to.
//
// SO IT RUNS AT DISTIL, NOT PER TURN. The end-of-session pass already reads the whole conversation
// with an LLM and already guards against re-running. A refusal record is an audit artifact — nobody
// is waiting on it mid-sentence — so one extra extraction over a transcript we are processing anyway
// beats a classifier on every live turn, in cost and in latency both.
//
// THE CONTAMINATION RISK IS THE POINT. A log that fills with tool failures is worthless precisely
// when it is shown to a buyer, and that is not hypothetical: the prohibition's own example arrived
// as a row 24 minutes after it shipped. So this extractor is biased hard towards returning NOTHING,
// classifies with the same four values, and its rows are subject to the same DB CHECK.

import { createServiceClient } from '@/lib/supabase/server';

/** The only kinds of refusal there are — must match lib/kira/refusal.ts and the DB CHECK. */
const DECLINED_BECAUSE = ['no_approval', 'not_asked_to_keep', 'unverified', 'outside_scope'] as const;
type DeclinedBecause = (typeof DECLINED_BECAUSE)[number];

export interface ObservedRefusal {
  asked: string;
  reason: string;
  declined_because: DeclinedBecause;
}

/** How far back a near-identical refusal counts as already recorded. Matches record_refusal's guard. */
const DEDUPE_WINDOW_MS = 60 * 60 * 1000;

/** Below this length, containment over-matches — see the same floor in uid-tools. */
const CONTAINMENT_FLOOR = 30;

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Same fact, allowing for one of them having grown — she rewords, and so does the extractor. */
function sameAsk(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= CONTAINMENT_FLOOR && longer.includes(shorter);
}

const SYSTEM_PROMPT = `You read a transcript between a business owner and his assistant, and you find
the moments where THE ASSISTANT DECIDED NOT TO DO SOMETHING.

Return JSON: {"refusals": [{"asked": "...", "reason": "...", "declined_because": "..."}]}

Return {"refusals": []} unless you are certain. An empty answer is ALWAYS better than a wrong one:
these become a permanent record shown to people evaluating the business.

A REFUSAL is a decision not to act. The test is WHAT EXISTS, never what someone could imagine fixing:
- She has NO tool for it at all (does not lodge BAS, does not log into an invoicing system, does not
  give legal advice) -> REFUSAL, declined_because "outside_scope".
- He wanted something sent or actioned and had not approved it in this conversation -> REFUSAL,
  "no_approval".
- He asked ABOUT a document and never asked her to keep it, and she did not keep it -> REFUSAL,
  "not_asked_to_keep".
- He wanted her to confirm or state something she had not checked -> REFUSAL, "unverified".

A FAILURE is NOT a refusal and must NEVER be returned:
- A tool she HAS that is unavailable right now: "Drive isn't connected", "your Google account isn't
  linked", "I couldn't reach it", a lookup that errored, an account not connected.
- Anything where reconnecting or fixing a setting would let the same request succeed.

Beware the hedge: "that's not something I can reach yet" is usually a REFUSAL wearing a failure's
clothes — if she has no tool for it at all, "yet" does not make it a failure. Judge by whether any
tool could ever do it, not by how she phrased it.

"asked" = what the owner wanted, in HIS words where possible. "reason" = why she did not do it, in
plain language. One entry per distinct refusal; never the same refusal twice.`;

/**
 * Pull refusals out of a transcript. Injected model call kept narrow and cheap.
 *
 * Returns [] on ANY failure. A broken extractor must produce no record rather than a bad one — the
 * opposite bias to the red-team judge, which fails towards flagging, because there the cost of being
 * wrong is a red test and here it is a false line in an audit log.
 */
export async function extractRefusals(
  transcript: { role: string; content: string }[],
  apiKey: string,
): Promise<ObservedRefusal[]> {
  if (!apiKey || transcript.length === 0) return [];
  const conversation = transcript
    .map((m) => `${m.role === 'assistant' ? 'ASSISTANT' : 'OWNER'}: ${m.content}`)
    .join('\n\n')
    .slice(0, 24_000);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: conversation },
        ],
      }),
    });
    const json = await res.json();
    const parsed = JSON.parse(String(json?.choices?.[0]?.message?.content ?? '{}'));
    const rows: unknown[] = Array.isArray(parsed?.refusals) ? parsed.refusals : [];

    return rows
      .map((r) => {
        const row = r as Record<string, unknown>;
        return {
          asked: String(row.asked ?? '').trim().slice(0, 600),
          reason: String(row.reason ?? '').trim().slice(0, 600),
          declined_because: String(row.declined_because ?? '').trim() as DeclinedBecause,
        };
      })
      // The same guard the tool path applies, applied here too rather than trusted from the model:
      // an unclassified or invented value is overwhelmingly a tool failure wearing a refusal's
      // clothes, and the DB CHECK would reject it anyway — better to drop it quietly than to write a
      // row that fails at insert and looks like a database problem.
      .filter((r) => r.asked && (DECLINED_BECAUSE as readonly string[]).includes(r.declined_because));
  } catch (error) {
    console.error('[refusal-sweep] extraction failed (nothing recorded):', error);
    return [];
  }
}

/**
 * Extract and record, skipping anything she already logged herself.
 *
 * @returns how many rows were written
 */
export async function sweepConversationForRefusals(args: {
  conversationId: string;
  userId: string;
  agentRowId?: string | null;
  transcript: { role: string; content: string }[];
  apiKey: string;
}): Promise<number> {
  const found = await extractRefusals(args.transcript, args.apiKey);
  if (found.length === 0) return 0;

  const supabase = createServiceClient();

  // Whatever is already on record for this owner in the window — from ANY source. She sometimes does
  // call the tool, and a conversation that produced both an agent row and an observed one would read
  // as two separate refusals to anyone looking at the log later, which overstates what happened.
  const { data: recent } = await supabase
    .from('kira_refusals')
    .select('asked')
    .eq('user_id', args.userId)
    .gte('created_at', new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString())
    .limit(200);
  const already = (recent ?? []).map((r) => normalise(String(r.asked ?? '')));

  let written = 0;
  for (const refusal of found) {
    const key = normalise(refusal.asked);
    if (already.some((prior) => sameAsk(prior, key))) continue;

    const { error } = await supabase.from('kira_refusals').insert({
      user_id: args.userId,
      kira_agent_id: args.agentRowId ?? null,
      source: 'observed',
      asked: refusal.asked,
      reason: refusal.reason || null,
      declined_because: refusal.declined_because,
    });
    if (error) {
      console.error('[refusal-sweep] could not record an observed refusal:', error.message);
      continue;
    }
    // Added to the in-memory list too, so two near-identical refusals in ONE transcript do not both
    // land — the query above cannot see rows written in this loop.
    already.push(key);
    written += 1;
  }
  return written;
}
