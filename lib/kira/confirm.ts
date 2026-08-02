// lib/kira/confirm.ts
// facts_to_confirm + confirm_fact — the Genome's verifiable axis (docs/GENOME_BUYER_FORMAT.md §2).
//
// A buyer discounts what he cannot check. Something the owner said once is hearsay; something he was
// read back and agreed with is evidence, and that difference is most of what the product is paid for.
//
// IDENTITY IS THE SERVER'S. Both handlers take the owner from the baked `?uid`, like every other
// operational tool, and every read and write is scoped to it. A handle belonging to another owner
// resolves to nothing rather than to someone else's fact — the check is a filter, not a comparison
// after the fact, so there is no path where the wrong row is even fetched.
//
// THE HANDLE IS SHORT ON PURPOSE. A full UUID read aloud and typed back through a voice model is a
// transcription error waiting to happen, and the failure mode is not "it fails" — it is a
// confirmation landing on the WRONG fact, which is a false claim carrying the strongest label the
// document has. So the handle is short, checked for ambiguity, and resolved server-side; anything
// that is not exactly one fact is refused.

import { createServiceClient } from '@/lib/supabase/server';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const uidFrom = (req: Request) => new URL(req.url).searchParams.get('uid') || '';

/** Longest text kept. What he said is a sentence; a paragraph here is a model narrating. */
const MAX_SAID = 600;

/**
 * How many facts to offer at once.
 *
 * Two. The tool description asks her to weave one or two into the conversation, and the surest way
 * to get a list read out like an audit is to hand her a list. The limit is the mechanism behind the
 * manners.
 */
const OFFER_LIMIT = 2;

/** The only three answers there are — must match the DB CHECK exactly. */
const OUTCOMES = ['confirmed', 'corrected', 'denied'] as const;
type Outcome = (typeof OUTCOMES)[number];

/**
 * Length of the handle she is given.
 *
 * Eight hex characters is ~4 billion values; within one owner's few hundred facts a collision is
 * vanishingly unlikely, and the ambiguity check below turns the remaining case into a refusal rather
 * than a wrong write.
 */
const HANDLE_LENGTH = 8;

function parseOutcome(value: unknown): Outcome | null {
  const v = String(value ?? '').trim().toLowerCase();
  return (OUTCOMES as readonly string[]).includes(v) ? (v as Outcome) : null;
}

/**
 * facts_to_confirm — a couple of things he has said that nobody has checked back with him.
 *
 * Oldest first, because the facts most worth re-testing are the ones said longest ago: a business
 * moves, and a price quoted eight months back is the kind of thing that has quietly changed. It is
 * also the order that makes the Genome improve fastest, since the oldest facts are the ones a buyer
 * would trust least.
 */
export async function handleFactsToConfirm(req: Request): Promise<Response> {
  const userId = uidFrom(req);
  if (!userId) return json(200, { success: false, error: 'No user identity on this request' });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // An empty body is entirely valid here — every parameter is optional.
  }
  const about = String(body.about ?? '').trim();

  try {
    const supabase = createServiceClient();
    let query = supabase
      .from('kira_memory')
      .select('id, content, created_at')
      .eq('user_id', userId)
      // Never offer a parked fact. It is out of his record, and reading one back would ask him to
      // confirm something the product has already decided not to assert.
      .neq('active', false)
      // SAME RULE, SECOND EXCLUSION — and it was missing until 2026-08-02.
      //
      // A row filed as 'none' is chit-chat, a software feature request, or a fact about a different
      // company, and `deriveOwnerGenome` drops it from the Genome outright. Offering one asks him to
      // confirm something that can never appear in his handover document and can never count on the
      // verifiable axis — spending the scarcest thing this product has, a turn of his attention, on
      // a fact that is already decided against. The single real confirmation in production landed on
      // exactly such a row, which is how this was found.
      //
      // ⚠️ THIS ALSO EXCLUDES UNCLASSIFIED (NULL) ROWS, DELIBERATELY, and the mechanism is worth
      // knowing before anyone "fixes" it: `neq` renders as `genome_section <> 'none'`, which is NULL
      // — not true — for a NULL column, so those rows are filtered out too. That is the behaviour we
      // want. A NULL means the classifier has not run yet, so we cannot say whether the fact will
      // survive into the Genome; offering it is the same gamble in a different costume. Classification
      // runs at write time plus an hourly sweep, so the exclusion is brief, and a fact captured
      // minutes ago is the last thing she should be reading back anyway — the point is re-opening old
      // ground, which is why the order below is oldest-first.
      .neq('genome_section', 'none')
      .is('confirmed_at', null)
      .order('created_at', { ascending: true })
      .limit(OFFER_LIMIT);
    if (about) query = query.ilike('content', `%${about}%`);

    const { data, error } = await query;
    if (error) throw error;

    const facts = (data ?? []).map((row) => ({
      handle: String(row.id).slice(0, HANDLE_LENGTH),
      fact: String(row.content ?? ''),
      // So she can say "you told me back in March", which is what makes the re-ask feel like care
      // rather than like a form.
      told_you: String(row.created_at ?? '').slice(0, 10),
    }));

    if (facts.length === 0) {
      return json(200, {
        success: true,
        facts: [],
        // Said explicitly, because "nothing came back" and "everything is confirmed" are different
        // states and she must not present the first as the second.
        message: about
          ? `Nothing unconfirmed about "${about}" — either it is all checked, or you have not been told about it yet.`
          : 'Everything you have been told has already been checked back with him.',
      });
    }

    return json(200, { success: true, facts });
  } catch (error) {
    console.error('[confirm] could not read unconfirmed facts:', error);
    // ok:false shape, per the honesty contract: a failure must never be presentable as "nothing
    // needs checking", which is the comfortable reading and the wrong one.
    return json(200, {
      success: false,
      error: "I couldn't pull up what still needs checking just now.",
    });
  }
}

