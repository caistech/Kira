// lib/genome/tasks.test.ts
//
// Pure-function tests run everywhere. DB-integration tests skip cleanly without a configured test
// project (describe.skipIf(!hasTestDb)) — mirrors business-genome/repository.test.ts's convention
// exactly, including routing through the dedicated test Supabase project, never production.

import { describe, expect, it, beforeAll } from 'vitest';

import { taskToChecklistItem, taskCoverageForArea, discoverTasks, createTask, listActiveTasks, retireTask, type TaskRow } from './tasks';
import { hasTestDb, createTestServiceClient } from '@/business-genome/test-support/test-db';

function row(over: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'task-1',
    organisation_id: 'org-1',
    discovered_by_user_id: 'user-1',
    area: 'operations',
    item_key: 'task.operations.abc-123',
    name: 'Quoting a bathroom renovation',
    source_type: 'conversation',
    source_conversation_id: null,
    created_at: '2026-09-29T00:00:00.000Z',
    retired_at: null,
    retired_reason: null,
    ...over,
  };
}

describe('taskToChecklistItem — the merge point into the existing checklist surface', () => {
  it('never carries a valuation factor — a task can only ever move operational coverage', () => {
    const item = taskToChecklistItem(row());
    expect(item.factor).toBeNull();
  });

  it('closes by document, not by change — the gap closes once the SOP is written and filed', () => {
    const item = taskToChecklistItem(row());
    expect(item.closes).toBe('document');
  });

  it('is required — a named task is a real dependency, never merely supporting depth', () => {
    const item = taskToChecklistItem(row());
    expect(item.required).toBe(true);
  });

  it('carries the item_key straight through, unchanged — this is what genome_item_status matches against', () => {
    const item = taskToChecklistItem(row({ item_key: 'task.people.xyz-789' }));
    expect(item.key).toBe('task.people.xyz-789');
  });

  it('generates a substance test naming the task, not a generic placeholder', () => {
    const item = taskToChecklistItem(row({ name: 'Onboarding a new customer' }));
    expect(item.substance).not.toBeNull();
    expect(item.substance!.tests).toHaveLength(3);
    expect(item.substance!.strongExample).toContain('Onboarding a new customer');
    expect(item.substance!.coaching).toContain('Onboarding a new customer');
  });

  it('carries provenance back to the row, so a caller can look up the pathway/retire path', () => {
    const item = taskToChecklistItem(row({ id: 'task-42' }));
    expect(item.source).toBe('discovered');
    expect(item.taskId).toBe('task-42');
  });
});

describe('taskCoverageForArea — the separate operational-coverage number', () => {
  it('reports null, never a percentage, when the area has no discovered tasks yet', () => {
    const coverage = taskCoverageForArea('operations', [], new Map());
    expect(coverage.task_count).toBe(0);
    expect(coverage.locked_fraction).toBeNull();
  });

  it('counts only "answered" verdicts as locked — weak and open do not count', () => {
    const tasks = [
      row({ id: 't1', item_key: 'task.operations.a', area: 'operations' }),
      row({ id: 't2', item_key: 'task.operations.b', area: 'operations' }),
      row({ id: 't3', item_key: 'task.operations.c', area: 'operations' }),
    ];
    const verdicts = new Map<string, 'open' | 'weak' | 'answered'>([
      ['task.operations.a', 'answered'],
      ['task.operations.b', 'weak'],
      ['task.operations.c', 'open'],
    ]);
    const coverage = taskCoverageForArea('operations', tasks, verdicts);
    expect(coverage.task_count).toBe(3);
    expect(coverage.locked_count).toBe(1);
    expect(coverage.locked_fraction).toBeCloseTo(1 / 3);
  });

  it('only counts tasks in the requested area — a mixed list is filtered first', () => {
    const tasks = [
      row({ id: 't1', item_key: 'task.operations.a', area: 'operations' }),
      row({ id: 't2', item_key: 'task.people.b', area: 'people' }),
    ];
    const coverage = taskCoverageForArea('operations', tasks, new Map([['task.operations.a', 'answered']]));
    expect(coverage.task_count).toBe(1);
    expect(coverage.locked_count).toBe(1);
  });
});

