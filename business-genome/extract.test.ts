// business-genome/extract.test.ts
//
// TESTS for the structured genome extraction pipeline.
// Tests the extraction against synthetic business conversations.
//
// NOTE: These are integration tests that call an LLM via OPENAI_API_KEY or OPENAI_BASE_URL.
// They require OPENAI_API_KEY or OPENAI_BASE_URL to be set in the environment.
// If not set, they are skipped.

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { extractGenomeFromConversation } from './extract';

// LLM calls can take 10-60s; raise the suite timeout well above the 5s default.
vi.setConfig({ testTimeout: 120000 });

// Test scope — a real organisation row (FK to organisations is enforced)
let TEST_ORGANISATION_ID: string;
const TEST_USER_ID = '00000000-0000-0000-0000-000000000003';

beforeAll(async () => {
  const sb = createServiceClientV2();
  const { data, error } = await sb
    .from('organisations')
    .insert({
      legal_name: 'Genome Extract Test Org',
      trading_name: 'GenomeExtractTest',
      status: 'active',
    })
    .select('organisation_id')
    .single();
  if (error || !data) throw new Error(`Failed to create test org: ${error?.message ?? 'no row'}`);
  TEST_ORGANISATION_ID = data.organisation_id;
});

// Base conversation id for this suite (source_id expects a UUID)
const TEST_ORG_CONV_ID = '00000000-0000-0000-0000-000000000098';

// Skip if no LLM configured
const hasApiKey = !!(process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL);

const llmConfig = {
  apiKey: process.env.OPENAI_API_KEY ?? '',
  baseUrl: process.env.OPENAI_BASE_URL,
  model: process.env.KIRA_EXTRACTION_MODEL,
};

describe.skipIf(!hasApiKey)('Genome Extraction Pipeline', () => {
  describe('Business A: Plumbing company', () => {
    const transcript = [
      { role: 'user', content: "Most of our jobs come from builders. We usually inspect the site first, then Sarah puts together the quote. We charge a $180 call-out and materials are marked up 25%." },
      { role: 'agent', content: "That's helpful. Tell me more about your team." },
      { role: 'user', content: "We have three technicians — Mike, Dave, and James. Sarah handles quoting and scheduling. I manage the business side. We use Xero for accounting and ServiceM8 for job management." },
      { role: 'agent', content: "How about your vehicles and equipment?" },
      { role: 'user', content: "We have three vans — one for each technician. All owned outright. We carry about $30,000 of stock in the vans. Our plumbing licence is due for renewal in March. We have public liability insurance with Allianz." },
    ];

    it('extracts entities from plumbing conversation', async () => {
      const result = await extractGenomeFromConversation(
        TEST_ORGANISATION_ID,
        TEST_USER_ID,
        TEST_ORG_CONV_ID,
        transcript,
        llmConfig
      );

      expect(result.raw_items).toBeGreaterThan(0);
      expect(result.processed_items).toBeGreaterThan(0);

      // Conflict-detected errors are expected (factual divergence flagged for owner review)
      const validationErrors = result.errors.filter(
        (e) => !e.includes('Conflict detected:')
      );
      expect(validationErrors, JSON.stringify(validationErrors, null, 2)).toHaveLength(0);

      // Should have extracted people
      const people = result.entities.filter((e) => e.entity_type === 'person');
      expect(people.length).toBeGreaterThan(0);

      // Should have extracted systems
      const systems = result.entities.filter((e) => e.entity_type === 'system');
      expect(systems.length).toBeGreaterThan(0);

      // All extracted entities should be scoped to the test organisation
      result.entities.forEach((e) => {
        expect(e.organisation_id).toBe(TEST_ORGANISATION_ID);
      });
    });

    it('extracts facts with correct area classification', async () => {
      const result = await extractGenomeFromConversation(
        TEST_ORGANISATION_ID,
        TEST_USER_ID,
        TEST_ORG_CONV_ID + '-facts',
        transcript,
        llmConfig
      );

      // Should have pricing facts
      const pricingFacts = result.facts.filter((f) => f.area_key === 'pricing');
      expect(pricingFacts.length).toBeGreaterThan(0);

      // All extracted facts should be scoped to the test organisation
      result.facts.forEach((f) => {
        expect(f.organisation_id).toBe(TEST_ORGANISATION_ID);
      });
    });
  });

  describe('Universal extraction properties', () => {
    const transcript = [
      { role: 'user', content: "We have about 14 employees. Our main customer is BuildCo — they account for about 60% of our revenue. We use Jobber for scheduling and QuickBooks for accounting." },
      { role: 'agent', content: "How do you price your work?" },
      { role: 'user', content: "We charge $95 per hour plus GST. Materials are marked up 20%. We give 10% discount for repeat customers." },
    ];

    it('never creates new top-level areas', async () => {
      const result = await extractGenomeFromConversation(
        TEST_ORGANISATION_ID,
        TEST_USER_ID,
        TEST_ORG_CONV_ID + '-universal',
        transcript,
        llmConfig
      );

      const validAreas = new Set([
        'work_sources', 'pricing', 'delivery', 'money', 'customers',
        'people', 'assets', 'compliance_calendar', 'systems_records',
      ]);

      result.entities.forEach((e) => {
        expect(validAreas.has(e.area_key)).toBe(true);
      });
      result.facts.forEach((f) => {
        expect(validAreas.has(f.area_key)).toBe(true);
      });
    });

    it('preserves provenance', async () => {
      const result = await extractGenomeFromConversation(
        TEST_ORGANISATION_ID,
        TEST_USER_ID,
        TEST_ORG_CONV_ID + '-provenance',
        transcript,
        llmConfig
      );

      // All entities should have source_type = 'conversation'
      result.entities.forEach((e) => {
        expect(e.source_type).toBe('conversation');
        expect(e.source_id).toBe(TEST_ORG_CONV_ID + '-provenance');
      });

      // All facts should have source_type = 'conversation'
      result.facts.forEach((f) => {
        expect(f.source_type).toBe('conversation');
        expect(f.source_id).toBe(TEST_ORG_CONV_ID + '-provenance');
      });
    });

    it('handles empty transcript gracefully', async () => {
      const result = await extractGenomeFromConversation(
        TEST_ORGANISATION_ID,
        TEST_USER_ID,
        TEST_ORG_CONV_ID + '-empty',
        [],
        llmConfig
      );

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.processed_items).toBe(0);
    });
  });
});
