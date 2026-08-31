// business-genome/coverage.ts
//
// COVERAGE, GAP & KNOWLEDGE-QUALITY ENGINE
//
// This module answers the questions the Orchestrator (Phase 9) needs to decide what to ask next:
//
//   1. WHAT DO WE KNOW? → entities, facts, relationships per area, with confidence + status
//   2. HOW WELL DO WE KNOW IT? → confidence distribution, confirmation rate, source diversity
//   3. WHERE ARE THE CONTRADICTIONS? → conflicting facts, inconsistent values, unresolved tensions
//   4. WHAT'S MISSING? → core concepts not covered, areas with no knowledge
//   5. WHAT SHOULD WE ASK NEXT? → the most valuable next question to improve the Genome
//
// The Orchestrator calls this engine to get the next-best-question. The engine doesn't decide
// what to ask — it surfaces the gaps and quantifies the value of filling them.
//
// Phase 8 (query API) uses this engine to serve "what we know" responses.
// Phase 9 (conversation loop) uses this engine to decide what to ask next.

import { getAllEntities, getAllFacts, getAllRelationships } from './repository';
import { ONTOLOGY_AREAS, type OntologyArea } from './ontology/v1/areas';
import type { GenomeFact, GenomeEntity, GenomeRelationship } from './types';
import { detectCrossConversationConflicts } from './conflicts';

// ─────────────────────────────────────────────────────────────────────────────
// AREA KNOWLEDGE STATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What the engine knows about one area.
 * This is the data structure the Orchestrator consumes.
 */
export interface AreaKnowledgeState {
  area_key: string;
  area_name: string;

  // What we have
  entities: GenomeEntity[];
  facts: GenomeFact[];
  relationships: GenomeRelationship[];

  // How much we have
  entity_count: number;
  fact_count: number;
  relationship_count: number;

  // How reliable it is
  confidence_stats: {
    mean: number;
    min: number;
    max: number;
    std_dev: number;
  };

  // What status it's in
  status_breakdown: {
    candidate: number;
    confirmed: number;
    observed: number;
    contradicted: number;
    superseded: number;
    rejected: number;
  };

  // Where it came from
  source_breakdown: Record<string, number>;

  // Freshness
  oldest_knowledge_days: number | null;
  newest_knowledge_days: number | null;

  // Contradictions
  contradictions: Array<{
    subject: string;
    predicate: string;
    values: string[];
    fact_ids: string[];
  }>;
}

/**
 * Get the full knowledge state for one area.
 */
export async function getAreaKnowledgeState(
  organisationId: string,
  areaKey: string
): Promise<AreaKnowledgeState | null> {
  const area = ONTOLOGY_AREAS.find((a) => a.key === areaKey);
  if (!area) return null;

  const entities = (await getAllEntities(organisationId)).filter((e) => e.area_key === areaKey && !e.superseded_at);
  const facts = (await getAllFacts(organisationId)).filter((f) => f.area_key === areaKey && !f.superseded_at);
  const relationships = (await getAllRelationships(organisationId)).filter((r) => r.area_key === areaKey && !r.superseded_at);

  // Confidence stats
  const allConfidences = [...entities.map((e) => e.confidence), ...facts.map((f) => f.confidence)];
  const confidenceStats = computeStats(allConfidences);

  // Status breakdown
  const allStatuses = [...entities, ...facts, ...relationships];
  const statusBreakdown = {
    candidate: allStatuses.filter((s) => s.status === 'candidate').length,
    confirmed: allStatuses.filter((s) => s.status === 'confirmed').length,
    observed: allStatuses.filter((s) => s.status === 'observed').length,
    contradicted: allStatuses.filter((s) => s.status === 'contradicted').length,
    superseded: allStatuses.filter((s) => s.status === 'superseded').length,
    rejected: allStatuses.filter((s) => s.status === 'rejected').length,
  };

  // Source breakdown
  const sourceBreakdown: Record<string, number> = {};
  allStatuses.forEach((s) => {
    sourceBreakdown[s.source_type] = (sourceBreakdown[s.source_type] || 0) + 1;
  });

  // Freshness
  const now = Date.now();
  const allDates = allStatuses.map((s) => new Date(s.observed_at ?? s.created_at).getTime());
  const oldestDays = allDates.length > 0
    ? Math.round((now - Math.min(...allDates)) / (1000 * 60 * 60 * 24))
    : null;
  const newestDays = allDates.length > 0
    ? Math.round((now - Math.max(...allDates)) / (1000 * 60 * 60 * 24))
    : null;

  // Detect contradictions within this area
  const contradictions = detectContradictions(facts);

  return {
    area_key: areaKey,
    area_name: area.name,
    entities,
    facts,
    relationships,
    entity_count: entities.length,
    fact_count: facts.length,
    relationship_count: relationships.length,
    confidence_stats: confidenceStats,
    status_breakdown: statusBreakdown,
    source_breakdown: sourceBreakdown,
    oldest_knowledge_days: oldestDays,
    newest_knowledge_days: newestDays,
    contradictions,
  };
}

