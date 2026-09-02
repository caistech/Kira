// business-genome/e2e-validation.test.ts
//
// END-TO-END VALIDATION SUITE — the 10-scenario test the system must pass.
//
// This test runs the complete lifecycle for one business, then verifies
// cross-org isolation with a second business.
//
// For each business, it tests:
//   1. Start with no knowledge
//   2. Extract from conversations
//   3. Establish provenance
//   4. Introduce contradictions
//   5. Introduce ambiguity
//   6. Create knowledge gaps
//   7. Ask what to ask next
//   8. Feed answer back
//   9. Query through orchestrator
//  10. Test agent safety boundary
//
// CRITICAL: Verifies cross-org isolation — Org A cannot see Org B's genome data.
//
// REQUIREMENTS:
//   - OPENAI_API_KEY or OPENAI_BASE_URL must be set for extraction tests
//   - Supabase connection must be available
//   - All genome tables must exist (run migration first)

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { extractGenomeFromConversation } from './extract';
import {
  getAllEntities,
  getAllFacts,
  getFactsByArea,
  getEntitiesByArea,
  findEntity,
  findFact,
  createEntity,
  createFact,
  supersedeFact,
  confirmFact,
  getEvents,
  getAreaCoverage,
  getAllRelationships,
} from './repository';
import {
  getAreaKnowledgeState,
  getFullKnowledgeState,
  findKnowledgeGaps,
  getNextQuestions,
  calculateQualityMetrics,
  generateKnowledgeAssessment,
} from './coverage';
import {
  detectFactConflicts,
  detectCrossConversationConflicts,
  getSupersessionChain,
  resolveConflictByConfirmingExisting,
} from './conflicts';
import {
  queryGenome,
  planConversation,
  analyzeGaps,
  assessQuality,
  checkAgentAccess,
  runSafetyChecks,
} from './orchestrator';
import { generateConversationPlan, getAreaAgenda } from './conversation-loop';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const hasApi = !!(process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL);

