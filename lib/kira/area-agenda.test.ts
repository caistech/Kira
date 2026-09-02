// The agenda's contract: what she is handed, in what order, and what she is never handed.
//
// The ordering assertions are the load-bearing ones. A model given a mixed list asks the easy new
// question every time, so if weak items do not lead, the one thing she would otherwise never do —
// go back to a thin answer she already accepted — silently stops happening, and nothing anywhere
// says so.

import { describe, expect, it, vi, afterEach } from 'vitest';

import { resolveArea } from './area-agenda';

// ⚠️ resetModules() before every dynamic import, and it is not boilerplate. `vi.doMock` only affects
// a module graph built AFTER it runs, and the static `resolveArea` import at the top of this file
// has already built one — so without the reset the handler quietly keeps the real Supabase client
// and five tests fail with `undefined`, which reads like a broken handler rather than a broken test.
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock('@/lib/supabase/server');
});

describe('resolving what she said into one of the nine areas', () => {
  it('takes the key she was told to send', () => {
    expect(resolveArea('people')).toBe('people');
    expect(resolveArea('systems')).toBe('systems');
  });

  it('is not fussy about case or spacing', () => {
    expect(resolveArea('  People ')).toBe('people');
  });

  it('takes the title, because a model given a vocabulary still speaks', () => {
    // She is told to send the key. She will sometimes send what the page calls it, and turning that
    // into a failed call for the sake of strictness costs a conversation and gains nothing.
    expect(resolveArea('Customers')).toBeTruthy();
  });

  it('⚠️ refuses what it cannot match rather than defaulting', () => {
    // The dangerous alternative is silently answering about Customers when he asked about Cash. A
    // refusal costs one clarifying question; a wrong area sends the whole conversation somewhere he
    // did not ask for and he has no way to tell.
    expect(resolveArea('the vibe')).toBeNull();
    expect(resolveArea('')).toBeNull();
    expect(resolveArea(null)).toBeNull();
    expect(resolveArea(undefined)).toBeNull();
    expect(resolveArea(42)).toBeNull();
  });
});

// The handler needs a Supabase client, so it is exercised through a stubbed module rather than a
// live table — what is being tested here is the ORDERING and the SHAPE, both of which are pure
// decisions about what she gets handed.
describe('what comes back', () => {
  async function agendaFor(rows: { item_key: string; status: string; why: string | null }[], area = 'people') {
    vi.resetModules();
    vi.doMock('@/lib/supabase/server', () => ({
      createServiceClientV2: () => ({
        from: () => ({
          select: () => ({ eq: () => ({ eq: async () => ({ data: rows, error: null }) }) }),
        }),
      }),
      createServiceClientV2: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                or: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: {
                          membership_id: 'm1',
                          organisation_id: 'test-org-id',
                          role: 'owner',
                          status: 'active',
                          valid_from: '2020-01-01',
                          valid_to: null,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }));
    vi.resetModules();
    const { handleAreaAgenda } = await import('./area-agenda');
    const res = await handleAreaAgenda(
      new Request('https://x.test/api/kira/webhooks/area_agenda?uid=u1', {
        method: 'POST',
        body: JSON.stringify({ area }),
      }),
    );
    return res.json();
  }

  it('⚠️ leads with the thin answers, not the easy new questions', async () => {
    // THE LOAD-BEARING ONE. Pushing back on something he already told you is the highest-value move
    // in the conversation and the one she will otherwise never make.
    const body = await agendaFor([
      { item_key: 'people.successor', status: 'weak', why: 'You said "my son helps out".' },
      { item_key: 'people.roster', status: 'answered', why: null },
    ]);
    expect(body.ok).toBe(true);
    expect(body.questions[0].why_it_is_not_enough).toMatch(/helps out/);
  });

  it('hands her three at most, because a list gets read out as a list', async () => {
    const body = await agendaFor([]);
    expect(body.questions.length).toBeLessThanOrEqual(3);
  });

  it('flags the ones no answer can close', async () => {
    const body = await agendaFor([
      { item_key: 'people.successor', status: 'weak', why: 'thin' },
    ]);
    expect(body.questions[0].needs_a_change).toBe(true);
  });

  it('never hands back entry text or ids — that is facts_to_confirm\'s job', async () => {
    // The two tools must not blur. This one hands her QUESTIONS TO ASK; that one hands her FACTS TO
    // CHECK. A tool doing both produces an interview, which is the one thing the product cannot
    // become.
    const body = await agendaFor([{ item_key: 'people.roster', status: 'answered', why: null }]);
    const serialised = JSON.stringify(body);
    expect(serialised).not.toMatch(/evidence/);
    expect(serialised).not.toMatch(/entry_id|memory_id/);
  });

  it('says plainly when nobody has ever checked', async () => {
    // Never-assessed reads differently from assessed-and-complete, and implying we have looked when
    // nobody has is the small lie that makes the rest untrustworthy.
    const body = await agendaFor([]);
    expect(body.ever_checked).toBe(false);
  });

  it('reports nothing outstanding rather than inventing a question', async () => {
    const { itemsForArea } = await import('@/lib/genome/checklist');
    const rows = itemsForArea('people').map((i) => ({
      item_key: i.key,
      status: 'answered',
      why: null,
    }));
    const body = await agendaFor(rows);
    expect(body.nothing_outstanding).toBe(true);
    expect(body.questions).toEqual([]);
  });
});

describe('when it cannot answer', () => {
  it('gives a reason she can say, never a bare failure', async () => {
    // The contract the lookup tools already use: ok:false means THE LOOKUP DID NOT HAPPEN, and the
    // reason is said verbatim. Collapsing that into "there is nothing" is how a working capability
    // comes to look absent — which this product has already done once, over Gmail.
    vi.doMock('@/lib/supabase/server', () => ({
      createServiceClientV2: () => ({
        from: () => ({
          select: () => ({ eq: () => ({ eq: async () => ({ data: null, error: { message: 'boom' } }) }) }),
        }),
      }),
      createServiceClientV2: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                or: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: {
                          membership_id: 'm1',
                          organisation_id: 'test-org-id',
                          role: 'owner',
                          status: 'active',
                          valid_from: '2020-01-01',
                          valid_to: null,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.resetModules();
    const { handleAreaAgenda } = await import('./area-agenda');
    const res = await handleAreaAgenda(
      new Request('https://x.test/a?uid=u1', { method: 'POST', body: JSON.stringify({ area: 'people' }) }),
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason.length).toBeGreaterThan(10);
  });

  it('offers the nine choices when the area did not match', async () => {
    const { handleAreaAgenda } = await import('./area-agenda');
    const res = await handleAreaAgenda(
      new Request('https://x.test/a?uid=u1', { method: 'POST', body: JSON.stringify({ area: 'the vibe' }) }),
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.choices).toHaveLength(9);
  });

  it('refuses without a baked identity', async () => {
    const { handleAreaAgenda } = await import('./area-agenda');
    const res = await handleAreaAgenda(
      new Request('https://x.test/a', { method: 'POST', body: JSON.stringify({ area: 'people' }) }),
    );
    expect((await res.json()).ok).toBe(false);
  });
});
