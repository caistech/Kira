// business-genome/conflicts.ts
//
// CONFLICT DETECTION & SUPERSESSION MANAGEMENT
//
// This module handles:
//   1. Detecting contradictions between new extractions and existing genome knowledge
//   2. Managing supersession chains (ensuring they don't get too deep)
//   3. Conflict resolution utilities for the owner to review

import {
  findFact,
  findEntity,
  getFactsByArea,
  getAllFacts,
  getAllEntities,
  supersedeFact,
  confirmFact,
  confirmEntity,
  getEvents,
} from './repository';
import type { GenomeFact, GenomeEntity, GenomeEvent } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface DetectedConflict {
  type: 'value_contradiction' | 'entity_duplicate' | 'relationship_cycle' | 'temporal_inconsistency';
  severity: 'low' | 'medium' | 'high';
  existing: GenomeFact | GenomeEntity;
  incoming: GenomeFact | GenomeEntity;
  description: string;
  suggested_action: 'supersede' | 'mark_contradicted' | 'flag_for_review' | 'ignore';
}

export interface ConflictDetectionOptions {
  /** Only detect contradictions with confirmed facts (not candidates) */
  onlyConfirmed?: boolean;
  /** Confidence threshold below which conflicts are ignored */
  confidenceThreshold?: number;
  /** Maximum supersession chain depth to allow */
  maxSupersessionDepth?: number;
}

/**
 * Detect conflicts between an incoming fact and existing genome knowledge.
 */
export async function detectFactConflicts(
  organisationId: string,
  incoming: {
    area_key: string;
    subject: string;
    predicate: string;
    value: string | null;
    value_type: GenomeFact['value_type'];
    unit: string | null;
    entity_id?: string | null;
  },
  options: ConflictDetectionOptions = {}
): Promise<DetectedConflict[]> {
  const {
    onlyConfirmed = false,
    confidenceThreshold = 0.3,
  } = options;

  const conflicts: DetectedConflict[] = [];

  // Find existing fact with same subject+predicate
  const existing = await findFact(organisationId, incoming.area_key, incoming.subject, incoming.predicate);

  if (!existing) {
    return conflicts; // No existing fact = no conflict
  }

  // Skip if existing is superseded
  if (existing.superseded_at) {
    return conflicts;
  }

  // Skip if incoming confidence is very low
  // (this would need to be passed in; for now we check existing)
  if (existing.confidence < confidenceThreshold) {
    return conflicts;
  }

  // If onlyConfirmed, skip candidate facts
  if (onlyConfirmed && existing.status === 'candidate') {
    return conflicts;
  }

  // VALUE CONTRADICTION: same subject+predicate, different value
  if (incoming.value !== null && existing.value !== null && incoming.value !== existing.value) {
    const severity = determineSeverity(existing, incoming);
    
    conflicts.push({
      type: 'value_contradiction',
      severity,
      existing,
      incoming: incoming as unknown as GenomeFact,
      description: `"${incoming.subject} ${incoming.predicate}" was "${existing.value}" but now "${incoming.value}"`,
      suggested_action: severity === 'high' ? 'flag_for_review' : 'supersede',
    });
  }

  // Check supersession chain depth
  const chainDepth = await getSupersessionChainDepth(existing.id);
  if (chainDepth >= (options.maxSupersessionDepth ?? 5)) {
    conflicts.push({
      type: 'temporal_inconsistency',
      severity: 'medium',
      existing,
      incoming: incoming as unknown as GenomeFact,
      description: `Supersession chain depth is ${chainDepth} — consider consolidating`,
      suggested_action: 'flag_for_review',
    });
  }

  return conflicts;
}

/**
 * Determine conflict severity based on fact types and confidence.
 */
