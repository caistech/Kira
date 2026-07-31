// The mirror lost rows for weeks and nothing could find them, because every repair path started
// from the rows that were missing. These tests are written against the three tasks that were
// actually lost — real ids, real utterances, real statuses — not invented ones.

import { describe, expect, it, vi } from 'vitest';

import { backfillMissingTasks, kindFor, missingRows, toMirrorRow } from './backfill';
import type { SwarmCoordinator, TaskSummary } from './coordinator';

const OWNER = '7f1c4e2f-0ada-48a5-92f7-946ae9b92a4a';

/** The three that existed in the orchestrator and on no Kira screen, as they actually were. */
const LOST: TaskSummary[] = [
  {
    taskGroupId: '05c8a4d6-aff3-4ef9-93c8-9fbe9d2ed1c1',
    status: 'awaiting_approval',
    kind: 'email',
    utterance: 'Follow up with Dave about the Wavecrest quote and see if he wants to proceed.',
    summary: 'Following up on the Wavecrest quote to see if you want to move forward.',
    createdAt: '2026-07-28T00:07:29.675Z',
  },
  {
    taskGroupId: '37b26335-1aa3-4b96-977f-810254c444e2',
    status: 'awaiting_approval',
    kind: 'reminder',
    utterance: 'Note that Dennis needs to give you access to Drive to fix unsupported issues.',
    summary: 'Reminder to grant me access to Drive for fixing issues.',
    createdAt: '2026-07-28T12:15:42.143Z',
  },
  {
    taskGroupId: '815d33d9-3cc4-446b-997a-913ef797df38',
    status: 'awaiting_approval',
    kind: 'reminder',
    utterance: 'Note the need for building another connector to integrate projects like S2K Checkpoint.',
    summary: 'Reminder to plan building a new connector for S2K Checkpoint integration.',
    createdAt: '2026-07-30T03:37:27.461Z',
  },
];

describe('kindFor', () => {
  it('uses the classifier’s own verdict when there is one', () => {
    expect(kindFor(LOST[1])).toBe('reminder');
  });

  it('never labels an unknown kind "unsupported" — that is the operator’s failure queue', () => {
    const unknown = { ...LOST[0], kind: null };
    expect(kindFor(unknown)).toBe('unknown');
    expect(kindFor(unknown)).not.toBe('unsupported');
  });

  it('does say unsupported when the task genuinely is', () => {
    expect(kindFor({ ...LOST[0], kind: null, status: 'unsupported' })).toBe('unsupported');
  });
});

describe('toMirrorRow', () => {
  it('keys on orch:<taskGroupId> — the same key the live mirror and the callback use', () => {
    // Anything else and a backfill races the callback into two rows for one task.
    expect(toMirrorRow(OWNER, LOST[0])?.intent_id).toBe('orch:05c8a4d6-aff3-4ef9-93c8-9fbe9d2ed1c1');
  });

  it('refuses a row with no utterance rather than inventing the owner’s words', () => {
    expect(toMirrorRow(OWNER, { ...LOST[0], utterance: null })).toBeNull();
    expect(toMirrorRow(OWNER, { ...LOST[0], utterance: '   ' })).toBeNull();
  });

  it('refuses a row with no task id', () => {
    expect(toMirrorRow(OWNER, { ...LOST[0], taskGroupId: '' })).toBeNull();
  });
});

describe('missingRows', () => {
  it('finds exactly the ones Kira does not have', () => {
    const known = ['orch:05c8a4d6-aff3-4ef9-93c8-9fbe9d2ed1c1', 'u:16stz3s'];
    const { rows, unusable } = missingRows(OWNER, LOST, known);
    expect(rows.map((r) => r.intent_id)).toEqual([
      'orch:37b26335-1aa3-4b96-977f-810254c444e2',
      'orch:815d33d9-3cc4-446b-997a-913ef797df38',
    ]);
    expect(unusable).toBe(0);
  });

  it('inserts nothing when the mirror is already complete', () => {
    const known = LOST.map((t) => `orch:${t.taskGroupId}`);
    expect(missingRows(OWNER, LOST, known).rows).toHaveLength(0);
  });

  it('counts a row it cannot rebuild instead of silently dropping it', () => {
    const { rows, unusable } = missingRows(OWNER, [{ ...LOST[0], utterance: null }], []);
    expect(rows).toHaveLength(0);
    expect(unusable).toBe(1);
  });
});

describe('backfillMissingTasks', () => {
  const store = (known: string[] = []) => ({
    knownIntentIds: vi.fn(async () => known),
    insert: vi.fn(async () => {}),
  });

  it('recovers the three that were lost', async () => {
    const coordinator = { listTasks: vi.fn(async () => LOST) } as unknown as SwarmCoordinator;
    const s = store();
    const result = await backfillMissingTasks(coordinator, s, [OWNER]);
    expect(result).toMatchObject({ tenants: 1, found: 3, inserted: 3, unusable: 0, failed: 0 });
    expect(s.insert).toHaveBeenCalledOnce();
  });

  it('does nothing at all for a coordinator with no list leg (the local stub)', async () => {
    const coordinator = {} as SwarmCoordinator;
    const s = store();
    const result = await backfillMissingTasks(coordinator, s, [OWNER]);
    expect(result.tenants).toBe(0);
    expect(s.insert).not.toHaveBeenCalled();
  });

  it('keeps going for other tenants when one fails', async () => {
    // The lesson the drain learned expensively: one un-onboarded tenant threw and nobody's mail sent.
    const coordinator = {
      listTasks: vi.fn(async (tenantId: string) => {
        if (tenantId === 'broken') throw new Error('unreachable');
        return LOST;
      }),
    } as unknown as SwarmCoordinator;
    const s = store();
    const result = await backfillMissingTasks(coordinator, s, ['broken', OWNER]);
    expect(result.failed).toBe(1);
    expect(result.inserted).toBe(3);
  });

  it('inserts nothing when the known-ids read fails, rather than duplicating every task', async () => {
    const coordinator = { listTasks: vi.fn(async () => LOST) } as unknown as SwarmCoordinator;
    const s = {
      knownIntentIds: vi.fn(async () => {
        throw new Error('database error');
      }),
      insert: vi.fn(async () => {}),
    };
    const result = await backfillMissingTasks(coordinator, s, [OWNER]);
    expect(s.insert).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(result.inserted).toBe(0);
  });
});
