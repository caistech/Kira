// app/business-valuation/url-code-prefill.test.ts
//
// Proves that the valuation page reads the beta code from the URL query
// parameter (?code=) as well as from sessionStorage. This ensures the
// "What should we call you?" field pre-fills even when the tester lands
// directly on /business-valuation (e.g., from an invitation email link
// that skips the landing page where BetaCodeCarrier parks the code).
//
// The test is a source scan: it reads the page file and asserts that the
// effect reads BOTH `window.location.search` and sessionStorage, and
// prefers the URL when both are present.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

const PAGE = stripComments(readFileSync(join(__dirname, 'page.tsx'), 'utf8'));

describe('valuation page reads beta code from URL and sessionStorage', () => {
  it('finds the page at all (a scan matching nothing reads as green forever)', () => {
    expect(PAGE.length).toBeGreaterThan(10_000);
    expect(PAGE).toContain('BETA_CODE_STORAGE_KEY');
  });

  it('reads the code from sessionStorage (the parked path)', () => {
    expect(PAGE).toContain('sessionStorage.getItem');
    expect(PAGE).toContain('BETA_CODE_STORAGE_KEY');
  });

  it('ALSO reads the code from the URL query parameter (?code=)', () => {
    // The fix: resolves `fromUrl` from `window.location.search` before falling
    // back to `parkedCode` from sessionStorage. This ensures pre-fill works
    // even when the tester lands directly on /business-valuation with ?code=.
    expect(PAGE).toContain('window.location.search');
    expect(PAGE).toContain('new URLSearchParams');
    expect(PAGE).toContain(".get('code')");
  });

  it('prefers the URL code over the parked code when both are present', () => {
    // The code uses `const codeToPeek = fromUrl || parkedCode;` so the URL
    // wins — it is the freshest signal.
    expect(PAGE).toContain('fromUrl || parkedCode');
  });
});