function determineSeverity(existing: GenomeFact, incoming: any): 'low' | 'medium' | 'high' {
  // High confidence + confirmed = high severity
  if (existing.status === 'confirmed' && existing.confidence >= 0.8) {
    return 'high';
  }

  // Money/percentage facts are more significant
  if (existing.value_type === 'money' || existing.value_type === 'percentage') {
    return 'medium';
  }

  // Low confidence or candidate = low severity
  if (existing.status === 'candidate' || existing.confidence < 0.5) {
    return 'low';
  }

  return 'medium';
}

/**
 * Get the depth of a supersession chain.
 */
async function getSupersessionChainDepth(factId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = factId;

  while (currentId) {
    const sb = (await import('@/lib/supabase/server')).createServiceClient();
    const { data }: { data: { supersedes: string | null } | null } = await sb
      .from('genome_facts')
      .select('supersedes')
      .eq('id', currentId)
      .single();

    if (data?.supersedes) {
      depth++;
      currentId = data.supersedes;
    } else {
      break;
    }
  }

  return depth;
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-CONVERSATION CONTRADICTION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface CrossConversationConflict {
  fact_id: string;
  area_key: string;
  subject: string;
  predicate: string;
  values: Array<{
    value: string | null;
    source_id: string | null;
    source_type: string;
    confidence: number;
    status: string;
    observed_at: string;
  }>;
}

/**
 * Scan all facts in an area for contradictions (same subject+predicate, different values).
 * This finds contradictions that may have been missed during individual extractions.
 */
export async function detectCrossConversationConflicts(
  organisationId: string,
  areaKey?: string
): Promise<CrossConversationConflict[]> {
  const facts = areaKey
    ? await getFactsByArea(organisationId, areaKey)
    : await getAllFacts(organisationId);

  // Group by subject+predicate
  const groups = new Map<string, GenomeFact[]>();

  for (const fact of facts) {
    if (fact.superseded_at) continue; // Skip superseded
    const key = `${fact.area_key}:${fact.subject}:${fact.predicate}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(fact);
  }

  const conflicts: CrossConversationConflict[] = [];

  for (const [key, group] of groups) {
    if (group.length < 2) continue;

    // Get unique values
    const uniqueValues = new Map<string, GenomeFact>();
    for (const fact of group) {
      if (fact.value !== null) {
        uniqueValues.set(fact.value, fact);
      }
    }

    if (uniqueValues.size > 1) {
      // Contradiction detected
      conflicts.push({
        fact_id: group[0].id,
        area_key: group[0].area_key,
        subject: group[0].subject,
        predicate: group[0].predicate,
        values: Array.from(uniqueValues.values()).map((f) => ({
          value: f.value,
          source_id: f.source_id,
          source_type: f.source_type,
          confidence: f.confidence,
          status: f.status,
          observed_at: f.observed_at,
        })),
      });
    }
  }

  return conflicts;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERSESSION CHAIN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface SupersessionChain {
  root_id: string;
  chain: GenomeFact[];
  depth: number;
  latest_value: string | null;
  is_linear: boolean;
}

/**
 * Get the full supersession chain for a fact.
 */
export async function getSupersessionChain(factId: string): Promise<SupersessionChain | null> {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const sb = createServiceClient();

  // Get the root (oldest) fact
  let currentId = factId;
  const chain: GenomeFact[] = [];

  // Walk backward to find root
  while (currentId) {
    const { data } = await sb
      .from('genome_facts')
      .select('*')
      .eq('id', currentId)
      .single();

    if (!data) break;
    chain.unshift(data); // prepend

    if (data.supersedes) {
      currentId = data.supersedes;
    } else {
      break;
    }
  }

  if (chain.length === 0) return null;

  // Walk forward to get full chain
  const root = chain[0];
  let nextId = root.id;
  const fullChain: GenomeFact[] = [root];

  while (nextId) {
    const { data } = await sb
      .from('genome_facts')
      .select('*')
      .eq('supersedes', nextId)
      .single();

    if (data) {
      fullChain.push(data);
      nextId = data.id;
    } else {
      break;
    }
  }

  return {
    root_id: root.id,
    chain: fullChain,
    depth: fullChain.length - 1,
    latest_value: fullChain[fullChain.length - 1].value,
    is_linear: true, // In this model, chains are always linear
  };
}

/**
 * Consolidate a supersession chain by creating a new confirmed fact
 * and marking the whole chain as superseded.
 */
export async function consolidateSupersessionChain(
  factId: string,
  consolidatedValue: string,
  userId: string,
  sourceType: string = 'consolidation'
): Promise<GenomeFact> {
  const chain = await getSupersessionChain(factId);
  if (!chain || chain.chain.length <= 1) {
    throw new Error('No chain to consolidate');
  }

  // Mark all facts in chain as superseded
  for (const fact of chain.chain) {
    await (await import('@/lib/supabase/server')).createServiceClient()
      .from('genome_facts')
      .update({ superseded_at: new Date().toISOString(), status: 'superseded' })
      .eq('id', fact.id);
  }

  // Create new consolidated fact
  const latest = chain.chain[chain.chain.length - 1];
  return supersedeFact(
    latest.id,
    {
      value: consolidatedValue,
      value_type: latest.value_type,
      unit: latest.unit ?? undefined,
      confidence: Math.max(...chain.chain.map((f) => f.confidence)),
      entity_id: latest.entity_id ?? undefined,
      source_type: sourceType as any,
      source_id: userId,
    },
    'consolidation',
    userId
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT RESOLUTION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ConflictResolution {
  conflict_id: string;
  resolution: 'supersede' | 'confirm_existing' | 'confirm_new' | 'reject_new' | 'defer';
  resolved_by: string;
  resolved_at: string;
  note?: string;
}

/**
 * Resolve a value contradiction by superseding with the new value.
 */
export async function resolveConflictBySuperseding(
  userId: string,
  existingFactId: string,
  newValue: string,
  newConfidence: number,
  newSourceType: string,
  newSourceId: string
): Promise<GenomeFact> {
  return supersedeFact(
    existingFactId,
    {
      value: newValue,
      confidence: newConfidence,
      source_type: newSourceType as any,
      source_id: newSourceId,
    },
    'conflict_resolution',
    newSourceId
  );
}

/**
 * Resolve a conflict by confirming the existing fact (rejecting the new value).
 */
export async function resolveConflictByConfirmingExisting(
  organisationId: string,
  existingFactId: string,
  userId: string
): Promise<GenomeFact> {
  return confirmFact(existingFactId, organisationId, userId);
}

/**
 * Mark a fact as contradicted without superseding.
 */
export async function markFactContradicted(
  factId: string,
  organisationId: string,
  userId: string,
  reason: string
): Promise<GenomeFact> {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const sb = createServiceClient();

  const { data, error } = await sb
    .from('genome_facts')
    .update({
      status: 'contradicted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', factId)
    .select()
    .single();

  if (error) throw new Error(`Failed to mark fact contradicted: ${error.message}`);

  // Record event
  await sb.from('genome_events').insert({
    organisation_id: organisationId,
    user_id: userId,
    event_type: 'fact_contradicted',
    fact_id: factId,
    new_value: { status: 'contradicted', reason },
    trigger_source: 'conflict_resolution',
    trigger_id: userId,
  });

  return data;
}

/**
 * Get all unresolved conflicts for a user (for review UI).
 */
export async function getUnresolvedConflicts(organisationId: string): Promise<CrossConversationConflict[]> {
  return detectCrossConversationConflicts(organisationId);
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY CONFLICTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect duplicate entities (same type, similar name).
 */
export async function detectEntityDuplicates(
  organisationId: string,
  entityType: string,
  name: string
): Promise<GenomeEntity[]> {
  const entities = await getAllEntities(organisationId);
  
  return entities.filter((e) => {
    if (e.entity_type !== entityType) return false;
    if (e.superseded_at) return false;
    if (e.name.toLowerCase() === name.toLowerCase()) return true;
    // Fuzzy match: one contains the other
    if (e.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(e.name.toLowerCase())) {
      return true;
    }
    return false;
  });
}