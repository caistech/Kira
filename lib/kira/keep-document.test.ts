// keep_document files a document into what Kira permanently knows. Three properties matter more
// than "does it save":
//
//   1. A Google Doc arrives as TEXT and must never be shipped to a third-party parser to come back
//      as the same text. Extraction is the only reason that vendor is in this path at all.
//   2. Keeping the same document twice must not make two copies — retrieval returning one document
//      twice reads as two sources agreeing with each other.
//   3. A failure must not report as kept. "Kept it" when nothing was stored is the same broken
//      promise as claiming a search that never ran, in a smaller frame.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const indexKnowledgeText = vi.fn(async () => ({ knowledgeId: 'k1', chunks: 3, chars: 900 }));
const ingestKnowledgeDocument = vi.fn(async () => ({ knowledgeId: 'k1', chunks: 5, chars: 4000 }));
const supersedeOlderVersions = vi.fn(async () => 0);

/** What the dedupe lookup finds. Set per test. */
let existingRow: { id: string } | null = null;
const inserted: Record<string, unknown>[] = [];

vi.mock('@/lib/kira/knowledge-ingest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/kira/knowledge-ingest')>();
  return { ...actual, indexKnowledgeText, ingestKnowledgeDocument, supersedeOlderVersions };
});

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientV2: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: existingRow }) }),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        inserted.push(row);
        return { select: () => ({ single: async () => ({ data: { id: 'k1' }, error: null }) }) };
      },
    }),
  }),
}));

const { keepDocument } = await import('./document');

interface Call {
  url: string;
  method: string;
}

function stubFetch(orchestratorBody: unknown) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, opts: { method?: string } = {}) => {
      calls.push({ url: String(input), method: opts.method ?? 'GET' });
      if (String(input).includes('/lookup?kind=file')) {
        return { ok: true, status: 200, json: async () => orchestratorBody } as unknown as Response;
      }
      return { ok: true, status: 200, json: async () => ({ id: 'el-doc-1' }) } as unknown as Response;
    }),
  );
  return calls;
}

beforeEach(() => {
  process.env.ORCHESTRATOR_URL = 'https://orchestrator.test';
  process.env.ORCHESTRATOR_SECRET = 'test-secret';
  process.env.ELEVENLABS_API_KEY = 'test-key';
  existingRow = null;
  inserted.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('keepDocument', () => {
  it('indexes a Google Doc directly and never sends it to the parser', async () => {
    const calls = stubFetch({
      ok: true,
      name: 'Lot 109 notes',
      mimeType: 'application/vnd.google-apps.document',
      link: 'https://docs.google.com/document/d/abc/edit',
      text: 'Pre-contract site services for Lot 109. Scope, rates, exclusions.',
    });

    const answer = await keepDocument('tenant-1', 'abc');

    expect(answer.ok).toBe(true);
    expect(answer.chunks).toBe(3);
    expect(indexKnowledgeText).toHaveBeenCalled();
    // The property worth protecting: a document that arrived as text never left our infrastructure.
    expect(calls.some((c) => c.url.includes('elevenlabs'))).toBe(false);
    expect(ingestKnowledgeDocument).not.toHaveBeenCalled();
    expect(inserted[0]).toMatchObject({ source_type: 'google_drive', organisation_id: 'tenant-1' });
  });

  it('sends a docx through the parser and keeps that copy', async () => {
    const calls = stubFetch({
      ok: true,
      name: 'Lot109_Quote.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      contentBase64: Buffer.from('bytes').toString('base64'),
    });

    const answer = await keepDocument('tenant-1', 'abc');

    expect(answer.ok).toBe(true);
    expect(answer.chunks).toBe(5);
    expect(ingestKnowledgeDocument).toHaveBeenCalled();
    // Unlike readDocument, this copy is storage rather than a parser call — so it is NOT deleted.
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('does not keep the same document twice', async () => {
    existingRow = { id: 'already-here' };
    stubFetch({ ok: true, name: 'Lot109_Quote.docx', mimeType: 'text/plain', text: 'anything at all' });

    const answer = await keepDocument('tenant-1', 'abc');

    expect(answer.ok).toBe(true);
    expect(answer.already).toBe(true);
    expect(inserted).toHaveLength(0);
    expect(indexKnowledgeText).not.toHaveBeenCalled();
  });

  it('passes a lookup failure through and stores nothing', async () => {
    const spoken = "no Google account is connected — connect one in Settings and I'll be able to look";
    stubFetch({ ok: false, reason: spoken });

    const answer = await keepDocument('tenant-1', 'abc');

    expect(answer.ok).toBe(false);
    expect(answer.message).toBe(spoken);
    expect(inserted).toHaveLength(0);
  });

  it('says it saved nothing usable rather than implying it can answer from a scan', async () => {
    ingestKnowledgeDocument.mockResolvedValueOnce({ knowledgeId: 'k1', chunks: 0, chars: 0 });
    stubFetch({
      ok: true,
      name: 'Scan.pdf',
      mimeType: 'application/pdf',
      contentBase64: Buffer.from('bytes').toString('base64'),
    });

    const answer = await keepDocument('tenant-1', 'abc');

    expect(answer.ok).toBe(true);
    expect(answer.chunks).toBe(0);
    expect(answer.message).toMatch(/no readable text/i);
  });

  it('refuses without a file id and never calls out', async () => {
    const calls = stubFetch({ ok: true, text: 'unreachable' });

    const answer = await keepDocument('tenant-1', '   ');

    expect(answer.ok).toBe(false);
    expect(answer.reason).toBe('no_file_id');
    expect(calls).toHaveLength(0);
  });
});