/**
 * confirm_fact — record what he said when a fact was put to him.
 *
 * `denied` and `corrected` PARK the fact. That is a real consequence and the right one: the cost of
 * parking something he actually agreed with is one re-ask, and the cost of continuing to assert what
 * he has told us is untrue — in a document shown to a buyer, over his name — is the whole product.
 */
export async function handleConfirmFact(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: 'Invalid JSON' });
  }

  const userId = uidFrom(req);
  if (!userId) return json(200, { success: false, error: 'No user identity on this request' });

  const handle = String(body.handle ?? '').trim().toLowerCase();
  const said = String(body.said ?? '').trim().slice(0, MAX_SAID) || null;
  const outcome = parseOutcome(body.outcome);

  if (!handle) return json(200, { success: false, error: 'No handle — call facts_to_confirm first.' });
  if (!outcome) {
    // Same guard as declined_because, for the same reason: an unclassified confirmation is almost
    // always a model recording something that is not a confirmation at all, and the DB would reject
    // it anyway. Loud, because if this fires often the tool description is teaching the wrong thing.
    console.warn('[confirm] refused an unclassified confirmation. handle=%s outcome=%o', handle, body.outcome);
    return json(200, {
      success: false,
      error: 'Not recorded — say whether he confirmed it, corrected it, or denied it.',
    });
  }

  try {
    const supabase = createServiceClient();

    // SCOPED TO HIM IN THE QUERY ITSELF. A handle from another owner's account matches nothing here
    // rather than matching a row we then have to remember to reject.
    //
    // THE PREFIX IS MATCHED IN JS, NOT IN THE QUERY. `id` is a uuid column and Postgres has no
    // ILIKE for one — the first version shipped `.ilike('id', ...)` and every call died on
    // "operator does not exist: uuid ~~* unknown". The unit tests passed it, because a mocked
    // client cannot fail on a type mismatch that only exists in the database; the end-to-end probe
    // caught it on the first try. Casting in the filter is not available through PostgREST, so the
    // candidates come back scoped to the owner and the prefix is applied here. Bounded the same way
    // the save_memory dedupe scan is, and for the same reason: far above any real owner's count.
    const { data: owned, error: findError } = await supabase
      .from('kira_memory')
      .select('id, content, kira_agent_id')
      .eq('user_id', userId)
      .neq('active', false)
      .limit(500);
    if (findError) throw findError;

    const candidates = (owned ?? []).filter((row) => String(row.id).toLowerCase().startsWith(handle));

    if (candidates.length === 0) {
      return json(200, {
        success: false,
        error: "That handle doesn't match anything on his record — call facts_to_confirm and use a handle from there.",
      });
    }
    if (candidates.length > 1) {
      // Refused rather than guessed. Landing a confirmation on the wrong fact is the failure this
      // whole design is arranged to prevent, and it would be invisible.
      return json(200, {
        success: false,
        error: 'That handle matches more than one fact — call facts_to_confirm again and use the full handle.',
      });
    }

    const fact = candidates[0];

    // The event, first. It is the evidence, and it must exist even if the stamp below fails —
    // a confirmation that happened and was not recorded is the loss that cannot be recovered.
    const { error: insertError } = await supabase.from('kira_fact_confirmations').insert({
      memory_id: fact.id,
      user_id: userId,
      outcome,
      said,
      kira_agent_id: fact.kira_agent_id ?? null,
    });
    if (insertError) throw insertError;

    // Then the denormalised state on the fact itself, so rendering a Genome stays one query.
    const patch: Record<string, unknown> = {
      confirmed_at: new Date().toISOString(),
      confirmed_outcome: outcome,
    };
    if (outcome !== 'confirmed') {
      // Out of the record immediately. Parked, never deleted — the same posture as every other guard
      // here, so a wrong call costs a --restore rather than the fact itself.
      patch.active = false;
      patch.parked_reason = outcome === 'denied' ? 'denied' : 'superseded';
    }
    const { error: updateError } = await supabase.from('kira_memory').update(patch).eq('id', fact.id);
    if (updateError) throw updateError;

    if (outcome === 'confirmed') {
      return json(200, { success: true, recorded: true, confirmed: true });
    }
    return json(200, {
      success: true,
      recorded: true,
      removed: true,
      // Told plainly so she can say it plainly, and — for a correction — reminded of the second half
      // of the job, which is a separate tool on purpose.
      message:
        outcome === 'corrected'
          ? 'Taken out of his record. Now save the corrected version with save_memory.'
          : 'Taken out of his record.',
    });
  } catch (error) {
    console.error('[confirm] could not record a confirmation:', error);
    // Honest failure, not a silent one. She has just told him she is noting it down; if that did not
    // happen he is entitled to know, because the alternative is him believing the record is better
    // than it is.
    return json(200, { success: false, error: "I couldn't write that down just now." });
  }
}