/**
 * Get the knowledge state for ALL areas.
 */
export async function getFullKnowledgeState(organisationId: string): Promise<AreaKnowledgeState[]> {
  const states: AreaKnowledgeState[] = [];
  for (const area of ONTOLOGY_AREAS) {
    const state = await getAreaKnowledgeState(organisationId, area.key);
    if (state) states.push(state);
  }
  return states;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRADICTION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect contradictions within an area's facts.
 * A contradiction is the same subject+predicate with different values.
 */
function detectContradictions(facts: GenomeFact[]): AreaKnowledgeState['contradictions'] {
  const groups = new Map<string, GenomeFact[]>();

  for (const fact of facts) {
    if (fact.status === 'superseded' || fact.status === 'rejected') continue;
    const key = `${fact.subject}::${fact.predicate}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(fact);
  }

  const contradictions: AreaKnowledgeState['contradictions'] = [];

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    const uniqueValues = new Set(group.map((f) => f.value).filter(Boolean));
    if (uniqueValues.size > 1) {
      contradictions.push({
        subject: group[0].subject,
        predicate: group[0].predicate,
        values: Array.from(uniqueValues) as string[],
        fact_ids: group.map((f) => f.id),
      });
    }
  }

  return contradictions;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAP ANALYSIS — what's missing
// ─────────────────────────────────────────────────────────────────────────────

export interface KnowledgeGap {
  area_key: string;
  area_name: string;
  concept: string;
  gap_type: 'core_concept_missing' | 'no_knowledge' | 'shallow_knowledge' | 'unconfirmed_knowledge' | 'contradiction_unresolved';
  severity: 'low' | 'medium' | 'high';
  evidence: string;
  /** What the Orchestrator should do to fill this gap */
  suggested_question_area: string;
}

/**
 * Find all gaps in the knowledge state.
 * These are the raw gaps — the Orchestrator decides which to act on.
 */
export async function findKnowledgeGaps(organisationId: string): Promise<KnowledgeGap[]> {
  const gaps: KnowledgeGap[] = [];
  const states = await getFullKnowledgeState(organisationId);

  for (const state of states) {
    const area = ONTOLOGY_AREAS.find((a) => a.key === state.area_key);
    if (!area) continue;

    // 1. No knowledge at all
    if (state.entity_count === 0 && state.fact_count === 0) {
      gaps.push({
        area_key: state.area_key,
        area_name: state.area_name,
        concept: 'any_knowledge',
        gap_type: 'no_knowledge',
        severity: 'high',
        evidence: 'No entities or facts captured in this area',
        suggested_question_area: state.area_key,
      });
    }

    // 2. Core concepts missing
    // Core concepts are inferred from the entities and facts present.
    // Each ontology area defines what a "complete" business should have.
    const conceptsCovered = inferCoveredConcepts(area, state);
    const conceptsMissing = area.coreConcepts.filter((c) => !conceptsCovered.includes(c));

    for (const concept of conceptsMissing) {
      gaps.push({
        area_key: state.area_key,
        area_name: state.area_name,
        concept,
        gap_type: 'core_concept_missing',
        severity: 'medium',
        evidence: `Core concept "${concept}" not found in ${state.entity_count} entities or ${state.fact_count} facts`,
        suggested_question_area: state.area_key,
      });
    }

    // 3. Shallow knowledge (all candidate, no confirmation)
    if (state.entity_count + state.fact_count > 0 && state.status_breakdown.confirmed === 0) {
      gaps.push({
        area_key: state.area_key,
        area_name: state.area_name,
        concept: 'confirmation',
        gap_type: 'unconfirmed_knowledge',
        severity: 'medium',
        evidence: `${state.entity_count + state.fact_count} items all at candidate status — nothing confirmed`,
        suggested_question_area: state.area_key,
      });
    }

    // 4. Low confidence items
    const lowConfidenceItems = [...state.entities, ...state.facts].filter((i) => i.confidence < 0.4);
    if (lowConfidenceItems.length > 0) {
      gaps.push({
        area_key: state.area_key,
        area_name: state.area_name,
        concept: 'confidence',
        gap_type: 'shallow_knowledge',
        severity: 'low',
        evidence: `${lowConfidenceItems.length} items with confidence < 40%`,
        suggested_question_area: state.area_key,
      });
    }

    // 5. Unresolved contradictions
    for (const contradiction of state.contradictions) {
      gaps.push({
        area_key: state.area_key,
        area_name: state.area_name,
        concept: `${contradiction.subject} ${contradiction.predicate}`,
        gap_type: 'contradiction_unresolved',
        severity: 'high',
        evidence: `Conflicting values: ${contradiction.values.join(' vs ')}`,
        suggested_question_area: state.area_key,
      });
    }
  }

  // Sort by severity
  const order = { high: 0, medium: 1, low: 2 };
  gaps.sort((a, b) => order[a.severity] - order[b.severity]);

  return gaps;
}

/**
 * Infer which ontology concepts are covered by the current knowledge.
 * This is the key function — it maps what we HAVE to what we SHOULD have.
 */
function inferCoveredConcepts(
  area: OntologyArea,
  state: AreaKnowledgeState
): string[] {
  const covered: string[] = [];

  // Each core concept has keywords/patterns that indicate it's been captured.
  // This is a heuristic — the ontology defines the concepts, this infers coverage.
  for (const concept of area.coreConcepts) {
    // Check if any entity or fact likely represents this concept
    const conceptMatch = matchesConcept(concept, state);
    if (conceptMatch) covered.push(concept);
  }

  return covered;
}

/**
 * Check if the knowledge in an area matches a specific concept.
 * Uses keyword/pattern matching against entity names and fact subjects.
 */
function matchesConcept(concept: string, state: AreaKnowledgeState): boolean {
  // Map concept keys to patterns that indicate coverage
  const conceptPatterns: Record<string, string[]> = {
    primary_demand_channels: ['referral', 'builder', 'tender', 'marketing', 'word of mouth', 'advertising', 'website'],
    customer_acquisition: ['acquisition', 'lead', 'inquiry', 'quote request'],
    lead_generation: ['lead', 'inquiry', 'referral', 'website'],
    referral_mechanics: ['referral', 'recommend', 'word of mouth'],
    pipeline_health: ['pipeline', 'forecast', 'backlog', 'workload'],
    pricing_model: ['hourly', 'fixed', 'rate', 'markup', 'margin', 'quote', 'estimate'],
    quoting_process: ['quote', 'estimate', 'proposal', 'pricing'],
    margin_structure: ['margin', 'markup', 'profit', 'cost plus'],
    pricing_authority: ['who quotes', 'approval', 'authority', 'pricing'],
    delivery_process: ['process', 'workflow', 'step', 'procedure'],
    workflow_stages: ['stage', 'phase', 'step', 'workflow'],
    quality_control: ['quality', 'inspection', 'check', 'review'],
    exception_handling: ['exception', 'problem', 'issue', 'complaint', 'rework'],
    revenue_model: ['revenue', 'income', 'turnover', 'sales'],
    cost_structure: ['cost', 'expense', 'overhead', 'fixed cost', 'variable cost'],
    payment_terms: ['payment', 'terms', '30 days', 'net', 'invoice'],
    cash_flow_patterns: ['cash flow', 'timing', 'seasonal', 'peak'],
    customer_segments: ['segment', 'type', 'residential', 'commercial', 'government'],
    key_accounts: ['key customer', 'big customer', 'major account', 'main customer'],
    relationship_ownership: ['who manages', 'account manager', 'relationship'],
    customer_concentration: ['concentration', 'percentage', 'revenue share'],
    key_people: ['employee', 'staff', 'technician', 'manager', 'director'],
    roles_and_responsibilities: ['role', 'responsibility', 'handles', 'manages', 'does'],
    organisational_structure: ['structure', 'team', 'department', 'reporting'],
    critical_dependencies: ['critical', 'key person', '依赖', 'single point'],
    asset_register: ['asset', 'equipment', 'vehicle', 'tool', 'machinery'],
    ownership_structure: ['own', 'lease', 'finance', 'hire'],
    lease_vs_own: ['lease', 'rent', 'own', 'finance', 'hire'],
    asset_condition: ['condition', 'age', 'new', 'old', 'maintenance'],
    licences_permits: ['licence', 'license', 'permit', 'registration', 'certification'],
    insurance_coverage: ['insurance', 'cover', 'policy', 'public liability'],
    compliance_obligations: ['compliance', 'requirement', 'regulation', 'standard'],
    renewal_calendar: ['renewal', 'due', 'expiry', 'annual'],
    operational_systems: ['system', 'software', 'platform', 'tool'],
    record_keeping: ['record', 'document', 'file', 'database', 'spreadsheet'],
    data_access: ['access', 'login', 'password', 'permission'],
    system_dependencies: ['depend', 'integrate', 'connect', 'sync'],
  };

  const patterns = conceptPatterns[concept] ?? [];
  const allText = [
    ...state.entities.map((e) => e.name.toLowerCase()),
    ...state.facts.map((f) => `${f.subject} ${f.predicate} ${f.value}`.toLowerCase()),
  ].join(' ');

  return patterns.some((p) => allText.includes(p));
}

// ─────────────────────────────────────────────────────────────────────────────
// WHAT TO ASK NEXT — the Orchestrator's input
// ─────────────────────────────────────────────────────────────────────────────

export interface NextQuestionRecommendation {
  area_key: string;
  area_name: string;
  concept: string;
  gap_type: KnowledgeGap['gap_type'];
  priority: number; // 0-100, higher = more valuable to ask
  reasoning: string;
  /** Suggested approach: what to ask about */
  suggested_approach: string;
}

/**
 * Get the next-best-questions for the Orchestrator.
 * This is the main function Phase 9 calls to decide what Kira should ask next.
 *
 * It takes the raw gaps and prioritises them by:
 *   1. Severity (high > medium > low)
 *   2. Area weight (some areas matter more for valuation)
 *   3. Knowledge completeness (an area close to complete is worth finishing)
 *   4. Conflict urgency (unresolved contradictions need attention)
 */
export async function getNextQuestions(
  organisationId: string,
  options: {
    limit?: number;
    maxPriority?: number;
    focusArea?: string;
  } = {}
): Promise<NextQuestionRecommendation[]> {
  const { limit = 5, focusArea } = options;
  const gaps = await findKnowledgeGaps(organisationId);
  const states = await getFullKnowledgeState(organisationId);

  // Build state lookup
  const stateMap = new Map(states.map((s) => [s.area_key, s]));

  // Score each gap
  const recommendations: NextQuestionRecommendation[] = gaps.map((gap) => {
    const state = stateMap.get(gap.area_key);
    let priority = 0;
    let reasoning = '';

    // Base priority from severity
    const severityScore = { high: 40, medium: 20, low: 5 };
    priority += severityScore[gap.severity];

    // Area weight: some areas are more important for valuation
    // (these weights come from the buyer's advisor perspective)
    const areaWeights: Record<string, number> = {
      work_sources: 15, // demand is critical for valuation
      customers: 15,    // customer base = recurring revenue
      money: 15,        // financial health = valuation basis
      people: 10,       // key person risk
      pricing: 10,      // pricing power = margin
      delivery: 8,      // operational efficiency
      systems_records: 7, // systems = scalability
      assets: 5,        // asset base
      compliance_calendar: 3, // compliance is table stakes
    };
    priority += areaWeights[gap.area_key] ?? 5;

    // Knowledge completeness bonus: if an area is close to complete, finish it
    if (state) {
      const totalItems = state.entity_count + state.fact_count;
      if (totalItems > 0 && totalItems < 10) {
        priority += 5; // Close to complete — worth finishing
      }
    }

    // Conflict urgency: unresolved contradictions are high priority
    if (gap.gap_type === 'contradiction_unresolved') {
      priority += 20;
      reasoning = 'Unresolved contradiction needs clarification';
    } else if (gap.gap_type === 'no_knowledge') {
      priority += 10;
      reasoning = 'Area has no knowledge — high-value to start capturing';
    } else if (gap.gap_type === 'core_concept_missing') {
      reasoning = `Core concept "${gap.concept}" missing — important for completeness`;
    } else {
      reasoning = gap.evidence;
    }

    // Focus area bonus
    if (focusArea && gap.area_key === focusArea) {
      priority += 25;
    }

    return {
      area_key: gap.area_key,
      area_name: gap.area_name,
      concept: gap.concept,
      gap_type: gap.gap_type,
      priority: Math.min(100, priority),
      reasoning,
      suggested_approach: buildSuggestedApproach(gap, state ?? null),
    };
  });

  // Sort by priority descending
  recommendations.sort((a, b) => b.priority - a.priority);

  return recommendations.slice(0, limit);
}

/**
 * Build a suggested approach for filling a gap.
 */
function buildSuggestedApproach(gap: KnowledgeGap, state: AreaKnowledgeState | null): string {
  if (gap.gap_type === 'no_knowledge') {
    return `Ask open-ended questions about ${gap.area_name.toLowerCase()} to start building the picture`;
  }

  if (gap.gap_type === 'core_concept_missing') {
    return `Ask specifically about "${gap.concept}" — what it is, how it works, who owns it`;
  }

  if (gap.gap_type === 'contradiction_unresolved') {
    return `Ask the owner to clarify which value is correct: "${gap.concept}"`;
  }

  if (gap.gap_type === 'unconfirmed_knowledge') {
    return `Ask the owner to confirm existing knowledge: "Is it still true that..."`;
  }

  if (gap.gap_type === 'shallow_knowledge') {
    return `Ask for more detail about "${gap.concept}" to increase confidence`;
  }

  return `Explore ${gap.area_name.toLowerCase()} area`;
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE QUALITY METRICS
// ─────────────────────────────────────────────────────────────────────────────

export interface GenomeQualityMetrics {
  /** Overall score 0-100 */
  overall: number;
  /** Per-area scores */
  per_area: Record<string, number>;
  /** Breakdown of what contributes to the score */
  breakdown: {
    coverage: number;      // % of core concepts covered
    confidence: number;    // average confidence (0-1)
    confirmation: number;  // % of items confirmed
    conflicts: number;     // number of unresolved conflicts
    freshness: number;     // average age of knowledge in days
  };
  /** Total items in the genome */
  total_items: number;
  /** Items with status=confirmed */
  confirmed_items: number;
  /** Items with status=candidate */
  candidate_items: number;
  /** Items with status=contradicted */
  contradicted_items: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-ITEM QUALITY ASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quality dimensions for a single genome item (entity, fact, or relationship).
 * These are what Phase 8 serves and Phase 9 uses to decide confidence.
 */
export interface ItemQualityAssessment {
  item_id: string;
  item_type: 'entity' | 'fact' | 'relationship';
  area_key: string;

  // The 9 quality dimensions from the spec
  provenance_strength: number;  // 0-1: how strong is the source? (conversation=0.7, document=0.9, system=1.0)
  source_type: string;          // 'conversation', 'document', 'system', 'inferred', 'owner_input'
  confidence: number;           // 0-1: how confident is the engine?
  recency_days: number;         // days since this item was observed
  corroboration_count: number;  // how many independent sources support this
  contradiction_state: 'none' | 'unresolved' | 'resolved' | 'superseded';
  supersession_depth: number;   // 0 = original, 1 = superseded once, etc.
  specificity: number;          // 0-1: how specific is this? (general=0.3, specific=0.9)
  completeness: number;         // 0-1: how complete is the information?

  // Composite score
  quality_score: number;        // 0-100: weighted combination of above
}

// Source strength scores (conversation is weaker than document, which is weaker than system)
const SOURCE_STRENGTH: Record<string, number> = {
  system: 1.0,
  document: 0.9,
  owner_input: 0.85,
  conversation: 0.7,
  inferred: 0.5,
};

/**
 * Assess the quality of a single genome item.
 */
export function assessItemQuality(
  item: GenomeEntity | GenomeFact | GenomeRelationship,
  allItems: Array<{ subject?: string; predicate?: string; value?: string | null; source_type: string; source_id?: string | null }>,
  supersessionDepth: number = 0
): ItemQualityAssessment {
  const now = Date.now();
  const observedAt = new Date(item.observed_at ?? item.created_at).getTime();
  const recencyDays = Math.round((now - observedAt) / (1000 * 60 * 60 * 24));

  // Provenance strength: source type + recency decay
  const baseSourceStrength = SOURCE_STRENGTH[item.source_type] ?? 0.5;
  const recencyDecay = Math.max(0.5, 1 - (recencyDays / 365)); // decay over a year
  const provenanceStrength = baseSourceStrength * recencyDecay;

  // Corroboration: how many independent sources support this fact
  const corroborationCount = countCorroboration(item, allItems);

  // Contradiction state
  const contradictionState = getContradictionState(item);

  // Specificity: how specific is the value?
  const specificity = assessSpecificity(item);

  // Completeness: how complete is the information?
  const completeness = assessCompleteness(item);

  // Composite quality score
  const qualityScore = Math.round(
    provenanceStrength * 20 +
    (item.confidence ?? 0.5) * 25 +
    Math.max(0, 1 - (recencyDays / 365)) * 15 +
    Math.min(1, corroborationCount / 3) * 15 +
    (contradictionState === 'none' ? 10 : contradictionState === 'resolved' ? 5 : 0) +
    Math.max(0, 1 - (supersessionDepth / 5)) * 5 +
    specificity * 5 +
    completeness * 5
  );

  return {
    item_id: item.id,
    item_type: 'entity' in item && 'name' in item ? 'entity' : 'fact' in item && 'subject' in item ? 'fact' : 'relationship',
    area_key: item.area_key,
    provenance_strength: Math.round(provenanceStrength * 100) / 100,
    source_type: item.source_type,
    confidence: item.confidence ?? 0.5,
    recency_days: recencyDays,
    corroboration_count: corroborationCount,
    contradiction_state: contradictionState,
    supersession_depth: supersessionDepth,
    specificity,
    completeness,
    quality_score: qualityScore,
  };
}

/**
 * Count how many independent sources corroborate a fact.
 */
function countCorroboration(
  item: GenomeEntity | GenomeFact | GenomeRelationship,
  allItems: Array<{ subject?: string; predicate?: string; value?: string | null; source_type: string; source_id?: string | null }>
): number {
  // For facts: count other facts with same subject+predicate+value from different sources
  if ('subject' in item && 'predicate' in item) {
    const fact = item as GenomeFact;
    return allItems.filter((i) =>
      i.subject === fact.subject &&
      i.predicate === fact.predicate &&
      i.value === fact.value &&
      i.source_id !== fact.source_id
    ).length;
  }

  // For entities: count other entities with same name+type from different sources
  if ('name' in item && 'entity_type' in item) {
    const entity = item as GenomeEntity;
    return allItems.filter((i) =>
      'name' in i && i.name === entity.name &&
      'entity_type' in i && i.entity_type === entity.entity_type &&
      i.source_id !== entity.source_id
    ).length;
  }

  return 0;
}

/**
 * Determine the contradiction state for an item.
 */
function getContradictionState(
  item: GenomeEntity | GenomeFact | GenomeRelationship
): 'none' | 'unresolved' | 'resolved' | 'superseded' {
  if (item.superseded_at) return 'superseded';
  if (item.status === 'contradicted') return 'unresolved';
  if (item.status === 'confirmed') return 'none';
  return 'none';
}

/**
 * Assess how specific a fact is.
 * Specific = has concrete values, names, numbers
 * General = vague descriptions, no specifics
 */
function assessSpecificity(item: GenomeEntity | GenomeFact | GenomeRelationship): number {
  if ('value' in item && item.value !== null) {
    // Facts with concrete values are more specific
    const value = String(item.value);
    // Numbers are very specific
    if (/\d/.test(value)) return 0.9;
    // Named entities are specific
    if (value.length > 3 && value.length < 100) return 0.8;
    return 0.6;
  }

  if ('name' in item) {
    // Entities with short, specific names are more specific
    const name = String((item as any).name);
    if (name.length > 1 && name.length < 50) return 0.8;
    return 0.6;
  }

  return 0.5;
}

/**
 * Assess how complete the information is.
 */
function assessCompleteness(item: GenomeEntity | GenomeFact | GenomeRelationship): number {
  let completeness = 0;
  let fields = 0;

  // Check common fields
  if ('area_key' in item) { fields++; if (item.area_key) completeness++; }
  if ('source_type' in item) { fields++; if (item.source_type) completeness++; }
  if ('confidence' in item) { fields++; if (item.confidence !== undefined) completeness++; }
  if ('observed_at' in item) { fields++; if (item.observed_at) completeness++; }

  // Type-specific fields
  if ('subject' in item && 'predicate' in item) {
    // Fact
    fields++; if ((item as GenomeFact).subject) completeness++;
    fields++; if ((item as GenomeFact).predicate) completeness++;
    fields++; if ((item as GenomeFact).value !== null && (item as GenomeFact).value !== undefined) completeness++;
    fields++; if ((item as GenomeFact).value_type) completeness++;
  }

  if ('name' in item && 'entity_type' in item) {
    // Entity
    fields++; if ((item as GenomeEntity).name) completeness++;
    fields++; if ((item as GenomeEntity).entity_type) completeness++;
  }

  if ('subject_entity_id' in item && 'predicate' in item) {
    // Relationship
    fields++; if ((item as GenomeRelationship).subject_entity_id) completeness++;
    fields++; if ((item as GenomeRelationship).predicate) completeness++;
  }

  return fields > 0 ? completeness / fields : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// MACHINE-READABLE KNOWLEDGE QUALITY ASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete, machine-readable Knowledge Quality / Coverage assessment.
 * This is the primary output of Phase 7.
 *
 * Conceptually:
 *   BUSINESS → CANONICAL GENOME → { Coverage, Quality, Conflicts, Gaps }
 */
export interface KnowledgeQualityAssessment {
  organisation_id: string;
  assessed_at: string;

  // COVERAGE: what we have
  coverage: {
    populated: string[];      // areas with substantial knowledge
    sparse: string[];         // areas with minimal knowledge
    absent: string[];         // areas with no knowledge
    total_entities: number;
    total_facts: number;
    total_relationships: number;
    per_area: Record<string, {
      entities: number;
      facts: number;
      relationships: number;
      coverage_level: 'populated' | 'sparse' | 'absent';
    }>;
  };

  // QUALITY: how good it is
  quality: {
    overall_score: number;      // 0-100
    per_area_score: Record<string, number>;
    per_item: ItemQualityAssessment[];
    breakdown: {
      average_provenance: number;
      average_confidence: number;
      average_recency_days: number;
      average_corroboration: number;
      average_specificity: number;
      average_completeness: number;
      confirmed_rate: number;      // % of items confirmed
      candidate_rate: number;      // % of items still candidate
    };
  };

  // CONFLICTS: where the contradictions are
  conflicts: {
    total: number;
    unresolved: Array<{
      area_key: string;
      subject: string;
      predicate: string;
      values: string[];
      fact_ids: string[];
    }>;
    superseded_total: number;
  };

  // GAPS: what's missing
  gaps: {
    missing_knowledge: Array<{
      area_key: string;
      area_name: string;
      reason: string;
    }>;
    weak_knowledge: Array<{
      area_key: string;
      area_name: string;
      reason: string;
    }>;
    stale_knowledge: Array<{
      area_key: string;
      area_name: string;
      days_since_update: number;
    }>;
  };

  // WHAT TO ASK NEXT: for Phase 9
  next_questions: Array<{
    area_key: string;
    concept: string;
    priority: number;
    reason: string;
  }>;
}

/**
 * Generate the complete machine-readable Knowledge Quality Assessment.
 * This is the main function that produces the Phase 7 output.
 */
export async function generateKnowledgeAssessment(organisationId: string): Promise<KnowledgeQualityAssessment> {
  const states = await getFullKnowledgeState(organisationId);
  const gaps = await findKnowledgeGaps(organisationId);
  const qualityMetrics = await calculateQualityMetrics(organisationId);

  // Build coverage
  const populated: string[] = [];
  const sparse: string[] = [];
  const absent: string[] = [];
  const perAreaCoverage: Record<string, any> = {};

  for (const state of states) {
    const total = state.entity_count + state.fact_count;
    let level: 'populated' | 'sparse' | 'absent';
    if (total >= 5) { level = 'populated'; populated.push(state.area_key); }
    else if (total >= 1) { level = 'sparse'; sparse.push(state.area_key); }
    else { level = 'absent'; absent.push(state.area_key); }

    perAreaCoverage[state.area_key] = {
      entities: state.entity_count,
      facts: state.fact_count,
      relationships: state.relationship_count,
      coverage_level: level,
    };
  }

  // Build quality per-item assessments
  const allFacts = states.flatMap((s) => s.facts);
  const allEntities = states.flatMap((s) => s.entities);
  const allRelationships = states.flatMap((s) => s.relationships);
  const allItems = [...allFacts, ...allEntities, ...allRelationships];

  const perItemAssessments = allItems.map((item) =>
    assessItemQuality(item, allItems as any, 0) // TODO: get actual supersession depth
  );

  // Quality breakdown
  const avgProvenance = perItemAssessments.length > 0
    ? perItemAssessments.reduce((s, a) => s + a.provenance_strength, 0) / perItemAssessments.length
    : 0;
  const avgConfidence = perItemAssessments.length > 0
    ? perItemAssessments.reduce((s, a) => s + a.confidence, 0) / perItemAssessments.length
    : 0;
  const avgRecency = perItemAssessments.length > 0
    ? perItemAssessments.reduce((s, a) => s + a.recency_days, 0) / perItemAssessments.length
    : 0;
  const avgCorroboration = perItemAssessments.length > 0
    ? perItemAssessments.reduce((s, a) => s + a.corroboration_count, 0) / perItemAssessments.length
    : 0;
  const avgSpecificity = perItemAssessments.length > 0
    ? perItemAssessments.reduce((s, a) => s + a.specificity, 0) / perItemAssessments.length
    : 0;
  const avgCompleteness = perItemAssessments.length > 0
    ? perItemAssessments.reduce((s, a) => s + a.completeness, 0) / perItemAssessments.length
    : 0;

  // Build conflicts
  const allConflicts = states.flatMap((s) => s.contradictions);
  const totalSuperseded = allFacts.filter((f) => f.superseded_at).length +
    allEntities.filter((e) => e.superseded_at).length;

  // Build gaps
  const missingKnowledge = gaps
    .filter((g) => g.gap_type === 'no_knowledge')
    .map((g) => ({ area_key: g.area_key, area_name: g.area_name, reason: g.evidence }));

  const weakKnowledge = gaps
    .filter((g) => g.gap_type === 'shallow_knowledge' || g.gap_type === 'unconfirmed_knowledge')
    .map((g) => ({ area_key: g.area_key, area_name: g.area_name, reason: g.evidence }));

  const staleKnowledge = gaps
    .filter((g) => g.gap_type === 'core_concept_missing') // Using this as proxy for stale
    .map((g) => ({ area_key: g.area_key, area_name: g.area_name, days_since_update: 0 }));

  // Build next questions
  const nextQuestions = await getNextQuestions(organisationId, { limit: 10 });

  return {
    organisation_id: organisationId,
    assessed_at: new Date().toISOString(),

    coverage: {
      populated,
      sparse,
      absent,
      total_entities: allEntities.length,
      total_facts: allFacts.length,
      total_relationships: allRelationships.length,
      per_area: perAreaCoverage,
    },

    quality: {
      overall_score: qualityMetrics.overall,
      per_area_score: qualityMetrics.per_area,
      per_item: perItemAssessments,
      breakdown: {
        average_provenance: Math.round(avgProvenance * 100) / 100,
        average_confidence: Math.round(avgConfidence * 100) / 100,
        average_recency_days: Math.round(avgRecency),
        average_corroboration: Math.round(avgCorroboration * 100) / 100,
        average_specificity: Math.round(avgSpecificity * 100) / 100,
        average_completeness: Math.round(avgCompleteness * 100) / 100,
        confirmed_rate: qualityMetrics.breakdown.confirmation,
        candidate_rate: qualityMetrics.breakdown.confidence > 0 ? 1 - qualityMetrics.breakdown.confirmation : 1,
      },
    },

    conflicts: {
      total: allConflicts.length,
      unresolved: allConflicts.map((c) => ({
        area_key: states.find((s) => s.contradictions.includes(c))?.area_key ?? 'unknown',
        subject: c.subject,
        predicate: c.predicate,
        values: c.values,
        fact_ids: c.fact_ids,
      })),
      superseded_total: totalSuperseded,
    },

    gaps: {
      missing_knowledge: missingKnowledge,
      weak_knowledge: weakKnowledge,
      stale_knowledge: staleKnowledge,
    },

    next_questions: nextQuestions.map((q) => ({
      area_key: q.area_key,
      concept: q.concept,
      priority: q.priority,
      reason: q.reasoning,
    })),
  };
}

/**
 * Calculate quality metrics for the genome.
 * This is what Phase 8 returns as the "genome health" response.
 */
export async function calculateQualityMetrics(organisationId: string): Promise<GenomeQualityMetrics> {
  const states = await getFullKnowledgeState(organisationId);
  const gaps = await findKnowledgeGaps(organisationId);

  const perArea: Record<string, number> = {};
  let totalItems = 0;
  let confirmedItems = 0;
  let candidateItems = 0;
  let contradictedItems = 0;
  let totalConfidence = 0;
  let totalConfidenceCount = 0;
  let totalFreshness = 0;
  let freshnessCount = 0;

  for (const state of states) {
    // Area score: based on coverage, confidence, confirmation
    const areaItems = state.entity_count + state.fact_count;
    const coverageScore = Math.min(100, areaItems * 10);
    const confidenceScore = state.confidence_stats.mean * 100;
    const confirmationRate = state.status_breakdown.confirmed / Math.max(1, areaItems);

    perArea[state.area_key] = Math.round(
      coverageScore * 0.4 +
      confidenceScore * 0.3 +
      confirmationRate * 100 * 0.3
    );

    totalItems += areaItems;
    confirmedItems += state.status_breakdown.confirmed;
    candidateItems += state.status_breakdown.candidate;
    contradictedItems += state.status_breakdown.contradicted;
    totalConfidence += state.confidence_stats.mean * areaItems;
    totalConfidenceCount += areaItems;

    if (state.newest_knowledge_days !== null) {
      totalFreshness += state.newest_knowledge_days;
      freshnessCount++;
    }
  }

  // Overall score
  const areaScores = Object.values(perArea);
  const overall = areaScores.length > 0
    ? Math.round(areaScores.reduce((a, b) => a + b, 0) / areaScores.length)
    : 0;

  // Gap-based penalties
  const highGaps = gaps.filter((g) => g.severity === 'high').length;
  const penalty = Math.min(20, highGaps * 5);

  return {
    overall: Math.max(0, overall - penalty),
    per_area: perArea,
    breakdown: {
      coverage: totalItems > 0 ? Math.min(100, totalItems * 10) / 100 : 0,
      confidence: totalConfidenceCount > 0 ? totalConfidence / totalConfidenceCount : 0,
      confirmation: totalItems > 0 ? confirmedItems / totalItems : 0,
      conflicts: contradictedItems,
      freshness: freshnessCount > 0 ? totalFreshness / freshnessCount : 0,
    },
    total_items: totalItems,
    confirmed_items: confirmedItems,
    candidate_items: candidateItems,
    contradicted_items: contradictedItems,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function computeStats(values: number[]): {
  mean: number;
  min: number;
  max: number;
  std_dev: number;
} {
  if (values.length === 0) {
    return { mean: 0, min: 0, max: 0, std_dev: 0 };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

  return {
    mean: Math.round(mean * 100) / 100,
    min,
    max,
    std_dev: Math.round(Math.sqrt(variance) * 100) / 100,
  };
}
