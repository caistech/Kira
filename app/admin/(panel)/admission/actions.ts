'use server';

// app/admin/(panel)/admission/actions.ts
//
// Operator actions for the monotonic admission gate (T3): nominate → WATCHLIST, admit → ADMITTED,
// retract-for-cause, flag-retired-for-coverage.
//
// Every action re-checks isCurrentUserAdmin() itself. The layout and middleware already gate
// /admin, but a server action is a callable endpoint — it is reachable by anyone who can construct
// the request, not only by someone who rendered the page. Guarding only the page would leave these
// open. (Same rule as every other actions file under the panel.)

import { revalidatePath } from 'next/cache';

import { isCurrentUserAdmin } from '@/lib/auth';
import { isAreaKey } from '@/lib/genome/areas';
import { isFactorKey, itemByKey } from '@/lib/genome/checklist';
import { cohortEvidenceFor, cohortSnapshotText } from '@/lib/genome/cohort-evidence';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const FACTOR_KEYS = [
  'ownerDependence',
  'systems',
  'recurringRevenue',
  'clientConcentration',
  'growth',
] as const;

/** item_key is matched and stored against, like a static ChecklistItem.key — keep it that shape. */
const ITEM_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function assertAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error('Not authorised');
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

interface LedgerRow {
  id: string;
  area_key: string;
  item_key: string;
  buyer_item: string;
  owner_prompt: string;
  factor: string | null;
  substance: {
    tests: string[];
    weakExample: string;
    strongExample: string;
    coaching: string;
  } | null;
  status: 'watchlisted' | 'admitted';
  reason: string | null;
  admitted_by: string | null;
  watchlisted_at: string;
  admitted_at: string | null;
  retracted_at: string | null;
  retraction_reason: string | null;
  evidence_note: string | null;
  no_longer_discriminative: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Put an item on the WATCHLIST. Everything surfaced, nothing admitted yet — admission only moves
 * when the operator deliberately approves, and this form is the only door in.
 *
 * Idempotent under D14: re-nominating the same (area_key, item_key) pair UPDATES the existing
 * watchlist row (the fields are refreshed, the row is one). A nomination of an already-ADMITTED
 * item is refused, not silently re-run: an admitted question is on every business's factor set and
 * its wording must not quietly change by re-nomination.
 */
export async function nominateAdmission(input: {
  areaKey: string;
  itemKey: string;
  buyerItem: string;
  ownerPrompt: string;
  factor: string;
  reason: string;
}): Promise<ActionResult> {
  await assertAdmin();

  const area = input.areaKey.trim();
  if (!isAreaKey(area)) return fail('That is not one of the nine census areas.');

  const itemKey = input.itemKey.trim().toLowerCase();
  if (!ITEM_KEY_RE.test(itemKey) || itemKey.length > 100) {
    return fail('item key must be kebab-case ([a-z0-9], joined by hyphens), max 100 characters.');
  }

  const buyerItem = input.buyerItem.trim();
  const ownerPrompt = input.ownerPrompt.trim();
  const reason = input.reason.trim();
  if (!buyerItem || !ownerPrompt) return fail('A buyer question and an owner prompt are both required.');
  if (!reason) return fail('A journaled reason is required — the bar has no silent members.');

  // The static census is the founding cohort. A nomination that collides with an existing census
  // question is not an admission, it is a duplicate — the question already IS asked.
  if (itemByKey(itemKey)) {
    return fail(`item key "${itemKey}" already exists in the static census.`);
  }

  const factor = FACTOR_KEYS.includes(input.factor as (typeof FACTOR_KEYS)[number])
    ? (input.factor as (typeof FACTOR_KEYS)[number])
    : null;

  const supabase = createServiceClientV2();

  const { data: existing } = await supabase
    .from('genome_admission_ledger')
    .select('status')
    .eq('area_key', area)
    .eq('item_key', itemKey)
    .maybeSingle();

  // Same question under another area is a duplicate in everything but spelling — one question lives
  // in one area.
  if (!existing) {
    const { data: crossArea } = await supabase
      .from('genome_admission_ledger')
      .select('area_key')
      .eq('item_key', itemKey)
      .maybeSingle();
    if (crossArea) {
      return fail(`item key "${itemKey}" is already in use under "${crossArea.area_key}".`);
    }
  }

  if (existing?.status === 'admitted') {
    return fail(`"${itemKey}" is already admitted — re-nominating an admitted question is refused.`);
  }

  const { error } = await supabase.from('genome_admission_ledger').upsert(
    {
      area_key: area,
      item_key: itemKey,
      buyer_item: buyerItem,
      owner_prompt: ownerPrompt,
      factor,
      status: 'watchlisted',
      reason,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'area_key,item_key' },
  );

  if (error) {
    console.error('[admission] nomination failed:', error);
    return fail('Could not write the nomination. Check the server logs.');
  }

  revalidatePath('/admin/admission');
  return { ok: true, message: `"${itemKey}" is on the watchlist, awaiting admission.` };
}

/**
 * The absolute floor, applied: the operator has judged (a) a buyer of ANY business in the cohort
 * asks this, and (b) it discriminates — real spread, not universally covered — and signs the
 * admission off with a journaled reason. The item enters every business's live factor set and is
 * never removed.
 */
export async function admitAdmission(id: string, reason: string): Promise<ActionResult> {
  await assertAdmin();

  const rationalReason = reason.trim();
  if (!rationalReason) return fail('An admission reason is required — the floor awards nothing silently.');

  const supabase = createServiceClientV2();

  const { data: row } = await supabase
    .from('genome_admission_ledger')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!row) return fail('That nomination could not be found.');
  if (row.status === 'admitted') return fail('That item is already admitted.');
  if (row.retracted_at) return fail('That nomination was already retracted.');

