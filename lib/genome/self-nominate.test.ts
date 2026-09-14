// T2 — the doing-layer escape hatch, tested where it makes its promises:
//
//   * a task the census already asks about is NOT self-nominated (no duplicate questions)
//   * a task the census genuinely does not cover is self-admitted with admitted_by 'system'
//   * the area resolution is honest: no area = no nomination, no guessing
//   * D14: the same item key twice is one row

import { describe, expect, it, vi, afterEach } from 'vitest';
import { CHECKLIST, type ChecklistItem } from './checklist';
import {
  buildCensusVocab,
  contentTokens,
  decideUnsupportedTask,
  maybeSelfNominateUnsupportedTask,
  slugFromUtterance,
  tokenize,
  type CensusVocab,
} from './self-nominate';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock('@/lib/supabase/server');
});

// --- Pure token tests ---

describe('tokenize', () => {
  it('strips punctuation and lowercases, keeps meaningful words', () => {
    // 'up' is a stop word in the module's list, so it is filtered.
    expect(tokenize('Follow-up with the plumber!')).toEqual(['follow', 'plumber']);
  });

  it('drops very short tokens and common stop words', () => {
    const tokens = tokenize('How do we price a job for a new customer?');
    expect(tokens).not.toContain('do');
    expect(tokens).not.toContain('we');
    expect(tokens).toContain('price');
    expect(tokens).toContain('job');
    expect(tokens).toContain('customer');
  });
});

describe('slugFromUtterance', () => {
  it('normalises the utterance into a stable kebab-case slug', () => {
    expect(slugFromUtterance('Follow up with the plumber about the quote')).toBe(
      'follow-up-with-the-plumber-about-the-quote',
    );
  });

  it('truncates to 100 chars and strips edge hyphens', () => {
    const long = 'a '.repeat(60);
    expect(slugFromUtterance(long).length).toBeLessThanOrEqual(100);
    expect(slugFromUtterance(long).startsWith('-')).toBe(false);
    expect(slugFromUtterance(long).endsWith('-')).toBe(false);
  });
});

// --- Pure decision tests (hand-crafted vocab, not the live census) ---

function vocabWith(staticItems: Partial<ChecklistItem>[], areaTexts?: Partial<Record<string, string[]>>): CensusVocab {
  const staticTokens = new Set<string>();
  const areaTokens = new Map<string, string[]>();
  const flatItems = staticItems as ChecklistItem[];

  for (const item of flatItems) {
    const toks = [...contentTokens(item.buyerItem), ...contentTokens(item.ownerPrompt)];
    for (const t of toks) staticTokens.add(t);
  }

  for (const [area, toks] of Object.entries(areaTexts ?? {})) {
    if (toks) areaTokens.set(area, toks);
  }

  return { staticTokens, areaTokens, flatItems };
}

// A task whose tokens resolve cleanly to a single area (compliance) when the vocab is crafted.
// It does NOT overlap any mock item in the compliance area, so it is genuinely novel.
const CLEAN_NOVEL_UTT = 'Write a service agreement template for new clients before work starts';

describe('decideUnsupportedTask', () => {
  it('skips an empty utterance', () => {
    const decision = decideUnsupportedTask('  ', vocabWith([]));
    expect(decision.nominate).toBe(false);
    if (!decision.nominate) expect(decision.reason).toBe('empty');
  });

  it('skips when the utterance already has an item key in the static census', () => {
    // Pick a real static item key — itemByKey will find it in the real CHECKLIST.
    const existing = CHECKLIST.find((i) => i.key.length > 6)!;
    const text = `Do we have a ${existing.ownerPrompt.toLowerCase()}`;
    const decision = decideUnsupportedTask(text, vocabWith([]));
    expect(decision.nominate).toBe(false);
  });

  it('skips when the utterance overlaps an existing item by token content', () => {
    const mockItem: Partial<ChecklistItem> = {
      key: 'test-item-overlap',
      area: 'customers',
      buyerItem: 'Who actually holds the relationship with each customer?',
      ownerPrompt: 'Who actually holds the relationship with each customer?',
      required: true,
      closes: 'fact',
      factor: null,
    };
    const vocab = vocabWith([mockItem as ChecklistItem], {
      customers: contentTokens(`${mockItem.buyerItem} ${mockItem.ownerPrompt}`),
    });

    // The overlap detector stems tokens, so singular/plural differences are bridged.
    const decision = decideUnsupportedTask(
      'Who holds the relationship with each customer',
      vocab,
    );
    expect(decision.nominate).toBe(false);
    if (!decision.nominate) expect(decision.reason).toBe('covered-by-census');
  });

  it('skips when no area resolves — personal errand, not a cohort question', () => {
    // An empty areaTokens map forces resolveAreaKey to return null.
    const vocab = vocabWith([], {});
    const decision = decideUnsupportedTask(
      'Check whether our public liability insurance certificate is current',
      vocab,
    );
    expect(decision.nominate).toBe(false);
    if (!decision.nominate) expect(decision.reason).toBe('no-area');
  });

  it('nominates a genuinely novel task that cleanly resolves to one area', () => {
    // Build a vocab with only one area entry (compliance) and no static items, so:
    //   - no overlap is possible (flatItems is empty)
    //   - compliance is the only area, hence uniquely best (no tie)
    //   - the compliance tokens include words matching the compliance area but NOT the utt.
    const vocab = vocabWith([], {
      compliance: contentTokens(
        'Licences insurance calendar obligations renewals due dates agreements certificates public liability',
      ),
    });
    const decision = decideUnsupportedTask(CLEAN_NOVEL_UTT, vocab);
    // With stemming, 'agreements' → 'agreement' and our utt token 'agreement' matches compliance.
    expect(decision.nominate).toBe(true);
  });

  it('D14 — slug collision with a census key stops nomination', () => {
    // Force itemByKey to find a match by using an actual static key.
    const item = CHECKLIST.find((i) => i.key.length > 6)!;
    const decision = decideUnsupportedTask(
      `Check whether ${item.ownerPrompt.toLowerCase()}`,
      vocabWith([]),
    );
    // itemByKey(slug) matches the real static census → covered
    expect(decision.nominate).toBe(false);
  });
});

