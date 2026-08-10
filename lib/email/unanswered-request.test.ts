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
  it('suppresses on the literal tool name', () => {
    expect(code).toMatch(/portfolio-gate/i);
    expect(code).toMatch(/function isAutomatedProbe/);
  });

  it('checks for the probe BEFORE spending a throttle slot', () => {
    // Order matters and is easy to lose in a tidy-up. Behind the throttle, twenty probe submissions
    // would still consume the five-per-window ceiling and silently suppress a real person's
    // question that arrived in the same ten minutes.
    const probeAt = code.indexOf('isAutomatedProbe(alert.utterance)');
    const throttleAt = code.indexOf('throttled(alert.utterance)');
    expect(probeAt).toBeGreaterThan(-1);
    expect(throttleAt).toBeGreaterThan(-1);
    expect(probeAt).toBeLessThan(throttleAt);
  });

  it('matches on exactly one pattern, and that pattern is the tool name', () => {
    // A matcher that also caught "probe", "bot", "automated" or a user-agent would eventually eat a
    // real question — someone asking whether Kira can "test" something for them — and since nothing
    // else records a public ask, that question would be gone rather than delayed.
    //
    // Asserted as "one regex literal, and it is this one" rather than as a blacklist of words. The
    // blacklist version of this test went red on `.test(utterance)`, which is a method call and not
    // a heuristic at all — a rule that cannot tell those apart teaches people to delete it.
    const fn = code.slice(
      code.indexOf('function isAutomatedProbe'),
      code.indexOf('export async function sendUnansweredRequestAlert'),
    );
    const literals = fn.match(/\/[^/\n]+\/[gimsuy]*/g) ?? [];
    expect(literals).toEqual(['/portfolio-gate/i']);
  });

  it('still throttles everything that is not a probe', () => {
    // The 3 August blast-radius reducer must survive this change: the endpoint is public and
    // unauthenticated, so a stranger with curl is the case the throttle exists for.
    expect(code).toMatch(/throttledDurable\(alert\.utterance\)/);
  });
});

describe('the throttle survives a cold start', () => {
  it('asks the database, not the memory of one serverless instance', () => {
    // The whole defect: a module-level Map is per instance, so on a low-traffic public endpoint
    // nearly every request started from nothing. Three identical alerts four minutes apart, inside
    // a ten-minute window, are in the operator's inbox as proof.
    expect(code).toMatch(/from\('unanswered_alert_sends'\)/);
    expect(code).toMatch(/utterance_key/);
  });

  it('enforces BOTH limits against the table', () => {
    // Dedupe alone lets novel-but-automated text walk straight past; the ceiling alone lets one
    // repeated utterance spend the whole budget. The 3 August incident needed both.
    const durable = code.slice(code.indexOf('async function throttledDurable'), code.indexOf('export function isAutomatedProbe'));
    expect(durable).toMatch(/duplicate within the window/);
    expect(durable).toMatch(/ceiling of/);
  });

  it('keeps the in-memory limiter as a fallback rather than deleting it', () => {
    // Neither layer is sufficient alone. The durable one is correct but depends on a service that
    // can be down; the in-memory one always works and barely limits anything. Losing the fallback
    // means a database blip either silences every alert or reopens the flood — and the flood is
    // what took portfolio-wide auth email down.
    expect(code).toMatch(/skip = throttled\(alert\.utterance\)/);
    expect(code).toMatch(/durable throttle unavailable, falling back to in-memory/);
  });
});
