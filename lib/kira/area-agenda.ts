// area_agenda — what is still missing from one part of his business, so she can actually ask.
//
// WHY THIS EXISTS, measured rather than assumed. On 2026-08-15 the operator's own Genome held 96
// filed memories and answered ZERO of the questions a buyer asks about Customers, and zero about
// Operations across 28 entries. `people` and `assets` held nothing at all. Reading the entries
// explains it: they are Lot 442 project chatter — soil testing scheduled, tasks archived, a site
// walk pending. Kira is a good assistant for one job and a poor biographer of the business.
//
// The reason is not the model. NOTHING HAS EVER PROMPTED HER TO ASK. She has no agenda, so she talks
// about whatever he raised last, and the last thing is always the live job. The next day he opened a
// conversation intending to work on a Genome area and she opened on the Herrings plumbing quote
// again — then filed *"The business includes a 'genome area' with categories that can be worked on"*
// as a fact about his business, which is our own product recorded as his.
//
// So this is the agenda: she pulls the open questions for an area and asks them. It is the pull half
// of the standard (VOICE_MEMORY_STANDARD) — the session override carries only the TRIGGER, the area
// name, and she fetches the authoritative content herself, because by the time she speaks a list
// baked into an override may be several conversations stale.
//
// ⚠️ WHAT IT DELIBERATELY DOES NOT RETURN: entry text, ids, or anything she could read back as a
// confirmation. That is `facts_to_confirm`'s job and the two must not blur — this hands her
// QUESTIONS TO ASK, that one hands her FACTS TO CHECK. A tool that did both would produce an
// interview, which is the one thing the product cannot become.

import { createServiceClient } from '@/lib/supabase/server';
import { resolveOrganisationForPerson } from '@/lib/auth';

import { GENOME_AREAS, type AreaKey } from '@/lib/genome/areas';
import { itemsForArea, type ChecklistItem } from '@/lib/genome/checklist';
import type { ItemStatus } from '@/lib/genome/checklist-bands';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const uidFrom = (req: Request) => new URL(req.url).searchParams.get('uid') || '';

/**
 * How many questions come back.
 *
 * Three. Same reasoning as `facts_to_confirm`'s two: the surest way to get a list read out like an
 * audit is to hand her a list. Three is enough for a ten-minute conversation to have somewhere to go
 * and few enough that she has to choose one to start with.
 */
const AGENDA_LIMIT = 3;

/**
 * Resolve whatever she said into one of the nine areas.
 *
 * She is told to pass the area key, and she will sometimes pass "the people bit" or "staff" anyway —
 * a model given a controlled vocabulary still speaks. Matching on the title as well as the key costs
 * nothing and turns a failed call into a working one; an unmatched value is refused rather than
 * defaulted, because silently answering about Customers when he asked about Cash is worse than
 * saying "which part?".
 */
export function resolveArea(value: unknown): AreaKey | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;
  const direct = GENOME_AREAS.find((a) => a.key === raw);
  if (direct) return direct.key as AreaKey;
  const byTitle = GENOME_AREAS.find(
    (a) => a.title.toLowerCase() === raw || a.title.toLowerCase().includes(raw) || raw.includes(a.key),
  );
  return (byTitle?.key as AreaKey) ?? null;
}

interface AgendaQuestion {
  ask: string;
  /** Present only when he has already answered and the answer was thin. */
  why_it_is_not_enough?: string;
  /** What a good answer sounds like — hers to use as a nudge, never to read out. */
  sounds_like?: string;
  /** True when no answer he gives closes this — the business has to change. */
  needs_a_change: boolean;
}

function toQuestion(item: ChecklistItem, why: string | null): AgendaQuestion {
  return {
    ask: item.ownerPrompt,
    ...(why ? { why_it_is_not_enough: why } : {}),
    ...(item.substance ? { sounds_like: item.substance.strongExample } : {}),
    needs_a_change: item.closes === 'change',
  };
}

/**
 * GET/POST handler for the `area_agenda` tool.
 *
 * Never throws and never returns a bare failure: an `ok:false` carries a REASON she is instructed to
 * say verbatim, per the contract the lookup tools already use — "the lookup did not happen, and here
 * is why" is a different thing from "there is nothing", and collapsing them is how a working
 * capability comes to look absent.
 */
export async function handleAreaAgenda(req: Request): Promise<Response> {
  const uid = uidFrom(req);
  if (!uid) return json(200, { ok: false, reason: 'I could not tell which account this is.' });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const area = resolveArea(body.area);
  if (!area) {
    return json(200, {
      ok: false,
      reason: 'I am not sure which part of the business you mean.',
      choices: GENOME_AREAS.map((a) => ({ area: a.key, called: a.title })),
    });
  }

  const def = GENOME_AREAS.find((a) => a.key === area)!;
  const items = itemsForArea(area);

  const supabase = createServiceClient();
  // INV-020: genome item status is organisation-owned — resolve the org from the person and scope
  // the read by it (a person's seat can change; the assessment belongs to the organisation).
  const orgContext = await resolveOrganisationForPerson(uid);
  if (!orgContext) {
    return json(200, {
      ok: false,
      reason: 'I could not identify which account this belongs to just now.',
    });
  }
  const { data, error } = await supabase
    .from('genome_item_status')
    .select('item_key, status, why')
    .eq('organisation_id', orgContext.organisationId)
    .eq('area', area);

  if (error) {
    console.error('[area_agenda] status read failed:', error);
    return json(200, {
      ok: false,
      reason: 'I could not read where we are up to on that part of the business just now.',
    });
  }

  const byKey = new Map(
    (data ?? []).map((r) => [r.item_key as string, { status: r.status as ItemStatus, why: (r.why as string | null) ?? null }]),
  );

  // WEAK FIRST, THEN REQUIRED-OPEN, THEN THE REST.
  //
  // Weak leads because pushing back on an answer he has already given is the highest-value thing in
  // the conversation and the thing she will otherwise never do — a model handed a mixed list asks
  // the easy new question every time. It is also the one that needs her to have the reason to hand,
  // which is why `why` travels with it.
  const weak = items.filter((i) => byKey.get(i.key)?.status === 'weak');
  const openRequired = items.filter((i) => i.required && (byKey.get(i.key)?.status ?? 'open') === 'open');
  const openRest = items.filter((i) => !i.required && (byKey.get(i.key)?.status ?? 'open') === 'open');

  const chosen = [...weak, ...openRequired, ...openRest].slice(0, AGENDA_LIMIT);
  const answered = items.filter((i) => byKey.get(i.key)?.status === 'answered').length;

  if (chosen.length === 0) {
    return json(200, {
      ok: true,
      area,
      called: def.title,
      buyer_asks: def.buyerQuestion,
      nothing_outstanding: true,
      already_answered: answered,
      questions: [],
    });
  }

  return json(200, {
    ok: true,
    area,
    called: def.title,
    buyer_asks: def.buyerQuestion,
    already_answered: answered,
    // Never assessed at all reads differently from assessed-and-complete, and she should say so
    // rather than implying we have checked when nobody has looked.
    ever_checked: byKey.size > 0,
    questions: chosen.map((i) => toQuestion(i, byKey.get(i.key)?.why ?? null)),
  });
}
