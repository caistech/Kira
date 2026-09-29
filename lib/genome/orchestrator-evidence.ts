// lib/genome/orchestrator-evidence.ts
//
// THE BRIDGE — orchestrator's real, observed evidence reaching the one place an owner looks.
//
// WHY THIS EXISTS. AGENTIC_NETWORK.md's doing-layer has been live since 2026-09-16: a real agent
// (quoting_agent / email_agent / reminder_agent / compliance_sweeper) completes real work, an effect
// lands, the evidence collector (orchestrator's src/genome/evidence-collector.ts) stages it, a human
// promotes it. NOTHING has ever read a promoted row back out. It reaches orchestrator's own
// /continuity dashboard — a page on a different domain no owner has ever opened — and stops there.
// `/my-genome`, the surface an owner actually sees, has never heard about a single completed,
// evidenced task. This file is the read half of that missing seam.
//
// WHY THIS IS STRONGER EVIDENCE THAN A CONVERSATION, AND MUST NEVER BE WEAKER. A task the owner
// SAYS someone else could do is self-report, judged by an LLM (checklist-assess.ts). A task an agent
// actually completed, evidenced, reviewed by a human and PROMOTED is an observed fact — the same
// hierarchy business-genome/coverage.ts already encodes (SOURCE_STRENGTH: system=1.0 >
// conversation=0.7). So an observed-automation item is NEVER routed through the LLM assessor: it is
// written DIRECTLY from orchestrator's data, and it is written AFTER (so it overrides) whatever the
// LLM concluded from the conversational record — see writeObservedVerdicts's call site in
// app/my-genome/[area]/actions.ts for the ordering that enforces this.
//
// WHAT THIS DELIBERATELY DOES NOT DO. It does not attach evidence to a specific discovered task
// (lib/genome/tasks.ts) — orchestrator's evidence is bucket-level (an effect_kind mapped to a
// genome_bucket), not task-id-level, and there is no shared identifier between the two systems'
// task rows. Pretending otherwise would be exactly the "precise-looking number on a guess" DATA_
// STANDARD exists to prevent. So this produces ONE item per AREA — "does anything in this area
// genuinely run without the owner, proven" — honest at the grain the data actually supports.
//
// ⚠️ DEGRADE, DON'T FAKE. Any failure to reach orchestrator (misconfigured, unreachable, timeout)
// returns an empty result — never a guess, never a cached stale answer presented as fresh.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AreaKey } from './areas';
import { isAreaKey } from './areas';
import type { ChecklistItem, SubstanceTest } from './checklist';

const AUTH_HEADER = 'x-orchestrator-secret';
const TIMEOUT_MS = 8_000;

export interface OrchestratorEvidenceRow {
  id: string;
  effectKind: string;
  genomeBucket: string;
  description: string;
  maturityLevel: number;
  status: 'pending' | 'reviewed' | 'promoted' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
}

/**
 * Orchestrator's evidence-collector buckets (src/genome/evidence-collector.ts EVIDENCE_MAPPINGS) →
 * Kira's nine area keys (lib/genome/areas.ts). A THIRD naming scheme existed here with no bridge to
 * either of Kira's — this is that bridge, held as data so a dispute is a one-line change, not a
 * rebuild, same discipline as checklist.ts's own "DATA, NOT PROSE" rule.
 *
 * Some choices are judgement calls, not exact fits, and are named as such rather than hidden:
 *   - risk_management has no home of its own in Kira's nine areas; compliance is the closest reading
 *     (both are "what could go wrong that the owner isn't watching").
 *   - supply_chain (stock reorder) reads as operations (a workflow) rather than assets (the static
 *     register of owned things) — it is about the REORDER PROCESS, not the inventory itself.
 *   - sales (lead/quote follow-up) maps to demand ("where the work comes from"), the closest of
 *     Kira's nine to a pipeline concept, though it also touches pricing at the margin.
 */
export const EVIDENCE_BUCKET_TO_AREA: Record<string, AreaKey> = {
  communication: 'customers',
  client_management: 'customers',
  compliance: 'compliance',
  risk_management: 'compliance',
  financial_management: 'cash',
  cash_flow: 'cash',
  operations: 'operations',
  supply_chain: 'operations',
  sales: 'demand',
};

function areaForBucket(bucket: string): AreaKey | null {
  const area = EVIDENCE_BUCKET_TO_AREA[bucket];
  return area && isAreaKey(area) ? area : null;
}

/**
 * Read promoted evidence for one tenant. `tenantId` IS the Kira user id (confirmed in
 * docs/GENOME_WRITE_BACK.md — "tenant_id IS the Kira app user id"), the same id already used for
 * dispatch (lib/kira/swarm/orchestrator-adapter.ts). Never throws; an unreachable or misconfigured
 * orchestrator degrades to "no evidence found this run", never a fabricated answer.
 */
