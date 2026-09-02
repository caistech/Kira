// The beta code's journey from the landing page to /plan, pinned as a source contract.
//
// WHY THIS FILE EXISTS. An invited tester arrives at the landing page with `?code=` in the URL —
// that is what the invitation email links to so he experiences the normal visitor flow first. The
// code must survive landing → the valuation → /plan WITHOUT being checked or consumed along the
// way: redemption happens only at /plan, inside BetaRedeem. Both halves are easy to break silently,
// and neither a render (Node environment, no DOM) nor the DB-level beta-codes tests can see it, so
// what is pinned here is the wiring:
//
//   1. The carrier parks the URL code in sessionStorage under the shared key.
//   2. The plan page restores from THAT key — one literal, not two that can drift apart.
//   3. Nothing on the landing page calls the network with the code (parking is context, not
//      redemption; the code is checked for the first time only at /plan).

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { stripComments } from '@/lib/source-scan';

const here = (...p: string[]) => path.resolve(__dirname, ...p);

const carrier = readFileSync(here('BetaCodeCarrier.tsx'), 'utf8');
const plan = readFileSync(here('..', 'app', 'plan', 'page.tsx'), 'utf8');
const planStripped = stripComments(plan);

describe('the code arrives at the landing page and is carried as context', () => {
  const KEY = 'kira_beta_code';

  it('reads the invitation code from the URL query', () => {
    // Expected from the email link: https://kiraexec.com/?code=KIRA-7H2K-9QLM
    expect(carrier).toMatch(/new URLSearchParams\(window\.location\.search\)\.get\('code'\)/);
  });

  it('parks the raw code in sessionStorage under the shared key', () => {
    expect(carrier).toMatch(/setItem\(BETA_CODE_STORAGE_KEY, fromUrl/);
  });

  it('shares ONE key constant with the plan page instead of a copied literal', () => {
    // Both files must bind to the same storage key. A duplicated string in two files is how the
    // carry silently died before: the plan page read 'kira_beta_code' and nothing testable noticed
    // the landing page wrote to a differently-named key.
    expect(carrier).toMatch(/export const BETA_CODE_STORAGE_KEY\s*=\s*'kira_beta_code'/);
    expect(planStripped).toMatch(/BETA_CODE_STORAGE_KEY/);
    expect(planStripped).not.toMatch(/const BETA_CODE_KEY\s*=\s*'kira_beta_code'/);
  });

  it('never touches the network on the landing page — the code is not checked here', () => {
    // The whole point of carrying it as context is that nothing validates or consumes it before the
    // tester reaches /plan. A fetch of `code` here would be early redemption and is the regression
    // this pins.
    expect(carrier).not.toMatch(/fetch\(/);
    expect(carrier).not.toMatch(/\/api\/beta\//);
  });

  it('the plan page opens the redeem step from the carried code', () => {
    // When the key is present on /plan, BetaRedeem becomes the door the code travels as —
    // not a link back to a form he has to fill again.
    expect(planStripped).toMatch(/BETA_CODE_KEY/);
    expect(planStripped).toMatch(/setBetaOpen\(true\)/);
    expect(planStripped).toMatch(/BetaRedeem initialCode=\{betaCode/);
  });

  it('the code survives the trip to the valuator and back', () => {
    // The valuation pages store their own keys (kira_valuation_handoff); the clear-control that
    // removes valuation answers must not take the beta code with them. Parking them side by side is
    // harmless; sharing a clear path is not.
    expect(planStripped).not.toMatch(new RegExp(`removeItem\\('${KEY}'\\)`));
  });
});