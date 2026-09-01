// business-genome/extract.ts
//
// THE STRUCTURED EXTRACTION PIPELINE — takes a conversation transcript and extracts
// typed entities, facts, and relationships into the Business Genome.
//
// This is a PARALLEL path to the existing memory-extract.ts. Both run after a call ends.
// memory-extract.ts writes to kira_memory (interaction/context memory).
// This writes to genome_* tables (structured business knowledge).
//
// The extraction is BUSINESS-AGNOSTIC — no plumbing-specific or construction-specific templates.
// The LLM infers entities and relationships dynamically from the conversation content.

import { buildExtractionPrompt, buildOntologySummary } from './extract-prompt';
import {
  createEntity,
  findEntity,
  createFact,
  findFact,
  createRelationship,
  supersedeFact,
} from './repository';
import { detectFactConflicts } from './conflicts';
import type { GenomeEntity, GenomeFact } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ExtractionItem {
  type: 'entity' | 'fact' | 'relationship';
  area_key: string;
  visibility?: 'org' | 'owner';
  // Entity fields
  entity_type?: string;
  name?: string;
  confidence?: number;
  // Fact fields
  entity_name?: string;
  subject?: string;
  predicate?: string;
  value?: string;
  value_type?: string;
  unit?: string;
  // Relationship fields
  subject_name?: string;
  subject_type?: string;
  object_name?: string;
  object_type?: string;
  object_value?: string;
}

