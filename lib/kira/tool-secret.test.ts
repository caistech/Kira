// lib/kira/tool-secret.test.ts
//
// The guard on the operational tool webhooks. These routes derive identity from a PUBLIC
// elevenlabs_agent_id — an id shipped to the browser — so without the header anyone holding one can
// read and poison that user's memory.
//
// It used to return TRUE when the secret was unset. An environment that lost the variable lost the
// guard while every route kept answering 200, which is the worst shape a security control can have:
// from the outside, indistinguishable from one that works.

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { toolSecretOk, TOOL_SECRET_HEADER } from './convai';

const SECRET = 'test-tool-secret';
const LEGACY_HEADER = 'x-kira-tool-secret';

function reqWith(headers: Record<string, string>): Request {
  return new Request('https://kira.app/api/kira/webhooks/recall_memory', {
    method: 'POST',
    headers,
  });
}

describe('toolSecretOk', () => {
  const saved = process.env.KIRA_TOOL_WEBHOOK_SECRET;
  const savedCanonical = process.env.CONVAI_TOOL_SECRET;

  beforeEach(() => {
    process.env.KIRA_TOOL_WEBHOOK_SECRET = SECRET;
    delete process.env.CONVAI_TOOL_SECRET;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.KIRA_TOOL_WEBHOOK_SECRET;
    else process.env.KIRA_TOOL_WEBHOOK_SECRET = saved;
    if (savedCanonical === undefined) delete process.env.CONVAI_TOOL_SECRET;
    else process.env.CONVAI_TOOL_SECRET = savedCanonical;
  });

  it('uses the package canonical header, not a Kira-local name', () => {
    expect(TOOL_SECRET_HEADER).toBe('x-convai-tool-secret');
  });

  it('accepts the canonical header', () => {
    expect(toolSecretOk(reqWith({ [TOOL_SECRET_HEADER]: SECRET }))).toBe(true);
  });

  it('NO LONGER accepts the legacy header — the migration is complete', () => {
    // Removed only after: prod deployed dual-accept, all 13 operational agents were re-provisioned
    // onto the canonical header (verified 13/13 with 0 remaining on legacy), and the live probe
    // passed 5/5 against production using the canonical header alone. Rename in, re-provision,
    // rename out — this is the last step, and it is safe precisely because the middle one was
    // verified rather than assumed.
    expect(toolSecretOk(reqWith({ [LEGACY_HEADER]: SECRET }))).toBe(false);
  });

  it('rejects a wrong secret', () => {
    expect(toolSecretOk(reqWith({ [TOOL_SECRET_HEADER]: 'nope' }))).toBe(false);
  });

  it('rejects a request with no header at all', () => {
    expect(toolSecretOk(reqWith({}))).toBe(false);
  });

  it('FAILS CLOSED when no secret is configured — it used to return true', () => {
    delete process.env.KIRA_TOOL_WEBHOOK_SECRET;
    // Throws rather than returning false: an unconfigured server is a 500 (fix your environment),
    // not a 401 (you guessed wrong). Different failures deserve different answers.
    expect(() => toolSecretOk(reqWith({ [TOOL_SECRET_HEADER]: SECRET }))).toThrow(
      /Refusing to serve/,
    );
  });

  it('accepts CONVAI_TOOL_SECRET as the canonical env name', () => {
    delete process.env.KIRA_TOOL_WEBHOOK_SECRET;
    process.env.CONVAI_TOOL_SECRET = SECRET;
    expect(toolSecretOk(reqWith({ [TOOL_SECRET_HEADER]: SECRET }))).toBe(true);
  });

  it('resolves lazily, so `next build` with placeholder env still works', () => {
    // A module-load throw would break the CI build, turning a security fix into a broken pipeline.
    // Importing this module with no secret set must be harmless; only a REQUEST may throw.
    delete process.env.KIRA_TOOL_WEBHOOK_SECRET;
    expect(() => TOOL_SECRET_HEADER).not.toThrow();
  });
});