const llmConfig = {
  apiKey: process.env.OPENAI_API_KEY ?? '',
  baseUrl: process.env.OPENAI_BASE_URL,
  model: process.env.KIRA_EXTRACTION_MODEL,
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST IDENTITY SETUP
// ─────────────────────────────────────────────────────────────────────────────

interface TestOrg {
  organisationId: string;
  personId: string;
  userId: string;
}

/**
 * Create a test organisation with person, auth credential, and membership.
 * Returns the canonical IDs needed for genome operations.
 */
async function createTestOrg(
  orgName: string,
  email: string,
  userId: string
): Promise<TestOrg> {
  const sb = createServiceClientV2();

  // 1. Create organisation (organisation_id = a fresh UUID)
  const orgId = crypto.randomUUID();
  const { error: orgError } = await sb.from('organisations').upsert({
    organisation_id: orgId,
    legal_name: orgName,
    trading_name: orgName,
    status: 'active',
  }, { onConflict: 'organisation_id' });
  if (orgError) throw new Error(`Failed to create test org: ${orgError.message}`);

  // 2. Create person
  const personId = userId; // Use userId as personId for simplicity
  const { error: personError } = await sb.from('persons').upsert({
    person_id: personId,
    email,
    first_name: orgName,
    status: 'active',
  }, { onConflict: 'person_id' });
  if (personError) throw new Error(`Failed to create test person: ${personError.message}`);

  // 3. Create auth credential (links auth_user_id → person)
  const { error: credError } = await sb.from('auth_credentials').upsert({
    person_id: personId,
    auth_provider: 'email',
    auth_user_id: userId,
    status: 'active',
  }, { onConflict: 'auth_provider,auth_user_id' });
  if (credError) throw new Error(`Failed to create auth credential: ${credError.message}`);

  // 4. Create organisation membership
  const { error: memError } = await sb.from('organisation_memberships').upsert({
    organisation_id: orgId,
    person_id: personId,
    role: 'owner',
    status: 'active',
    valid_from: new Date().toISOString(),
  }, { onConflict: 'organisation_id,person_id,role' });
  if (memError) throw new Error(`Failed to create membership: ${memError.message}`);

  return { organisationId: orgId, personId, userId };
}

/**
 * Clean all genome data for an organisation.
 */
async function cleanOrgGenomeData(organisationId: string): Promise<void> {
  const sb = createServiceClientV2();
  // Delete in FK-safe order
  await sb.from('genome_events').delete().eq('organisation_id', organisationId);
  await sb.from('genome_relationships').delete().eq('organisation_id', organisationId);
  await sb.from('genome_facts').delete().eq('organisation_id', organisationId);
  await sb.from('genome_entities').delete().eq('organisation_id', organisationId);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST BUSINESSES
// ─────────────────────────────────────────────────────────────────────────────

const ORG_A_USER_ID = 'a0000000-0000-0000-0000-000000000001';
const ORG_B_USER_ID = 'b0000000-0000-0000-0000-000000000002';

const PLUMBING_CONVERSATIONS = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    messages: [
      { role: 'user', content: "We're a plumbing company based in Western Sydney. Most of our work comes from builders — about 70% of our jobs. The rest comes from word of mouth and repeat customers." },
      { role: 'agent', content: "That's helpful. Tell me more about your pricing." },
      { role: 'user', content: "We charge $180 for a call-out fee. Materials are marked up 25%. We do fixed-price quotes for bigger jobs. Our hourly rate for technicians is $95 plus GST." },
      { role: 'agent', content: "And your team?" },
      { role: 'user', content: "We have three technicians — Mike, Dave, and James. Sarah handles quoting and scheduling. I manage the business side. We have about 14 employees total including office staff." },
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    messages: [
      { role: 'user', content: "We use Xero for accounting and ServiceM8 for job management. We have three vans — one for each technician. All owned outright. We carry about $30,000 of stock in the vans." },
      { role: 'agent', content: "Any licences or insurance?" },
      { role: 'user', content: "Our plumbing licence is due for renewal in March. We have public liability insurance with Allianz — $20 million cover. We also have workers comp with EML." },
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    messages: [
      { role: 'user', content: "Our biggest customer is BuildCo — they account for about 60% of our revenue. We also do work for Greenfield Homes and a few smaller builders. Revenue is about $1.2 million a year." },
      { role: 'agent', content: "How about cash flow?" },
      { role: 'user', content: "We usually get paid within 30 days. Some builders take longer — up to 60 days sometimes. We don't usually have cash flow problems but January is always slow." },
    ],
  },
  // Conversation 4: CONTRADICTION — employee count changes
  {
    id: '10000000-0000-0000-0000-000000000004',
    messages: [
      { role: 'user', content: "We've been growing. We're now at 17 employees — we hired two new technicians and an apprentice. Mike is now our leading hand." },
      { role: 'agent', content: "That's great growth. Has anything else changed?" },
      { role: 'user', content: "We picked up a new builder — Horizon Construction. They're giving us consistent work. And we increased our call-out fee to $195." },
    ],
  },
];

const MANUFACTURER_CONVERSATIONS = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    messages: [
      { role: 'user', content: "We're a manufacturer of plumbing fittings. We supply to three major distributors — ABC Distributors, National Plumbing Supplies, and TradeLink. Most orders come through purchase orders." },
      { role: 'agent', content: "Tell me about your production process." },
      { role: 'user', content: "We have five production cells — CNC machining, powder coating, assembly, quality control, and dispatch. Our ERP is SAP Business One. We employ 28 people across two shifts." },
    ],
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    messages: [
      { role: 'user', content: "We have two CNC machines — both Haas, about $250,000 each. The powder coating line was installed in 2022. We lease the factory — $15,000 a month. Our main supplier is BlueScope Steel — we get 30-day terms." },
      { role: 'agent', content: "How about your pricing?" },
      { role: 'user', content: "We have a minimum order of $500. We price on a cost-plus basis — 35% margin on materials, 40% on labour. We do volume discounts for orders over $10,000." },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasApi)('Business Genome — End-to-End Validation', () => {
  vi.setConfig({ testTimeout: 120000 });

  let orgA: TestOrg;
  let orgB: TestOrg;

  beforeAll(async () => {
    // Create two isolated test organisations
    orgA = await createTestOrg('Plumbing Co Test', 'test-plumbing@test.com', ORG_A_USER_ID);
    orgB = await createTestOrg('Manufacturer Test', 'test-manufacturer@test.com', ORG_B_USER_ID);

    // Clean genome data for both orgs
    await cleanOrgGenomeData(orgA.organisationId);
    await cleanOrgGenomeData(orgB.organisationId);
  });

  // ─── SCENARIO 1: START WITH NO KNOWLEDGE ──────────────────────────────────

  describe('Scenario 1: Start with no knowledge', () => {
    it('plumbing business starts with empty genome', async () => {
      const entities = await getAllEntities(orgA.organisationId);
      const facts = await getAllFacts(orgA.organisationId);

      expect(entities.length).toBe(0);
      expect(facts.length).toBe(0);
    });
  });

  // ─── SCENARIO 2: EXTRACT FROM CONVERSATIONS ──────────────────────────────

  describe('Scenario 2: Extract from conversations', () => {
    it('extracts knowledge from conversation 1', async () => {
      const conv = PLUMBING_CONVERSATIONS[0];
      const result = await extractGenomeFromConversation(
        orgA.organisationId,
        orgA.userId,
        conv.id,
        conv.messages,
        llmConfig
      );

      if (result.errors.length > 0) {
        console.log('=== EXTRACTION ERRORS ===');
        console.log(JSON.stringify(result.errors, null, 2));
      }

      const unexpectedErrors = result.errors.filter(
        (e) => !e.includes('Conflict detected:') || e.includes('severity: high')
      );
      expect(unexpectedErrors, JSON.stringify(unexpectedErrors, null, 2)).toHaveLength(0);
      expect(result.processed_items).toBeGreaterThan(0);
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.facts.length).toBeGreaterThan(0);
    });

    it('extracts knowledge from conversation 2', async () => {
      const conv = PLUMBING_CONVERSATIONS[1];
      const result = await extractGenomeFromConversation(
        orgA.organisationId,
        orgA.userId,
        conv.id,
        conv.messages,
        llmConfig
      );

      const unexpectedErrors = result.errors.filter(
        (e) =>
          !e.includes('Conflict detected:') &&
          !e.includes('Invalid predicate:') &&
          !e.includes('Invalid entity_type:') &&
          !e.includes('Invalid area_key:')
      );
      expect(unexpectedErrors, JSON.stringify(unexpectedErrors, null, 2)).toHaveLength(0);
      expect(result.processed_items).toBeGreaterThan(0);
    });

    it('extracts knowledge from conversation 3', async () => {
      const conv = PLUMBING_CONVERSATIONS[2];
      const result = await extractGenomeFromConversation(
        orgA.organisationId,
        orgA.userId,
        conv.id,
        conv.messages,
        llmConfig
      );

      const unexpectedErrors = result.errors.filter(
        (e) =>
          !e.includes('Conflict detected:') &&
          !e.includes('Invalid predicate:') &&
          !e.includes('Invalid entity_type:') &&
          !e.includes('Invalid area_key:')
      );
      expect(unexpectedErrors, JSON.stringify(unexpectedErrors, null, 2)).toHaveLength(0);
      expect(result.processed_items).toBeGreaterThan(0);
    });

    it('all extracted entities belong to the correct organisation', async () => {
      const entities = await getAllEntities(orgA.organisationId);
      for (const entity of entities) {
        expect(entity.organisation_id).toBe(orgA.organisationId);
      }
    });

    it('all extracted facts belong to the correct organisation', async () => {
      const facts = await getAllFacts(orgA.organisationId);
      for (const fact of facts) {
        expect(fact.organisation_id).toBe(orgA.organisationId);
      }
    });
  });

  // ─── SCENARIO 3: ESTABLISH PROVENANCE ────────────────────────────────────

  describe('Scenario 3: Establish provenance', () => {
    it('every entity has source_type and source_id', async () => {
      const entities = await getAllEntities(orgA.organisationId);
      for (const entity of entities) {
        expect(entity.source_type).toBeTruthy();
        expect(entity.source_id).toBeTruthy();
      }
    });

    it('every fact has source_type and source_id', async () => {
      const facts = await getAllFacts(orgA.organisationId);
      for (const fact of facts) {
        expect(fact.source_type).toBeTruthy();
        expect(fact.source_id).toBeTruthy();
      }
    });

    it('user_id is preserved as provenance (actor identity)', async () => {
      const entities = await getAllEntities(orgA.organisationId);
      for (const entity of entities) {
        // user_id should be set (provenance), not empty
        expect(entity.user_id).toBeTruthy();
      }
    });
  });

  // ─── SCENARIO 4: INTRODUCE CONTRADICTIONS ────────────────────────────────

  describe('Scenario 4: Introduce contradictions', () => {
    it('extracts updated employee count from conversation 4', async () => {
      const conv = PLUMBING_CONVERSATIONS[3];
      const result = await extractGenomeFromConversation(
        orgA.organisationId,
        orgA.userId,
        conv.id,
        conv.messages,
        llmConfig
      );

      const unexpectedErrors = result.errors.filter(
        (e) => !e.includes('Conflict detected:')
      );
      expect(unexpectedErrors, JSON.stringify(unexpectedErrors, null, 2)).toHaveLength(0);
      expect(result.processed_items).toBeGreaterThan(0);
    });

    it('old employee count is superseded', async () => {
      const facts = await getAllFacts(orgA.organisationId);
      const employeeFacts = facts.filter((f) =>
        f.subject?.toLowerCase().includes('employee') ||
        f.subject?.toLowerCase().includes('staff') ||
        f.subject?.toLowerCase().includes('team') ||
        f.subject?.toLowerCase().includes('people') ||
        f.subject?.toLowerCase().includes('workforce')
      );

      expect(employeeFacts.length).toBeGreaterThan(0);
      const superseded = employeeFacts.filter((f) => f.superseded_at);
      const values = employeeFacts.map((f) => f.value);
      const hasContradiction = superseded.length > 0 || values.length > 1;
      expect(hasContradiction).toBe(true);
    });

    it('history is retained', async () => {
      const facts = await getAllFacts(orgA.organisationId);
      const employeeFacts = facts.filter((f) =>
        f.subject?.toLowerCase().includes('employee') ||
        f.subject?.toLowerCase().includes('staff') ||
        f.subject?.toLowerCase().includes('team') ||
        f.subject?.toLowerCase().includes('people') ||
        f.subject?.toLowerCase().includes('workforce')
      );

      const superseded = employeeFacts.filter((f) => f.superseded_at);
      const current = employeeFacts.filter((f) => !f.superseded_at);
      const hasHistory = superseded.length > 0 || current.length > 1;
      expect(hasHistory).toBe(true);
    });
  });

  // ─── SCENARIO 5: CREATE KNOWLEDGE GAPS ───────────────────────────────────

  describe('Scenario 5: Create knowledge gaps', () => {
    it('coverage engine identifies gaps', async () => {
      const gaps = await findKnowledgeGaps(orgA.organisationId);
      expect(gaps.length).toBeGreaterThan(0);
    });

    it('coverage engine identifies missing areas', async () => {
      const states = await getFullKnowledgeState(orgA.organisationId);
      const sparseOrAbsent = states.filter((s) =>
        s.entity_count + s.fact_count < 3
      );
      expect(sparseOrAbsent.length).toBeGreaterThan(0);
    });

    it('quality metrics show incomplete knowledge', async () => {
      const metrics = await calculateQualityMetrics(orgA.organisationId);
      expect(metrics.overall).toBeLessThan(100);
      expect(metrics.total_items + metrics.candidate_items).toBeGreaterThan(0);
    });
  });

  // ─── SCENARIO 6: ASK WHAT TO ASK NEXT ───────────────────────────────────

  describe('Scenario 6: Ask what to ask next', () => {
    it('next-questions engine returns prioritised questions', async () => {
      const questions = await getNextQuestions(orgA.organisationId, { limit: 5 });
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(5);
    });

    it('questions are sorted by priority', async () => {
      const questions = await getNextQuestions(orgA.organisationId, { limit: 5 });
      for (let i = 1; i < questions.length; i++) {
        expect(questions[i].priority).toBeLessThanOrEqual(questions[i - 1].priority);
      }
    });

    it('conversation plan is generated', async () => {
      const plan = await planConversation(orgA.organisationId);
      expect(plan.questions.length).toBeGreaterThan(0);
      expect(plan.focus_areas.length).toBeGreaterThan(0);
      expect(plan.generated_at).toBeTruthy();
    });

    it('conversation plan is organisation-scoped', async () => {
      const plan = await generateConversationPlan(orgA.organisationId);
      expect(plan.organisation_id).toBe(orgA.organisationId);
    });
  });

  // ─── SCENARIO 7: FEED ANSWER BACK ───────────────────────────────────────

  describe('Scenario 7: Feed answer back', () => {
    it('new extraction improves coverage', async () => {
      const metricsBefore = await calculateQualityMetrics(orgA.organisationId);

      const conv = PLUMBING_CONVERSATIONS[3];
      const result = await extractGenomeFromConversation(
        orgA.organisationId,
        orgA.userId,
        conv.id + '-feedback',
        conv.messages,
        llmConfig
      );

      expect(result.processed_items).toBeGreaterThan(0);

      const metricsAfter = await calculateQualityMetrics(orgA.organisationId);
      expect(metricsAfter.overall).toBeGreaterThanOrEqual(metricsBefore.overall);
    });
  });

  // ─── SCENARIO 8: QUERY THROUGH ORCHESTRATOR ─────────────────────────────

  describe('Scenario 8: Query through orchestrator', () => {
    it('queryGenome returns entities and facts', async () => {
      const result = await queryGenome(orgA.organisationId, {});
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.facts.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.source).toBe('genome');
    });

    it('queryGenome filters by area', async () => {
      const result = await queryGenome(orgA.organisationId, { area_key: 'pricing' });
      for (const entity of result.entities) {
        expect(entity.area_key).toBe('pricing');
      }
      for (const fact of result.facts) {
        expect(fact.area_key).toBe('pricing');
      }
    });

    it('assessQuality returns quality metrics', async () => {
      const quality = await assessQuality(orgA.organisationId);
      expect(quality.quality.overall_score).toBeGreaterThanOrEqual(0);
      expect(quality.quality.overall_score).toBeLessThanOrEqual(100);
      expect(quality.quality.per_item.length).toBeGreaterThan(0);
    });

    it('quality assessment is organisation-scoped', async () => {
      const quality = await generateKnowledgeAssessment(orgA.organisationId);
      expect(quality.organisation_id).toBe(orgA.organisationId);
    });

    it('analyzeGaps returns gaps', async () => {
      const gaps = await analyzeGaps(orgA.organisationId);
      expect(Array.isArray(gaps)).toBe(true);
    });

    it('area agenda is organisation-scoped', async () => {
      const agenda = await getAreaAgenda(orgA.organisationId, 'pricing');
      expect(agenda).not.toBeNull();
      expect(agenda?.area_key).toBe('pricing');
    });
  });

  // ─── SCENARIO 9: TEST AGENT SAFETY BOUNDARY ────────────────────────────

  describe('Scenario 9: Test agent safety boundary', () => {
    it('voice agent can read genome', () => {
      const check = checkAgentAccess('voice', 'read');
      expect(check.allowed).toBe(true);
    });

    it('voice agent cannot confirm facts', () => {
      const check = checkAgentAccess('voice', 'confirm');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Only owner');
    });

    it('report agent can assess quality', () => {
      const check = checkAgentAccess('report', 'assess_quality');
      expect(check.allowed).toBe(true);
    });

    it('unknown agent is denied', () => {
      const check = checkAgentAccess('unknown_agent', 'read');
      expect(check.allowed).toBe(false);
    });

    it('safety checks run before agent action', async () => {
      const checks = await runSafetyChecks(
        orgA.userId,
        'voice',
        'read',
        { area_key: 'pricing' }
      );
      expect(checks.length).toBeGreaterThan(0);
      const passedChecks = checks.filter((c) => c.passed);
      expect(passedChecks.length).toBeGreaterThan(0);
    });

    it('mutation attempt is blocked for agents', async () => {
      const checks = await runSafetyChecks(orgA.userId, 'voice', 'confirm');
      const criticalFailures = checks.filter(
        (c) => !c.passed && c.severity === 'critical'
      );
      expect(criticalFailures.length).toBeGreaterThan(0);
    });
  });

  // ─── SCENARIO 10: CROSS-ORG ISOLATION ────────────────────────────────────

  describe('Scenario 10: Cross-organisation isolation', () => {
    it('Org B starts with empty genome', async () => {
      const entities = await getAllEntities(orgB.organisationId);
      const facts = await getAllFacts(orgB.organisationId);
      expect(entities.length).toBe(0);
      expect(facts.length).toBe(0);
    });

    it('extracting into Org B does not pollute Org A', async () => {
      const countBefore = (await getAllEntities(orgA.organisationId)).length;

      const conv = MANUFACTURER_CONVERSATIONS[0];
      const result = await extractGenomeFromConversation(
        orgB.organisationId,
        orgB.userId,
        conv.id,
        conv.messages,
        llmConfig
      );
      expect(result.processed_items).toBeGreaterThan(0);

      // Org A entity count must not change
      const countAfter = (await getAllEntities(orgA.organisationId)).length;
      expect(countAfter).toBe(countBefore);
    });

    it('Org B entities are scoped to Org B', async () => {
      const entities = await getAllEntities(orgB.organisationId);
      expect(entities.length).toBeGreaterThan(0);
      for (const entity of entities) {
        expect(entity.organisation_id).toBe(orgB.organisationId);
      }
    });

    it('Org A cannot see Org B entities via getAllEntities', async () => {
      const orgAEntities = await getAllEntities(orgA.organisationId);
      const orgBEntities = await getAllEntities(orgB.organisationId);

      // No overlap: Org A entities should not contain any Org B data
      for (const entity of orgAEntities) {
        expect(entity.organisation_id).toBe(orgA.organisationId);
        expect(entity.organisation_id).not.toBe(orgB.organisationId);
      }
    });

    it('queryGenome for Org A does not return Org B data', async () => {
      const orgAGenome = await queryGenome(orgA.organisationId, {});
      const orgBGenome = await queryGenome(orgB.organisationId, {});

      // Org A genome should not contain Org B entities
      for (const entity of orgAGenome.entities) {
        expect(entity.organisation_id).toBe(orgA.organisationId);
      }

      // Org B genome should not contain Org A entities
      for (const entity of orgBGenome.entities) {
        expect(entity.organisation_id).toBe(orgB.organisationId);
      }
    });

    it('coverage is organisation-scoped', async () => {
      const orgACoverage = await getAreaCoverage(orgA.organisationId);
      const orgBCoverage = await getAreaCoverage(orgB.organisationId);

      // Org A has more knowledge (4 conversations) than Org B (1 conversation so far)
      const orgATotal = orgACoverage.reduce((s, a) => s + a.entity_count + a.fact_count, 0);
      const orgBTotal = orgBCoverage.reduce((s, a) => s + a.entity_count + a.fact_count, 0);
      expect(orgATotal).toBeGreaterThan(orgBTotal);
    });

    it('events are organisation-scoped', async () => {
      const orgAEvents = await getEvents(orgA.organisationId);
      const orgBEvents = await getEvents(orgB.organisationId);

      for (const event of orgAEvents) {
        expect(event.organisation_id).toBe(orgA.organisationId);
      }
      for (const event of orgBEvents) {
        expect(event.organisation_id).toBe(orgB.organisationId);
      }
    });
  });
});
