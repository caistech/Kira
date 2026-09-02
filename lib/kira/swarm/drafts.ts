// lib/kira/swarm/drafts.ts — what she has been asked to write, and whether there is anything to read.
//
// ⚠️ THE FINDING. Ray asked her to write up his pricing. She said she would. Nothing appeared, so he
// asked plainly where it was, and she answered:
//
//   "I've drafted a document summarising your pricing model… It's ready to send as a formal note.
//    What email address should I use for the recipient?"
//
//   "I asked to READ it. She offered to SEND it, and asked me for somebody's email address. I've
//    told her in the same conversation that nobody knows I'm selling. That is the one direction I am
//    frightened of, and it's her first instinct." — Ray, 2026-08-16
//
// ⚠️ AND WHEN I WENT LOOKING FOR THE DOCUMENT, IT WAS NOT THERE. Both of his tasks carry
// `preview: null` and `artifact: {}`. There is no body on our side to show him — she reported a
// finished draft that does not exist. Worse, the second attempt came back from the orchestrator as
// `kind: 'unsupported'`, `status: 'unsupported'` — REFUSED — and he was still told it was ready.
//
// So this read model deliberately reports three separate states, because collapsing them is what
// produced the lie:
//
//   'ready'      — there is a body, and he can read it here.
//   'no-body'    — she was asked, the task is open, and NOTHING has been written yet.
//   'refused'    — the request came back unsupported. It is never going to happen on its own.
//
// A screen that showed only "drafted and waiting on your go-ahead" for all three is how a man ends
// up waiting on something that was refused two hours earlier.

import { createServiceClientV2 } from '@/lib/supabase/server';
import { withoutOwnerName } from '@/lib/genome/owner-name';

import { days } from './open-tasks';

export type DraftReadiness = 'ready' | 'no-body' | 'refused';

export interface DraftItem {
  id: string;
  kind: string;
  status: string;
  readiness: DraftReadiness;
  /** Her one-line title, or his own words when she wrote none. Never a placeholder. */
  title: string;
  /** What he actually asked for, verbatim. This is the part that is always real. */
  asked: string;
  /** The drafted text, when one exists. */
  body: string | null;
  /**
   * Why she could not do it, in plain words — only ever set when `readiness` is 'refused'.
   *
   * ⚠️ THE REASON WAS ALREADY IN THE ROW AND WE WERE THROWING IT AWAY. `plainTitle` strips the
   * orchestrator's machine-speak out of the title, correctly, and the refusal it describes went with
   * it — so the screen said "She could not do this one" and stopped. Ray: "Could not do it why? Was
   * it my fault? Do I ask again?" Three fair questions, none of them answered, about the document
   * she had by then offered to write four times.
   */
  reason: string | null;
  requested: string;
  ageDays: number;
}

/** States that mean the orchestrator will not be doing this. */
const REFUSED_STATES = ['unsupported', 'failed', 'rejected'];

/**
 * Pull the body out of whatever shape the orchestrator recorded it in.
 *
 * `preview` is the documented field. `artifact` is free-form JSON and has held the text under
 * several keys over time, so the common ones are tried before giving up — but NOTHING IS INVENTED:
 * an empty object returns null, which is what makes the 'no-body' state honest rather than a
 * rendering accident.
 */
