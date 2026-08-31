// business-genome/ontology/v1/areas.ts
//
// THE CANONICAL 9-AREA ONTOLOGY — the fixed top-level classification layer for the Business Genome.
//
// This is the platform ontology. It is versioned, immutable within a version, and shared across
// every business on the platform. Business-specific categories become entities/facts classified
// underneath these areas — they never become new top-level areas.
//
// RULE: The ontology owns classification; it does not own the business model.
// A plumbing company's "emergency call-outs" → entity/fact under work_sources.
// A manufacturer's "distributor agreements" → entity/relationship under the relevant area.
// A law firm's "matter management" → entity/fact under the relevant areas.
// The ontology stays stable.
//
// VERSIONING: When the ontology changes, a new version directory is created (v2/).
// Existing businesses remain interpretable through v1. The version is platform configuration,
// not tenant data.

/**
 * The five levels of knowledge coverage per area.
 * The Genome never produces a percentage — it uses these bands.
 */
export const COVERAGE_BANDS = [
  'not_started',   // Nothing captured yet
  'just_started',  // A few facts, most is unknown
  'building_up',   // Substantial knowledge, some gaps remain
  'well_covered',  // A buyer could rely on this
  'comprehensive',  // Deep knowledge, edge cases captured
] as const;

export type CoverageBand = (typeof COVERAGE_BANDS)[number];

/**
 * The canonical knowledge status for any genome assertion.
 * Status and confidence are SEPARATE fields — they measure different things.
 */
export const KNOWLEDGE_STATUSES = [
  'candidate',     // Extracted from conversation, not yet confirmed
  'confirmed',     // Owner has explicitly confirmed this
  'observed',      // Derived from a connected system (high certainty)
  'contradicted',  // Conflicting information detected
  'superseded',    // Replaced by a newer value (history retained)
  'rejected',      // Determined to be incorrect or irrelevant
] as const;

export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

/**
 * Source types for provenance tracking.
 * Every material Genome assertion must know where it came from.
 */
