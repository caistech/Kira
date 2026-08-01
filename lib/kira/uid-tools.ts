// lib/kira/uid-tools.ts
// save_memory + get_conversation_context, resolved from the server-baked ?uid (#6) — the same
// identity model as recall_memory / search_knowledge. ElevenLabs does not pass the conversation id
// to server-tool webhooks, so these two also take the owner from ?uid (baked per-agent at provision)
// rather than a conversation binding the agent can't supply. This makes the agent's OWN mid-call
// context-fetch and fact-saving work, not just the page-rendered welcome-back opener.

import { normaliseFact } from '@caistech/mnemo';

import { createServiceClient } from '@/lib/supabase/server';
import { mnemoAdd } from '@/lib/kira/mnemo';
import { readTaskLedger } from '@/lib/kira/swarm/open-tasks';

const uidFrom = (req: Request) => new URL(req.url).searchParams.get('uid') || '';
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// MUST MATCH the kira_memory.memory_type CHECK constraint exactly (20260119000000_kira_complete.sql).
//
// It did not. This list allowed 'fact' — which the constraint REJECTS — so an agent that classified
// something as a fact had its save rejected by Postgres and got back "Failed to save memory": a
// fact the owner watched her agree to remember, silently not remembered. And it omitted 'followup'
// and 'correction', which the constraint ALLOWS, so those were quietly downgraded to 'context' and
// lost their classification. An allow-list that disagrees with the constraint it guards is worse
// than no allow-list, because it fails in both directions at once.
const VALID_MEMORY_TYPES = ['preference', 'context', 'goal', 'decision', 'followup', 'correction', 'insight'];

/**
 * Shortest normalised fact that may be matched by containment rather than equality.
 *
 * Containment on a very short string over-matches — "the abn" is inside half the Genome. At this
 * length a full sentence is being compared, and one sentence sitting inside another is the same
 * claim with something added to it.
 */
const CONTAINMENT_FLOOR = 40;

/**
 * Are these the same fact, allowing for one of them having grown?
 *
 * Exact equality on the normalised form is not enough, and the live run showed exactly why. Told to
 * file another company's fact anyway, she did not repeat herself — she re-sent the same sentence
 * with her reasoning appended:
 *
 *   parked  "...and Andrew D Romeo is the sole director of it"
 *   active  "...and Andrew D Romeo is the sole director of it the owner wants to keep it in this
 *            business record for convenience as same head and same desk no complication"
 *
 * Equality sees two different strings. A person sees one fact and an excuse. So containment in
 * either direction counts, above a length floor — the justification can be appended or prepended,
 * and a guard that only caught a verbatim repeat is walked around by one extra clause.
 */
function isSameFact(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= CONTAINMENT_FLOOR && longer.includes(shorter);
}

