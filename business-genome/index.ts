// business-genome/index.ts
//
// THE BUSINESS GENOME MODULE — single entry point for all genome functionality.
//
// Import from this file to access the ontology, types, and repository.

// ─── Ontology ──────────────────────────────────────────────────────────────
export * from './ontology';

// ─── Types ─────────────────────────────────────────────────────────────────
export type {
  GenomeEntity,
  GenomeEntityWithRelations,
  GenomeFact,
  GenomeRelationship,
  GenomeEvent,
  GenomeEntityInput,
  GenomeFactInput,
  GenomeRelationshipInput,
  AreaCoverage,
  BusinessGenome,
} from './types';

// ─── Repository ────────────────────────────────────────────────────────────
export {
  createEntity,
  findEntity,
  getEntitiesByArea,
  getAllEntities,
  createFact,
  findFact,
  getFactsByArea,
  getFactsByEntity,
  getAllFacts,
  createRelationship,
  getRelationshipsByEntity,
  getRelationshipsByArea,
  getAllRelationships,
  supersedeFact,
  supersedeEntity,
  confirmFact,
  confirmEntity,
  getEvents,
  getAreaCoverage,
  upsertEntities,
  upsertFacts,
} from './repository';

// ─── Extraction ────────────────────────────────────────────────────────────
export {
  extractGenomeFromConversation,
  runGenomeExtraction,
} from './extract';

export { genomePostCallHook } from './post-call-hook';

// ─── Conflicts ─────────────────────────────────────────────────────────────
export {
  detectFactConflicts,
  detectCrossConversationConflicts,
  detectEntityDuplicates,
  getSupersessionChain,
  consolidateSupersessionChain,
  resolveConflictBySuperseding,
  resolveConflictByConfirmingExisting,
  markFactContradicted,
  getUnresolvedConflicts,
} from './conflicts';

export type {
  DetectedConflict,
  ConflictDetectionOptions,
  CrossConversationConflict,
  SupersessionChain,
  ConflictResolution,
} from './conflicts';

// ─── Coverage & Quality ────────────────────────────────────────────────────
export {
  getAreaKnowledgeState,
  getFullKnowledgeState,
  findKnowledgeGaps,
  getNextQuestions,
  calculateQualityMetrics,
  assessItemQuality,
  generateKnowledgeAssessment,
} from './coverage';

export type {
  AreaKnowledgeState,
  KnowledgeGap,
  NextQuestionRecommendation,
  GenomeQualityMetrics,
  ItemQualityAssessment,
  KnowledgeQualityAssessment,
} from './coverage';

// ─── Conversation Loop ─────────────────────────────────────────────────────
export {
  generateConversationPlan,
  getAreaAgenda,
  getConversationContext,
  assessPostCall,
} from './conversation-loop';

export type {
  ConversationPlan,
  AreaAgenda,
  ConversationContext,
  PostCallAssessment,
} from './conversation-loop';

// ─── Genome Area Focus ─────────────────────────────────────────────────────
export {
  buildGenomeAreaFocusFirstMessage,
  buildGenomeOverviewFirstMessage,
  isGenomeAreaKey,
  getBuyerQuestion,
  getOwnerQuestion,
  getAllAreaKeys,
  getAreaDefinition,
} from './genome-area-focus';

// ─── Orchestrator ──────────────────────────────────────────────────────────
export {
  queryGenome,
  planConversation,
  analyzeGaps,
  assessQuality,
  checkAgentAccess,
  runSafetyChecks,
  getAccessLog,
} from './orchestrator';

export type {
  OrchestratorState,
  ConversationPlanSnapshot,
  AccessLogEntry,
  AgentAccessPolicy,
  SafetyCheck,
} from './orchestrator';
