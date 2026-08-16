// The assessor's contract, tested without a model.
//
// Everything here is about what happens when the model is absent, wrong, or lying — because those
// are the states that put a false green on a page meant to be shown to a buyer, and they are the
// states a happy-path test never reaches.

import { describe, expect, it, vi, afterEach } from 'vitest';

import { assessAreaEntries } from './checklist-assess';
import { itemsForArea } from './checklist';

const entries = [
  { id: 'e1', headline: 'Sam runs scheduling', content: 'Sam does the scheduling and the ordering.' },
];

afterEach(() => vi.restoreAllMocks());

describe('degrade, don\'t fake', () => {
  it('returns everything open with no API key, never a guess', async () => {
    const out = await assessAreaEntries('people', entries, { apiKey: '' });
    expect(out.length).toBe(itemsForArea('people').length);
    expect(out.every((v) => v.status === 'open')).toBe(true);
  });

  it('returns everything open when there is nothing on the record', async () => {
    const out = await assessAreaEntries('people', [], { apiKey: 'sk-test' });
    expect(out.every((v) => v.status === 'open')).toBe(true);
  });

  it('returns everything open when the model call throws', async () => {
    // A failed assessment must render as "not assessed yet", which is true — not as an empty
    // Genome, which is not. The page is the product; it renders whatever else is broken.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await assessAreaEntries('people', entries, { apiKey: 'sk-test' });
    expect(out.every((v) => v.status === 'open')).toBe(true);
  });
});

function mockModel(payload: unknown) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
  } as Response);
}

describe('what the model returns is not taken on trust', () => {
  it('an item the model omitted comes back OPEN, not dropped', async () => {
    // ⚠️ LOAD-BEARING. If omitted items were dropped, an area where the model returned two verdicts
    // would look like a two-item area, and the band would be computed against a denominator that
    // shrank silently whenever the model got lazy.
    mockModel({ verdicts: [{ item_key: 'people.roster', status: 'answered' }] });
    const out = await assessAreaEntries('people', entries, { apiKey: 'sk-test' });
    expect(out.length).toBe(itemsForArea('people').length);
    expect(out.find((v) => v.itemKey === 'people.roster')?.status).toBe('answered');
    expect(out.filter((v) => v.status === 'open').length).toBe(itemsForArea('people').length - 1);
  });

  it('drops an evidence id that was never in the prompt', async () => {
    // A model citing an entry that does not exist has invented it. An invented citation on a page
    // whose whole purpose is to be defensible to a buyer is worse than no citation at all.
    mockModel({
      verdicts: [
        { item_key: 'people.roster', status: 'answered', evidence: ['e1', 'e-does-not-exist'] },
      ],
    });
    const out = await assessAreaEntries('people', entries, { apiKey: 'sk-test' });
    expect(out.find((v) => v.itemKey === 'people.roster')?.evidence).toEqual(['e1']);
  });

  it('ignores a verdict for an item key that is not in this area', async () => {
    mockModel({ verdicts: [{ item_key: 'assets.owned', status: 'answered' }] });
    const out = await assessAreaEntries('people', entries, { apiKey: 'sk-test' });
    expect(out.some((v) => v.itemKey === 'assets.owned')).toBe(false);
    expect(out.every((v) => v.status === 'open')).toBe(true);
  });

  it('falls back to the static coaching when a weak verdict carries no reason', async () => {
    // A criticism with no reason attached is the one thing more annoying than no criticism. The
    // static line is always at least true of the QUESTION, even when it cannot quote him.
    mockModel({ verdicts: [{ item_key: 'people.successor', status: 'weak' }] });
    const out = await assessAreaEntries('people', entries, { apiKey: 'sk-test' });
    expect(out.find((v) => v.itemKey === 'people.successor')?.why).toMatch(/hospital/i);
  });

  it('never attaches a reason to an answered item', async () => {
    mockModel({
      verdicts: [{ item_key: 'people.roster', status: 'answered', why: 'could be better' }],
    });
    const out = await assessAreaEntries('people', entries, { apiKey: 'sk-test' });
    expect(out.find((v) => v.itemKey === 'people.roster')?.why).toBeNull();
  });
});

describe('the prompt tells the model the things that matter most', () => {
  it('sends the substance tests, not only the question', async () => {
    // Without the tests the model is grading on its own taste, which is precisely the "six facts of
    // any kind" problem wearing a language model.
    let sent = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      sent = String((init as RequestInit).body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"verdicts":[]}' } }] }) } as Response;
    });
    await assessAreaEntries('people', entries, { apiKey: 'sk-test' });
    expect(sent).toMatch(/tests \(ALL must hold\)/);
    expect(sent).toMatch(/helps out/); // the weak example for people.successor
  });

  it('instructs that an honest negative is an answer', async () => {
    // "Nobody could step into my job" is the most valuable sentence in the record. A model that
    // scored it as open or weak would punish the exact honesty the product is built to elicit.
    let sent = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      sent = String((init as RequestInit).body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"verdicts":[]}' } }] }) } as Response;
    });
    await assessAreaEntries('people', entries, { apiKey: 'sk-test' });
    expect(sent).toMatch(/honest negative IS an answer/i);
    expect(sent).toMatch(/plan or an intention is not an answer/i);
  });
});