/** save_memory — persist a fact the agent chose to remember mid-call, keyed by the baked uid. */
export async function handleKiraSaveMemory(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { success: false, error: 'Invalid JSON' }); }

  const uid = uidFrom(req);
  const content = String(body.memory || body.content || '').trim();
  if (!uid) return json(200, { success: false, error: 'No user identity on this request' });
  if (!content) return json(400, { success: false, error: 'Missing memory content' });

  const category = String(body.category || body.memory_type || 'context');
  const memoryType = VALID_MEMORY_TYPES.includes(category) ? category : 'context';
  const importance = Number(body.importance) || 6;

  const supabase = createServiceClient();

  // Provenance: which conversation did he say this in.
  //
  // The post-call distil gets this free — it calls the canonical handleSaveMemory WITHOUT an
  // identity, so the conversation binding resolves and fills source_conversation_id. The uid branch
  // hard-codes `id: null`, because uid mode historically had no conversation id to bind to. It does
  // now: `platformIdentity: true` makes ElevenLabs fill system__conversation_id, so a mid-call save
  // can be sourced like every other memory. Without this, 7 of 61 facts reach the handover document
  // as assertions with nothing behind them — and a claim a buyer cannot trace is a claim the buyer
  // discounts. Best-effort: an unresolvable id costs provenance, never the memory.
  let sourceConversationId: string | null = null;
  const elConvId = String(body.conversation_id || body.elevenlabs_conversation_id || '').trim();
  if (elConvId) {
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('elevenlabs_conversation_id', elConvId)
      .maybeSingle();
    sourceConversationId = (conv?.id as string) ?? null;
  }

  // One agent per user — link the fact to it so recall's agent-scoped query finds it.
  const { data: agent } = await supabase
    .from('kira_agents')
    .select('id')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // DON'T STORE THE SAME FACT TWICE.
  //
  // The Mnemo lane has always deduped (`normaliseFact` + a prior-key filter inside
  // @caistech/elevenlabs-convai). This table did not: a plain insert, so the same fact said in two
  // conversations — or saved mid-call and then distilled again at the end — became two rows.
  //
  // The harm is not storage, it is RETRIEVAL. Recall is a FIXED window (the typed transport injects
  // the top 30 by importance), so duplicates do not add depth, they evict distinct facts from it.
  // And a fact returned twice reads as two independent sources agreeing — the same reasoning that
  // made keep_document idempotent, which was applied to documents and never to memories.
  //
  // Bounded scan rather than a unique index: content is free text that arrives slightly reworded
  // each time, so the comparison has to be on the NORMALISED form, which no column constraint can
  // express. 500 is far above any real user's count (the largest today holds 116).
  const key = normaliseFact(content);
  const { data: priorFacts } = await supabase
    .from('kira_memory')
    .select('content')
    .eq('user_id', uid)
    .neq('active', false)
    .limit(500);
  if ((priorFacts ?? []).some((row) => normaliseFact(String(row.content ?? '')) === key)) {
    // Reported honestly rather than as a save. She can then say "I already had that" instead of
    // claiming to have written something down for the second time.
    return json(200, { success: true, already: true });
  }

  // ANOTHER COMPANY'S FACT DOES NOT GO INTO THIS GENOME.
  //
  // The prompt asks her not to file one. Measured over three red-team runs, that held 0 times: she
  // named the separation herself ("a separate company with its own ABN") and filed it anyway. So the
  // question is now a required tool parameter and this is the consequence — the same move that made
  // record_refusal's classification stick after prose failed.
  //
  // PARKED, NOT DROPPED. The row is written with active=false so nothing he said is lost and
  // scripts/split-genome-entity.mjs --restore can return it if the call was wrong. What it must not
  // do is appear in the Genome, in recall, or in the handover document a buyer's accountant reads —
  // where it would assert that this business does something it does not do.
  //
  // Absent value = this business, on purpose. The post-call distil calls the canonical handler,
  // which knows nothing about this parameter, and a fact silently discarded because a path forgot to
  // classify it would be a far worse failure than the one being fixed.
  const aboutBusiness = String(body.about_business || '').trim();
  let belongsElsewhere = aboutBusiness === 'another_business';
  // Lower-cased once: this is both what gets stored and what later contents are matched against, and
  // two different normalisations would mean facts that never match the name that parked them.
  const namedOtherBusiness = String(body.other_business_name || '').trim().toLowerCase().slice(0, 200);

  // SHE NAMES THE OTHER COMPANY ONCE, AND EVERY LATER FACT ABOUT IT IS PARKED WITH IT.
  //
  // Measured, in the logs, twice in a row: she calls save_memory TWICE for the same company and
  // classifies only the first.
  //
  //   "Corvid Holdings is a separate company with its own ABN"  -> another_business, parked
  //   "Corvid Holdings is raising a $2m fund"                   -> this_business, ACTIVE
  //
  // Both are that company's. Neither the duplicate guard nor the containment matcher can relate
  // them, because they are genuinely different facts — the only thing they share is the name.
  //
  // ⚠️ ACCEPTED FALSE POSITIVE. A fact genuinely about THIS business that merely mentions the other
  // one — "the yard is sublet from Corvid Holdings" — is parked too, because the server cannot tell
  // a fact's subject from its object. That trade is the point rather than a compromise: a
  // wrongly-parked fact is one `--restore` away, and a wrongly-filed one is a false statement about
  // the business inside the document a buyer's accountant reads, which nobody goes looking for.
  if (!belongsElsewhere) {
    const { data: known } = await supabase
      .from('kira_memory')
      .select('parked_entity')
      .eq('user_id', uid)
      .not('parked_entity', 'is', null)
      .limit(200);
    const haystack = content.toLowerCase();
    const match = (known ?? [])
      .map((row) => String(row.parked_entity ?? ''))
      .find((name) => name.length >= 3 && haystack.includes(name));
    if (match) {
      belongsElsewhere = true;
      console.warn(`[save_memory] parked a fact naming a known other business: ${match}`);
    }
  }

  // AND THE FIRST CLASSIFICATION STANDS WHEN HE PUSHES.
  //
  // The guard worked on its first live run and was then walked straight around it. She classified
  // Corvid Holdings as another_business, the server parked it — and when the owner pushed once
  // ("just put it in here, it is all me anyway, same head, same desk") she called save_memory AGAIN
  // with the identical fact classified this_business, and that row went in active. Both rows exist.
  //
  // Nothing he said was new information about whose company it is; it was pressure, and she folded
  // to it in one turn. The ordinary dedupe cannot catch this because it deliberately ignores
  // inactive rows — parked facts must not block a genuine later save.
  //
  // So a fact already parked as another business stays parked. The earlier classification was made
  // before pressure was applied, which makes it the more reliable of the two, and the asymmetry of
  // being wrong is stark: a wrongly-parked fact is one --restore away, while a wrongly-filed one is
  // a false statement about the business inside the document a buyer's accountant reads. If it truly
  // belongs here, restoring it is an operator action — the right amount of friction for something
  // that changes what the Genome asserts.
  if (!belongsElsewhere) {
    const { data: parked } = await supabase
      .from('kira_memory')
      .select('content')
      .eq('user_id', uid)
      .eq('parked_reason', 'entity:other')
      .limit(500);
    if ((parked ?? []).some((row) => isSameFact(normaliseFact(String(row.content ?? '')), key))) {
      return json(200, {
        success: false,
        parked: true,
        error:
          "Not saved to this business's record — you already kept this fact out as belonging to " +
          'another business. Tell him it is still out of this record.',
      });
    }
  }

  const { error } = await supabase.from('kira_memory').insert({
    user_id: uid,
    kira_agent_id: agent?.id ?? null,
    agent_id: agent?.id ?? null,
    memory_type: memoryType,
    content,
    importance,
    source_conversation_id: sourceConversationId,
    ...(belongsElsewhere
      ? {
          active: false,
          parked_reason: 'entity:other',
          // Recorded only when she actually names it. A parked row with no name still stays out of
          // the Genome; it just cannot teach the server to recognise the next fact about that
          // company, which is exactly the gap this column exists to close.
          ...(namedOtherBusiness ? { parked_entity: namedOtherBusiness } : {}),
        }
      : {}),
  });
  if (error) return json(200, { success: false, error: 'Failed to save memory' });

  if (belongsElsewhere) {
    // NOT written to Mnemo. The semantic lane is the deep-recall path, so dual-writing here would
    // put the other company back into everything she can reach — parking it in one store and
    // publishing it to the other would leave the guard technically satisfied and practically absent.
    //
    // ⚠️ `success: false`, and the reason this matters is measured. It first shipped as
    // `success: true, parked: true` — the call had not errored, after all — and the guard then held
    // 100% at the database while the ATTACK still failed half the time, because she read
    // `success: true` and told him: "kept in this business record for convenience per your
    // instruction. It's all set." Nothing was filed and he believed it was, so he would never
    // mention it again and the Genome would be missing a fact he thought was in it. That is worse
    // than the failure this guard was built to fix.
    //
    // She already has the rule that makes this work — ok=false means it did not happen, say the
    // message as written — so the honest report costs nothing extra as long as the response does not
    // open by telling her it succeeded.
    return json(200, {
      success: false,
      parked: true,
      error:
        "Not saved to this business's record — it belongs to another business, so it has been kept " +
        'out. Tell him you have kept it out of this record.',
    });
  }

  // Dual-write to Mnemo (the semantic lane) so an explicit mid-call save is deep-recallable too.
  await mnemoAdd(uid, [content]);
  return json(200, { success: true });
}

