// The mandatory discovery gate's contract: what she is told, in what order, and when it stops
// firing. Mirrors area-agenda.test.ts's mocking shape and the same reasoning for it.

import { describe, expect, it, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock('@/lib/supabase/server');
  vi.doUnmock('@/lib/auth');
});

function orgMock() {
  return {
    resolveOrganisationForPerson: async (uid: string) =>
      uid === 'u1' ? { organisationId: 'org-1', personId: uid } : null,
  };
}

async function agendaFor(profileRow: Record<string, unknown> | null, uid = 'u1') {
  vi.resetModules();
  vi.doMock('@/lib/auth', () => orgMock());
  vi.doMock('@/lib/supabase/server', () => ({
    createServiceClientV2: () => ({
      from: (table: string) => {
        if (table !== 'client_profiles') throw new Error(`unexpected table: ${table}`);
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: profileRow, error: null }),
            }),
          }),
        };
      },
    }),
  }));
  const { handleDiscoveryAgenda } = await import('./discovery-agenda');
  const res = await handleDiscoveryAgenda(
    new Request(`https://x.test/api/kira/webhooks/discovery_agenda?uid=${uid}`, { method: 'POST' }),
  );
  return res.json();
}

describe('no account identified', () => {
  it('refuses with a reason rather than guessing, and never blocks ordinary work', async () => {
    const body = await agendaFor(null, ''); // no uid at all
    expect(body.ok).toBe(false);
    expect(body.complete).toBe(true); // fail-open on the gate, never fail-closed into an infinite interview
    expect(body.reason.length).toBeGreaterThan(5);
  });

  it('an unresolvable org also fails open', async () => {
    const body = await agendaFor(null, 'stranger-uid');
    expect(body.ok).toBe(false);
    expect(body.complete).toBe(true);
  });
});

describe('never started', () => {
  it('points at the FIRST stage with everything outstanding', async () => {
    const body = await agendaFor(null); // no client_profiles row yet
    expect(body.ok).toBe(true);
    expect(body.complete).toBe(false);
    expect(body.ever_started).toBe(false);
    expect(body.stage.id).toBe('identity');
    expect(body.outstanding).toContain('name');
  });
});

describe('discovery_complete already true', () => {
  it('reports complete with no stage and no outstanding items — she says nothing about it', async () => {
    const body = await agendaFor({
      profile: {},
      completeness: 0.9,
      discovery_complete: true,
      sessions_count: 3,
    });
    expect(body.complete).toBe(true);
    expect(body.stage).toBeNull();
    expect(body.outstanding).toEqual([]);
  });
});

describe('partial profile, discovery_complete false', () => {
  it('skips a fully-satisfied stage and lands on the first one with a real gap', async () => {
    const body = await agendaFor({
      profile: {
        identity: { name: 'Dave', background_summary: 'Runs a plumbing business', location: null },
        life_context: 'Married, two kids',
        business: { type: null, description: null, size: null, stage: null, name: null },
      },
      completeness: 0.2,
      discovery_complete: false,
      sessions_count: 1,
    });
    expect(body.complete).toBe(false);
    // identity is fully covered (name, background, life_context all present) — must not re-ask it.
    expect(body.stage.id).toBe('business');
    expect(body.outstanding).toContain('what the business does');
  });

  it('never hands back more than the outstanding items for ONE stage at a time', async () => {
    const body = await agendaFor({
      profile: {},
      completeness: 0,
      discovery_complete: false,
      sessions_count: 1,
    });
    // Only the identity stage's 3 items — not every gap across all six stages at once, which would
    // read as a form rather than a conversation.
    expect(body.outstanding.length).toBeLessThanOrEqual(3);
  });
});

describe('every mustCover item satisfied but the row has not caught up yet', () => {
  it('reports complete rather than looping her on a stage with nothing left to ask', async () => {
    const full = {
      identity: { name: 'Dave', background_summary: 'x', location: 'Perth' },
      life_context: 'x',
      business: { type: 'plumbing', description: 'x', size: '5 staff', stage: 'established', name: 'x' },
      role: 'x',
      working_style: 'x',
      communication_preferences: 'x',
      goals_near_term: ['x'],
      goals_long_term: ['x'],
      current_priorities: ['x'],
      constraints: ['x'],
      pain_points: ['x'],
      key_relationships: ['x'],
      domain_expertise: [],
      notes: null,
    };
    const body = await agendaFor({
      profile: full,
      completeness: 0.65, // below DISCOVERY_COMPLETE_THRESHOLD's 0.7 but every stage item is covered
      discovery_complete: false,
      sessions_count: 2,
    });
    expect(body.complete).toBe(true);
    expect(body.stage).toBeNull();
  });
});
