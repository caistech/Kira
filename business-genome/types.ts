// business-genome/types.ts
//
// THE CANONICAL TYPES — TypeScript interfaces for the Business Genome knowledge model.
//
// These types mirror the database schema exactly. Every field is typed to prevent
// runtime errors. The types are the single source of truth for the shape of genome data.

import type { KnowledgeStatus, SourceType, CoverageBand, GenomeEventType } from './ontology/v1';

// ─────────────────────────────────────────────────────────────────────────────
// GENOME ENTITY
// ─────────────────────────────────────────────────────────────────────────────

export interface GenomeEntity {
  id: string;
  organisation_id: string;
  user_id: string;
  area_key: string;
  entity_type: string;
  name: string;
  status: KnowledgeStatus;
  confidence: number;
  source_type: SourceType;
  source_id: string | null;
  source_reference: string | null;
  observed_at: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  superseded_at: string | null;
  supersedes: string | null;
  visibility: 'org' | 'owner';
}

/**
 * A genome entity as it appears in the knowledge graph — with optional joined data.
 */
export interface GenomeEntityWithRelations extends GenomeEntity {
  /** Facts about this entity */
  facts?: GenomeFact[];
  /** Relationships where this entity is the subject */
  outgoing_relationships?: GenomeRelationship[];
  /** Relationships where this entity is the object */
  incoming_relationships?: GenomeRelationship[];
}

// ─────────────────────────────────────────────────────────────────────────────
// GENOME FACT
// ─────────────────────────────────────────────────────────────────────────────

export interface GenomeFact {
  id: string;
  organisation_id: string;
  user_id: string;
  entity_id: string | null;
  area_key: string;
  subject: string;
  predicate: string;
  value: string | null;
  value_type: 'text' | 'number' | 'boolean' | 'date' | 'money' | 'percentage';
  unit: string | null;
  status: KnowledgeStatus;
  confidence: number;
  source_type: SourceType;
  source_id: string | null;
  source_reference: string | null;
  observed_at: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  superseded_at: string | null;
  supersedes: string | null;
  visibility: 'org' | 'owner';
}

// ─────────────────────────────────────────────────────────────────────────────
// GENOME RELATIONSHIP
// ─────────────────────────────────────────────────────────────────────────────

export interface GenomeRelationship {
  id: string;
  organisation_id: string;
  user_id: string;
  subject_entity_id: string;
  predicate: string;
  object_entity_id: string | null;
  object_value: string | null;
  area_key: string;
  status: KnowledgeStatus;
  confidence: number;
  source_type: SourceType;
  source_id: string | null;
  source_reference: string | null;
  observed_at: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  superseded_at: string | null;
  supersedes: string | null;
  visibility: 'org' | 'owner';
}

// ─────────────────────────────────────────────────────────────────────────────
// GENOME EVENT (immutable audit trail)
// ─────────────────────────────────────────────────────────────────────────────

export interface GenomeEvent {
  id: string;
  organisation_id: string;
  user_id: string;
  event_type: GenomeEventType;
  entity_id: string | null;
  fact_id: string | null;
  relationship_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  trigger_source: string | null;
  trigger_id: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPES — for creating new genome records
// ─────────────────────────────────────────────────────────────────────────────

export interface GenomeEntityInput {
  organisation_id: string;
  user_id: string;
  area_key: string;
  entity_type: string;
  name: string;
  confidence?: number;
  source_type: SourceType;
  source_id?: string;
  source_reference?: string;
  observed_at?: string;
  visibility?: 'org' | 'owner';
}

export interface GenomeFactInput {
  organisation_id: string;
  user_id: string;
  entity_id?: string;
  area_key: string;
  subject: string;
  predicate: string;
  value?: string;
  value_type?: GenomeFact['value_type'];
  unit?: string;
  confidence?: number;
  source_type: SourceType;
  source_id?: string;
  source_reference?: string;
  observed_at?: string;
  visibility?: 'org' | 'owner';
}

export interface GenomeRelationshipInput {
  organisation_id: string;
  user_id: string;
  subject_entity_id: string;
  predicate: string;
  object_entity_id?: string;
  object_value?: string;
  area_key: string;
  confidence?: number;
  source_type: SourceType;
  source_id?: string;
  source_reference?: string;
  observed_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA COVERAGE — quality metrics per area
// ─────────────────────────────────────────────────────────────────────────────

export interface AreaCoverage {
  area_key: string;
  area_name: string;
  band: CoverageBand;
  entity_count: number;
  fact_count: number;
  relationship_count: number;
  confirmed_count: number;
  candidate_count: number;
  conflict_count: number;
  last_updated: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENOME PROJECTION — the business-oriented view
// ─────────────────────────────────────────────────────────────────────────────

export interface BusinessGenome {
  organisation_id: string;
  user_id: string;
  areas: AreaCoverage[];
  entity_count: number;
  fact_count: number;
  relationship_count: number;
  event_count: number;
  last_updated: string | null;
}
