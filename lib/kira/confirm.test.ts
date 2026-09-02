// The confirmation record is the Genome's verifiable axis, which makes it the one place where a
// wrong write is worse than no write: a confirmation is the strongest label the document has, and a
// buyer is meant to rely on it. These pin the four ways it could produce a claim nobody made.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  /** Rows the "kira_memory" select resolves to. */
  facts: [] as Array<{ id: string; content: string; kira_agent_id: string | null }>,
  inserted: [] as Array<Record<string, unknown>>,
  updated: [] as Array<{ id: string; patch: Record<string, unknown> }>,
  /** Every filter applied to the memory query, so identity scoping can be asserted. */
  filters: [] as Array<[string, string, unknown]>,
  failInsert: false,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientV2: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, val: unknown) => {
          db.filters.push(['eq', col, val]);
          return chain;
        },
        neq: (col: string, val: unknown) => {
          db.filters.push(['neq', col, val]);
          return chain;
        },
        is: (col: string, val: unknown) => {
          db.filters.push(['is', col, val]);
          return chain;
        },
        ilike: (col: string, val: unknown) => {
          db.filters.push(['ilike', col, val]);
          return chain;
        },
        order: () => chain,
        limit: () => Promise.resolve({ data: table === 'kira_memory' ? db.facts : [], error: null }),
        insert: (row: Record<string, unknown>) => {
          db.inserted.push({ table, ...row });
          return Promise.resolve({ error: db.failInsert ? new Error('insert failed') : null });
        },
        update: (patch: Record<string, unknown>) => ({
          eq: (_col: string, _val: unknown) => ({
            eq: (_col2: string, id: string) =>
              Promise.resolve({ error: null, data: {} }).then(() => {
                db.updated.push({ id, patch });
                return { error: null, data: {} };
              }),
          }),
        }),
      };
      return chain;
    },
  }),
}));

vi.mock('@/lib/auth', () => ({
  resolveOrganisationForPerson: vi.fn().mockResolvedValue({ organisationId: 'org-1', personId: 'owner-1' }),
}));

const { handleConfirmFact, handleFactsToConfirm } = await import('./confirm');

const URL_WITH_UID = 'https://kira.internal/api/kira/webhooks/confirm_fact?uid=owner-1';

function post(url: string, body: unknown): Request {
  return new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

beforeEach(() => {
  db.facts = [{ id: 'abcd1234-0000-4000-8000-000000000001', content: 'Fencing is priced by the lineal metre.', kira_agent_id: 'agent-1' }];
  db.inserted = [];
  db.updated = [];
  db.filters = [];
  db.failInsert = false;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('a confirmation cannot be manufactured', () => {
  it('refuses without an identity — a confirmation with no owner belongs to nobody', async () => {
    const res = await handleConfirmFact(
      post('https://kira.internal/api/kira/webhooks/confirm_fact', { handle: 'abcd1234', outcome: 'confirmed', said: 'yes' }),
    );
    expect((await res.json()).success).toBe(false);
    expect(db.inserted).toHaveLength(0);
  });

  // The same guard as declined_because on record_refusal, and for the same reason: an unclassified
  // write is almost always the model recording something that is not a confirmation at all.
  it('refuses an outcome outside the three that exist', async () => {
    const res = await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'probably', said: 'he nodded' }));
    expect((await res.json()).success).toBe(false);
  });

  it('refuses a handle that matches nothing', async () => {
    const res = await handleConfirmFact(post(URL_WITH_UID, { handle: 'deadbeef-dead-beef-beef-deadbeefdead', outcome: 'confirmed', said: 'yes' }));
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/facts_to_confirm/);
    expect(db.inserted).toHaveLength(0);
  });

  it('refuses an ambiguous handle instead of guessing which fact he meant', async () => {
    db.facts = [
      { id: 'abcd1234-0000-4000-8000-000000000001', content: 'Fencing is priced by the lineal metre.', kira_agent_id: 'agent-1' },
      { id: 'abcd1234-0000-4000-8000-000000000002', content: 'Fencing is priced by the linear meter.', kira_agent_id: 'agent-1' },
    ];
    const res = await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'confirmed', said: 'yes' }));
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/ambiguous/);
    expect(db.inserted).toHaveLength(0);
  });

  it('scopes the lookup to the owner in the query, not after it', async () => {
    await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'confirmed', said: 'yes' }));
    expect(db.filters).toContainEqual(['eq', 'organisation_id', 'org-1']);
    expect(db.filters).not.toContainEqual(['eq', 'user_id', 'owner-1']);
  });

  it('writes the event with his words, not her summary', async () => {
    await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'confirmed', said: 'That is exactly right.' }));
    expect(db.inserted[0].user_said).toBe('That is exactly right.');
    expect(db.inserted[0].outcome).toBe('confirmed');
  });

  it('stamps the fact so rendering a Genome stays one query', async () => {
    await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'confirmed', said: 'yes' }));
    expect(db.updated[0].patch).toMatchObject({ confirmed_at: expect.any(String), active: true });
  });

  it('parks a denied fact', async () => {
    const res = await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'denied', said: 'no that was wrong' }));
    expect(db.updated[0].patch).toMatchObject({ active: false, parked_reason: 'denied' });
    const body = await res.json();
    console.log('denied response:', body);
    expect(body.success).toBe(true);
  });

  it('parks a corrected fact, and says the correction is a separate save', async () => {
    const res = await handleConfirmFact(
      post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'corrected', said: "it's per square metre, not lineal" }),
    );
    expect(db.updated[0].patch).toMatchObject({ active: false, parked_reason: 'superseded' });
    const body = await res.json();
    console.log('corrected response:', body);
    expect(body.message).toMatch(/save_memory/);
  });

  it('reports a failed write honestly rather than claiming it landed', async () => {
    db.failInsert = true;
    const res = await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'confirmed', said: 'yes' }));
    expect((await res.json()).success).toBe(false);
    // And the fact is NOT stamped — a confirmation whose evidence failed to write must not leave the
    // fact looking confirmed.
    expect(db.updated).toHaveLength(0);
  });
});

describe('what she is offered to read back', () => {
  it('hands back a short handle and the date he said it', async () => {
    const res = await handleFactsToConfirm(
      post('https://kira.internal/api/kira/webhooks/facts_to_confirm?uid=owner-1', {}),
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.facts[0].handle).toBe('abcd1234');
    expect(body.facts[0].fact).toMatch(/lineal metre/);
  });

  it('only offers unconfirmed, unparked facts', async () => {
    await handleFactsToConfirm(post('https://kira.internal/api/kira/webhooks/facts_to_confirm?uid=owner-1', {}));
    expect(db.filters).toContainEqual(['is', 'confirmed_at', null]);
    expect(db.filters).toContainEqual(['neq', 'active', false]);
  });

  // The exclusion that was missing until 2026-08-02, asserted in the unit test to guard the fix.
  it('never offers a fact the Genome throws away (genome_section = none)', async () => {
    await handleFactsToConfirm(post('https://kira.internal/api/kira/webhooks/facts_to_confirm?uid=owner-1', {}));
    expect(db.filters).toContainEqual(['neq', 'genome_section', 'none']);
  });
});