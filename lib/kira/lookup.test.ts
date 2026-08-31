// The bug these pin is not a crash. On 31 July she told the owner his contact book held no address
// for someone, having never opened it — and the shape that makes that possible is a lookup client
// that turns "I could not look" into "there is nothing there". Every test here is that one
// distinction, from a different angle.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { lookUpContact, searchDrive } from './lookup';

const ORIGINAL = { url: process.env.ORCHESTRATOR_URL, secret: process.env.ORCHESTRATOR_SECRET };

/** One fetch stub returning a fixed JSON body, recording what it was called with. */
function stubFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, opts: { headers?: Record<string, string> }) => {
      calls.push({ url: String(url), headers: opts?.headers ?? {} });
      return {
        ok: init.ok ?? true,
        status: init.status ?? 200,
        json: async () => body,
      } as unknown as Response;
    }),
  );
  return calls;
}

beforeEach(() => {
  process.env.ORCHESTRATOR_URL = 'https://orchestrator.test';
  process.env.ORCHESTRATOR_SECRET = 'test-secret';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env.ORCHESTRATOR_URL = ORIGINAL.url;
  process.env.ORCHESTRATOR_SECRET = ORIGINAL.secret;
});

describe('the failure/empty distinction', () => {
  it('carries the orchestrator\'s spoken reason through UNALTERED', async () => {
    const spoken = "your Google account is connected but Drive access wasn't granted — reconnect it in Settings and tick Drive";
    stubFetch({ ok: false, reason: spoken, results: [] });

    const answer = await searchDrive('org-1', 'Lot 91');

    expect(answer.ok).toBe(false);
    // Verbatim. Rewording it is how "you didn't grant Drive access" becomes "I found nothing".
    expect(answer.message).toBe(spoken);
  });

  it('never reports a failed lookup as an empty result', async () => {
    stubFetch({ ok: false, reason: 'no Google account is connected', results: [] });

    const answer = await lookUpContact('org-1', 'Roger');

    expect(answer.ok).toBe(false);
    // The specific defect: a caller reading `count === 0` as "searched, nothing there".
    expect(answer.count).toBeUndefined();
    expect(answer.results).toBeUndefined();
    expect(answer.message).not.toMatch(/no match|nothing matching/i);
  });

  it('gives a genuine empty result its own honest sentence', async () => {
    stubFetch({ ok: true, results: [] });

    const answer = await lookUpContact('org-1', 'Roger');

    expect(answer.ok).toBe(true);
    expect(answer.count).toBe(0);
    expect(answer.message).toContain('Roger');
    expect(answer.message).toMatch(/nothing matching/i);
  });

  it('reports OUR misconfiguration as ours, not as an empty contact book', async () => {
    delete process.env.ORCHESTRATOR_URL;
    const calls = stubFetch({ ok: true, results: [] });

    const answer = await lookUpContact('org-1', 'Roger');

    expect(answer.ok).toBe(false);
    expect(answer.reason).toBe('not_configured');
    expect(answer.message).toMatch(/at my end/i);
    // And it did not pretend to look.
    expect(calls).toHaveLength(0);
  });

  it('reports an upstream HTTP failure as a failure', async () => {
    stubFetch({}, { ok: false, status: 500 });

    const answer = await searchDrive('org-1', 'Lot 91');

    expect(answer.ok).toBe(false);
    expect(answer.reason).toBe('upstream_error');
    expect(answer.results).toBeUndefined();
  });

  it('reports a thrown fetch as a failure rather than nothing found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('socket hang up'); }));

    const answer = await searchDrive('org-1', 'Lot 91');

    expect(answer.ok).toBe(false);
    expect(answer.reason).toBe('upstream_error');
    expect(answer.count).toBeUndefined();
  });
});

describe('the request it actually sends', () => {
  it('addresses the organisation\'s tenant, authenticated, with the kind and query', async () => {
    const calls = stubFetch({ ok: true, results: [{ name: 'Lot 91 plans.pdf', link: null, modifiedAt: null }] });

    const answer = await searchDrive('org-abc', 'Lot 91');

    expect(answer.ok).toBe(true);
    expect(answer.count).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      'https://orchestrator.test/api/v1/tenants/org-abc/lookup?kind=drive&q=Lot%2091',
    );
    // Without this header the orchestrator 401s and every lookup becomes "couldn't look".
    expect(calls[0].headers['x-orchestrator-secret']).toBe('test-secret');
  });

  it('sends kind=contacts for a contact lookup', async () => {
    const calls = stubFetch({ ok: true, results: [] });
    await lookUpContact('org-abc', 'Roger');
    expect(calls[0].url).toContain('kind=contacts');
  });

  it('does not call out for an empty search term', async () => {
    const calls = stubFetch({ ok: true, results: [] });

    const answer = await searchDrive('org-abc', '   ');

    expect(answer.ok).toBe(false);
    expect(answer.reason).toBe('no_query');
    expect(calls).toHaveLength(0);
  });
});