describe('discoverTasks — degrade, don\'t fake (DATA_STANDARD R4)', () => {
  it('returns nothing rather than guessing when no model key is configured', async () => {
    const result = await discoverTasks(
      'operations',
      [{ id: 'e1', headline: null, content: 'Mark quotes every bathroom job himself, start to finish.' }],
      [],
      { apiKey: '' },
    );
    expect(result).toEqual([]);
  });

  it('returns nothing when there is no record to read — never invents a task from nothing', async () => {
    const result = await discoverTasks('operations', [], [], { apiKey: 'sk-test-unused' });
    expect(result).toEqual([]);
  });

  it('returns nothing for an unrecognised area rather than throwing', async () => {
    const result = await discoverTasks(
      'not-a-real-area' as never,
      [{ id: 'e1', headline: null, content: 'x' }],
      [],
      { apiKey: 'sk-test-unused' },
    );
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB INTEGRATION — real Supabase, dedicated test project only.
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasTestDb)('genome_tasks — CRUD against the real table', () => {
  let organisationId: string;
  let userId: string | null = null;

  beforeAll(async () => {
    const sb = createTestServiceClient();

    const { data: org, error: orgError } = await sb
      .from('organisations')
      .insert({ legal_name: 'Genome Tasks Test Org', trading_name: 'GenomeTasksTest', status: 'active' })
      .select('organisation_id')
      .single();
    if (orgError || !org) throw new Error(`Failed to create test org: ${orgError?.message ?? 'no row'}`);
    organisationId = org.organisation_id;

    // genome_tasks.discovered_by_user_id has a real FK to public.users — unlike genome_entities,
    // which has none. Rather than guess at users' insert schema (unknown from this file alone), use
    // whatever user row the test project already has; skip the write-path tests if there is none
    // rather than fabricate a users row that might violate a constraint this file cannot see.
    const { data: anyUser } = await sb.from('users').select('id').limit(1).maybeSingle();
    userId = (anyUser?.id as string | undefined) ?? null;
  });

  it('creates a task and reads it back as an active task for its area', async () => {
    if (!userId) return; // no seeded user in this test project — see beforeAll's note.
    const created = await createTask(createTestServiceClient(), {
      organisationId,
      discoveredByUserId: userId,
      area: 'operations',
      name: 'Quoting a bathroom renovation',
    });
    expect(created.name).toBe('Quoting a bathroom renovation');
    expect(created.item_key).toMatch(/^task\.operations\./);

    const active = await listActiveTasks(createTestServiceClient(), organisationId, 'operations');
    expect(active.some((t) => t.id === created.id)).toBe(true);
  });

  it('is idempotent by (organisation, area, name) — case/whitespace insensitive', async () => {
    if (!userId) return;
    const first = await createTask(createTestServiceClient(), {
      organisationId,
      discoveredByUserId: userId,
      area: 'people',
      name: 'Onboarding a new customer',
    });
    const second = await createTask(createTestServiceClient(), {
      organisationId,
      discoveredByUserId: userId,
      area: 'people',
      name: '  onboarding a new customer  ',
    });
    expect(second.id).toBe(first.id);
  });

  it('a retired task no longer appears in the active list', async () => {
    if (!userId) return;
    const created = await createTask(createTestServiceClient(), {
      organisationId,
      discoveredByUserId: userId,
      area: 'cash',
      name: 'Chasing a slow-paying customer',
    });
    await retireTask(createTestServiceClient(), created.id, organisationId, 'We now use a debt collector for this.');
    const active = await listActiveTasks(createTestServiceClient(), organisationId, 'cash');
    expect(active.some((t) => t.id === created.id)).toBe(false);
  });
});
