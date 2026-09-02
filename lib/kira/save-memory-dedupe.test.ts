// The same fact, twice, must not become two rows.
//
// The Mnemo lane has always deduped; this table did not. The harm is retrieval, not storage: recall
// reads a FIXED window (the typed transport injects the top 30 by importance), so a duplicate does
// not add depth — it evicts a distinct fact from the window. And a fact returned twice reads as two
// sources agreeing. keep_document was built idempotent for exactly this reason; memories were not.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  existing: [] as Array<{ content: string }>,
  inserted: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientV2: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        or: () => chain,
        eq: () => chain,
        neq: () => chain,
        not: () => {
          chain.__entityQuery = true;
          return chain;
        },
        order: () => chain,
        limit: () =>
          chain.__entityQuery
            ? Promise.resolve({ data: [] })
            : table === 'kira_memory'
              ? Promise.resolve({ data: db.existing })
              : chain,
        maybeSingle: () => Promise.resolve({ data: null }),
        insert: (row: Record<string, unknown>) => {
          db.inserted.push(row);
          return Promise.resolve({ error: null });
        },
      };
      return chain;
    },
  }),
  createServiceClientV2: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        or: () => chain,
        eq: () => chain,
        neq: () => chain,
        order: () => chain,
        limit: () =>
          table === 'kira_memory'
            ? Promise.resolve({ data: db.existing })
            : chain,
        maybeSingle: () => Promise.resolve({ data: null }),
        insert: (row: Record<string, unknown>) => {
          db.inserted.push(row);
          return Promise.resolve({ error: null });
        },
      };
      return chain;
    },
  }),
}));

vi.mock('@/lib/auth', () => ({
  resolveOrganisationForPerson: vi.fn().mockResolvedValue({ organisationId: 'org-1', personId: 'owner-1' }),
}));

vi.mock('@/lib/kira/mnemo', () => ({ mnemoAdd: async () => undefined }));
vi.mock('@/lib/kira/swarm/open-tasks', () => ({ readTaskLedger: async () => ({}) }));

const { handleKiraSaveMemory } = await import('./uid-tools');

function save(memory: string): Promise<Response> {
  return handleKiraSaveMemory(
    new Request('https://kira.test/api/kira/webhooks/save_memory?uid=owner-1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ memory }),
    }),
  );
}

beforeEach(() => {
  db.existing = [];
  db.inserted = [];
});

describe('save_memory does not store what it already holds', () => {
  it('stores a fact it has never seen', async () => {
    const body = await (await save('Dave at Quantum Surveys prefers a phone call to email.')).json();

    expect(body.success).toBe(true);
    expect(body.already).toBeUndefined();
    expect(db.inserted).toHaveLength(1);
  });

  it('refuses a second copy of the identical fact', async () => {
    db.existing = [{ content: 'Dave at Quantum Surveys prefers a phone call to email.' }];
    const body = await (await save('Dave at Quantum Surveys prefers a phone call to email.')).json();

    expect(body.success).toBe(true);
    expect(body.already).toBe(true); // honest: "I already had that", not a second save
    expect(db.inserted).toHaveLength(0);
  });

  // The realistic case. Nobody repeats a fact word-for-word across two conversations — a mid-call
  // save and a post-call distillation of the same sentence differ in casing, spacing and
  // punctuation, which is why a unique index on the column could never have caught this.
  it('catches the same fact reworded in the ways a transcript actually rewords it', async () => {
    db.existing = [{ content: 'Dave at Quantum Surveys prefers a phone call to email.' }];
    const body = await (await save('  dave at quantum surveys prefers a phone call to email  ')).json();

    expect(body.already).toBe(true);
    expect(db.inserted).toHaveLength(0);
  });

  it('still stores a genuinely different fact about the same person', async () => {
    db.existing = [{ content: 'Dave at Quantum Surveys prefers a phone call to email.' }];
    await save('Dave at Quantum Surveys charges $180 an hour.');

    expect(db.inserted).toHaveLength(1);
  });
});
