// business-genome/ontology/v1/entity-types.ts
//
// THE CANONICAL ENTITY TYPES — what kinds of things exist in a business.
//
// These are business-agnostic. A plumbing company's "Sarah" is a person entity.
// A manufacturer's "CNC machine" is an asset entity. A law firm's "trust account"
// is a system entity. The entity types are the same; the instances differ.
//
// Entity types are NOT industry-specific. If a business needs a custom entity type,
// it can be added to the ontology as an optional concept under the relevant area.

/**
 * Canonical entity types for the Business Genome.
 * Each type maps to one or more ontology areas where it typically appears.
 */
export const ENTITY_TYPES = [
  // ─── People & Organisations ─────────────────────────────────────────────
  {
    type: 'person',
    name: 'Person',
    description: 'An individual who works in or interacts with the business.',
    typicalAreas: ['people', 'customers', 'work_sources'],
  },
  {
    type: 'organisation',
    name: 'Organisation',
    description: 'A business entity, customer, supplier, or partner.',
    typicalAreas: ['customers', 'work_sources', 'money'],
  },
  {
    type: 'role',
    name: 'Role',
    description: 'A function or position within the business (e.g. estimator, project manager).',
    typicalAreas: ['people', 'delivery'],
  },

  // ─── Systems & Tools ────────────────────────────────────────────────────
  {
    type: 'system',
    name: 'System',
    description: 'Software, platform, or digital tool used in the business.',
    typicalAreas: ['systems_records', 'delivery'],
  },
  {
    type: 'document',
    name: 'Document',
    description: 'A key document, form, template, or record.',
    typicalAreas: ['systems_records', 'compliance_calendar'],
  },

  // ─── Assets & Resources ─────────────────────────────────────────────────
  {
    type: 'asset',
    name: 'Asset',
    description: 'Physical or intangible resource owned or used by the business.',
    typicalAreas: ['assets'],
  },
  {
    type: 'vehicle',
    name: 'Vehicle',
    description: 'A vehicle used for business operations.',
    typicalAreas: ['assets', 'delivery'],
  },
  {
    type: 'equipment',
    name: 'Equipment',
    description: 'Tools, machinery, or equipment used in delivery.',
    typicalAreas: ['assets', 'delivery'],
  },
  {
    type: 'property',
    name: 'Property',
    description: 'Real estate or premises used by the business.',
    typicalAreas: ['assets'],
  },

  // ─── Financial ──────────────────────────────────────────────────────────
  {
    type: 'financial_account',
    name: 'Financial Account',
    description: 'Bank account, credit facility, or financial instrument.',
    typicalAreas: ['money'],
  },
  {
    type: 'pricing_rule',
    name: 'Pricing Rule',
    description: 'A specific pricing structure, rate, or margin rule.',
    typicalAreas: ['pricing'],
  },
  {
    type: 'cost_category',
    name: 'Cost Category',
    description: 'A major cost type or expense category.',
    typicalAreas: ['money'],
  },

  // ─── Compliance ─────────────────────────────────────────────────────────
  {
    type: 'licence',
    name: 'Licence',
    description: 'A licence, permit, or certification required to operate.',
    typicalAreas: ['compliance_calendar'],
  },
  {
    type: 'insurance',
    name: 'Insurance',
    description: 'An insurance policy or coverage.',
    typicalAreas: ['compliance_calendar'],
  },
  {
    type: 'obligation',
    name: 'Compliance Obligation',
    description: 'A regulatory or compliance requirement with a deadline.',
    typicalAreas: ['compliance_calendar'],
  },

  // ─── Delivery & Process ─────────────────────────────────────────────────
  {
    type: 'process',
    name: 'Process',
    description: 'A workflow, procedure, or operational process.',
    typicalAreas: ['delivery'],
  },
  {
    type: 'service',
    name: 'Service',
    description: 'A service offering or product delivered to customers.',
    typicalAreas: ['delivery', 'pricing', 'customers'],
  },

  // ─── Knowledge & Memory ─────────────────────────────────────────────────
  {
    type: 'insight',
    name: 'Insight',
    description: 'A business insight, pattern, or strategic observation.',
    typicalAreas: ['work_sources', 'customers', 'delivery'],
  },
  {
    type: 'preference',
    name: 'Preference',
    description: 'An owner preference, decision rule, or operational habit.',
    typicalAreas: ['pricing', 'delivery', 'money'],
  },
  {
    type: 'correction',
    name: 'Correction',
    description: 'A correction to previously captured information.',
    typicalAreas: [],  // Can apply to any area
  },
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number]['type'];

/**
 * Get an entity type definition by its type key.
 */
export function getEntityType(type: string): typeof ENTITY_TYPES[number] | undefined {
  return ENTITY_TYPES.find((e) => e.type === type);
}

/**
 * Get all entity type keys.
 */
export function getEntityTypeKeys(): string[] {
  return ENTITY_TYPES.map((e) => e.type);
}
