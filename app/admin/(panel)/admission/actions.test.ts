// D14 — idempotent admission at the action layer: a duplicate nomination of the same
// (area_key, item_key) pair is one row, never two. This is the honesty guarantee that a
// re-delivered nomination (a doing-layer task fired twice, a broker challenging the same gap
// twice) cannot inflate the factor set by repetition.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { itemsForArea } from '@/lib/genome/checklist';

const calls = {
  upserted: [] as { payload: Record<string, unknown>; onConflict?: string }[],
  updated: [] as { payload: Record<string, unknown>; id?: string }[],
  revalidated: [] as string[],
};

vi.mock('next/cache', () => ({
  revalidatePath: (p: string) => calls.revalidated.push(p),
}));

vi.mock('@/lib/auth', () => ({
  isCurrentUserAdmin: vi.fn().mockResolvedValue(true),
}));

let existingStatus: {
  status: string;
  id?: string;
  item_key?: string;
  factor?: string | null;
  substance?: unknown;
  retracted_at?: string | null;
} | null = null;
let existingCrossArea: { area_key: string } | null = null;

function clientStub() {
  let lastCols = '';
  const builder = {
    select: (cols: string) => {
      lastCols = cols;
      return builder;
    },
    eq: () => builder,
    is: () => builder,
    maybeSingle: async () =>
      lastCols.includes('status') || lastCols === '*'
        ? { data: existingStatus, error: null }
        : { data: existingCrossArea, error: null },
    upsert: (payload: Record<string, unknown>, opts: { onConflict?: string }) => {
      calls.upserted.push({ payload, onConflict: opts?.onConflict });
      return { error: null };
    },
    update: (payload: Record<string, unknown>) => ({
      eq: (_col: string, id: string) => {
        calls.updated.push({ payload, id });
        return { error: null };
      },
    }),
  };
  return { from: () => builder };
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientV2: () => clientStub(),
}));

const { nominateAdmission, setSubstance, admitAdmission, validateSubstanceInput } = await import('./actions');

function nomination(over: Record<string, string> = {}) {
  return {
    areaKey: 'demand',
    itemKey: 'adm-lead-response-time',
    buyerItem: 'How quickly does the business respond to new enquiries?',
    ownerPrompt: 'How quickly do you get back to new enquiries?',
    factor: 'growth',
    reason: 'A broker flagged three unanswered enquiries in one review.',
    ...over,
  };
}

beforeEach(() => {
  calls.upserted.length = 0;
  calls.updated.length = 0;
  calls.revalidated.length = 0;
  existingStatus = null;
  existingCrossArea = null;
});

describe('nominateAdmission (D14 idempotency)', () => {
  it('nominates to the watchlist via a single idempotent upsert', async () => {
    const result = await nominateAdmission(nomination());
    expect(result.ok).toBe(true);
    expect(calls.upserted).toHaveLength(1);
    expect(calls.upserted[0].onConflict).toBe('area_key,item_key');
    expect(calls.upserted[0].payload.item_key).toBe('adm-lead-response-time');
    expect(calls.upserted[0].payload.status).toBe('watchlisted');
  });

  it('re-nominating the same pair stays ONE row (same upsert key), never a second insert', async () => {
    const first = await nominateAdmission(nomination());
    const second = await nominateAdmission(nomination({ buyerItem: 'A reworded buyer question.' }));
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    // Both deliveries resolve to the same (area_key,item_key) conflict key — the row is one and
    // the fields are refreshed in place. Two deliveries, one journaled entry.
    expect(calls.upserted).toHaveLength(2);
    for (const c of calls.upserted) {
      expect(c.onConflict).toBe('area_key,item_key');
      expect(c.payload.item_key).toBe('adm-lead-response-time');
    }
    // And the fields travel with the LATEST nomination, matching an upsert-do-update.
    expect(calls.upserted[1].payload.buyer_item).toBe('A reworded buyer question.');
  });

  it('refuses an item key that already exists in the static census', async () => {
    const staticKey = itemsForArea('people')[0].key;
    const result = await nominateAdmission(nomination({ itemKey: staticKey }));
    expect(result.ok).toBe(false);
    expect(calls.upserted).toHaveLength(0); // no write — the week question is already ASKED
  });

  it('refuses to re-nominate an already-ADMITTED item (an admitted question must not quietly change)', async () => {
    existingStatus = { status: 'admitted' };
    const result = await nominateAdmission(nomination({ itemKey: 'adm-already-live' }));
    expect(result.ok).toBe(false);
    expect(calls.upserted).toHaveLength(0);
  });

  it('refuses an item key already in use under another area (one question, one area)', async () => {
    existingCrossArea = { area_key: 'pricing' };
    const result = await nominateAdmission(nomination({ itemKey: 'adm-duplicated-name' }));
    expect(result.ok).toBe(false);
    expect(calls.upserted).toHaveLength(0);
  });

  it('rejects a non-kebab-case item key without touching the database', async () => {
    const result = await nominateAdmission(nomination({ itemKey: 'Not A Key!' }));
    expect(result.ok).toBe(false);
    expect(calls.upserted).toHaveLength(0);
  });
});

