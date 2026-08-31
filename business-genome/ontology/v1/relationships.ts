// business-genome/ontology/v1/relationships.ts
//
// THE CANONICAL RELATIONSHIP PREDICATES — how entities connect to each other.
//
// Relationships are the connective tissue of the Business Genome. They link entities
// together to form the business model: "ABC Plumbing BUYS emergency maintenance services"
// "Sarah MANAGES the quoting process" "Xero IS the accounting system"
//
// Predicates are business-agnostic. A plumbing company's "buys" is the same predicate
// as a manufacturer's "buys" — the entities differ, the relationship type is the same.

/**
 * Canonical relationship predicates for the Business Genome.
 * Each predicate defines the types of entities it can connect.
 */
export const RELATIONSHIP_PREDICATES = [
  // ─── Customer & Sales ───────────────────────────────────────────────────
  {
    predicate: 'buys',
    name: 'Buys',
    description: 'Customer purchases a product or service.',
    subjectTypes: ['organisation', 'person'],
    objectTypes: ['service', 'product'],
    areaKey: 'customers',
  },
  {
    predicate: 'refers',
    name: 'Refers',
    description: 'One entity refers customers or work to another.',
    subjectTypes: ['organisation', 'person'],
    objectTypes: ['organisation', 'person'],
    areaKey: 'work_sources',
  },
  {
    predicate: 'supplies_to',
    name: 'Supplies to',
    description: 'One entity supplies goods or services to another.',
    subjectTypes: ['organisation', 'person'],
    objectTypes: ['organisation', 'person'],
    areaKey: 'work_sources',
  },

  // ─── People & Roles ─────────────────────────────────────────────────────
  {
    predicate: 'employs',
    name: 'Employs',
    description: 'An organisation employs a person.',
    subjectTypes: ['organisation'],
    objectTypes: ['person'],
    areaKey: 'people',
  },
  {
    predicate: 'contracted_by',
    name: 'Contracted by',
    description: 'A person or organisation is contracted by another.',
    subjectTypes: ['person', 'organisation'],
    objectTypes: ['organisation'],
    areaKey: 'people',
  },
  {
    predicate: 'manages',
    name: 'Manages',
    description: 'A person manages a process, system, or relationship.',
    subjectTypes: ['person', 'role'],
    objectTypes: ['process', 'system', 'organisation', 'service'],
    areaKey: 'people',
  },
  {
    predicate: 'performs',
    name: 'Performs',
    description: 'A person or role performs a process or service.',
    subjectTypes: ['person', 'role'],
    objectTypes: ['process', 'service'],
    areaKey: 'delivery',
  },

  // ─── Systems & Tools ────────────────────────────────────────────────────
  {
    predicate: 'uses',
    name: 'Uses',
    description: 'An entity uses a system, tool, or resource.',
    subjectTypes: ['person', 'organisation', 'process'],
    objectTypes: ['system', 'equipment', 'document'],
    areaKey: 'systems_records',
  },
  {
    predicate: 'is_system_for',
    name: 'Is system for',
    description: 'A system serves a particular business function.',
    subjectTypes: ['system'],
    objectTypes: ['process', 'service'],
    areaKey: 'systems_records',
  },
  {
    predicate: 'integrates_with',
    name: 'Integrates with',
    description: 'Two systems exchange data or are connected.',
    subjectTypes: ['system'],
    objectTypes: ['system'],
    areaKey: 'systems_records',
  },

  // ─── Financial ──────────────────────────────────────────────────────────
  {
    predicate: 'costs',
    name: 'Costs',
    description: 'An activity or resource has a specific cost.',
    subjectTypes: ['process', 'service', 'asset', 'person'],
    objectTypes: [],  // cost is a value, not an entity
    areaKey: 'money',
    hasInlineValue: true,
  },
  {
    predicate: 'charges',
    name: 'Charges',
    description: 'The business charges a specific amount for something.',
    subjectTypes: ['organisation', 'service'],
    objectTypes: [],
    areaKey: 'pricing',
    hasInlineValue: true,
  },
  {
    predicate: 'supplies',
    name: 'Supplies',
    description: 'A supplier provides goods or services to the business.',
    subjectTypes: ['organisation'],
    objectTypes: ['service', 'asset'],
    areaKey: 'money',
  },

  // ─── Assets & Ownership ─────────────────────────────────────────────────
  {
    predicate: 'owns',
    name: 'Owns',
    description: 'An entity owns an asset or resource.',
    subjectTypes: ['organisation', 'person'],
    objectTypes: ['asset', 'vehicle', 'equipment', 'property', 'financial_account'],
    areaKey: 'assets',
  },
  {
    predicate: 'leases',
    name: 'Leases',
    description: 'An entity leases an asset from another.',
    subjectTypes: ['organisation', 'person'],
    objectTypes: ['asset', 'vehicle', 'property'],
    areaKey: 'assets',
  },
  {
    predicate: 'financed_by',
    name: 'Financed by',
    description: 'An asset is financed by a financial arrangement.',
    subjectTypes: ['asset', 'vehicle', 'equipment'],
    objectTypes: ['financial_account', 'organisation'],
    areaKey: 'assets',
  },

  // ─── Compliance ─────────────────────────────────────────────────────────
  {
    predicate: 'required_for',
    name: 'Required for',
    description: 'A licence or insurance is required for an activity.',
    subjectTypes: ['licence', 'insurance'],
    objectTypes: ['process', 'service', 'organisation'],
    areaKey: 'compliance_calendar',
  },
  {
    predicate: 'expires',
    name: 'Expires',
    description: 'A compliance item has a renewal deadline.',
    subjectTypes: ['licence', 'insurance', 'obligation'],
    objectTypes: [],
    areaKey: 'compliance_calendar',
    hasInlineValue: true,
  },

  // ─── Process & Delivery ─────────────────────────────────────────────────
  {
    predicate: 'precedes',
    name: 'Precedes',
    description: 'One process or step comes before another.',
    subjectTypes: ['process', 'service'],
    objectTypes: ['process', 'service'],
    areaKey: 'delivery',
  },
  {
    predicate: 'depends_on',
    name: 'Depends on',
    description: 'One entity depends on another for completion.',
    subjectTypes: ['process', 'service', 'delivery'],
    objectTypes: ['process', 'service', 'system', 'person', 'asset'],
    areaKey: 'delivery',
  },
] as const;

export type RelationshipPredicate = (typeof RELATIONSHIP_PREDICATES)[number]['predicate'];

/**
 * Get a relationship predicate definition by its predicate key.
 */
export function getPredicate(predicate: string): typeof RELATIONSHIP_PREDICATES[number] | undefined {
  return RELATIONSHIP_PREDICATES.find((p) => p.predicate === predicate);
}

/**
 * Get all predicate keys.
 */
export function getPredicateKeys(): string[] {
  return RELATIONSHIP_PREDICATES.map((p) => p.predicate);
}
