// lib/genome/leg-assignment.ts
// The existence test from DESIGN §2.2 / §5.7.
// Given an area key, returns which D/S partition a record-evidence entry feeds.
// This is a pure function — no DB, no network. Shared by T8 (ingest) and T7 (partition enforcement).

import type { AreaKey } from './areas';

export type Leg = 'D' | 'S';

/** Map of areaKey → leg assignment. The design locks this: continuity (D) first, capability (S) second.
    The crossover (both) assigns to D. The map is the authoritative source; do not duplicate this logic. */
const AREA_LEG: Record<AreaKey, Leg> = {
  demand: 'D',           // work comes in — continuity gap (owner handles quoting)
  pricing: 'D',          // how work is priced — continuity gap
  operations: 'D',       // work gets done — continuity gap (owner on site)
  cash: 'S',             // money in/out — capability gap (no formal reporting pack)
  customers: 'D',        // who buys — continuity gap (owner holds relationships)
  people: 'S',           // who does the work — capability gap (no succession plan)
  assets: 'S',           // what the business owns — capability gap (no asset register)
  compliance: 'S',       // licences/insurance — capability gap (undocumented)
  systems: 'S',          // systems & records — capability gap (no job management)
} as const satisfies Record<AreaKey, Leg>;

/** The existence test (DESIGN §2.2).
    - Function EXISTS but runs through owner → D (continuity gap)
    - Function DOES NOT EXIST → S (capability gap)

    The nine areas are mapped once here so the rule is applied consistently everywhere.
    If the design's area taxonomy changes, update this map — do not inline the logic. */
export function legForArea(area: AreaKey): Leg {
  return AREA_LEG[area];
}

/** Acceptance matrix for the 22-path test plan (DESIGN §7).
    Every area/flowGroup pair must map to exactly one leg.
    This function is the single source of truth for that invariant. */
export function validateLegAssignment(): { ok: boolean; errors: string[] } {
  const allAreas: AreaKey[] = [
    'demand', 'pricing', 'operations', 'cash', 'customers',
    'people', 'assets', 'compliance', 'systems',
  ];
  const errors: string[] = [];
  for (const area of allAreas) {
    const leg = legForArea(area);
    if (leg !== 'D' && leg !== 'S') {
      errors.push(`area ${area}: invalid leg ${leg}`);
    }
  }
  return { ok: errors.length === 0, errors };
}