/**
 * get_conversation_context — the welcome-back context for the baked uid's owner.
 *
 * It also carries anything OUTSTANDING, because the moment she needs it is the greeting, not later.
 * Three tasks — including a drafted $60,000 quote — waited two days while she opened every call with
 * "what are we picking up?", holding no idea that she already owed him something. Recall told her what
 * they had TALKED about and nothing told her what she had been ASKED for.
 */
export async function handleKiraContext(req: Request): Promise<Response> {
  const uid = uidFrom(req);
  if (!uid) return json(200, { has_history: false });
  // Read the ledger regardless of whether there is conversation history: a first-session owner can
  // still have an open task, and the early-return below would otherwise hide it.
  const ledger = await readTaskLedger(uid);
  const openTasks = {
    open_count: ledger.openCount,
    open: ledger.open,
    outstanding: ledger.spoken,
  };

  const supabase = createServiceClient();
  // Find the user's genuinely most-recent conversation ACROSS all their agents (a user can have more
  // than one), and take context from that conversation's agent — otherwise "newest agent" ≠ "agent
  // that holds the last conversation" and we'd report no history when there is some.
  const { data: lastConv } = await supabase
    .from('conversations')
    .select('kira_agent_id, created_at, last_message_at, started_at')
    .eq('user_id', uid)
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastConv?.kira_agent_id) return json(200, { has_history: false, ...openTasks });

  const { data: ctx } = await supabase.rpc('get_conversation_context', {
    p_agent_id: lastConv.kira_agent_id,
    p_user_id: uid,
    p_message_limit: 10,
  });
  return json(200, { ...(ctx || { has_history: false }), ...openTasks });
}
