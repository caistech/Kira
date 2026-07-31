// Two properties are load-bearing here and neither is "does it return text".
//
// One: truncation must be REPORTED. An agent that does not know it saw the first six thousand
// characters of a twenty-page contract will answer about the terms as though it read them all.
//
// Two: the vendor copy must be deleted. Extraction pushes a private business document into
// ElevenLabs' knowledge base; if the delete is ever dropped in a refactor, the product quietly
// accumulates copies of clients' contracts somewhere nobody is looking, as a side effect of
// someone asking a question out loud. Nothing else in the system would notice.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readDocument } from './document';

const ORIGINAL = {
  url: process.env.ORCHESTRATOR_URL,
  secret: process.env.ORCHESTRATOR_SECRET,
  key: process.env.ELEVENLABS_API_KEY,
};

interface Call {
  url: string;
  method: string;
}

/**
 * Routes by URL so one stub can serve the orchestrator fetch, the ElevenLabs upload, the extraction
 * poll and the delete — which is what the real call path touches.
 */
function stubFetch(handlers: {
  orchestrator?: unknown;
  orchestratorOk?: boolean;
  upload?: unknown;
  extract?: unknown;
}) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, opts: { method?: string } = {}) => {
      const url = String(input);
      const method = opts.method ?? 'GET';
      calls.push({ url, method });

      if (url.includes('/lookup?kind=file')) {
        return {
          ok: handlers.orchestratorOk ?? true,
          status: (handlers.orchestratorOk ?? true) ? 200 : 500,
          json: async () => handlers.orchestrator,
        } as unknown as Response;
      }
      if (url.endsWith('/knowledge-base/file')) {
        return { ok: true, status: 200, json: async () => handlers.upload ?? { id: 'doc-1' } } as unknown as Response;
      }
      if (method === 'DELETE') {
        return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
      }
      // The extraction poll.
      return { ok: true, status: 200, json: async () => handlers.extract ?? {} } as unknown as Response;
    }),
  );
  return calls;
}

beforeEach(() => {
  process.env.ORCHESTRATOR_URL = 'https://orchestrator.test';
  process.env.ORCHESTRATOR_SECRET = 'test-secret';
  process.env.ELEVENLABS_API_KEY = 'test-key';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env.ORCHESTRATOR_URL = ORIGINAL.url;
  process.env.ORCHESTRATOR_SECRET = ORIGINAL.secret;
  process.env.ELEVENLABS_API_KEY = ORIGINAL.key;
});

describe('a document the connector can read itself', () => {
  it('returns the text without touching the extractor at all', async () => {
    const calls = stubFetch({
      orchestrator: { ok: true, name: 'Notes.txt', mimeType: 'text/plain', text: 'Lot 109 site services.' },
    });

    const answer = await readDocument('tenant-1', 'file-abc');

    expect(answer.ok).toBe(true);
    expect(answer.text).toBe('Lot 109 site services.');
    expect(answer.truncated).toBe(false);
    // No upload means no vendor copy to clean up. A Google Doc should never leave our infrastructure.
    expect(calls.some((c) => c.url.includes('knowledge-base'))).toBe(false);
  });

  it('reports truncation rather than silently halving a long document', async () => {
    stubFetch({
      orchestrator: { ok: true, name: 'Contract.txt', mimeType: 'text/plain', text: 'x'.repeat(9000) },
    });

    const answer = await readDocument('tenant-1', 'file-abc');

    expect(answer.ok).toBe(true);
    expect(answer.truncated).toBe(true);
    expect(answer.text).toHaveLength(6000);
  });
});

describe('a docx or pdf, which needs extraction', () => {
  it('extracts the text and DELETES the vendor copy', async () => {
    const calls = stubFetch({
      orchestrator: {
        ok: true,
        name: 'Lot109_Quote.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        contentBase64: Buffer.from('fake docx bytes').toString('base64'),
      },
      upload: { id: 'doc-42' },
      extract: { extracted_inner_html: '<p>Pre-contract site services quote for Lot 109.</p>' },
    });

    const answer = await readDocument('tenant-1', 'file-abc');

    expect(answer.ok).toBe(true);
    expect(answer.text).toContain('Pre-contract site services quote');
    expect(answer.name).toBe('Lot109_Quote.docx');

    const deleted = calls.find((c) => c.method === 'DELETE');
    expect(deleted, 'the extraction copy must be deleted').toBeTruthy();
    expect(deleted?.url).toContain('doc-42');
  });

  it('still deletes the vendor copy when extraction yields nothing', async () => {
    const calls = stubFetch({
      orchestrator: {
        ok: true,
        name: 'Scan.pdf',
        mimeType: 'application/pdf',
        contentBase64: Buffer.from('fake pdf bytes').toString('base64'),
      },
      upload: { id: 'doc-43' },
      extract: { extracted_inner_html: '' },
    });

    const answer = await readDocument('tenant-1', 'file-abc');

    // Honest: the file arrived, the text did not. Not an error, and not an empty document.
    expect(answer.ok).toBe(true);
    expect(answer.pending).toBe(true);
    expect(answer.message).toMatch(/scan/i);
    expect(calls.some((c) => c.method === 'DELETE' && c.url.includes('doc-43'))).toBe(true);
  });
}, 20_000);

describe('failures stay distinguishable', () => {
  it('passes the orchestrator\'s spoken reason through unaltered', async () => {
    const spoken = "your Google account is connected but Drive access wasn't granted";
    stubFetch({ orchestrator: { ok: false, reason: spoken } });

    const answer = await readDocument('tenant-1', 'file-abc');

    expect(answer.ok).toBe(false);
    expect(answer.message).toBe(spoken);
    expect(answer.text).toBeUndefined();
  });

  it('refuses without a file id rather than guessing one', async () => {
    const calls = stubFetch({ orchestrator: { ok: true, text: 'should not be reached' } });

    const answer = await readDocument('tenant-1', '  ');

    expect(answer.ok).toBe(false);
    expect(answer.reason).toBe('no_file_id');
    expect(calls).toHaveLength(0);
  });

  it('says a file is unreadable rather than saying it is empty', async () => {
    stubFetch({ orchestrator: { ok: true, name: 'photo.heic', mimeType: 'image/heic' } });

    const answer = await readDocument('tenant-1', 'file-abc');

    expect(answer.ok).toBe(false);
    expect(answer.reason).toBe('unreadable_type');
    expect(answer.message).toContain('photo.heic');
  });

  it('reports our own missing configuration as ours', async () => {
    delete process.env.ORCHESTRATOR_URL;
    const calls = stubFetch({ orchestrator: { ok: true } });

    const answer = await readDocument('tenant-1', 'file-abc');

    expect(answer.ok).toBe(false);
    expect(answer.reason).toBe('not_configured');
    expect(calls).toHaveLength(0);
  });
});
