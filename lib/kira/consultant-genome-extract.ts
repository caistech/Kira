// lib/kira/consultant-genome-extract.ts
//
// STAGE B — consultant genome extraction from /talk interview transcript.
//
// When a consultant finishes a /talk conversation, this module extracts the consultant's
// structured genome: identity, methodology, frameworks, target clients, services, and
// engagement model. Results land in consultant_frameworks + consultant_genomes (the
// Stage-A tables), scoped to the consultant's own organisation_id.
//
// The interview IS the genome — the same seam the capture cron scaffolds rows around.
//
// @machine-callable — runs inside onConversationComplete, degrade-don't-fake.

import { createServiceClientV2 } from '@/lib/supabase/server';

// ─────────────────────────────────────────────────────────────────────────────
// LLM call
// ─────────────────────────────────────────────────────────────────────────────

interface ExtractLLMConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

interface TranscriptMessage {
  role: string;
  content: string;
}

async function callExtractLLM(transcript: string, config: ExtractLLMConfig): Promise<Record<string, unknown>> {
  const baseUrl = (config.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = config.model || process.env.KIRA_EXTRACTION_MODEL || 'gpt-4.1-mini';
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error('No API key for consultant genome extraction');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: transcript },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Consultant extraction LLM failed: ${response.status} ${response.statusText}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Consultant extraction LLM returned no JSON object');

  return JSON.parse(jsonMatch[0]);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTION PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You extract a consultant's structured profile from an onboarding interview transcript.

The consultant has just completed their first conversation with Kira, a business intelligence assistant. This interview captures their professional identity, methodology, target clients, services, and how they work.

Return ONLY JSON matching this shape:
{
  "identity": {
    "name": "string",
    "business_name": "string or null",
    "location": "string or null",
    "years_in_business": "number or null"
  },
  "framework": {
    "principles": [{"name": "string", "description": "string"}],
    "stages": [{"name": "string", "order": 1, "description": "string", "activities": ["string"]}],
    "terminology": {"term": "definition"},
    "outputs": ["deliverable names"],
    "diagnostic_method": "string describing how they assess a new client"
  },
  "target_client": {
    "industry": "string or null",
    "size": "string — e.g. small business, mid-market",
    "revenue_range": "string or null",
    "pain_points": ["common problems they solve"]
  },
  "industries": ["industries they serve"],
  "services": ["specific service offerings"],
  "engagement_models": ["how they structure engagements — e.g. project, retainer, audit"],
  "diagnostic_process": {"name": "string", "description": "string"},
  "delivery_process": {"name": "string", "description": "string"},
  "commercial_model": {"name": "string", "description": "string"},
  "areas_kira_can_assist": ["areas where AI assistance adds value for this consultant"],
  "areas_consultant_led": ["areas the consultant handles personally"]
}

RULES:
- Extract ONLY what the transcript establishes. Never invent.
- If the consultant did not discuss something, use an empty array or null.
- "areas_kira_can_assist" = where the AI assistant can help this consultant serve their clients.
- "areas_consultant_led" = where the consultant's human expertise is irreplaceable.
- Be specific and grounded, not generic.`;

// ─────────────────────────────────────────────────────────────────────────────
// TRANSCRIPT FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

function formatTranscript(messages: TranscriptMessage[]): string {
  return messages
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => {
      const role = m.role === 'agent' ? 'Kira' : 'Consultant';
      return `${role}: ${m.content}`;
    })
    .join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXTRACTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export interface ConsultantGenomeExtraction {
  framework: {
    principles: Array<{ name: string; description: string }>;
    stages: Array<{ name: string; order: number; description: string; activities: string[] }>;
    terminology: Record<string, string>;
    outputs: string[];
    diagnostic_method: string | null;
  };
  identity: Record<string, unknown>;
  target_client: Record<string, unknown>;
  industries: string[];
  services: string[];
  engagement_models: string[];
  diagnostic_process: Record<string, unknown>;
  delivery_process: Record<string, unknown>;
  commercial_model: Record<string, unknown>;
  areas_kira_can_assist: string[];
  areas_consultant_led: string[];
}

/**
 * Extract consultant genome from transcript messages and persist to consultant_frameworks + consultant_genomes.
 *
 * @param organisationId  The consultant's own organisation (ownership boundary).
 * @param transcriptMessages  The raw conversation turns.
 * @param config  LLM configuration (apiKey, baseUrl, model).
 * @returns  The extracted genome fields, or null on failure (degrade-don't-fake).
 */
export async function extractConsultantGenome(
  organisationId: string,
  transcriptMessages: TranscriptMessage[],
  config: ExtractLLMConfig,
): Promise<ConsultantGenomeExtraction | null> {
  const transcript = formatTranscript(transcriptMessages);
  if (transcript.trim().length < 100) {
    console.log('[consultant-genome-extract] transcript too short — skipping');
    return null;
  }

  let raw: Record<string, unknown>;
  try {
    raw = await callExtractLLM(transcript, config);
  } catch (error) {
    console.error('[consultant-genome-extract] LLM extraction failed:', error);
    return null;
  }

  // Normalise LLM output into typed shape, falling back to empty arrays/objects for missing fields
  const fw = (typeof raw.framework === 'object' ? raw.framework : {}) as Record<string, unknown>;
  const genome: ConsultantGenomeExtraction = {
    framework: {
      principles: Array.isArray(fw.principles) ? fw.principles : [],
      stages: Array.isArray(fw.stages) ? fw.stages : [],
      terminology: typeof fw.terminology === 'object' ? (fw.terminology as Record<string, string>) : {},
      outputs: Array.isArray(fw.outputs) ? fw.outputs : [],
      diagnostic_method: typeof fw.diagnostic_method === 'string' ? fw.diagnostic_method : null,
    },
    identity: typeof raw.identity === 'object' ? (raw.identity as Record<string, unknown>) : {},
    target_client: typeof raw.target_client === 'object' ? (raw.target_client as Record<string, unknown>) : {},
    industries: Array.isArray(raw.industries) ? raw.industries : [],
    services: Array.isArray(raw.services) ? raw.services : [],
    engagement_models: Array.isArray(raw.engagement_models) ? raw.engagement_models : [],
    diagnostic_process: typeof raw.diagnostic_process === 'object' ? (raw.diagnostic_process as Record<string, unknown>) : {},
    delivery_process: typeof raw.delivery_process === 'object' ? (raw.delivery_process as Record<string, unknown>) : {},
    commercial_model: typeof raw.commercial_model === 'object' ? (raw.commercial_model as Record<string, unknown>) : {},
    areas_kira_can_assist: Array.isArray(raw.areas_kira_can_assist) ? raw.areas_kira_can_assist : [],
    areas_consultant_led: Array.isArray(raw.areas_consultant_led) ? raw.areas_consultant_led : [],
  };

  // Persist — upsert by organisation_id (one genome per consultant org)
  await persistConsultantGenome(organisationId, genome, transcriptMessages);

  return genome;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert framework + genome rows for this organisation.
 * One framework row (latest version) + one genome row, scoped to organisation_id.
 */
async function persistConsultantGenome(
  organisationId: string,
  genome: ConsultantGenomeExtraction,
  transcriptMessages: TranscriptMessage[],
): Promise<void> {
  const db = createServiceClientV2();

  // 1) Framework row — upsert by organisation_id (one per org)
  const { data: existingFw } = await db
    .from('consultant_frameworks')
    .select('framework_id')
    .eq('organisation_id', organisationId)
    .limit(1);

  let frameworkId = existingFw?.[0]?.framework_id as string | undefined;

  if (!frameworkId) {
    const { data: inserted, error: fwErr } = await db
      .from('consultant_frameworks')
      .insert({
        organisation_id: organisationId,
        framework_name: genome.identity?.business_name || genome.identity?.name || 'Consultant Framework',
        framework_slug: `consultant-${organisationId.slice(0, 8)}`,
        framework_type: 'consulting',
        status: 'draft',
      })
      .select('framework_id')
      .single();

    if (fwErr) {
      console.error('[consultant-genome-extract] framework insert failed:', fwErr.message);
      return;
    }
    frameworkId = inserted.framework_id;
  }

  // Update framework with extracted methodology
  await db
    .from('consultant_frameworks')
    .update({
      principles: genome.framework.principles,
      stages: genome.framework.stages,
      terminology: genome.framework.terminology,
      outputs: genome.framework.outputs,
      diagnostic_method: genome.framework.diagnostic_method,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('framework_id', frameworkId);

  // 2) Genome row — upsert by organisation_id
  const { data: existingG } = await db
    .from('consultant_genomes')
    .select('genome_id')
    .eq('organisation_id', organisationId)
    .limit(1);

  const genomeRow = {
    organisation_id: organisationId,
    framework_id: frameworkId,
    identity: genome.identity,
    target_client: genome.target_client,
    industries: genome.industries,
    services: genome.services,
    engagement_models: genome.engagement_models,
    diagnostic_process: genome.diagnostic_process,
    delivery_process: genome.delivery_process,
    commercial_model: genome.commercial_model,
    areas_kira_can_assist: genome.areas_kira_can_assist,
    areas_consultant_led: genome.areas_consultant_led,
    extraction_version: '1.0',
    completeness: calculateCompleteness(genome),
    updated_at: new Date().toISOString(),
  };

  if (existingG?.length) {
    await db
      .from('consultant_genomes')
      .update(genomeRow)
      .eq('genome_id', existingG[0].genome_id);
  } else {
    const { error: gErr } = await db.from('consultant_genomes').insert(genomeRow);
    if (gErr) {
      console.error('[consultant-genome-extract] genome insert failed:', gErr.message);
    }
  }

  console.log(`[consultant-genome-extract] persisted genome for org ${organisationId.slice(0, 8)}`);
}

/**
 * Completeness score (0–1): what fraction of the genome sections have non-empty data.
 */
function calculateCompleteness(genome: ConsultantGenomeExtraction): number {
  const sections = [
    genome.identity && Object.keys(genome.identity).length > 1,
    genome.services.length > 0,
    genome.engagement_models.length > 0,
    genome.target_client && Object.keys(genome.target_client).length > 0,
    genome.framework.principles.length > 0,
    genome.framework.stages.length > 0,
    genome.areas_kira_can_assist.length > 0,
  ];
  const filled = sections.filter(Boolean).length;
  return Number((filled / sections.length).toFixed(2));
}