  // THE BAR HAS NO SILENT MEMBERS. A factor-bearing item moves every business's number; judged by
  // presence alone it is weaker than the static census items its factor claims to rank alongside.
  // The substance test is not optional for a factor item — and the YOLKLESS escape is always open:
  // admit it without a factor (document-completing) and presence judgment is exactly right.
  if (row.factor && !row.substance) {
    return fail(
      'This item carries a factor but no substance test. Write the substance test first, or ' +
        'clear the factor and admit it as a document-completing item (judged by presence).',
    );
  }

  const { error } = await supabase
    .from('genome_admission_ledger')
    .update({
      status: 'admitted',
      admitted_by: 'operator',
      admitted_at: new Date().toISOString(),
      reason: rationalReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[admission] admit failed:', error);
    return fail('Could not admit the item. Check the server logs.');
  }

  revalidatePath('/admin/admission');
  return { ok: true, message: `"${row.item_key}" admitted — it is now on every factor set.` };
}

export interface SubstanceInput {
  factor: string;
  tests: string;
  weakExample: string;
  strongExample: string;
  coaching: string;
}

/** The substance/factor editor's validation, pure so it can be asserted without a database. */
export async function validateSubstanceInput(input: SubstanceInput): Promise<{
  ok: true;
  factor: string | null;
  substance: { tests: string[]; weakExample: string; strongExample: string; coaching: string } | null;
} | { ok: false; message: string }> {
  const factor = input.factor.trim();
  const resolvedFactor = factor ? (isFactorKey(factor) ? factor : null) : null;
  if (factor && !resolvedFactor) return { ok: false, message: 'That is not a known factor.' };

  const tests = input.tests
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);
  const weakExample = input.weakExample.trim();
  const strongExample = input.strongExample.trim();
  const coaching = input.coaching.trim();

  if (resolvedFactor) {
    // A factor-bearing item's substance test is the whole test — no silent members.
    if (!tests.length || !weakExample || !strongExample || !coaching) {
      return {
        ok: false,
        message:
          'A factor-bearing item needs its whole substance test: at least one observable test, a ' +
          'weak example, a strong example, and the coaching.',
      };
    }
    return {
      ok: true,
      factor: resolvedFactor,
      substance: { tests, weakExample, strongExample, coaching },
    };
  }

  // The yolkless escape: no factor, judged by presence. The substance test is optional, but if any
  // of it is written the whole test is preferred (a half-authored test is a half-formed bar).
  const anyPart = tests.length || weakExample || strongExample || coaching;
  const substance =
    !anyPart || !weakExample || !strongExample || !coaching || !tests.length
      ? null
      : { tests, weakExample, strongExample, coaching };
  return { ok: true, factor: null, substance };
}

/**
 * Author (or clear) the substance test + factor on a row — the v2 surface the T3 migration
 * reserved, and the OTHER side of the admit gate above: a watchlisted factor item can write its
 * test here and then be admitted; an admitted item authored this way upgrades from presence
 * judgment to real scoring.
 */