interface ExtractionResult {
  entities: GenomeEntity[];
  facts: GenomeFact[];
  relationships: unknown[];
  errors: string[];
  raw_items: number;
  processed_items: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

const VALID_AREA_KEYS = new Set([
  'work_sources', 'pricing', 'delivery', 'money', 'customers',
  'people', 'assets', 'compliance_calendar', 'systems_records',
]);

const VALID_ENTITY_TYPES = new Set([
  'person', 'organisation', 'system', 'asset', 'vehicle', 'equipment',
  'property', 'licence', 'insurance', 'pricing_rule', 'cost_category',
  'process', 'service', 'insight', 'preference', 'correction', 'document',
  'financial_account', 'role',
]);

const VALID_PREDICATES = new Set([
  'buys', 'supplies_to', 'supplied_by', 'supplies_from', 'employs', 'contracted_by', 'manages', 'performs',
  'uses', 'is_system_for', 'costs', 'charges', 'owns', 'leases', 'supplies',
  'depends_on', 'precedes', 'integrates_with', 'required_for', 'refers',
  'is', 'has', 'generates', 'requires',
]);

const VALID_VISIBILITY = new Set(['org', 'owner']);

function validateItem(item: ExtractionItem): string | null {
  if (!item.area_key || !VALID_AREA_KEYS.has(item.area_key)) {
    return `Invalid area_key: ${item.area_key}`;
  }
  if (item.type === 'entity') {
    if (!item.name) return 'Entity missing name';
    if (!item.entity_type || !VALID_ENTITY_TYPES.has(item.entity_type)) {
      return `Invalid entity_type: ${item.entity_type}`;
    }
    if (item.visibility && !VALID_VISIBILITY.has(item.visibility)) {
      return `Invalid visibility: ${item.visibility}`;
    }
  }
  if (item.type === 'fact') {
    if (!item.subject) return 'Fact missing subject';
    if (!item.predicate) return 'Fact missing predicate';
    if (item.visibility && !VALID_VISIBILITY.has(item.visibility)) {
      return `Invalid visibility: ${item.visibility}`;
    }
  }
  if (item.type === 'relationship') {
    if (!item.subject_name) return 'Relationship missing subject_name';
    if (!item.predicate || !VALID_PREDICATES.has(item.predicate)) {
      return `Invalid predicate: ${item.predicate}`;
    }
    if (item.visibility && !VALID_VISIBILITY.has(item.visibility)) {
      return `Invalid visibility: ${item.visibility}`;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM CALL
// ─────────────────────────────────────────────────────────────────────────────
// Supports OpenAI-compatible endpoints via OPENAI_BASE_URL (e.g. Ollama, vLLM).
// Same pattern as lib/kira/memory-extract.ts.

interface ExtractionLLMConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

async function callExtractionLLM(
  transcript: string,
  config: ExtractionLLMConfig
): Promise<ExtractionItem[]> {
  const prompt = buildExtractionPrompt(buildOntologySummary());

  const baseUrl = (config.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = config.model || process.env.KIRA_EXTRACTION_MODEL || 'gpt-4.1-mini';
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('No API key provided for extraction LLM');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Extraction LLM failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  // Parse JSON from the response (handle markdown code blocks)
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Extraction LLM returned no JSON array');
  }

  const items = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(items)) {
    throw new Error('Extraction LLM returned non-array');
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSCRIPT FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

interface TranscriptMessage {
  role: string;
  content: string;
}

function formatTranscript(messages: TranscriptMessage[]): string {
  return messages
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => {
      const role = m.role === 'agent' ? 'Kira' : 'Owner';
      return `${role}: ${m.content}`;
    })
    .join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXTRACTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract structured genome data from a conversation transcript.
 *
 * @param userId - The business owner's user ID
 * @param conversationId - The conversation ID (for provenance)
 * @param transcriptMessages - The raw transcript messages
 * @param config - LLM configuration (apiKey, baseUrl, model)
 * @returns ExtractionResult with created entities, facts, relationships, and errors
 */
export async function extractGenomeFromConversation(
  organisationId: string,
  userId: string,
  conversationId: string,
  transcriptMessages: TranscriptMessage[],
  config: ExtractionLLMConfig
): Promise<ExtractionResult> {
  const result: ExtractionResult = {
    entities: [],
    facts: [],
    relationships: [],
    errors: [],
    raw_items: 0,
    processed_items: 0,
  };

  // Format transcript for the LLM
  const transcript = formatTranscript(transcriptMessages);
  if (transcript.trim().length < 50) {
    result.errors.push('Transcript too short for meaningful extraction');
    return result;
  }

  // Call the LLM
  let items: ExtractionItem[];
  try {
    items = await callExtractionLLM(transcript, config);
  } catch (error) {
    result.errors.push(`LLM extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }

  result.raw_items = items.length;

  // Process in three phases — entities first, then facts, then relationships.
  // Entities must be persisted before facts/relationships so that subject and object
  // name references resolve regardless of the order the LLM returned the items in.
  // This guarantees a relationship never fails with "subject entity not found" merely
  // because its entity appeared later in the same extraction pass.

  // Phase 1: entities
  for (const item of items) {
    if (item.type !== 'entity') continue;
    try {
      // Validate
      const error = validateItem(item);
      if (error) {
        result.errors.push(error);
        continue;
      }

      const confidence = item.confidence ?? 0.5;

      // Find or create entity
      const existing = await findEntity(organisationId, item.entity_type!, item.name!);
      if (existing) {
        result.entities.push(existing);
      } else {
const entity = await createEntity({
            organisation_id: organisationId,
            user_id: userId,
            area_key: item.area_key,
            entity_type: item.entity_type!,
            name: item.name!,
            confidence,
            source_type: 'conversation',
            source_id: conversationId,
            visibility: item.visibility ?? 'org',
          });
        result.entities.push(entity);
      }
      result.processed_items++;
    } catch (error) {
      result.errors.push(
        `Failed to process ${item.type}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Phase 2: facts (Phase 1 entities are linkable now)
  for (const item of items) {
    if (item.type !== 'fact') continue;
    try {
      // Validate
      const error = validateItem(item);
      if (error) {
        result.errors.push(error);
        continue;
      }

      const confidence = item.confidence ?? 0.5;

      // Find the entity this fact is about (if any)
      let entityId: string | undefined;
      if (item.entity_name && item.entity_type) {
        const entity = await findEntity(organisationId, item.entity_type, item.entity_name);
        entityId = entity?.id;
      }

      // Check for existing fact with same subject+predicate
      const existing = await findFact(organisationId, item.area_key, item.subject!, item.predicate!);

      if (existing && !existing.superseded_at) {
        // Detect conflicts before superseding
        const conflicts = await detectFactConflicts(organisationId, {
          area_key: item.area_key,
          subject: item.subject!,
          predicate: item.predicate!,
          value: item.value ?? null,
          value_type: (item.value_type as any) ?? 'text',
          unit: item.unit ?? null,
          entity_id: entityId ?? null,
        });

        if (conflicts.length > 0) {
          // Log conflicts for review
          for (const conflict of conflicts) {
            result.errors.push(
              `Conflict detected: ${conflict.description} (severity: ${conflict.severity}, suggested: ${conflict.suggested_action})`
            );
          }

          // If high severity, don't auto-supersede — flag for review
          const hasHighSeverity = conflicts.some((c) => c.severity === 'high');
          if (hasHighSeverity && existing.status === 'confirmed') {
            result.errors.push(
              `High-severity conflict with confirmed fact — skipping auto-supersede. Fact ID: ${existing.id}`
            );
            result.facts.push(existing);
            result.processed_items++;
            continue;
          }
        }

        // Check if value changed → supersede
        if (existing.value !== item.value && item.value !== undefined) {
          const newFact = await supersedeFact(
            existing.id,
            {
              value: item.value,
              value_type: (item.value_type as any) ?? 'text',
              unit: item.unit ?? undefined,
              confidence,
              entity_id: entityId,
              source_type: 'conversation',
              source_id: conversationId,
            },
            'conversation',
            conversationId
          );
          result.facts.push(newFact);
        } else {
          result.facts.push(existing);
        }
      } else {
const fact = await createFact({
            organisation_id: organisationId,
            user_id: userId,
            entity_id: entityId,
            area_key: item.area_key,
            subject: item.subject!,
            predicate: item.predicate!,
            value: item.value ?? undefined,
            value_type: (item.value_type as any) ?? 'text',
            unit: item.unit ?? undefined,
            confidence,
            source_type: 'conversation',
            source_id: conversationId,
            visibility: item.visibility,
          });
        result.facts.push(fact);
      }
      result.processed_items++;
    } catch (error) {
      result.errors.push(
        `Failed to process ${item.type}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Phase 3: relationships (Phase 1 entities provide the subject/object references)
  for (const item of items) {
    if (item.type !== 'relationship') continue;
    try {
      // Validate
      const error = validateItem(item);
      if (error) {
        result.errors.push(error);
        continue;
      }

      const confidence = item.confidence ?? 0.5;

      // Find subject entity
      const subjectEntity = await findEntity(organisationId, item.subject_type!, item.subject_name!);
      if (!subjectEntity) {
        result.errors.push(`Subject entity not found: ${item.subject_name}`);
        continue;
      }

      // Find or create object entity
      let objectEntityId: string | undefined;
      if (item.object_name && item.object_type) {
        let objEntity = await findEntity(organisationId, item.object_type, item.object_name);
        if (!objEntity) {
          objEntity = await createEntity({
            organisation_id: organisationId,
            user_id: userId,
            area_key: item.area_key,
            entity_type: item.object_type,
            name: item.object_name,
            confidence: confidence * 0.8,
            source_type: 'conversation',
            source_id: conversationId,
            visibility: item.visibility ?? 'org',
          });
        }
        objectEntityId = objEntity.id;
      }

      const rel = await createRelationship({
        organisation_id: organisationId,
        user_id: userId,
        subject_entity_id: subjectEntity.id,
        predicate: item.predicate!,
        object_entity_id: objectEntityId,
        object_value: item.object_value ?? undefined,
        area_key: item.area_key,
        confidence,
        source_type: 'conversation',
        source_id: conversationId,
        visibility: item.visibility,
      });
      result.relationships.push(rel);
      result.processed_items++;
    } catch (error) {
      result.errors.push(
        `Failed to process ${item.type}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE FUNCTION — for integration into convai.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run genome extraction as part of the post-call pipeline.
 * This is the function called from convai.ts onConversationComplete.
 *
 * Degrade-don't-fake: if extraction fails, it logs and returns errors
 * but never throws — the memory pipeline must not be blocked.
 */
export async function runGenomeExtraction(params: {
  organisationId: string;
  userId: string;
  conversationId: string;
  transcriptMessages: TranscriptMessage[];
  apiKey: string;
  baseUrl?: string;
  model?: string;
}): Promise<ExtractionResult> {
  try {
    const result = await extractGenomeFromConversation(
      params.organisationId,
      params.userId,
      params.conversationId,
      params.transcriptMessages,
      {
        apiKey: params.apiKey,
        baseUrl: params.baseUrl,
        model: params.model,
      }
    );

    if (result.errors.length > 0) {
      console.warn(
        `[genome/extract] extraction completed with ${result.errors.length} errors:`,
        result.errors.join('; ')
      );
    }

    console.log(
      `[genome/extract] extracted ${result.processed_items} items ` +
      `(${result.entities.length} entities, ${result.facts.length} facts, ` +
      `${result.relationships.length} relationships) from conversation ${params.conversationId}`
    );

    return result;
  } catch (error) {
    console.error('[genome/extract] extraction failed:', error);
    return {
      entities: [],
      facts: [],
      relationships: [],
      errors: [`Extraction failed: ${error instanceof Error ? error.message : String(error)}`],
      raw_items: 0,
      processed_items: 0,
    };
  }
}
