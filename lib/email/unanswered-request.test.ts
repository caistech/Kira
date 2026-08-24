// Our own CI probe must not mail three operators, and a person must always be able to.
//
// THE DEFECT THIS PINS. `portfolio-gate-audit-input-response` really submits — twenty times per run
// — against `PORTFOLIO_GATE_PREVIEW_URL`, which in this repo is `kira-rho.vercel.app`, an alias of
// PRODUCTION. Every submission hits the public `/api/kira/ask` endpoint, which mails every admin.
// Measured in the operator's inbox: fourteen identical alerts between 6 Aug 20:20 and 7 Aug 11:55,
// three of them four minutes apart — inside the ten-minute dedupe window added on 3 August, which
// did not hold because its state is per serverless instance.
//
// It had already caused a real outage once: the same alert exhausted the portfolio's shared Resend
// daily quota and took auth email down for EVERY product on the account.
//
// THE ASYMMETRY IS THE WHOLE DESIGN. A missed probe costs one email. A matched HUMAN costs the
// question — public asks are recorded nowhere, so the email IS the record. Hence a tight match on
// the tool's own name rather than a heuristic about what automated traffic looks like.
//
// ARCHITECTURE. The authoritative durable throttle now lives in Orchestrator (POST /v1/kira/email/alert-throttle).
// Kira retains an in-memory fallback for resilience. This test validates both layers exist.

import { describe, expect, it } from 'vitest';

// The predicate is not exported — it is an implementation detail of the module — so this asserts the
// source, in the same style as the other routing guards in this repo. What matters is that the rule
// stays tight, and that is visible in the pattern itself.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = readFileSync(path.resolve(__dirname, 'unanswered-request.ts'), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const code = stripComments(src);

describe('the unanswered-request alert ignores our own probe', () => {
  it('matches on the tool name literally, not a heuristic', () => {
    expect(code).toMatch(/portfolio-gate/i);
  });
});

describe('the architecture delegates the durable throttle to Orchestrator', () => {
  it('calls the Orchestrator endpoint for the authoritative claim', () => {
    expect(code).toMatch(/claimThrottleDurable/);
    expect(code).toMatch(/api\/v1\/kira\/email\/alert-throttle/);
  });

  it('retains an in-memory fallback for resilience', () => {
    expect(code).toMatch(/function throttled/);
    expect(code).toMatch(/duplicate within the window/);
    expect(code).toMatch(/ceiling of/);
  });

  it('falls back to in-memory when Orchestrator is unavailable', () => {
    expect(code).toMatch(/durable throttle unavailable/);
    expect(code).toMatch(/falling back to in-memory/);
  });
});

describe('owner enrichment is delegated to Orchestrator', () => {
  it('calls the Orchestrator endpoint for owner resolution', () => {
    expect(code).toMatch(/resolveOwnerDurable/);
    expect(code).toMatch(/api\/v1\/kira\/email\/alert-owner/);
  });

  it('fail-soft: returns null on any error', () => {
    expect(code).toMatch(/return null/);
  });
});