export async function setSubstance(
  id: string,
  input: SubstanceInput,
): Promise<ActionResult> {
  await assertAdmin();

  const parsed = await validateSubstanceInput(input);
  if (!parsed.ok) return fail(parsed.message);

  const supabase = createServiceClientV2();

  const { data: row } = await supabase
    .from('genome_admission_ledger')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!row) return fail('That row could not be found.');
  if (row.retracted_at) return fail('That row is already retracted.');

  const { error } = await supabase
    .from('genome_admission_ledger')
    .update({
      factor: parsed.factor,
      substance: parsed.substance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[admission] setSubstance failed:', error);
    return fail('Could not save the substance test. Check the server logs.');
  }

  const verb = parsed.substance
    ? `substance test set for`
    : parsed.factor
      ? `factor set for`
      : `factor cleared for`;
  revalidatePath('/admin/admission');
  return { ok: true, message: `${verb} "${row.item_key}".` };
}

/**
 * Retraction FOR CAUSE (D12): the specification or cohort was wrong. Journaled, never a delete —
 * the row stays readable as what it was. Retraction is final in v1; re-admitting starts a fresh
 * nomination (which keeps the trail).
 */
export async function retractAdmission(id: string, reason: string): Promise<ActionResult> {
  await assertAdmin();

  const cause = reason.trim();
  if (!cause) return fail('A cause is required — a retraction never happens without one.');

  const supabase = createServiceClientV2();

  const { data: row } = await supabase
    .from('genome_admission_ledger')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!row) return fail('That row could not be found.');
  if (row.retracted_at) return fail('That row is already retracted.');

  const { error } = await supabase
    .from('genome_admission_ledger')
    .update({
      retracted_at: new Date().toISOString(),
      retraction_reason: cause,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[admission] retract failed:', error);
    return fail('Could not retract the item. Check the server logs.');
  }

  revalidatePath('/admin/admission');
  return { ok: true, message: `"${row.item_key}" retracted for cause: ${cause}` };
}

/**
 * Retirement FOR COVERAGE (never a removal): the operator flags an item "everyone now answers it".
 * It stays in the coverage denominator and keeps being asked; only the live factor score stops
 * loading from it — the cohort-evidence bar the design sets ("no longer discriminative" must not be
 * a quiet way to move a number).
 */
export async function flagRetired(id: string, evidence: string): Promise<ActionResult> {
  await assertAdmin();

  const note = evidence.trim();
  if (!note) {
    return fail(
      'Cohort evidence is required — flagging an item retired skips the live score, and that bar is as high as admission was.',
    );
  }

  const supabase = createServiceClientV2();

  const { data: row } = await supabase
    .from('genome_admission_ledger')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!row) return fail('That row could not be found.');
  if (row.status !== 'admitted') return fail('Only an admitted item can be retired for coverage.');
  if (row.no_longer_discriminative) return fail('Already flagged no-longer-discriminative.');

  // SNAPSHOT THE COHORT BEFORE THE FLAG MOVES. "Everyone now answers it" must not be a quiet way to
  // move a number — so the claim, with its numbers, is what the journal records. Computed at flag
  // time from genome_item_status, fail-soft: if the read fails the operator's note still lands.
  const snapshot = await cohortEvidenceFor(supabase, row.item_key);
  const storedNote = snapshot ? `${note}\n\n${cohortSnapshotText(snapshot)}` : note;

  const { error } = await supabase
    .from('genome_admission_ledger')
    .update({
      no_longer_discriminative: true,
      evidence_note: storedNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[admission] retire failed:', error);
    return fail('Could not flag the item. Check the server logs.');
  }

  revalidatePath('/admin/admission');
  return { ok: true, message: `"${row.item_key}" flagged no-longer-discriminative (stays in the denominator).` };
}

/**
 * Wraps the core logic in a FormData-compatible action for the HTML form submission.
 */
export async function admitAdmissionAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') || '');
  const reason = String(formData.get('reason') || '');
  return admitAdmission(id, reason);
}

export async function retractAdmissionAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') || '');
  const reason = String(formData.get('reason') || '');
  return retractAdmission(id, reason);
}

export async function flagRetiredAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') || '');
  const evidence = String(formData.get('evidence') || '');
  return flagRetired(id, evidence);
}

export type { LedgerRow };