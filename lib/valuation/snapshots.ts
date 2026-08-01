// lib/valuation/snapshots.ts
//
// Appending to the valuation time series.
//
// business_valuations holds an owner's CURRENT figures — one row, upserted. This module writes the
// history beside it, so "your valuation is moving" is a statement the data can support. The
// introducer board has been making that claim since it shipped; until the snapshots table existed
// it was joining a single overwritten row and calling the result movement.
//
// EVERY WRITE CARRIES model_version AND inputs. Not for completeness — because the model's own
// comments warn that re-weighting "would re-price valuations already shown to people", and a stored
// series makes that worse rather than better. A snapshot that knows which code read which inputs
// can be recomputed and defended later; one that stores only outputs is a number nobody can stand
// behind.
//
// SOURCE IS NOT DECORATION. A 'verification' snapshot — an adapter connecting and correcting
// self-reported figures — legitimately moves the number DOWN, and owners over-rate their own
// diversification and recurring revenue. That must never render like a regression, so the reason it
// moved travels with the row (FINANCIAL_DATA_SCOPE.md §4.1).

import { createServiceClient } from '@/lib/supabase/server';
import { MODEL_VERSION } from '@/lib/valuation/model';
import { DEFAULT_CURRENCY } from '@/lib/valuation/currency';

/** Why a snapshot was taken. Drives how the movement is explained, so it is never guessed. */
export type SnapshotSource = 'onboarding' | 'weekly' | 'verification' | 'manual';

export interface ValuationSnapshotInput {
  userId: string;
  /** The raw ValuationInputs the figures were computed from. */
  inputs: unknown;
  currency?: string;
  gap?: number | null;
  worthToday?: number | null;
  worthPotential?: number | null;
  walkAway?: number | null;
  sdeMultiple?: number | null;
  /** The valuation-bearing track — moves only on an owner-confirmed factor change. */
  readiness?: number | null;
  /** That client's own ceiling: 85 + their growth contribution. Moves when their trends move. */
  readinessPotential?: number | null;
  /** The objective 0-100 track. Null until the admission-test machinery lands. */
  progress?: number | null;
  source: SnapshotSource;
  /** Why this differs from the last one, in the owner's words. */
  reason?: string | null;
}

/**
 * Append one point to an owner's valuation history.
 *
 * Deliberately NEVER throws. A snapshot is a record of something that already happened — the
 * valuation was computed, the owner saw it, the current row was written. Failing the caller because
 * the history write failed would turn a bookkeeping problem into a checkout failure, which is the
 * wrong trade. It logs loudly instead, because a silently empty series is exactly the defect this
 * module exists to fix.
 */
export async function recordValuationSnapshot(snapshot: ValuationSnapshotInput): Promise<void> {
  try {
    const svc = createServiceClient();
    const { error } = await svc.from('business_valuation_snapshots').insert({
      user_id: snapshot.userId,
      model_version: MODEL_VERSION,
      inputs: snapshot.inputs ?? {},
      source: snapshot.source,
      currency: snapshot.currency || DEFAULT_CURRENCY,
      gap: snapshot.gap ?? null,
      worth_today: snapshot.worthToday ?? null,
      worth_potential: snapshot.worthPotential ?? null,
      walk_away: snapshot.walkAway ?? null,
      sde_multiple: snapshot.sdeMultiple ?? null,
      readiness: snapshot.readiness ?? null,
      readiness_potential: snapshot.readinessPotential ?? null,
      progress: snapshot.progress ?? null,
      reason: snapshot.reason ?? null,
    });

    if (error) {
      console.error('[valuation] snapshot insert failed', {
        userId: snapshot.userId,
        source: snapshot.source,
        error: error.message,
      });
    }
  } catch (err) {
    console.error('[valuation] snapshot insert threw', {
      userId: snapshot.userId,
      source: snapshot.source,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
