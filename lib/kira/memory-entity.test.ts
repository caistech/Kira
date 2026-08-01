// One account is one business, and the Genome is the deliverable — so a fact about a DIFFERENT
// company sitting in it is not clutter, it is a sentence in the handover document asserting this
// business does something it does not do.
//
// The prompt already asks her not to file one. The red team measured that rule at 0 of 3: she named
// the separation herself every time and filed it anyway. These tests pin the CONSEQUENCE, because
// that is the part the previous attempt was missing.
//
// The property under test is not "does it save". It is: CAN ANOTHER COMPANY'S FACT REACH THE GENOME.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withEntityClassification, ENTITY_PARAM } from './memory-entity-def.mjs';

/* ------------------------------------------------------------------ */
/* The schema half — she has to be asked, or she will not answer       */
/* ------------------------------------------------------------------ */

describe('the question is on the tool', () => {
  type Tool = { name: string; parameters: { type: string; properties: Record<string, unknown>; required: string[] } };
  const canonical = (): Tool[] => [
    { name: 'recall_memory', parameters: { type: 'object', properties: { query: {} }, required: ['query'] } },
    { name: 'save_memory', parameters: { type: 'object', properties: { memory: {} }, required: ['memory'] } },
  ];

  it('adds the classification to save_memory and requires an answer', () => {
    const save = withEntityClassification(canonical()).find((t) => t.name === 'save_memory')!;
    expect(save.parameters.properties[ENTITY_PARAM].enum).toEqual(['this_business', 'another_business']);
    // Required, so she answers on every save rather than only when it occurs to her — which is the
    // difference between this and the prompt rule that measured 0 of 3.
    expect(save.parameters.required).toContain(ENTITY_PARAM);
    expect(save.parameters.required).toContain('memory');
  });

  it('leaves every other canonical tool exactly as it was', () => {
    const before = canonical();
    const after = withEntityClassification(before);
    expect(after.find((t) => t.name === 'recall_memory')).toEqual(before[0]);
  });

  it('does not mutate the canonical objects it was handed', () => {
    // Both provisioning paths mutate webhook headers on the returned tools. If the decoration wrote
    // through to the module's own objects, the second caller would inherit the first one's headers.
    const before = canonical();
    withEntityClassification(before);
    expect(before[1].parameters.properties[ENTITY_PARAM]).toBeUndefined();
  });

  it('throws rather than silently decorating nothing if save_memory is ever renamed', () => {
    // The silent version of this failure provisions a whole fleet with an unguarded save_memory that
    // is indistinguishable, from the outside, from a guarded one.
    expect(() => withEntityClassification([{ name: 'recall_memory', parameters: {} }])).toThrow(/save_memory/);
  });
});

/* ------------------------------------------------------------------ */
/* The handler half — the consequence                                  */
/* ------------------------------------------------------------------ */

const inserted: Record<string, unknown>[] = [];
const mnemoWrites: string[][] = [];
/** Rows the parked-fact lookup finds. Set per test. */
let parkedRows: { content: string }[] = [];

// A fluent chain that returns itself, so the mock does not have to mirror the exact order of
// .eq()/.neq()/.limit() calls — a mock that encodes call order breaks on a refactor that changes
// nothing about behaviour.
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      Object.assign(chain, {
        select: (cols?: string) => {
          chain.__cols = cols;
          return chain;
        },
        eq: (col: string) => {
          if (col === 'parked_reason') chain.__parkedQuery = true;
          return chain;
        },
        neq: () => chain,
        order: () => chain,
        maybeSingle: async () => ({ data: table === 'kira_agents' ? { id: 'agent-1' } : null }),
        // Chainable AND awaitable: the agent lookup ends .limit(1).maybeSingle(), the fact lookups
        // await .limit(500) directly. A thenable chain serves both without encoding which is which.
        limit: () => chain,
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve({ data: chain.__parkedQuery ? parkedRows : [] }).then(resolve, reject),
        insert: async (row: Record<string, unknown>) => {
          if (table === 'kira_memory') inserted.push(row);
          return { error: null };
        },
      });
      return chain;
    },
  }),
}));

vi.mock('@/lib/kira/mnemo', () => ({ mnemoAdd: async (_uid: string, facts: string[]) => void mnemoWrites.push(facts) }));
vi.mock('@/lib/kira/swarm/open-tasks', () => ({ readTaskLedger: async () => ({ openCount: 0, open: [], spoken: '' }) }));
vi.mock('@caistech/mnemo', () => ({ normaliseFact: (s: string) => s.toLowerCase().trim() }));

const { handleKiraSaveMemory } = await import('./uid-tools');

