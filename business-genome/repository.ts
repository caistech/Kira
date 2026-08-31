// business-genome/repository.ts
//
// THE GENOME REPOSITORY — CRUD operations for the Business Genome knowledge model.
//
// This is the ONLY layer that should touch the genome_* tables directly.
// All other code (extraction, query API, UI projection) goes through this repository.
//
// RULES:
//   1. Every write creates a genome_event (immutable audit trail)
//   2. Updates never overwrite — they supersede (old value becomes history)
//   3. Identity is server-baked from the organisation_id — no cross-organisation leakage
//   4. user_id = provenance (who performed / created / confirmed), NOT ownership

import { createServiceClient } from '@/lib/supabase/server';
import type {
  GenomeEntity,
  GenomeFact,
  GenomeRelationship,
  GenomeEvent,
  GenomeEntityInput,
  GenomeFactInput,
  GenomeRelationshipInput,
  AreaCoverage,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function supabase() {
  return createServiceClient();
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITIES
// ─────────────────────────────────────────────────────────────────────────────

export async function createEntity(input: GenomeEntityInput): Promise<GenomeEntity> {
  const sb = supabase();
  const { data, error } = await sb
    .from('genome_entities')
    .insert({
      organisation_id: input.organisation_id,
      user_id: input.user_id,
      area_key: input.area_key,
      entity_type: input.entity_type,
      name: input.name,
      status: 'candidate',
      confidence: input.confidence ?? 0.5,
      source_type: input.source_type,
      source_id: input.source_id ?? null,
      source_reference: input.source_reference ?? null,
      observed_at: input.observed_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create entity: ${error.message}`);

  await recordEvent({
    organisation_id: input.organisation_id,
    user_id: input.user_id,
    event_type: 'entity_created',
    entity_id: data.id,
    new_value: data,
    trigger_source: input.source_type,
    trigger_id: input.source_id ?? null,
  });

  return data;
}

export async function findEntity(
  organisationId: string,
  entityType: string,
  name: string
): Promise<GenomeEntity | null> {
  const sb = supabase();
  const { data } = await sb
    .from('genome_entities')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('entity_type', entityType)
    .eq('name', name)
    .is('superseded_at', null)
    .single();

  return data;
}

export async function getEntitiesByArea(
  organisationId: string,
  areaKey: string
): Promise<GenomeEntity[]> {
  const sb = supabase();
  const { data } = await sb
    .from('genome_entities')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('area_key', areaKey)
    .is('superseded_at', null)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getAllEntities(organisationId: string): Promise<GenomeEntity[]> {
  const sb = supabase();
  const { data } = await sb
    .from('genome_entities')
    .select('*')
    .eq('organisation_id', organisationId)
    .is('superseded_at', null)
    .order('area_key')
    .order('entity_type')
    .order('name');

  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTS
// ─────────────────────────────────────────────────────────────────────────────

export async function createFact(input: GenomeFactInput): Promise<GenomeFact> {
  const sb = supabase();
  const { data, error } = await sb
    .from('genome_facts')
    .insert({
      organisation_id: input.organisation_id,
      user_id: input.user_id,
      entity_id: input.entity_id ?? null,
      area_key: input.area_key,
      subject: input.subject,
      predicate: input.predicate,
      value: input.value ?? null,
      value_type: input.value_type ?? 'text',
      unit: input.unit ?? null,
      status: 'candidate',
      confidence: input.confidence ?? 0.5,
      source_type: input.source_type,
      source_id: input.source_id ?? null,
      source_reference: input.source_reference ?? null,
      observed_at: input.observed_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create fact: ${error.message}`);

  await recordEvent({
    organisation_id: input.organisation_id,
    user_id: input.user_id,
    event_type: 'fact_created',
    fact_id: data.id,
    new_value: data,
    trigger_source: input.source_type,
    trigger_id: input.source_id ?? null,
  });

  return data;
}

export async function findFact(
  organisationId: string,
  areaKey: string,
  subject: string,
  predicate: string
): Promise<GenomeFact | null> {
  const sb = supabase();
  const { data } = await sb
    .from('genome_facts')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('area_key', areaKey)
    .eq('subject', subject)
    .eq('predicate', predicate)
    .is('superseded_at', null)
    .single();

  return data;
}

export async function getFactsByArea(
  organisationId: string,
  areaKey: string
): Promise<GenomeFact[]> {
  const sb = supabase();
  const { data } = await sb
    .from('genome_facts')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('area_key', areaKey)
    .is('superseded_at', null)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getFactsByEntity(
  organisationId: string,
  entityId: string
): Promise<GenomeFact[]> {
  const sb = supabase();
  const { data } = await sb
    .from('genome_facts')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('entity_id', entityId)
    .is('superseded_at', null)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getAllFacts(organisationId: string): Promise<GenomeFact[]> {
  const sb = supabase();
  const { data } = await sb
    .from('genome_facts')
    .select('*')
    .eq('organisation_id', organisationId)
    .is('superseded_at', null)
    .order('area_key')
    .order('subject');

  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONSHIPS
// ─────────────────────────────────────────────────────────────────────────────

export async function createRelationship(
  input: GenomeRelationshipInput
): Promise<GenomeRelationship> {
  const sb = supabase();
  const { data, error } = await sb
    .from('genome_relationships')
    .insert({
      organisation_id: input.organisation_id,
      user_id: input.user_id,
      subject_entity_id: input.subject_entity_id,
      predicate: input.predicate,
      object_entity_id: input.object_entity_id ?? null,
      object_value: input.object_value ?? null,
      area_key: input.area_key,
      status: 'candidate',
      confidence: input.confidence ?? 0.5,
      source_type: input.source_type,
      source_id: input.source_id ?? null,
      source_reference: input.source_reference ?? null,
      observed_at: input.observed_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create relationship: ${error.message}`);

  await recordEvent({
    organisation_id: input.organisation_id,
    user_id: input.user_id,
    event_type: 'relationship_created',
    relationship_id: data.id,
    new_value: data,
    trigger_source: input.source_type,
    trigger_id: input.source_id ?? null,
  });

  return data;
}

export async function getAllRelationships(
  organisationId: string
): Promise<GenomeRelationship[]> {
  const sb = supabase();
  const { data } = await sb
    .from('genome_relationships')
    .select('*')
    .eq('organisation_id', organisationId)
    .is('superseded_at', null)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getRelationshipsByEntity(
  organisationId: string,
  entityId: string
): Promise<GenomeRelationship[]> {
  const sb = supabase();
  const { data } = await sb
    .from('genome_relationships')
    .select('*')
    .eq('organisation_id', organisationId)
    .or(`subject_entity_id.eq.${entityId},object_entity_id.eq.${entityId}`)
    .is('superseded_at', null)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getRelationshipsByArea(
  organisationId: string,
  areaKey: string
): Promise<GenomeRelationship[]> {
  const sb = supabase();
  const { data } = await sb
    .from('genome_relationships')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('area_key', areaKey)
    .is('superseded_at', null)
    .order('created_at', { ascending: false });

  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERSESSION — the critical pattern: don't overwrite, supersede
// ─────────────────────────────────────────────────────────────────────────────

export async function supersedeFact(
  factId: string,
  newValue: Partial<GenomeFactInput>,
  triggerSource: string,
  triggerId?: string
): Promise<GenomeFact> {
  const sb = supabase();

  // Get the current fact
  const { data: current } = await sb
    .from('genome_facts')
    .select('*')
    .eq('id', factId)
    .single();

  if (!current) throw new Error(`Fact not found: ${factId}`);

  // Mark current as superseded
  const { error: updateError } = await sb
    .from('genome_facts')
    .update({ superseded_at: new Date().toISOString(), status: 'superseded' })
    .eq('id', factId);

  if (updateError) throw new Error(`Failed to supersede fact: ${updateError.message}`);

  // Create the new fact — organisation carries forward from current record
  const newFact = await createFact({
    organisation_id: current.organisation_id,
    user_id: current.user_id,
    entity_id: newValue.entity_id ?? current.entity_id,
    area_key: newValue.area_key ?? current.area_key,
    subject: newValue.subject ?? current.subject,
    predicate: newValue.predicate ?? current.predicate,
    value: newValue.value ?? current.value,
    value_type: newValue.value_type ?? current.value_type,
    unit: newValue.unit ?? current.unit,
    confidence: newValue.confidence ?? current.confidence,
    source_type: newValue.source_type ?? current.source_type,
    source_id: newValue.source_id ?? current.source_id,
    source_reference: newValue.source_reference ?? current.source_reference,
    observed_at: newValue.observed_at ?? new Date().toISOString(),
  });

  // Update the new fact's supersedes field
  await sb
    .from('genome_facts')
    .update({ supersedes: factId })
    .eq('id', newFact.id);

  // Record supersession event
  await recordEvent({
    organisation_id: current.organisation_id,
    user_id: current.user_id,
    event_type: 'fact_superseded',
    fact_id: factId,
    previous_value: current,
    new_value: newFact,
    trigger_source: triggerSource,
    trigger_id: triggerId ?? null,
  });

  return { ...newFact, supersedes: factId };
}

export async function supersedeEntity(
  entityId: string,
  newName: string,
  newConfidence: number,
  triggerSource: string,
  triggerId?: string
): Promise<GenomeEntity> {
  const sb = supabase();

  const { data: current } = await sb
    .from('genome_entities')
    .select('*')
    .eq('id', entityId)
    .single();

  if (!current) throw new Error(`Entity not found: ${entityId}`);

  // Mark current as superseded
  await sb
    .from('genome_entities')
    .update({ superseded_at: new Date().toISOString(), status: 'superseded' })
    .eq('id', entityId);

  // Create new entity — organisation carries forward from current record
  const newEntity = await createEntity({
    organisation_id: current.organisation_id,
    user_id: current.user_id,
    area_key: current.area_key,
    entity_type: current.entity_type,
    name: newName,
    confidence: newConfidence,
    source_type: current.source_type,
    source_id: current.source_id,
    source_reference: current.source_reference,
    observed_at: new Date().toISOString(),
  });

  // Update supersedes field
  await sb
    .from('genome_entities')
    .update({ supersedes: entityId })
    .eq('id', newEntity.id);

  await recordEvent({
    organisation_id: current.organisation_id,
    user_id: current.user_id,
    event_type: 'entity_superseded',
    entity_id: entityId,
    previous_value: current,
    new_value: newEntity,
    trigger_source: triggerSource,
    trigger_id: triggerId ?? null,
  });

  return { ...newEntity, supersedes: entityId };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMATION — owner confirms a fact
// ─────────────────────────────────────────────────────────────────────────────

export async function confirmFact(
  factId: string,
  organisationId: string,
  userId: string
): Promise<GenomeFact> {
  const sb = supabase();

  const { data, error } = await sb
    .from('genome_facts')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', factId)
    .eq('organisation_id', organisationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to confirm fact: ${error.message}`);

  await recordEvent({
    organisation_id: organisationId,
    user_id: userId,
    event_type: 'fact_confirmed',
    fact_id: factId,
    new_value: data,
    trigger_source: 'confirmation',
    trigger_id: userId,
  });

  return data;
}

export async function confirmEntity(
  entityId: string,
  organisationId: string,
  userId: string
): Promise<GenomeEntity> {
  const sb = supabase();

  const { data, error } = await sb
    .from('genome_entities')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', entityId)
    .eq('organisation_id', organisationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to confirm entity: ${error.message}`);

  await recordEvent({
    organisation_id: organisationId,
    user_id: userId,
    event_type: 'entity_confirmed',
    entity_id: entityId,
    new_value: data,
    trigger_source: 'confirmation',
    trigger_id: userId,
  });

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — immutable audit trail
// ─────────────────────────────────────────────────────────────────────────────

async function recordEvent(event: {
  organisation_id: string;
  user_id: string;
  event_type: string;
  entity_id?: string;
  fact_id?: string;
  relationship_id?: string;
  previous_value?: Record<string, unknown> | object;
  new_value?: Record<string, unknown> | object;
  trigger_source?: string;
  trigger_id?: string | null;
}): Promise<GenomeEvent> {
  const sb = supabase();
  const { data, error } = await sb
    .from('genome_events')
    .insert({
      organisation_id: event.organisation_id,
      user_id: event.user_id,
      event_type: event.event_type,
      entity_id: event.entity_id ?? null,
      fact_id: event.fact_id ?? null,
      relationship_id: event.relationship_id ?? null,
      previous_value: (event.previous_value as Record<string, unknown>) ?? null,
      new_value: (event.new_value as Record<string, unknown>) ?? null,
      trigger_source: event.trigger_source ?? null,
      trigger_id: event.trigger_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to record event: ${error.message}`);
  return data;
}

export async function getEvents(
  organisationId: string,
  options?: {
    entity_id?: string;
    fact_id?: string;
    event_type?: string;
    limit?: number;
  }
): Promise<GenomeEvent[]> {
  const sb = supabase();
  let query = sb
    .from('genome_events')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false });

  if (options?.entity_id) query = query.eq('entity_id', options.entity_id);
  if (options?.fact_id) query = query.eq('fact_id', options.fact_id);
  if (options?.event_type) query = query.eq('event_type', options.event_type);
  if (options?.limit) query = query.limit(options.limit);

  const { data } = await query;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE — area-level quality metrics
// ─────────────────────────────────────────────────────────────────────────────

export async function getAreaCoverage(organisationId: string): Promise<AreaCoverage[]> {
  const sb = supabase();

  // Get all active entities grouped by area
  const { data: entities } = await sb
    .from('genome_entities')
    .select('area_key, status, created_at')
    .eq('organisation_id', organisationId)
    .is('superseded_at', null);

  // Get all active facts grouped by area
  const { data: facts } = await sb
    .from('genome_facts')
    .select('area_key, status, created_at')
    .eq('organisation_id', organisationId)
    .is('superseded_at', null);

  // Get all active relationships grouped by area
  const { data: relationships } = await sb
    .from('genome_relationships')
    .select('area_key, status, created_at')
    .eq('organisation_id', organisationId)
    .is('superseded_at', null);

  // Import ontology for area names
  const { ONTOLOGY_AREAS } = await import('./ontology/v1');

  return ONTOLOGY_AREAS.map((area) => {
    const areaEntities = entities?.filter((e) => e.area_key === area.key) ?? [];
    const areaFacts = facts?.filter((f) => f.area_key === area.key) ?? [];
    const areaRels = relationships?.filter((r) => r.area_key === area.key) ?? [];

    const totalItems = areaEntities.length + areaFacts.length + areaRels.length;
    const confirmedCount =
      areaEntities.filter((e) => e.status === 'confirmed').length +
      areaFacts.filter((f) => f.status === 'confirmed').length +
      areaRels.filter((r) => r.status === 'confirmed').length;
    const candidateCount =
      areaEntities.filter((e) => e.status === 'candidate').length +
      areaFacts.filter((f) => f.status === 'candidate').length +
      areaRels.filter((r) => r.status === 'candidate').length;
    const conflictCount =
      areaEntities.filter((e) => e.status === 'contradicted').length +
      areaFacts.filter((f) => f.status === 'contradicted').length +
      areaRels.filter((r) => r.status === 'contradicted').length;

    // Determine coverage band
    let band: AreaCoverage['band'] = 'not_started';
    if (totalItems >= 10 && confirmedCount >= 5) band = 'well_covered';
    else if (totalItems >= 6 && confirmedCount >= 2) band = 'building_up';
    else if (totalItems >= 2) band = 'just_started';

    // Find most recent activity
    const allDates = [
      ...areaEntities.map((e) => e.created_at),
      ...areaFacts.map((f) => f.created_at),
      ...areaRels.map((r) => r.created_at),
    ].sort().reverse();

    return {
      area_key: area.key,
      area_name: area.name,
      band,
      entity_count: areaEntities.length,
      fact_count: areaFacts.length,
      relationship_count: areaRels.length,
      confirmed_count: confirmedCount,
      candidate_count: candidateCount,
      conflict_count: conflictCount,
      last_updated: allDates[0] ?? null,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK OPERATIONS — for extraction pipeline
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertEntities(
  organisationId: string,
  entities: GenomeEntityInput[]
): Promise<{ created: GenomeEntity[]; existing: GenomeEntity[] }> {
  const created: GenomeEntity[] = [];
  const existing: GenomeEntity[] = [];

  for (const input of entities) {
    const found = await findEntity(organisationId, input.entity_type, input.name);
    if (found) {
      existing.push(found);
    } else {
      const newEntity = await createEntity({ ...input, organisation_id: organisationId });
      created.push(newEntity);
    }
  }

  return { created, existing };
}

export async function upsertFacts(
  organisationId: string,
  facts: GenomeFactInput[]
): Promise<{ created: GenomeFact[]; existing: GenomeFact[]; superseded: GenomeFact[] }> {
  const created: GenomeFact[] = [];
  const existing: GenomeFact[] = [];
  const superseded: GenomeFact[] = [];

  for (const input of facts) {
    const found = await findFact(organisationId, input.area_key, input.subject, input.predicate);
    if (found) {
      // Check if value changed
      if (found.value !== input.value && input.value !== undefined) {
        const newFact = await supersedeFact(
          found.id,
          input,
          'extraction',
          input.source_id
        );
        superseded.push(newFact);
      } else {
        existing.push(found);
      }
    } else {
      const newFact = await createFact({ ...input, organisation_id: organisationId });
      created.push(newFact);
    }
  }

  return { created, existing, superseded };
}
