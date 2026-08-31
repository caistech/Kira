// business-genome/conversation-loop.ts
//
// THE CONVERSATION → GENOME FEEDBACK LOOP
//
// This module answers: "Given what we know and don't know, what should Kira ask next?"
//
// It's the bridge between the genome knowledge state and the voice conversation.
// Kira doesn't just randomly ask questions — she uses the genome gaps to ask
// the most valuable question at the right moment.
//
// THE LOOP:
//   1. Before a call: get the next-best-questions from the genome
//   2. During the call: when a topic comes up, call area_agenda for context
//   3. After the call: extract new knowledge, re-assess gaps
//
// This module handles step 1 and provides context for step 2.

import { getNextQuestions, getAreaKnowledgeState, findKnowledgeGaps } from './coverage';
import { ONTOLOGY_AREAS } from './ontology/v1/areas';
import type { NextQuestionRecommendation, KnowledgeGap } from './coverage';

// ─────────────────────────────────────────────────────────────────────────────
// PRE-CALL PLANNING
// ─────────────────────────────────────────────────────────────────────────────

export interface ConversationPlan {
  organisation_id: string;
  generated_at: string;
  /** The top questions to work through, in priority order */
  questions: NextQuestionRecommendation[];
  /** Areas that need attention (for area_agenda context) */
  area_focus: Array<{
    area_key: string;
    area_name: string;
    priority: number;
    reason: string;
  }>;
  /** Opening suggestion — what to start with */
  opening_suggestion: {
    area_key: string;
    approach: string;
    reasoning: string;
  } | null;
}

/**
 * Generate a conversation plan before a call starts.
 * This is what the Orchestrator calls to decide what Kira should focus on.
 */
