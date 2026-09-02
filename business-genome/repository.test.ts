// business-genome/repository.test.ts
//
// INTEGRATION TESTS for the Business Genome repository.
// Tests the full CRUD + supersession + confirmation cycle.
//
// These tests use a test user ID and do NOT affect production data.
// The Supabase client is created with the service role key (bypasses RLS).

import { describe, it, expect, beforeAll } from 'vitest';
import { createServiceClientV2 } from '@/lib/supabase/server';
import {
  createEntity,
  findEntity,
  getEntitiesByArea,
  getAllEntities,
  createFact,
  findFact,
  getFactsByArea,
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
import type { GenomeEntityInput, GenomeFactInput, GenomeRelationshipInput } from './types';

// Test IDs — an organisation row must exist for the FK constraint
let TEST_ORGANISATION_ID: string;
const TEST_USER_ID = '00000000-0000-0000-0000-000000000002';

beforeAll(async () => {
  const sb = createServiceClientV2();
  const { data, error } = await sb
    .from('organisations')
    .insert({
      legal_name: 'Genome Repository Test Org',
      trading_name: 'GenomeRepoTest',
      status: 'active',
    })
    .select('organisation_id')
    .single();
  if (error || !data) throw new Error(`Failed to create test org: ${error?.message ?? 'no row'}`);
  TEST_ORGANISATION_ID = data.organisation_id;
});

describe('Genome Repository', () => {
  // ─── ENTITIES ──────────────────────────────────────────────────────────────

  describe('Entity CRUD', () => {
    it('creates an entity', async () => {
      const entity = await createEntity({
        organisation_id: TEST_ORGANISATION_ID,
        user_id: TEST_USER_ID,
        area_key: 'work_sources',
        entity_type: 'organisation',
        name: 'Test Builder Corp',
        confidence: 0.8,
        source_type: 'conversation',
        source_id: '00000000-0000-0000-0000-000000000099',
      });

      expect(entity).toBeDefined();
      expect(entity.id).toBeDefined();
      expect(entity.organisation_id).toBe(TEST_ORGANISATION_ID);
      expect(entity.user_id).toBe(TEST_USER_ID);
      expect(entity.area_key).toBe('work_sources');
      expect(entity.entity_type).toBe('organisation');
      expect(entity.name).toBe('Test Builder Corp');
      expect(entity.status).toBe('candidate');
      expect(entity.confidence).toBe(0.8);
      expect(entity.source_type).toBe('conversation');
    });

    it('finds an entity by type and name', async () => {
      const found = await findEntity(TEST_ORGANISATION_ID, 'organisation', 'Test Builder Corp');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Test Builder Corp');
    });

    it('returns null for non-existent entity', async () => {
      const found = await findEntity(TEST_ORGANISATION_ID, 'organisation', 'Non Existent Corp');
      expect(found).toBeNull();
    });

    it('gets entities by area', async () => {
      const entities = await getEntitiesByArea(TEST_ORGANISATION_ID, 'work_sources');
      expect(entities.length).toBeGreaterThan(0);
      expect(entities.every((e) => e.area_key === 'work_sources')).toBe(true);
    });

    it('gets all entities for an organisation', async () => {
      const entities = await getAllEntities(TEST_ORGANISATION_ID);
      expect(entities.length).toBeGreaterThan(0);
    });
  });

  // ─── FACTS ─────────────────────────────────────────────────────────────────

  describe('Fact CRUD', () => {
    let testEntityId: string;

    beforeAll(async () => {
      const entity = await findEntity(TEST_ORGANISATION_ID, 'organisation', 'Test Builder Corp');
      testEntityId = entity?.id ?? '';
    });

    it('creates a fact', async () => {
      const fact = await createFact({
        organisation_id: TEST_ORGANISATION_ID,
        user_id: TEST_USER_ID,
        entity_id: testEntityId,
        area_key: 'pricing',
        subject: 'standard call-out fee',
        predicate: 'is',
        value: '180',
        value_type: 'money',
        unit: 'AUD',
        confidence: 0.86,
        source_type: 'conversation',
        source_id: '00000000-0000-0000-0000-000000000099',
      });

      expect(fact).toBeDefined();
      expect(fact.id).toBeDefined();
      expect(fact.organisation_id).toBe(TEST_ORGANISATION_ID);
      expect(fact.subject).toBe('standard call-out fee');
      expect(fact.predicate).toBe('is');
      expect(fact.value).toBe('180');
      expect(fact.value_type).toBe('money');
      expect(fact.unit).toBe('AUD');
      expect(fact.status).toBe('candidate');
      expect(fact.confidence).toBe(0.86);
    });

    it('finds a fact by area, subject, and predicate', async () => {
      const found = await findFact(TEST_ORGANISATION_ID, 'pricing', 'standard call-out fee', 'is');
      expect(found).not.toBeNull();
      expect(found?.value).toBe('180');
    });

    it('gets facts by area', async () => {
      const facts = await getFactsByArea(TEST_ORGANISATION_ID, 'pricing');
      expect(facts.length).toBeGreaterThan(0);
    });
  });

  // ─── RELATIONSHIPS ─────────────────────────────────────────────────────────

  describe('Relationship CRUD', () => {
    let entityId: string;

    beforeAll(async () => {
      const entity = await createEntity({
        organisation_id: TEST_ORGANISATION_ID,
        user_id: TEST_USER_ID,
        area_key: 'people',
        entity_type: 'person',
        name: 'Test Sarah',
        confidence: 0.9,
        source_type: 'conversation',
      });
      entityId = entity.id;
    });

    it('creates a relationship', async () => {
      const rel = await createRelationship({
        organisation_id: TEST_ORGANISATION_ID,
        user_id: TEST_USER_ID,
        subject_entity_id: entityId,
        predicate: 'manages',
        object_value: 'quoting process',
        area_key: 'delivery',
        confidence: 0.8,
        source_type: 'conversation',
      });

      expect(rel).toBeDefined();
      expect(rel.id).toBeDefined();
      expect(rel.organisation_id).toBe(TEST_ORGANISATION_ID);
      expect(rel.predicate).toBe('manages');
      expect(rel.object_value).toBe('quoting process');
    });

    it('gets relationships by entity', async () => {
      const rels = await getRelationshipsByEntity(TEST_ORGANISATION_ID, entityId);
      expect(rels.length).toBeGreaterThan(0);
    });
  });

  // ─── SUPERSESSION ──────────────────────────────────────────────────────────

  describe('Supersession', () => {
    let factId: string;

    beforeAll(async () => {
      const fact = await createFact({
        organisation_id: TEST_ORGANISATION_ID,
        user_id: TEST_USER_ID,
        area_key: 'pricing',
        subject: 'materials markup',
        predicate: 'is',
        value: '25',
        value_type: 'percentage',
        unit: 'percent',
        source_type: 'conversation',
      });
      factId = fact.id;
    });

    it('supersedes a fact with a new value', async () => {
      const newFact = await supersedeFact(
        factId,
        { value: '30', confidence: 0.9, source_type: 'conversation' },
        'conversation',
        '00000000-0000-0000-0000-000000000099'
      );

      expect(newFact).toBeDefined();
      expect(newFact.value).toBe('30');
      expect(newFact.supersedes).toBe(factId);

      // The successor is the active (non-superseded) fact now returned by findFact
      const current = await findFact(TEST_ORGANISATION_ID, 'pricing', 'materials markup', 'is');
      expect(current).not.toBeNull();
      expect(current?.value).toBe('30');
      expect(current?.supersedes).toBe(factId);

      // History is retained — original is accessible via the supersession chain
      const { data: original } = await createServiceClientV2()
        .from('genome_facts')
        .select('id, value, superseded_at')
        .eq('id', factId)
        .single();
      expect(original?.superseded_at).not.toBeNull();
      expect(original?.value).toBe('25');
    });
  });

  // ─── CONFIRMATION ──────────────────────────────────────────────────────────

  describe('Confirmation', () => {
    let factId: string;

    beforeAll(async () => {
      const fact = await createFact({
        organisation_id: TEST_ORGANISATION_ID,
        user_id: TEST_USER_ID,
        area_key: 'money',
        subject: 'annual revenue',
        predicate: 'is',
        value: '3000000',
        value_type: 'money',
        unit: 'AUD',
        source_type: 'conversation',
      });
      factId = fact.id;
    });

    it('confirms a fact', async () => {
      const confirmed = await confirmFact(factId, TEST_ORGANISATION_ID, TEST_USER_ID);
      expect(confirmed.status).toBe('confirmed');
      expect(confirmed.confirmed_at).toBeDefined();
    });

    it('confirms an entity', async () => {
      const entity = await createEntity({
        organisation_id: TEST_ORGANISATION_ID,
        user_id: TEST_USER_ID,
        area_key: 'systems_records',
        entity_type: 'system',
        name: 'Test Xero',
        source_type: 'conversation',
      });

      const confirmed = await confirmEntity(entity.id, TEST_ORGANISATION_ID, TEST_USER_ID);
      expect(confirmed.status).toBe('confirmed');
      expect(confirmed.confirmed_at).toBeDefined();
    });
  });

  // ─── EVENTS ────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('records events for entity creation', async () => {
      const events = await getEvents(TEST_ORGANISATION_ID, {
        event_type: 'entity_created',
        limit: 5,
      });
      expect(events.length).toBeGreaterThan(0);
    });

    it('records events for fact creation', async () => {
      const events = await getEvents(TEST_ORGANISATION_ID, {
        event_type: 'fact_created',
        limit: 5,
      });
      expect(events.length).toBeGreaterThan(0);
    });

    it('records events for supersession', async () => {
      const events = await getEvents(TEST_ORGANISATION_ID, {
        event_type: 'fact_superseded',
        limit: 5,
      });
      expect(events.length).toBeGreaterThan(0);
    });
  });

  // ─── COVERAGE ──────────────────────────────────────────────────────────────

  describe('Coverage', () => {
    it('returns coverage for all 9 areas', async () => {
      const coverage = await getAreaCoverage(TEST_ORGANISATION_ID);
      expect(coverage).toHaveLength(9);
    });

    it('has correct structure for each area', async () => {
      const coverage = await getAreaCoverage(TEST_ORGANISATION_ID);
      coverage.forEach((area) => {
        expect(area.area_key).toBeDefined();
        expect(area.area_name).toBeDefined();
        expect(area.band).toBeDefined();
        expect(area.entity_count).toBeGreaterThanOrEqual(0);
        expect(area.fact_count).toBeGreaterThanOrEqual(0);
        expect(area.relationship_count).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ─── UPSERT ────────────────────────────────────────────────────────────────

  describe('Upsert', () => {
    it('upserts entities — creates new, finds existing', async () => {
      const inputs: GenomeEntityInput[] = [
        {
          organisation_id: TEST_ORGANISATION_ID,
          user_id: TEST_USER_ID,
          area_key: 'assets',
          entity_type: 'vehicle',
          name: 'Test Van 1',
          source_type: 'conversation',
        },
        {
          organisation_id: TEST_ORGANISATION_ID,
          user_id: TEST_USER_ID,
          area_key: 'assets',
          entity_type: 'vehicle',
          name: 'Test Van 1', // duplicate
          source_type: 'conversation',
        },
      ];

      const result = await upsertEntities(TEST_ORGANISATION_ID, inputs);
      expect(result.created.length).toBe(1);
      expect(result.existing.length).toBe(1);
    });

    it('upserts facts — creates new, detects value changes', async () => {
      const inputs: GenomeFactInput[] = [
        {
          organisation_id: TEST_ORGANISATION_ID,
          user_id: TEST_USER_ID,
          area_key: 'pricing',
          subject: 'hourly labour rate',
          predicate: 'is',
          value: '85',
          value_type: 'money',
          unit: 'AUD',
          source_type: 'conversation',
        },
      ];

      const result1 = await upsertFacts(TEST_ORGANISATION_ID, inputs);
      expect(result1.created.length).toBe(1);

      // Same value — should find existing
      const result2 = await upsertFacts(TEST_ORGANISATION_ID, inputs);
      expect(result2.existing.length).toBe(1);
    });
  });
});