export async function fetchPromotedEvidence(tenantId: string): Promise<OrchestratorEvidenceRow[]> {
  const baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
  const secret = process.env.ORCHESTRATOR_SECRET || '';
  if (!baseUrl || !secret || !tenantId) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${baseUrl}/api/v1/evidence?tenantId=${encodeURIComponent(tenantId)}&status=promoted`;
    const res = await fetch(url, { headers: { [AUTH_HEADER]: secret }, signal: controller.signal });
    if (!res.ok) {
      console.error(`[orchestrator-evidence] fetch → ${res.status}`);
      return [];
    }
    const wire = (await res.json()) as { evidence?: unknown[] };
    return (wire.evidence ?? []).flatMap((raw) => {
      const e = raw as Record<string, unknown>;
      if (typeof e.id !== 'string' || typeof e.genomeBucket !== 'string') return [];
      return [
        {
          id: e.id,
          effectKind: typeof e.effectKind === 'string' ? e.effectKind : 'unknown',
          genomeBucket: e.genomeBucket,
          description: typeof e.description === 'string' ? e.description : '',
          maturityLevel: typeof e.maturityLevel === 'number' ? e.maturityLevel : 0,
          status: 'promoted' as const,
          createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
          reviewedAt: typeof e.reviewedAt === 'string' ? e.reviewedAt : null,
        },
      ];
    });
  } catch (error) {
    console.error('[orchestrator-evidence] fetch failed:', error);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Which of Kira's nine areas have at least one promoted, mapped evidence row. */
export function observedAreas(rows: OrchestratorEvidenceRow[]): AreaKey[] {
  const areas = new Set<AreaKey>();
  for (const row of rows) {
    const area = areaForBucket(row.genomeBucket);
    if (area) areas.add(area);
  }
  return Array.from(areas);
}

const OBSERVED_ITEM_PREFIX = 'observed.';

export function observedItemKey(area: AreaKey): string {
  return `${OBSERVED_ITEM_PREFIX}${area}`;
}

function observedSubstance(): SubstanceTest {
  return {
    tests: ['a completed piece of work in this area ran without the owner, and a human reviewed and confirmed it happened'],
    weakExample: '"the system probably does some of this"',
    strongExample: 'A reviewed, promoted record: a real task completed here without the owner touching it.',
    coaching: 'Nothing in this area has been proven to run without you yet — talked about is not the same as evidenced.',
  };
}

/**
 * The area-level "proven, not just described" item. Supporting, never required (`required: false`)
 * — most Kira accounts have no orchestrator automation live yet (KIRA_SWARM_ADAPTER is only flipped
 * per beta tenant), and an absent item must never read as a deficiency the way a genuine unanswered
 * dependency does. `factor: null`, same reasoning as every task-derived item: this can only move
 * operational-coverage, never `readiness`/`readiness_now`.
 */
export function observedAutomationItem(area: AreaKey): ChecklistItem {
  return {
    key: observedItemKey(area),
    area,
    required: false,
    buyerItem: `Whether anything in ${area} runs without the owner, proven by the system`,
    ownerPrompt: 'Has anything here actually run without you — not described, proven?',
    substance: observedSubstance(),
    factor: null,
    closes: 'fact',
  };
}

/**
 * Write the observed-evidence verdicts DIRECTLY — never through the LLM assessor. This is a
 * boolean fact from orchestrator's own data (did a promoted row land for this area), not something
 * requiring interpretation, so routing it through checklist-assess.ts would be asking a model to
 * judge something it cannot see and has no business guessing at.
 *
 * MUST be called AFTER the LLM-assessed verdicts are upserted for the same area (see actions.ts) —
 * observed evidence overrides self-report, never the reverse. An area with real orchestrator
 * evidence gets `answered` here regardless of what the conversational record did or didn't say.
 */
export async function writeObservedVerdicts(
  supabase: SupabaseClient,
  organisationId: string,
  userId: string,
  tenantId: string,
  area: AreaKey,
): Promise<{ observed: boolean }> {
  const rows = await fetchPromotedEvidence(tenantId);
  const areas = observedAreas(rows);
  if (!areas.includes(area)) return { observed: false };

  const { error } = await supabase.from('genome_item_status').upsert(
    {
      organisation_id: organisationId,
      user_id: userId,
      item_key: observedItemKey(area),
      area,
      status: 'answered',
      why: null,
      evidence: [],
      assessed_at: new Date().toISOString(),
      assessed_by: 'orchestrator-evidence',
    },
    { onConflict: 'organisation_id,item_key' },
  );

  if (error) {
    console.error('[orchestrator-evidence] verdict write failed:', error);
    return { observed: false };
  }
  return { observed: true };
}