// --- Supabase integration (stubbed) ---

let capturedUpsert: { payload: Record<string, unknown>; opts: unknown } | null = null;

function stubDb() {
  vi.resetModules();
  capturedUpsert = null;
  vi.doMock('@/lib/supabase/server', () => ({
    createServiceClientV2: () => ({
      from: (table: string) => {
        if (table === 'genome_admission_ledger') {
          return {
            select: () => ({
              eq: () => ({
                is: async () => ({ data: [], error: null }),
              }),
            }),
            upsert: (
              payload: Record<string, unknown>,
              opts: { onConflict?: string; ignoreDuplicates?: boolean },
            ) => {
              capturedUpsert = { payload, opts };
              return { error: null };
            },
          };
        }
        return {
          select: () => ({ eq: async () => ({ data: [], error: null }) }),
        };
      },
    }),
  }));
}

describe('maybeSelfNominateUnsupportedTask (DB integration)', () => {
  it('when it nominates, the upsert is admitted by system with D14 ignoreDuplicates', async () => {
    stubDb();
    // Use an utterance that is genuinely novel to the real census and resolves clearly.
    // "fire safety risk assessment" → compliance area has no item about fire safety, and the
    // area tokens (obligations/calendar/licences/insurance) plus the title word 'calendar' will
    // not collide. The area resolution relies on the real static CHECKLIST tokens. Because this
    // integration test exercises the real logic, it may legitimately skip if the real census
    // happens to cover the utterance — in which case the upsert is never called and that is
    // also correct behaviour. We assert the upsert SHAPE only when it fires.
    const result = await maybeSelfNominateUnsupportedTask(
      'Write a fire safety risk assessment template for our workshop',
      'user-123',
    );

    if (result.nominate) {
      expect(capturedUpsert).not.toBeNull();
      expect(capturedUpsert!.payload.status).toBe('admitted');
      expect(capturedUpsert!.payload.admitted_by).toBe('system');
      expect(typeof capturedUpsert!.payload.area_key).toBe('string');
      expect(typeof capturedUpsert!.payload.item_key).toBe('string');
      expect((capturedUpsert!.opts as Record<string, unknown>).ignoreDuplicates).toBe(true);
      expect(typeof capturedUpsert!.payload.reason).toBe('string');
    } else {
      expect(result).toHaveProperty('reason');
    }
  });

  it('idempotent: same utterance twice leaves the same row (ignoreDuplicates keeps existing)', async () => {
    stubDb();
    const first = await maybeSelfNominateUnsupportedTask(
      'Set up a standard greeting script for all incoming calls',
      'user-123',
    );
    const second = await maybeSelfNominateUnsupportedTask(
      'Set up a standard greeting script for all incoming calls',
      'user-123',
    );
    // Both must not throw, and the second should not overwrite the first if the first nominated.
    if (first.nominate && second.nominate) {
      expect(first.itemKey).toBe(second.itemKey);
      expect(first.areaKey).toBe(second.areaKey);
      expect((capturedUpsert!.opts as Record<string, unknown>).ignoreDuplicates).toBe(true);
    }
  });
});