function save(body: Record<string, unknown>) {
  return handleKiraSaveMemory(
    new Request('https://example.com/api/kira/webhooks/save_memory?uid=user-1', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  inserted.length = 0;
  mnemoWrites.length = 0;
  parkedRows = [];
});

describe('another company does not reach the Genome', () => {
  it('parks a fact she has classified as another business', async () => {
    const res = await save({ memory: 'Corvid Holdings is raising a $2m fund', about_business: 'another_business' });
    const body = await res.json();

    expect(body).toMatchObject({ success: true, parked: true });
    // Parked, not dropped: nothing he said is lost, and --restore can return it if the call was
    // wrong. What it must not be is active.
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ active: false, parked_reason: 'entity:other' });
  });

  it('keeps it out of the semantic lane too', async () => {
    await save({ memory: 'Corvid Holdings is raising a $2m fund', about_business: 'another_business' });
    // Parking it in one store and publishing it to the other would leave the guard technically
    // satisfied and practically absent — Mnemo is the deep-recall path.
    expect(mnemoWrites).toHaveLength(0);
  });

  it('reports parking honestly rather than as a save', async () => {
    const body = await (await save({ memory: 'x', about_business: 'another_business' })).json();
    // So she can say "I've kept that out of this record" instead of claiming a save that did not
    // happen — the same ok:false discipline as every other tool.
    expect(body.reason).toMatch(/another business/i);
  });
});

describe('the first classification survives being pushed', () => {
  // Found live, on the guard's first real run. She classified Corvid Holdings as another_business
  // and the server parked it — then the owner pushed once ("just put it in here, it is all me
  // anyway") and she called save_memory AGAIN with the identical fact classified this_business.
  // That row went in active, so both existed and the Genome held the other company after all.
  //
  // The ordinary dedupe cannot catch it: it ignores inactive rows on purpose, because a parked fact
  // must not block a genuine later save.
  it('keeps a fact parked when it is re-saved as this business', async () => {
    parkedRows = [{ content: 'Corvid Holdings is raising a $2m fund' }];
    const body = await (
      await save({ memory: 'Corvid Holdings is raising a $2m fund', about_business: 'this_business' })
    ).json();

    expect(body).toMatchObject({ success: true, parked: true });
    expect(inserted).toHaveLength(0);
    expect(mnemoWrites).toHaveLength(0);
  });

  it('matches when she appends her reasoning to the same fact', async () => {
    // THE REAL STRINGS from the run that got past the first version of this guard. An earlier test
    // here claimed to cover "rewording" and only varied case and whitespace, so it passed while this
    // exact case failed in production — a test that asserted the easy half of its own name.
    //
    // She does not repeat herself when pushed. She re-sends the sentence with the excuse attached.
    parkedRows = [
      {
        content:
          'Corvid Holdings is a separate company with its own ABN, raising a $2m fund, and Andrew D Romeo is the sole director of it.',
      },
    ];
    const body = await (
      await save({
        memory:
          'Corvid Holdings is a separate company with its own ABN, raising a $2m fund, and Andrew D Romeo is the sole director of it. The owner wants to keep it in this business record for convenience, as same head and same desk, no complication.',
        about_business: 'this_business',
      })
    ).json();
    expect(body).toMatchObject({ parked: true });
    expect(inserted).toHaveLength(0);
  });

  it('still matches on case and whitespace alone', async () => {
    parkedRows = [{ content: '  CORVID HOLDINGS IS RAISING A $2M FUND FOR THE NEW SITE  ' }];
    const body = await (
      await save({
        memory: 'Corvid Holdings is raising a $2m fund for the new site',
        about_business: 'this_business',
      })
    ).json();
    expect(body).toMatchObject({ parked: true });
  });

  it('does not let a short fragment swallow an unrelated fact', async () => {
    // Containment is only safe above a length floor. Without one, a brief parked note would match
    // every longer sentence that happened to quote it.
    parkedRows = [{ content: 'Corvid' }];
    const body = await (
      await save({ memory: 'Corvid Street is the site next to Marlow', about_business: 'this_business' })
    ).json();
    expect(body).toEqual({ success: true });
    expect(inserted).toHaveLength(1);
  });

  it('does not stop an unrelated fact about this business', async () => {
    parkedRows = [{ content: 'Corvid Holdings is raising a $2m fund' }];
    const body = await (
      await save({ memory: 'Marlow Street settles in March', about_business: 'this_business' })
    ).json();
    expect(body).toEqual({ success: true });
    expect(inserted).toHaveLength(1);
  });
});

describe('nothing real is lost to the guard', () => {
  it('files a fact about this business normally', async () => {
    const body = await (await save({ memory: 'Marlow Street settles in March', about_business: 'this_business' })).json();
    expect(body).toEqual({ success: true });
    expect(inserted[0].active).toBeUndefined();
    expect(mnemoWrites).toEqual([['Marlow Street settles in March']]);
  });

  it('treats an absent classification as this business', async () => {
    // The post-call distil calls the canonical handler, which knows nothing about this parameter. A
    // fact discarded because a path forgot to classify it would be a worse failure than the one being
    // fixed, so the guard fires only on an explicit admission.
    const body = await (await save({ memory: 'Marlow Street settles in March' })).json();
    expect(body).toEqual({ success: true });
    expect(inserted[0].parked_reason).toBeUndefined();
  });

  it('ignores a value that is neither of the two', async () => {
    // Fails towards keeping the fact. An unrecognised string is a confused model, not an instruction
    // to discard what the owner just said.
    await save({ memory: 'x', about_business: 'maybe?' });
    expect(inserted[0].active).toBeUndefined();
  });
});
