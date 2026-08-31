// business-genome/ontology/v1/index.ts
//
// THE CANONICAL ONTOLOGY — the single entry point for the Business Genome ontology.
//
// Import from this file to access all ontology definitions.
// This file IS the ontology — it is versioned, immutable within a version,
// and shared across every business on the platform.
//
// RULE: Business-specific categories become entities/facts underneath these areas.
// They never become new top-level areas. The ontology stays stable.

export {
  // ─── Areas ──────────────────────────────────────────────────────────────
  ONTOLOGY_AREAS,
  COVERAGE_BANDS,
  KNOWLEDGE_STATUSES,
  SOURCE_TYPES,
  GENOME_EVENT_TYPES,
  LEGACY_KEY_MAP,
  CANONICAL_TO_LEGACY,
  getArea,
  getAreaKeys,
  canonicalKey,
  legacyKey,
  isValidAreaKey,
} from './areas';

export type {
  OntologyArea,
  CoverageBand,
  KnowledgeStatus,
  SourceType,
  GenomeEventType,
} from './areas';

// ─── Entity Types ───────────────────────────────────────────────────────────
export {
  ENTITY_TYPES,
  getEntityType,
  getEntityTypeKeys,
} from './entity-types';

export type { EntityType } from './entity-types';

// ─── Relationships ──────────────────────────────────────────────────────────
export {
  RELATIONSHIP_PREDICATES,
  getPredicate,
  getPredicateKeys,
} from './relationships';

export type { RelationshipPredicate } from './relationships';

// ─── Ontology Metadata ──────────────────────────────────────────────────────

/** The ontology version — increment when the ontology changes. */
export const ONTOLOGY_VERSION = 'v1' as const;

/** Human-readable version description. */
export const ONTOLOGY_DESCRIPTION = 'Universal Business Genome Ontology v1 — the canonical 9-area classification layer for business knowledge.' as const;

/**
 * The ontology is immutable within a version.
 * When changes are needed, create a new version directory (v2/).
 * Existing businesses remain interpretable through v1.
 */
