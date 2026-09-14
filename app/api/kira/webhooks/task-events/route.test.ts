// app/api/kira/webhooks/task-events/route.test.ts
// T8: backwards-compatible callback handler tests.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSupabase, mockAuth } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
  mockAuth: {
    resolveOrganisationForPerson: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientV2: () => mockSupabase,
}));

vi.mock('@/lib/auth', () => mockAuth);

vi.mock('@/lib/genome/leg-assignment', () => ({
  legForArea: (area: string) => {
    const legs: Record<string, 'D' | 'S'> = {
      demand: 'D',
      pricing: 'D',
      operations: 'D',
      cash: 'S',
      customers: 'D',
      people: 'S',
      assets: 'S',
      compliance: 'S',
      systems: 'S',
    };
    return legs[area] ?? 'D';
  },
}));

import { POST } from './route';

describe('T8: task-events backwards-compatible handler', () => {
  const secret = 'test-secret';
  const tenantId = 'person-123';
  const taskGroupId = 'task-456';
  const orgId = 'org-789';
  const personId = 'person-123';

  /** Captured chain mocks — rebuilt per test via beforeEach. */
  let kiraTasksUpsert: ReturnType<typeof vi.fn>;
  let kiraMemoryInsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ORCHESTRATOR_CALLBACK_SECRET = secret;

    // Default successful org resolution
    mockAuth.resolveOrganisationForPerson.mockResolvedValue({
      organisationId: orgId,
      personId: personId,
    });

    // Default successful supabase implementation
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'kira_agents') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'agent-1' }, error: null }),
        };
      }
      if (table === 'kira_tasks') {
        kiraTasksUpsert = vi.fn().mockResolvedValue({ error: null });
        return { upsert: kiraTasksUpsert };
      }
      if (table === 'kira_memory') {
        kiraMemoryInsert = vi.fn().mockResolvedValue({ error: null });
        return { insert: kiraMemoryInsert };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn() };
    });
  });

  afterEach(() => {
    delete process.env.ORCHESTRATOR_CALLBACK_SECRET;
  });

  const makeRequest = (body: Record<string, unknown>) =>
    new Request('https://test.com/api/kira/webhooks/task-events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-orchestrator-callback-secret': secret,
      },
      body: JSON.stringify(body),
    });

  it('old-style callback (no genomeMetadata) → kira_tasks mirror only, no kira_memory insert', async () => {
    const body = {
      tenantId,
      taskGroupId,
      status: 'done',
      summary: 'Quote sent to client',
      event: 'task.completed',
    };

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });

    // kira_tasks upsert called with correct shape
    expect(kiraTasksUpsert).toHaveBeenCalled();
    expect(kiraTasksUpsert.mock.calls[0][0]).toMatchObject({
      user_id: tenantId,
      organisation_id: orgId,
      intent_id: `orch:${taskGroupId}`,
      handled_by: 'orchestrator',
      status: 'done',
    });

    // kira_memory NOT called
    expect(kiraMemoryInsert).toBeUndefined();
  });

  it('new-style callback (with genomeMetadata) → kira_tasks mirror + pending kira_memory', async () => {
    const body = {
      tenantId,
      taskGroupId,
      status: 'done',
      summary: 'Quote sent to Metro Builders',
      event: 'task.completed',
      genomeMetadata: {
        flowGroup: '4.2 Scoping and quoting',
        genomeSection: 'pricing',
        outcome: 'quote_sent',
      },
    };

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });

    // kira_tasks upsert called
    expect(kiraTasksUpsert).toHaveBeenCalled();

    // kira_memory insert called with correct pending shape
    expect(kiraMemoryInsert).toHaveBeenCalled();
    expect(kiraMemoryInsert.mock.calls[0][0]).toMatchObject({
      organisation_id: orgId,
      user_id: personId,
      memory_type: 'decision',
      source: 'record',
      genome_section: null,
      leg: 'D', // pricing → D (continuity gap)
      tags: expect.arrayContaining(['orchestrator', 'pricing']),
    });
    expect(kiraMemoryInsert.mock.calls[0][0].content).toBe('Quote sent to Metro Builders');
  });

  it('new-style callback with cash area → leg = S', async () => {
    const body = {
      tenantId,
      taskGroupId,
      status: 'done',
      summary: 'Payment chased',
      genomeMetadata: {
        genomeSection: 'cash',
      },
    };

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    expect(kiraMemoryInsert.mock.calls[0][0].leg).toBe('S');
  });

  it('malformed genomeMetadata (invalid section) → mirror succeeds, memory gracefully skipped', async () => {
    const body = {
      tenantId,
      taskGroupId,
      status: 'done',
      summary: 'Something happened',
      genomeMetadata: {
        genomeSection: 'invalid-section',
      },
    };

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });

    // Memory IS inserted — with leg null (sweep classifies later), no area tag
    expect(kiraMemoryInsert).toHaveBeenCalled();
    expect(kiraMemoryInsert.mock.calls[0][0].leg).toBeNull();
    expect(kiraMemoryInsert.mock.calls[0][0].genome_section).toBeNull();
    expect(kiraMemoryInsert.mock.calls[0][0].tags).toEqual(['orchestrator']);
  });

  it('missing taskGroupId → 400', async () => {
    const body = { tenantId, status: 'done' };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it('missing tenantId → 400', async () => {
    const body = { taskGroupId, status: 'done' };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it('wrong secret → 401', async () => {
    const body = { tenantId, taskGroupId, status: 'done' };
    const req = new Request('https://test.com/api/kira/webhooks/task-events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-orchestrator-callback-secret': 'wrong' },
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('org resolution failure → 422', async () => {
    mockAuth.resolveOrganisationForPerson.mockResolvedValue(null);

    const body = { tenantId, taskGroupId, status: 'done' };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(422);
  });

  it('kira_tasks upsert failure → 500', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'kira_tasks') {
        return { upsert: vi.fn().mockResolvedValue({ error: { message: 'db error' } }) };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn() };
    });

    const body = { tenantId, taskGroupId, status: 'done' };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(500);
  });
});
