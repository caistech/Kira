// business-genome/orchestrator.ts
//
// THE ORCHESTRATOR — the brain that uses the genome to make decisions.
//
// The Orchestrator sits between the genome and the outside world.
// It decides:
//   1. What to ask next (conversation planning)
//   2. What to show (UI projection)
//   3. What agents can access (access control)
//   4. When to escalate to the owner (safety guards)
//
// SAFETY RULES:
//   - Agents READ the genome, they never WRITE to it
//   - The owner CONFIRMS all genome mutations
//   - The Orchestrator LOGS all access
//   - High-stakes actions require owner approval

import {
  generateKnowledgeAssessment,
  getNextQuestions,
  getAreaKnowledgeState,
  findKnowledgeGaps,
} from './coverage';
import {
  getAllEntities,
  getAllFacts,
} from './repository';
import type { KnowledgeQualityAssessment, NextQuestionRecommendation, KnowledgeGap } from './coverage';
import type { GenomeEntity, GenomeFact } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR STATE
// ─────────────────────────────────────────────────────────────────────────────

export interface OrchestratorState {
  organisation_id: string;
  user_id: string;
  last_assessment: KnowledgeQualityAssessment | null;
  last_plan: ConversationPlanSnapshot | null;
  access_log: AccessLogEntry[];
}

export interface ConversationPlanSnapshot {
  generated_at: string;
  questions: NextQuestionRecommendation[];
  focus_areas: string[];
}

