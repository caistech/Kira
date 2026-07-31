// The page promised the answers were kept "so you can stop and come back" and they died with the
// tab. These tests pin the two properties that make the new promise true AND bounded: it survives a
// reload, and it does not survive forever.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearValuationLocal,
  loadValuationLocal,
  saveValuationLocal,
  valuationExpiresAt,
  VALUATION_TTL_DAYS,
} from './persist';

const KEY = 'kira_valuation_progress';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: memoryStorage(), sessionStorage: memoryStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('saveValuationLocal / loadValuationLocal', () => {
  it('survives a reload — the thing the copy on screen promises', () => {
    saveValuationLocal(KEY, { stepIndex: 4, answers: { annualProfit: 250_000 } });
    expect(loadValuationLocal(KEY)).toEqual({ stepIndex: 4, answers: { annualProfit: 250_000 } });
  });

  it('returns null for a key that was never written', () => {
    expect(loadValuationLocal(KEY)).toBeNull();
  });

  it('expires, and DELETES rather than merely ignoring', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-31T00:00:00Z'));
    saveValuationLocal(KEY, { annualProfit: 250_000 });

    vi.setSystemTime(new Date('2026-08-06T23:00:00Z')); // within the window
    expect(loadValuationLocal(KEY)).not.toBeNull();

    vi.setSystemTime(new Date('2026-08-08T00:00:00Z')); // past it
    expect(loadValuationLocal(KEY)).toBeNull();
    // Ignoring an expired entry would leave his turnover in the browser store indefinitely while the
    // product behaved as though it were gone — no resume AND the disclosure risk.
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('refuses an envelope with no expiry rather than treating it as "never expires"', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ data: { annualProfit: 1 } }));
    expect(loadValuationLocal(KEY)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('survives a corrupt blob instead of throwing on a public page', () => {
    window.localStorage.setItem(KEY, 'not json');
    expect(loadValuationLocal(KEY)).toBeNull();
  });

  it('reports when the saved copy expires, so he can be told', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-31T00:00:00Z'));
    saveValuationLocal(KEY, { annualProfit: 1 });
    const expires = valuationExpiresAt(KEY);
    expect(expires?.toISOString()).toBe(
      new Date(Date.UTC(2026, 6, 31) + VALUATION_TTL_DAYS * 86_400_000).toISOString(),
    );
  });
});

describe('clearValuationLocal', () => {
  it('erases both stores, so nothing written before the change is left behind', () => {
    saveValuationLocal(KEY, { annualProfit: 250_000 });
    window.sessionStorage.setItem(KEY, JSON.stringify({ annualProfit: 250_000 }));

    clearValuationLocal(KEY);

    expect(window.localStorage.getItem(KEY)).toBeNull();
    // A "clear my answers" control that leaves the previous generation of the same data in place is
    // not telling the truth.
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it('clears every key it is given — the answers and the finished valuation', () => {
    saveValuationLocal('a', 1);
    saveValuationLocal('b', 2);
    clearValuationLocal('a', 'b');
    expect(loadValuationLocal('a')).toBeNull();
    expect(loadValuationLocal('b')).toBeNull();
  });
});