describe('validateSubstanceInput (pure)', () => {
  it('passes a factor-bearing item with a complete substance test', () => {
    const r = validateSubstanceInput({
      factor: 'growth',
      tests: 'names the two biggest accounts\nnames a rough share',
      weakExample: 'A couple of big ones.',
      strongExample: 'Biggest is 35% of revenue.',
      coaching: 'Name them and add shares.',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.factor).toBe('growth');
      expect(r.substance).toEqual({
        tests: ['names the two biggest accounts', 'names a rough share'],
        weakExample: 'A couple of big ones.',
        strongExample: 'Biggest is 35% of revenue.',
        coaching: 'Name them and add shares.',
      });
    }
  });

  it('requires a complete substance test when a factor is set', () => {
    const r = validateSubstanceInput({
      factor: 'growth',
      tests: '',
      weakExample: '',
      strongExample: '',
      coaching: '',
    });
    expect(r.ok).toBe(false);
  });

  it('returns the yolkless path when the factor is cleared', () => {
    const r = validateSubstanceInput({
      factor: '',
      tests: '',
      weakExample: '',
      strongExample: '',
      coaching: '',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.factor).toBeNull();
      expect(r.substance).toBeNull();
    }
  });

  it('rejects an unknown factor', () => {
    const r = validateSubstanceInput({
      factor: 'synergy',
      tests: 'x',
      weakExample: 'x',
      strongExample: 'x',
      coaching: 'x',
    });
    expect(r.ok).toBe(false);
  });
});

describe('setSubstance (the authoring surface)', () => {
  it('writes factor + substance onto a row', async () => {
    existingStatus = {
      status: 'watchlisted',
      id: 'row-1',
      item_key: 'adm-lead-time',
      factor: null,
      substance: null,
      retracted_at: null,
    };
    const result = await setSubstance('row-1', {
      factor: 'growth',
      tests: 'names the biggest account',
      weakExample: 'A couple of big ones.',
      strongExample: 'Biggest is 35%.',
      coaching: 'Name them.',
    });
    expect(result.ok).toBe(true);
    expect(calls.updated).toHaveLength(1);
    expect(calls.updated[0].payload.factor).toBe('growth');
    expect(calls.updated[0].payload.substance).toEqual({
      tests: ['names the biggest account'],
      weakExample: 'A couple of big ones.',
      strongExample: 'Biggest is 35%.',
      coaching: 'Name them.',
    });
  });

  it('clears factor AND substance together (the yolkless escape)', async () => {
    existingStatus = {
      status: 'watchlisted',
      id: 'row-1',
      item_key: 'adm-lead-time',
      factor: 'growth',
      substance: { tests: ['x'] },
      retracted_at: null,
    };
    const result = await setSubstance('row-1', {
      factor: '',
      tests: '',
      weakExample: '',
      strongExample: '',
      coaching: '',
    });
    expect(result.ok).toBe(true);
    expect(calls.updated[0].payload.factor).toBeNull();
    expect(calls.updated[0].payload.substance).toBeNull();
  });

  it('never touches the database for an invalid input', async () => {
    const result = await setSubstance('row-1', {
      factor: 'synergy',
      tests: 'x',
      weakExample: 'x',
      strongExample: 'x',
      coaching: 'x',
    });
    expect(result.ok).toBe(false);
    expect(calls.updated).toHaveLength(0);
  });
});

describe('admitAdmission (the gate that makes the substance test honest)', () => {
  function watchlistRow(over: Partial<NonNullable<typeof existingStatus>> = {}) {
    existingStatus = {
      status: 'watchlisted',
      id: 'row-1',
      item_key: 'adm-lead-time',
      factor: null,
      substance: null,
      retracted_at: null,
      ...over,
    };
  }

  it('refuses a factor-bearing item with no substance test — the bar has no silent members', async () => {
    watchlistRow({ factor: 'growth', substance: null });
    const result = await admitAdmission('row-1', 'A broker flagged three unanswered enquiries.');
    expect(result.ok).toBe(false);
    expect(calls.updated).toHaveLength(0);
  });

  it('admits a factor-bearing item once its substance test is authored', async () => {
    watchlistRow({
      factor: 'growth',
      substance: {
        tests: ['names the biggest account'],
        weakExample: 'a couple of big ones',
        strongExample: 'biggest is 35%',
        coaching: 'name them',
      },
    });
    const result = await admitAdmission('row-1', 'A broker flagged three unanswered enquiries.');
    expect(result.ok).toBe(true);
    expect(calls.updated).toHaveLength(1);
    expect(calls.updated[0].payload.status).toBe('admitted');
    // The admit update carries status/journaling only — factor and substance live on the row
    // already (authored before admission), and the SUBSTANCE GATE above is what let it through.
    expect(calls.updated[0].payload).not.toHaveProperty('factor');
  });

  it('admits a factor-null document-completing item by presence (no test needed)', async () => {
    watchlistRow({ factor: null, substance: null });
    const result = await admitAdmission('row-1', 'A broker flagged three unanswered enquiries.');
    expect(result.ok).toBe(true);
    expect(calls.updated).toHaveLength(1);
    expect(calls.updated[0].payload.status).toBe('admitted');
  });
});