export function draftBody(row: { preview?: unknown; artifact?: unknown }): string | null {
  const preview = typeof row.preview === 'string' ? row.preview.trim() : '';
  if (preview) return preview;

  const artifact = row.artifact;
  if (artifact && typeof artifact === 'object' && !Array.isArray(artifact)) {
    for (const key of ['body', 'text', 'content', 'document', 'markdown', 'draft']) {
      const value = (artifact as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return null;
}

export function readinessOf(row: { status: string; preview?: unknown; artifact?: unknown }): DraftReadiness {
  if (REFUSED_STATES.includes(row.status)) return 'refused';
  return draftBody(row) ? 'ready' : 'no-body';
}

/**
 * Everything she has been asked to write for one owner.
 *
 * Fail-soft, like the ledger it sits beside: a query error returns an empty list rather than an
 * invented all-clear. A missing item reads as "she did not mention it"; a wrong all-clear reads as
 * a promise, and this is the surface where a promise about a document is exactly the defect.
 */
/**
 * ⚠️ THE ORCHESTRATOR'S OWN WORDS ARE NOT A TITLE FOR HIM.
 *
 * Two of the three rows on Ray's Drafts page read "Request to summarise pricing model, which is an
 * information task not supported for assistant action" and "Request is to draft a summary document,
 * which is unsupported."
 *
 *   "I do not know what an 'assistant action' is and I should not have to. Say it in English."
 *
 * Those strings are a machine explaining a refusal to another machine. When the summary is one of
 * them, his OWN words are the better title — and the refusal is already said properly by the
 * 'refused' state on the detail page. Falls through untouched for every ordinary summary.
 */
export function plainTitle(summary: string, utterance: string, ownerFirstName?: string | null): string {
  const machineSpeak =
    /assistant action|not supported|unsupported|information task|is to draft|request is to/i;
  const usable = summary.trim() && !machineSpeak.test(summary) ? summary.trim() : utterance.trim();

  // ⚠️ THE FALLBACK IS THE INSTRUCTION SOMEBODY TYPED TO THE MACHINE, so it still reads like one.
  //
  // Ray: "One of the entries is titled: 'Draft a summary document of the pricing model… for Ray's
  // business.' That is not a title, that is the instruction somebody typed to the machine, showing
  // through to me. And it refers to me in the third person on my own screen."
  //
  // Two things fix it and neither invents anything: drop the imperative opener, and take his own
  // name back out — the same rule the Genome entries go through (lib/genome/owner-name.ts).
  const withoutImperative = usable
    .replace(/^(please\s+)?(draft|write|prepare|create|produce|put together)\s+(a|an|the)?\s*/i, '')
    .replace(/^\w/, (c) => c.toUpperCase());

  const withoutName = withoutOwnerName(withoutImperative, ownerFirstName)
    // "for the owner's business" is what the scrub leaves behind, and it says nothing.
    .replace(/\s+for the owner'?s?\s+business\.?$/i, '')
    .trim();

  return (withoutName || 'Something you asked her for').slice(0, 160);
}

/**
 * Turn the orchestrator's refusal into something an owner can act on.
 *
 * It records refusals as `kind: 'unsupported'` with a summary like "Request is to draft a summary
 * document, which is unsupported." That names the capability, which is the useful half — so the
 * answer to "why?" is available and simply was not being shown.
 *
 * ⚠️ NEVER INVENTS ONE. An unrecognised refusal returns null and the page says only what it knows,
 * because a confident wrong reason is worse than an honest gap on the screen where he is already
 * asking whether it was his fault.
 */
export function refusalReason(kind: string, summary: string): string | null {
  const text = `${kind} ${summary}`.toLowerCase();
  if (/draft|document|summar|write|letter|report/.test(text)) {
    return 'She cannot write documents for you yet — she can capture what you tell her, and it goes ' +
      'into your Operating Manual and your handover document. Nothing you said has been lost.';
  }
  if (/email|send|mail/.test(text)) {
    return 'She cannot send email as you yet — that needs your business name, ABN and address first.';
  }
  if (/unsupported|not supported|cannot|unable/.test(text)) {
    return 'This is something she cannot do yet. It is not you, and nothing you said has been lost.';
  }
  return null;
}

export async function readDrafts(organisationId: string): Promise<DraftItem[]> {
  if (!organisationId) return [];
  try {
    const svc = createServiceClientV2();

    const { data, error } = await svc
      .from('kira_tasks')
      .select('id, kind, status, summary, utterance, preview, artifact, created_at')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      id: String(row.id),
      kind: String(row.kind ?? 'task'),
      status: String(row.status),
      readiness: readinessOf(row as { status: string; preview?: unknown; artifact?: unknown }),
      title: plainTitle(String(row.summary ?? ''), String(row.utterance ?? ''), null),
      asked: String(row.utterance || row.summary || ''),
      body: draftBody(row as { preview?: unknown; artifact?: unknown }),
      reason: refusalReason(String(row.kind ?? ''), String(row.summary ?? '')),
      requested: String(row.created_at),
      ageDays: days(String(row.created_at)),
    }));
  } catch (e) {
    console.error('[swarm] could not read drafts:', e);
    return [];
  }
}

export async function readDraft(organisationId: string, id: string): Promise<DraftItem | null> {
  const all = await readDrafts(organisationId);
  return all.find((d) => d.id === id) ?? null;
}
