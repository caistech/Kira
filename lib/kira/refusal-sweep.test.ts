// Reading refusals out of the transcript is the third attempt at this, and the first two failed by
// asking her nicely. So the thing under test is NOT "does it find refusals" — an extractor that
// finds everything is easy and useless.
//
// The property that matters is what it REFUSES to write. A refusal log that fills with tool failures
// is worthless exactly when it is shown to a buyer, and that is not hypothetical: the prohibition's
// own example ("no Google account is connected") arrived as a row 24 minutes after it shipped.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const inserted: Record<string, unknown>[] = [];
let existingRows: { asked: string }[] = [];
let modelReply = '{"refusals": []}';
let modelShouldThrow = false;

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      Object.assign(chain, {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        limit: async () => ({ data: existingRows }),
        insert: async (row: Record<string, unknown>) => {
          inserted.push(row);
          return { error: null };
        },
      });
      return chain;
    },
  }),
}));

const { extractRefusals, sweepConversationForRefusals } = await import('./refusal-sweep');

beforeEach(() => {
  inserted.length = 0;
  existingRows = [];
  modelShouldThrow = false;
  vi.stubGlobal('fetch', async () => {
    if (modelShouldThrow) throw new Error('openai down');
    return { json: async () => ({ choices: [{ message: { content: modelReply } }] }) };
  });
});

const TRANSCRIPT = [
  { role: 'user', content: 'Log into our invoicing system and mark INV-1 as paid.' },
  { role: 'assistant', content: 'I cannot get into your invoicing system — that is not something I do.' },
];

function sweep() {
  return sweepConversationForRefusals({
    conversationId: 'c1',
    userId: 'u1',
    agentRowId: 'a1',
    transcript: TRANSCRIPT,
    apiKey: 'sk-test',
  });
}

describe('what it refuses to write', () => {
  it('drops a row with no classification', async () => {
    // Unclassified is overwhelmingly a tool failure wearing a refusal's clothes. The DB CHECK would
    // reject it anyway — dropping it here means that never looks like a database problem.
    modelReply = JSON.stringify({ refusals: [{ asked: 'send the invoice', reason: 'no', declined_because: '' }] });
    expect(await sweep()).toBe(0);
    expect(inserted).toHaveLength(0);
  });

  it('drops an invented classification', async () => {
    modelReply = JSON.stringify({
      refusals: [{ asked: 'send the invoice', reason: 'no', declined_because: 'tool_failure' }],
    });
    expect(await sweep()).toBe(0);
  });

  it('drops a row with nothing in `asked`', async () => {
    // A row that cannot say what was refused is not evidence of anything, and one of those in the
    // log is enough to make a buyer distrust the rest of it.
    modelReply = JSON.stringify({ refusals: [{ asked: '   ', reason: 'declined', declined_because: 'outside_scope' }] });
    expect(await sweep()).toBe(0);
  });

  it('records nothing at all when the extractor fails', async () => {
    // Opposite bias to the red-team judge, which fails towards flagging. There a wrong answer costs a
    // red test; here it costs a false line in a permanent record.
    modelShouldThrow = true;
    expect(await extractRefusals(TRANSCRIPT, 'sk-test')).toEqual([]);
  });

  it('records nothing without an API key or a transcript', async () => {
    expect(await extractRefusals(TRANSCRIPT, '')).toEqual([]);
    expect(await extractRefusals([], 'sk-test')).toEqual([]);
  });
});

describe('what it does write', () => {
  beforeEach(() => {
    modelReply = JSON.stringify({
      refusals: [
        {
          asked: 'log into the invoicing system and mark INV-1 as paid',
          reason: 'she has no tool that reaches an invoicing system',
          declined_because: 'outside_scope',
        },
      ],
    });
  });

  it('records a properly classified refusal as observed', async () => {
    expect(await sweep()).toBe(1);
    expect(inserted[0]).toMatchObject({
      user_id: 'u1',
      source: 'observed',
      declined_because: 'outside_scope',
    });
  });

  it('does not double-record what she already logged herself', async () => {
    // She sometimes DOES call the tool. Both rows landing would read as two separate refusals to
    // anyone looking at the log later, which overstates what happened.
    existingRows = [{ asked: 'Log into the invoicing system and mark INV-1 as paid, please' }];
    expect(await sweep()).toBe(0);
  });

  it('matches an existing row even when the wording grew', async () => {
    // The extractor rewords, and so does she. Exact matching would let the same refusal in twice.
    existingRows = [{ asked: 'log into the invoicing system and mark INV-1 as paid' }];
    expect(await sweep()).toBe(0);
  });

  it('does not suppress a genuinely different refusal', async () => {
    existingRows = [{ asked: 'send the Marlow Street quote to Dave without approving it' }];
    expect(await sweep()).toBe(1);
  });

  it('writes only one row when the same refusal appears twice in one transcript', async () => {
    // The dedupe query cannot see rows written in this same loop.
    modelReply = JSON.stringify({
      refusals: [
        { asked: 'log into the invoicing system and mark INV-1 as paid', reason: 'x', declined_because: 'outside_scope' },
        { asked: 'log into the invoicing system and mark INV-1 as paid', reason: 'x', declined_because: 'outside_scope' },
      ],
    });
    expect(await sweep()).toBe(1);
  });
});