export async function generateConversationPlan(
  organisationId: string,
  options: {
    focusArea?: string;
    maxQuestions?: number;
  } = {}
): Promise<ConversationPlan> {
  const { focusArea, maxQuestions = 5 } = options;

  // Get the next-best-questions
  const questions = await getNextQuestions(organisationId, {
    limit: maxQuestions,
    focusArea,
  });

  // Get area priorities
  const areaFocus = questions.map((q) => ({
    area_key: q.area_key,
    area_name: q.area_name,
    priority: q.priority,
    reason: q.reasoning,
  }));

  // Determine opening suggestion
  const openingSuggestion = questions.length > 0
    ? {
        area_key: questions[0].area_key,
        approach: questions[0].suggested_approach,
        reasoning: questions[0].reasoning,
      }
    : null;

  return {
    organisation_id: organisationId,
    generated_at: new Date().toISOString(),
    questions,
    area_focus: areaFocus,
    opening_suggestion: openingSuggestion,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA AGENDA — what Kira knows about a specific area
// ─────────────────────────────────────────────────────────────────────────────

export interface AreaAgenda {
  area_key: string;
  area_name: string;
  /** What we already know in this area */
  known_facts: Array<{
    subject: string;
    predicate: string;
    value: string | null;
    confidence: number;
    status: string;
  }>;
  /** What's missing in this area */
  gaps: Array<{
    concept: string;
    gap_type: string;
    severity: string;
    suggested_question: string;
  }>;
  /** What to ask about in this area */
  suggested_questions: string[];
  /** Confidence in this area */
  confidence: number;
}

/**
 * Get the agenda for a specific area.
 * This is what Kira calls when a topic comes up during the call.
 *
 * "Let's look at pricing" → here's what we know, what's missing, and what to ask.
 */
export async function getAreaAgenda(
  organisationId: string,
  areaKey: string
): Promise<AreaAgenda | null> {
  const area = ONTOLOGY_AREAS.find((a) => a.key === areaKey);
  if (!area) return null;

  const state = await getAreaKnowledgeState(organisationId, areaKey);
  if (!state) return null;

  // Get gaps for this area
  const allGaps = await findKnowledgeGaps(organisationId);
  const areaGaps = allGaps.filter((g) => g.area_key === areaKey);

  // Build suggested questions from gaps
  const suggestedQuestions = areaGaps.map((gap) => {
    if (gap.gap_type === 'no_knowledge') {
      return `Tell me about how ${area.name.toLowerCase()} works in your business.`;
    }
    if (gap.gap_type === 'core_concept_missing') {
      return `Let's talk about ${gap.concept.replace(/_/g, ' ')}. ${area.ownerFacingQuestion}`;
    }
    if (gap.gap_type === 'contradiction_unresolved') {
      return `I want to clarify something about ${gap.concept}. Which value is correct?`;
    }
    if (gap.gap_type === 'unconfirmed_knowledge') {
      return `Can you confirm: is it still true that ${gap.concept}?`;
    }
    return `Tell me more about ${area.name.toLowerCase()}.`;
  });

  // Calculate confidence
  const allItems = [...state.entities, ...state.facts];
  const confidence = allItems.length > 0
    ? allItems.reduce((sum, i) => sum + i.confidence, 0) / allItems.length
    : 0;

  return {
    area_key: areaKey,
    area_name: area.name,
    known_facts: state.facts.map((f) => ({
      subject: f.subject,
      predicate: f.predicate,
      value: f.value,
      confidence: f.confidence,
      status: f.status,
    })),
    gaps: areaGaps.map((g) => ({
      concept: g.concept,
      gap_type: g.gap_type,
      severity: g.severity,
      suggested_question: g.suggested_question_area,
    })),
    suggested_questions: suggestedQuestions,
    confidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-CONVERSATION CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export interface ConversationContext {
  /** What we know about the current topic */
  current_area: AreaAgenda | null;
  /** What we know overall */
  overall_quality: {
    total_entities: number;
    total_facts: number;
    confidence_mean: number;
    confirmed_count: number;
  };
  /** What to steer toward */
  steering_suggestions: Array<{
    area_key: string;
    reason: string;
    priority: number;
  }>;
}

/**
 * Get context for an in-conversation decision.
 * This is what Kira calls when she needs to decide what to ask next during a call.
 */
export async function getConversationContext(
  organisationId: string,
  currentArea?: string
): Promise<ConversationContext> {
  // Get current area agenda if specified
  const currentAreaAgenda = currentArea
    ? await getAreaAgenda(organisationId, currentArea)
    : null;

  // Get overall quality
  const allQuestions = await getNextQuestions(organisationId, { limit: 10 });
  const totalEntities = allQuestions.length; // rough estimate
  const totalFacts = allQuestions.length;

  // Get steering suggestions (areas that need attention)
  const steeringSuggestions = allQuestions
    .filter((q) => q.priority > 30) // Only high-priority gaps
    .map((q) => ({
      area_key: q.area_key,
      reason: q.reasoning,
      priority: q.priority,
    }));

  return {
    current_area: currentAreaAgenda,
    overall_quality: {
      total_entities: totalEntities,
      total_facts: totalFacts,
      confidence_mean: 0.7, // TODO: get from quality metrics
      confirmed_count: 0,
    },
    steering_suggestions: steeringSuggestions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST-CALL REASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface PostCallAssessment {
  organisation_id: string;
  conversation_id: string;
  /** What we learned in this call */
  new_knowledge: {
    entities: number;
    facts: number;
    relationships: number;
  };
  /** How the genome changed */
  genome_change: {
    before: { entities: number; facts: number };
    after: { entities: number; facts: number };
    gaps_filled: string[];
    new_gaps: string[];
  };
  /** What to focus on next time */
  next_call_focus: Array<{
    area_key: string;
    priority: number;
    reason: string;
  }>;
}

/**
 * Assess what changed after a call ends.
 * This is called after genome extraction completes.
 */
export async function assessPostCall(
  organisationId: string,
  conversationId: string,
  extractionResult: {
    entities: number;
    facts: number;
    relationships: number;
  }
): Promise<PostCallAssessment> {
  // Get the new next-questions to see what changed
  const nextQuestions = await getNextQuestions(organisationId, { limit: 5 });

  return {
    organisation_id: organisationId,
    conversation_id: conversationId,
    new_knowledge: extractionResult,
    genome_change: {
      before: { entities: 0, facts: 0 }, // TODO: get before snapshot
      after: {
        entities: extractionResult.entities,
        facts: extractionResult.facts,
      },
      gaps_filled: [], // TODO: compare gaps before/after
      new_gaps: [], // TODO: compare gaps before/after
    },
    next_call_focus: nextQuestions.map((q) => ({
      area_key: q.area_key,
      priority: q.priority,
      reason: q.reasoning,
    })),
  };
}
