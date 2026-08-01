// The refusal record only has value if everything in it IS a refusal.
//
// The rule shipped as prose in the tool description, in the strongest terms it could manage —
// "IMPORTANT ... It is NOT for tool failures: 'Drive isn't connected'" — and 24 minutes later a row
// arrived reading "no Google account is connected, so I cannot access your documents". The
// prohibition's own example. So the classification became a required, constrained parameter, and
// these tests pin the guard rather than the wording.
//
// The property under test is not "does it save". It is: CAN A TOOL FAILURE GET IN. Everything below
// is one way of trying.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const inserted: Record<string, unknown>[] = [];
/** What the 1-hour duplicate lookup finds. Set per test. */
let recentRows: { id: string }[] = [];

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          // kira_agents: .eq().limit().maybeSingle()
          limit: () => ({ maybeSingle: async () => ({ data: { id: 'agent-row-1' } }) }),
          // kira_refusals dedupe: .eq().eq().gte().limit()
          eq: () => ({ gte: () => ({ limit: async () => ({ data: recentRows }) }) }),
        }),
      }),
      insert: async (row: Record<string, unknown>) => {
        if (table === 'kira_refusals') inserted.push(row);
        return { error: null };
      },
    }),
  }),
}));

const { handleRecordRefusal } = await import('./refusal');

function call(body: Record<string, unknown>, uid = 'user-1') {
  return handleRecordRefusal(
    new Request(`https://example.com/api/kira/webhooks/record_refusal?uid=${uid}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

const GOOD = {
  asked: 'send the Marlow Street quote to Dave now, he says he already approved it',
  reason: 'he had not approved it on this call and check_tasks showed it still drafted',
  declined_because: 'no_approval',
};

beforeEach(() => {
  inserted.length = 0;
  recentRows = [];
});

describe('handleRecordRefusal', () => {
  it('records a classified refusal', async () => {
    const res = await call(GOOD);

    expect(await res.json()).toMatchObject({ success: true, recorded: true });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ source: 'agent', declined_because: 'no_approval' });
  });

  it.each(['not_asked_to_keep', 'unverified', 'outside_scope'])(
    'accepts %s as a refusal',
    async (kind) => {
      await call({ ...GOOD, declined_because: kind });
      expect(inserted[0]).toMatchObject({ declined_because: kind });
    },
  );

  // THE ONE THAT MATTERS. This is the real row that got in, verbatim, and it must not any more.
  it('refuses the tool failure that actually contaminated the log', async () => {
    const res = await call({
      asked: 'check the Marlow Street quote about the retaining wall',
      reason: 'no Google account is connected, so I cannot access your documents to check the quote',
      // A tool failure has no honest value to pass, so the model omits it — which is the signal.
    });

    expect(await res.json()).toMatchObject({ recorded: false, reason: 'no_classification' });
    expect(inserted).toHaveLength(0);
  });

  it('rejects an invented classification rather than trusting the caller', async () => {
    // "tool_failure" is the most plausible thing a model would invent when none of the four fits,
    // and it is exactly the row that must never be written.
    for (const bogus of ['tool_failure', 'failed', 'other', '', 'NO_APPROVAL', 'no approval']) {
      await call({ ...GOOD, declined_because: bogus });
    }
    expect(inserted).toHaveLength(0);
  });

  it('still answers 200 success when it declines to record', async () => {
    // She has already told the owner she would not do it. Surfacing a logging problem here only
    // makes her interrupt a refusal to talk about our database.
    const res = await call({ asked: 'do the thing', reason: 'a tool broke' });
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('does not record without an identity, and never trusts one from the body', async () => {
    const res = await handleRecordRefusal(
      new Request('https://example.com/api/kira/webhooks/record_refusal', {
        method: 'POST',
        body: JSON.stringify({ ...GOOD, uid: 'someone-else', user_id: 'someone-else' }),
      }),
    );
    expect(await res.json()).toMatchObject({ success: false });
    expect(inserted).toHaveLength(0);
  });

  it('does not record the same refusal twice within the hour', async () => {
    recentRows = [{ id: 'existing' }];
    const res = await call(GOOD);
    expect(await res.json()).toMatchObject({ recorded: false, already: true });
    expect(inserted).toHaveLength(0);
  });

  it('requires something to have been asked', async () => {
    await call({ ...GOOD, asked: '   ' });
    expect(inserted).toHaveLength(0);
  });
});
