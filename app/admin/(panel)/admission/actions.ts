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
import { itemByKey } from '@/lib/genome/checklist';
import { createServiceClientV2 } from '@/lib/supabase/server';

const FACTOR_KEYS = [
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

  const { error } = await supabase
    .from('genome_admission_ledger')
    .update({
      no_longer_discriminative: true,
      evidence_note: note,
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