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
  createServiceClient: () => ({
    from(table: string) {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      for (const method of ['select', 'eq', 'neq', 'is', 'ilike', 'order', 'limit']) {
        chain[method] = (...args: unknown[]) => {
          if (['eq', 'neq', 'is', 'ilike'].includes(method)) {
            db.filters.push([method, String(args[0]), args[1]]);
          }
          return self();
        };
      }
      // The memory query is awaited directly at the end of the chain.
      (chain as { then: unknown }).then = (resolve: (v: unknown) => void) =>
        resolve({ data: table === 'kira_memory' ? db.facts : [], error: null });
      chain.insert = (row: Record<string, unknown>) => {
        db.inserted.push({ table, ...row });
        return Promise.resolve({ error: db.failInsert ? new Error('insert failed') : null });
      };
      chain.update = (patch: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => {
          db.updated.push({ id, patch });
          return Promise.resolve({ error: null });
        },
      });
      return chain;
    },
  }),
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
    expect(db.inserted).toHaveLength(0);
  });

  it('refuses a handle that matches nothing', async () => {
    db.facts = [];
    const res = await handleConfirmFact(post(URL_WITH_UID, { handle: 'ffffffff', outcome: 'confirmed', said: 'yes' }));
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/facts_to_confirm/);
    expect(db.inserted).toHaveLength(0);
  });

  // Landing a confirmation on the WRONG fact is the failure the whole two-tool design exists to
  // prevent, and it would be invisible — so ambiguity is refused rather than resolved by picking one.
  it('refuses an ambiguous handle instead of guessing which fact he meant', async () => {
    db.facts = [
      { id: 'abcd1234-0000-4000-8000-000000000001', content: 'one', kira_agent_id: null },
      { id: 'abcd1234-0000-4000-8000-000000000002', content: 'two', kira_agent_id: null },
    ];
    const res = await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'confirmed', said: 'yes' }));
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/more than one/);
    expect(db.inserted).toHaveLength(0);
  });

  it('scopes the lookup to the owner in the query, not after it', async () => {
    await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'confirmed', said: 'yes' }));
    expect(db.filters).toContainEqual(['eq', 'user_id', 'owner-1']);
  });
});

describe('what it records', () => {
  it('writes the event with his words, not her summary', async () => {
    await handleConfirmFact(
      post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'confirmed', said: "yeah that's right, though it's $95 now" }),
    );
    expect(db.inserted).toHaveLength(1);
    expect(db.inserted[0]).toMatchObject({
      table: 'kira_fact_confirmations',
      user_id: 'owner-1',
      outcome: 'confirmed',
      said: "yeah that's right, though it's $95 now",
    });
  });

  it('stamps the fact so rendering a Genome stays one query', async () => {
    await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'confirmed', said: 'yes' }));
    expect(db.updated[0].patch).toMatchObject({ confirmed_outcome: 'confirmed' });
    expect(db.updated[0].patch.confirmed_at).toBeTruthy();
    // A confirmed fact stays in the record — only a denial or correction removes one.
    expect(db.updated[0].patch.active).toBeUndefined();
  });

  // The consequence that makes this worth having: a fact he says is wrong stops being asserted in
  // his name immediately, rather than sitting in a document a buyer reads.
  it('parks a denied fact', async () => {
    await handleConfirmFact(post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'denied', said: "no, we stopped doing that" }));
    expect(db.updated[0].patch).toMatchObject({ active: false, parked_reason: 'denied' });
  });

  it('parks a corrected fact, and says the correction is a separate save', async () => {
    const res = await handleConfirmFact(
      post(URL_WITH_UID, { handle: 'abcd1234', outcome: 'corrected', said: "it's per square metre, not lineal" }),
    );
    expect(db.updated[0].patch).toMatchObject({ active: false, parked_reason: 'superseded' });
    expect((await res.json()).message).toMatch(/save_memory/);
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

  // The exclusion that was missing until 2026-08-02, asserted on the QUERY rather than on the
  // returned rows — the mock cannot filter, and a test that checked the output would pass against a
  // handler with no filter at all.
  //
  // Measured before the fix, against the real QA account: of 13 offerable rows, 7 were 'none' —
  // more than half of what she would read back were facts `deriveOwnerGenome` drops from the Genome
  // outright, so confirming one could never count on the verifiable axis. A wasted turn of his
  // attention is the most expensive thing this product can spend.
  it('never offers a fact the Genome throws away', async () => {
    await handleFactsToConfirm(post('https://kira.internal/api/kira/webhooks/facts_to_confirm?uid=owner-1', {}));
    expect(db.filters).toContainEqual(['neq', 'genome_section', 'none']);
  });

  // "Nothing came back" and "everything is confirmed" are different states, and presenting the first
  // as the second would tell him the record is better than it is.
  it('says plainly when there is nothing left to check', async () => {
    db.facts = [];
    const res = await handleFactsToConfirm(post('https://kira.internal/api/kira/webhooks/facts_to_confirm?uid=owner-1', {}));
    const body = await res.json();
    expect(body.facts).toEqual([]);
    expect(body.message).toMatch(/already been checked/);
  });
});