export const SOURCE_TYPES = [
  'conversation',  // Spoken by the owner in a voice conversation
  'document',      // Extracted from an uploaded document
  'system',        // Observed from a connected system (Xero, Google, etc.)
  'inferred',      // Derived by the engine from other facts
  'owner_input',   // Provided during onboarding or profile setup
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

/**
 * Event types for the Genome audit trail.
 * The Genome event layer is immutable history of how knowledge changed.
 */
export const GENOME_EVENT_TYPES = [
  'entity_created',
  'entity_confirmed',
  'entity_updated',
  'entity_superseded',
  'entity_contradicted',
  'entity_rejected',
  'entity_removed',
  'fact_created',
  'fact_confirmed',
  'fact_updated',
  'fact_superseded',
  'fact_contradicted',
  'fact_rejected',
  'relationship_created',
  'relationship_confirmed',
  'relationship_removed',
] as const;

export type GenomeEventType = (typeof GENOME_EVENT_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// THE 9 CANONICAL AREAS
// ─────────────────────────────────────────────────────────────────────────────

export interface OntologyArea {
  /** Stable key — never changes within a version. Used in database, API, and queries. */
  key: string;

  /** Human-readable name — what the owner sees on the Genome page. */
  name: string;

  /** What this area covers — used in prompts and documentation. */
  description: string;

  /** What a buyer's advisor is trying to find out about this area. */
  buyerQuestion: string;

  /** The same question addressed to the owner on his own page. */
  ownerFacingQuestion: string;

  /**
   * Core concepts that EVERY business should eventually have knowledge about in this area.
   * These drive gap detection — if a core concept is missing, the area has a gap.
   * These are NOT fields to fill — they are knowledge domains to discover.
   */
  coreConcepts: string[];

  /**
   * Optional concepts that SOME businesses may have in this area.
   * These are industry-specific and discovered through conversation.
   * They do NOT represent gaps if absent — they represent richness when present.
   */
  optionalConcepts: string[];

  /**
   * What evidence would substantiate knowledge in this area.
   * Used to guide Kira's questioning and assess knowledge quality.
   */
  evidenceRequirements: string[];

  /**
   * When this area is relevant for a particular business.
   * Used to avoid asking about irrelevant areas.
   */
  relevanceRules: string[];
}

export const ONTOLOGY_AREAS: OntologyArea[] = [
  {
    key: 'work_sources',
    name: 'Where the work comes from',
    description: 'Lead generation, referrals, channels, pipeline and sources of demand.',
    buyerQuestion: 'Where does the work come from, and does it come to you personally?',
    ownerFacingQuestion: 'Where does your work come from, and does it come to you personally?',
    coreConcepts: [
      'primary_demand_channels',
      'customer_acquisition',
      'lead_generation',
      'referral_mechanics',
      'pipeline_health',
    ],
    optionalConcepts: [
      'advertising_spend',
      'seo_performance',
      'tender_portal_usage',
      'government_contracts',
      'seasonal_patterns',
      'geographic_coverage',
      'competitive_positioning',
    ],
    evidenceRequirements: [
      'Specific channels named with relative contribution',
      'Customer acquisition cost or process described',
      'Referral mechanics explained',
      'Pipeline health indicators mentioned',
    ],
    relevanceRules: [
      'Every business has demand sources — this area is always relevant',
    ],
  },
  {
    key: 'pricing',
    name: 'How work is priced and quoted',
    description: 'Pricing logic, estimates, proposals, margins and quoting.',
    buyerQuestion: 'Could someone else price a job and reach your number?',
    ownerFacingQuestion: 'Could someone else price a job and reach your number?',
    coreConcepts: [
      'pricing_model',
      'quoting_process',
      'margin_structure',
      'pricing_authority',
    ],
    optionalConcepts: [
      'discount_authority',
      'price_escalation',
      'fixed_vs_variable_pricing',
      'competitive_pricing',
      'value_based_pricing',
      'rate_cards',
      'minimum_charge',
    ],
    evidenceRequirements: [
      'Pricing methodology described',
      'Specific rates or margins mentioned',
      'Who can authorise pricing decisions',
      'How quotes are generated and approved',
    ],
    relevanceRules: [
      'Every business has pricing — this area is always relevant',
    ],
  },
  {
    key: 'delivery',
    name: 'How the work actually gets done',
    description: 'Processes, workflows, dependencies, delivery and exceptions.',
    buyerQuestion: 'How does the work actually get done?',
    ownerFacingQuestion: 'How does the work actually get done?',
    coreConcepts: [
      'delivery_process',
      'workflow_stages',
      'quality_control',
      'exception_handling',
    ],
    optionalConcepts: [
      'subcontractor_usage',
      'scheduling_system',
      'project_management',
      'handover_process',
      'rework_policy',
      'capacity_planning',
      'dependencies',
      'seasonal_variation',
    ],
    evidenceRequirements: [
      'End-to-end delivery process described',
      'Key workflow stages identified',
      'Quality checks or controls mentioned',
      'How exceptions or problems are handled',
    ],
    relevanceRules: [
      'Every business delivers something — this area is always relevant',
    ],
  },
  {
    key: 'money',
    name: 'Money in, money out and terms',
    description: 'Revenue, costs, payment terms, cash flow and financial obligations.',
    buyerQuestion: 'Who chases, who approves, and are any of your supplier terms personal to you?',
    ownerFacingQuestion: 'Who chases, who approves, and are any of your supplier terms personal to you?',
    coreConcepts: [
      'revenue_model',
      'cost_structure',
      'payment_terms',
      'cash_flow_patterns',
    ],
    optionalConcepts: [
      'supplier_relationships',
      'credit_terms',
      'factoring',
      'seasonal_cash_flow',
      'capital_expenditure',
      'debt_obligations',
      'personal_vs_business_expenses',
    ],
    evidenceRequirements: [
      'Revenue figures and trends',
      'Major cost categories identified',
      'Payment terms with customers and suppliers',
      'Cash flow patterns and pressures',
    ],
    relevanceRules: [
      'Every business has money flows — this area is always relevant',
    ],
  },
  {
    key: 'customers',
    name: 'Who buys, and who owns the relationship',
    description: 'Customers, buyers, decision-makers and relationship ownership.',
    buyerQuestion: 'Who does the work?',
    ownerFacingQuestion: 'Who does the work?',
    coreConcepts: [
      'customer_segments',
      'key_accounts',
      'relationship_ownership',
      'customer_concentration',
    ],
    optionalConcepts: [
      'contract_structure',
      'customer_satisfaction',
      'churn_patterns',
      'customer_lifetime_value',
      'decision_makers',
      'procurement_process',
    ],
    evidenceRequirements: [
      'Customer segments or key accounts named',
      'Relationship ownership clarified (who manages each)',
      'Customer concentration risk assessed',
      'Contract or engagement terms described',
    ],
    relevanceRules: [
      'Every business has customers — this area is always relevant',
    ],
  },
  {
    key: 'people',
    name: 'Who does the work',
    description: 'Employees, contractors, roles, responsibilities and capacity.',
    buyerQuestion: 'Who is critical, how long have they been with you, and who would leave on announcement?',
    ownerFacingQuestion: 'Who is critical, how long have they been with you, and who would leave on announcement?',
    coreConcepts: [
      'key_people',
      'roles_and_responsibilities',
      'organisational_structure',
      'critical_dependencies',
    ],
    optionalConcepts: [
      'contractor_usage',
      'knowledge_distribution',
      'succession_planning',
      'training_programs',
      'employment_contracts',
      'non_compete_clauses',
      'team_capacity',
    ],
    evidenceRequirements: [
      'Key people and their roles identified',
      'Critical dependencies on specific people',
      'Organisational structure described',
      'Retention risk assessed',
    ],
    relevanceRules: [
      'Every business has people (even solo operators have contractors/helpers)',
    ],
  },
  {
    key: 'assets',
    name: 'What the business owns',
    description: 'Assets, IP, property, equipment, inventory and other owned resources.',
    buyerQuestion: 'What do you own, what do you lease, and what is held in your own name?',
    ownerFacingQuestion: 'What do you own, what do you lease, and what is held in your own name?',
    coreConcepts: [
      'asset_register',
      'ownership_structure',
      'lease_vs_own',
      'asset_condition',
    ],
    optionalConcepts: [
      'intellectual_property',
      'vehicle_fleet',
      'equipment_list',
      'inventory_management',
      'property_ownership',
      'finance_agreements',
      'depreciation',
    ],
    evidenceRequirements: [
      'Major assets listed with ownership status',
      'Lease vs own decisions clarified',
      'Asset condition or age mentioned',
      'Finance agreements documented',
    ],
    relevanceRules: [
      'Every business has assets — this area is always relevant',
    ],
  },
  {
    key: 'compliance_calendar',
    name: 'Licences, insurance and the calendar',
    description: 'Licences, insurance, compliance obligations, renewals and important dates.',
    buyerQuestion: 'What must not lapse, and who is watching it?',
    ownerFacingQuestion: 'What must not lapse, and who is watching it?',
    coreConcepts: [
      'licences_permits',
      'insurance_coverage',
      'compliance_obligations',
      'renewal_calendar',
    ],
    optionalConcepts: [
      'safety_certifications',
      'environmental_permits',
      'industry_associations',
      'audit_requirements',
      'regulatory_changes',
      'training_requirements',
    ],
    evidenceRequirements: [
      'All licences and permits listed',
      'Insurance coverage described',
      'Renewal dates and responsibilities assigned',
      'Compliance obligations identified',
    ],
    relevanceRules: [
      'Every business has compliance obligations — this area is always relevant',
      'Complexity varies by industry',
    ],
  },
  {
    key: 'systems_records',
    name: 'Systems & records',
    description: 'Software, documents, spreadsheets, databases and source systems.',
    buyerQuestion: 'Where do your records live, who can reach them, and what is written down?',
    ownerFacingQuestion: 'Where do your records live, who can reach them, and what is written down?',
    coreConcepts: [
      'operational_systems',
      'record_keeping',
      'data_access',
      'system_dependencies',
    ],
    optionalConcepts: [
      'accounting_software',
      'crm_system',
      'project_management',
      'document_management',
      'backup_procedures',
      'system_integrations',
      'it_infrastructure',
    ],
    evidenceRequirements: [
      'Key systems named and their purpose described',
      'Record-keeping practices explained',
      'Access permissions clarified',
      'System dependencies identified',
    ],
    relevanceRules: [
      'Every business has systems — this area is always relevant',
      'Complexity varies from paper-based to fully digital',
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// KEY MAPPING — current area keys → canonical ontology keys
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapping from the current `genome_section` values in `kira_memory` to the canonical
 * ontology keys. Used during the transition to maintain backward compatibility.
 *
 * Current keys (from lib/genome/areas.ts):
 *   demand → work_sources
 *   pricing → pricing
 *   operations → delivery
 *   cash → money
 *   customers → customers
 *   people → people
 *   assets → assets
 *   compliance → compliance_calendar
 *   systems → systems_records
 */
export const LEGACY_KEY_MAP: Record<string, string> = {
  demand: 'work_sources',
  pricing: 'pricing',
  operations: 'delivery',
  cash: 'money',
  customers: 'customers',
  people: 'people',
  assets: 'assets',
  compliance: 'compliance_calendar',
  systems: 'systems_records',
};

/**
 * Reverse mapping: canonical key → legacy key.
 * Used when reading existing kira_memory.genome_section values.
 */
export const CANONICAL_TO_LEGACY: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_KEY_MAP).map(([legacy, canonical]) => [canonical, legacy])
);

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Get an area by its canonical key. */
export function getArea(key: string): OntologyArea | undefined {
  return ONTOLOGY_AREAS.find((a) => a.key === key);
}

/** Get all area keys. */
export function getAreaKeys(): string[] {
  return ONTOLOGY_AREAS.map((a) => a.key);
}

/** Get the canonical key for a legacy genome_section value. */
export function canonicalKey(legacyKey: string): string {
  return LEGACY_KEY_MAP[legacyKey] ?? legacyKey;
}

/** Get the legacy key for a canonical ontology key. */
export function legacyKey(canonicalKey: string): string {
  return CANONICAL_TO_LEGACY[canonicalKey] ?? canonicalKey;
}

/**
 * Validate that an area key exists in the ontology.
 * Rejects business-specific categories that don't belong as top-level areas.
 */
export function isValidAreaKey(key: string): boolean {
  return ONTOLOGY_AREAS.some((a) => a.key === key);
}