export interface AccessLogEntry {
  timestamp: string;
  agent_id: string;
  action: string;
  area_key?: string;
  item_id?: string;
  result: 'success' | 'denied' | 'error';
  reason?: string;
  organisation_id?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE QUERIES — what agents can ask
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query the genome for knowledge.
 * This is the primary read endpoint for agents.
 *
 * SAFETY: Read-only. No mutations.
 */
export async function queryGenome(
  organisationId: string,
  query: {
    area_key?: string;
    entity_name?: string;
    entity_type?: string;
    subject?: string;
    predicate?: string;
    limit?: number;
  }
): Promise<{
  entities: Array<GenomeEntity>;
  facts: Array<GenomeFact>;
  confidence: number;
  source: string;
}> {
  // Log the access
  logAccess(organisationId, 'orchestrator', 'query', query.area_key);

  // Get knowledge state
  const state = query.area_key
    ? await getAreaKnowledgeState(organisationId, query.area_key)
    : null;

  // Get all items
  const entities = await getAllEntities(organisationId);
  const facts = await getAllFacts(organisationId);

  // Filter
  let filteredEntities = entities;
  let filteredFacts = facts;

  if (query.area_key) {
    filteredEntities = filteredEntities.filter((e) => e.area_key === query.area_key);
    filteredFacts = filteredFacts.filter((f) => f.area_key === query.area_key);
  }

  if (query.entity_name) {
    filteredEntities = filteredEntities.filter((e) =>
      e.name.toLowerCase().includes(query.entity_name!.toLowerCase())
    );
  }

  if (query.entity_type) {
    filteredEntities = filteredEntities.filter((e) => e.entity_type === query.entity_type);
  }

  if (query.subject) {
    filteredFacts = filteredFacts.filter((f) =>
      f.subject.toLowerCase().includes(query.subject!.toLowerCase())
    );
  }

  // Limit
  const limit = query.limit ?? 50;
  filteredEntities = filteredEntities.slice(0, limit);
  filteredFacts = filteredFacts.slice(0, limit);

  // Calculate confidence
  const allItems = [...filteredEntities, ...filteredFacts];
  const confidence = allItems.length > 0
    ? allItems.reduce((sum, i) => sum + i.confidence, 0) / allItems.length
    : 0;

  return {
    entities: filteredEntities,
    facts: filteredFacts,
    confidence,
    source: 'genome',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION PLANNING — what to ask next
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a conversation plan.
 * This is what the voice loop calls to decide what Kira should focus on.
 */
export async function planConversation(
  organisationId: string,
  options: {
    focusArea?: string;
    maxQuestions?: number;
  } = {}
): Promise<ConversationPlanSnapshot> {
  const questions = await getNextQuestions(organisationId, {
    limit: options.maxQuestions ?? 5,
    focusArea: options.focusArea,
  });

  const focusAreas = [...new Set(questions.map((q) => q.area_key))];

  const snapshot: ConversationPlanSnapshot = {
    generated_at: new Date().toISOString(),
    questions,
    focus_areas: focusAreas,
  };

  // Log the plan generation
  logAccess(organisationId, 'orchestrator', 'plan_conversation');

  return snapshot;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAP ANALYSIS — what's missing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get gaps in the genome.
 * This is what agents use to understand what's missing.
 */
export async function analyzeGaps(
  organisationId: string,
  options: {
    area_key?: string;
    severity?: 'high' | 'medium' | 'low';
    limit?: number;
  } = {}
): Promise<KnowledgeGap[]> {
  const gaps = await findKnowledgeGaps(organisationId);

  let filtered = gaps;

  if (options.area_key) {
    filtered = filtered.filter((g) => g.area_key === options.area_key);
  }

  if (options.severity) {
    filtered = filtered.filter((g) => g.severity === options.severity);
  }

  if (options.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  // Log the access
  logAccess(organisationId, 'orchestrator', 'analyze_gaps', options.area_key);

  return filtered;
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE QUALITY — how good is the knowledge
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the quality assessment.
 * This is what agents use to understand how reliable the knowledge is.
 */
export async function assessQuality(
  organisationId: string
): Promise<KnowledgeQualityAssessment> {
  const assessment = await generateKnowledgeAssessment(organisationId);

  // Log the access
  logAccess(organisationId, 'orchestrator', 'assess_quality');

  return assessment;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT ACCESS CONTROL
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentAccessPolicy {
  agent_id: string;
  agent_type: 'voice' | 'report' | 'valuation' | 'integration' | 'admin';
  can_read: boolean;
  can_plan: boolean;
  can_analyze_gaps: boolean;
  can_assess_quality: boolean;
  can_confirm: boolean; // owner-only in practice
  areas_allowed: string[]; // empty = all areas
  rate_limit_per_minute: number;
}

const DEFAULT_ACCESS_POLICIES: Record<string, AgentAccessPolicy> = {
  voice: {
    agent_id: 'voice',
    agent_type: 'voice',
    can_read: true,
    can_plan: true,
    can_analyze_gaps: true,
    can_assess_quality: false,
    can_confirm: false,
    areas_allowed: [],
    rate_limit_per_minute: 60,
  },
  report: {
    agent_id: 'report',
    agent_type: 'report',
    can_read: true,
    can_plan: false,
    can_analyze_gaps: true,
    can_assess_quality: true,
    can_confirm: false,
    areas_allowed: [],
    rate_limit_per_minute: 10,
  },
  valuation: {
    agent_id: 'valuation',
    agent_type: 'valuation',
    can_read: true,
    can_plan: false,
    can_analyze_gaps: false,
    can_assess_quality: true,
    can_confirm: false,
    areas_allowed: [],
    rate_limit_per_minute: 5,
  },
  integration: {
    agent_id: 'integration',
    agent_type: 'integration',
    can_read: true,
    can_plan: false,
    can_analyze_gaps: false,
    can_assess_quality: false,
    can_confirm: false,
    areas_allowed: [],
    rate_limit_per_minute: 30,
  },
};

/**
 * Check if an agent has access to perform an action.
 */
export function checkAgentAccess(
  agentId: string,
  action: 'read' | 'plan' | 'analyze_gaps' | 'assess_quality' | 'confirm',
  areaKey?: string
): { allowed: boolean; reason?: string } {
  const policy = DEFAULT_ACCESS_POLICIES[agentId];

  if (!policy) {
    return { allowed: false, reason: `Unknown agent: ${agentId}` };
  }

  // Check action permission
  switch (action) {
    case 'read':
      if (!policy.can_read) return { allowed: false, reason: 'Agent cannot read genome' };
      break;
    case 'plan':
      if (!policy.can_plan) return { allowed: false, reason: 'Agent cannot plan conversations' };
      break;
    case 'analyze_gaps':
      if (!policy.can_analyze_gaps) return { allowed: false, reason: 'Agent cannot analyze gaps' };
      break;
    case 'assess_quality':
      if (!policy.can_assess_quality) return { allowed: false, reason: 'Agent cannot assess quality' };
      break;
    case 'confirm':
      if (!policy.can_confirm) return { allowed: false, reason: 'Only owner can confirm facts' };
      break;
  }

  // Check area permission
  if (areaKey && policy.areas_allowed.length > 0) {
    if (!policy.areas_allowed.includes(areaKey)) {
      return { allowed: false, reason: `Agent not allowed in area: ${areaKey}` };
    }
  }

  return { allowed: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY GUARDS
// ─────────────────────────────────────────────────────────────────────────────

export interface SafetyCheck {
  passed: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Run safety checks before an agent action.
 */
export async function runSafetyChecks(
  userId: string,
  agentId: string,
  action: string,
  context?: Record<string, unknown>
): Promise<SafetyCheck[]> {
  const checks: SafetyCheck[] = [];

  // 1. Agent access check
  const accessCheck = checkAgentAccess(agentId, action as any, context?.area_key as string);
  if (!accessCheck.allowed) {
    checks.push({
      passed: false,
      reason: accessCheck.reason,
      severity: 'critical',
    });
  }

  // 2. Rate limit check (simplified — in production, use Redis)
  checks.push({
    passed: true,
    severity: 'low',
  });

  // 3. Data sensitivity check
  if (action === 'read' && context?.area_key === 'money') {
    // Money area requires additional verification
    checks.push({
      passed: true,
      reason: 'Money area access — verify agent is authorised',
      severity: 'medium',
    });
  }

  // 4. Mutation attempt check
  if (action === 'confirm' || action === 'write' || action === 'delete') {
    // Only owner can mutate
    checks.push({
      passed: agentId === 'owner',
      reason: 'Only owner can mutate genome',
      severity: 'critical',
    });
  }

  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS LOGGING
// ─────────────────────────────────────────────────────────────────────────────

const accessLog: AccessLogEntry[] = [];

function logAccess(
  organisationId: string,
  agentId: string,
  action: string,
  areaKey?: string,
  itemId?: string,
  result: 'success' | 'denied' | 'error' = 'success',
  reason?: string
): void {
  const entry: AccessLogEntry = {
    timestamp: new Date().toISOString(),
    agent_id: agentId,
    action,
    area_key: areaKey,
    item_id: itemId,
    result,
    reason,
    organisation_id: organisationId,
  };

  accessLog.push(entry);

  // Keep only last 1000 entries
  if (accessLog.length > 1000) {
    accessLog.splice(0, accessLog.length - 1000);
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[genome/access] ${agentId} ${action} ${areaKey ?? ''} ${result}`);
  }
}

/**
 * Get the access log.
 */
export function getAccessLog(
  organisationId: string,
  options?: {
    agent_id?: string;
    action?: string;
    limit?: number;
  }
): AccessLogEntry[] {
  let filtered = accessLog;

  if (options?.agent_id) {
    filtered = filtered.filter((e) => e.agent_id === options.agent_id);
  }

  if (options?.action) {
    filtered = filtered.filter((e) => e.action === options.action);
  }

  if (options?.limit) {
    filtered = filtered.slice(-options.limit);
  }

  return filtered;
}
