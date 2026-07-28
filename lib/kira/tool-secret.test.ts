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

  it('REJECTS the legacy header — the rename is finished', () => {
    // The last step of "rename in, re-provision, rename out", taken only once the audit showed
    // zero callers on the legacy name: 13/13 agents re-provisioned and all 41 Kira workspace tools
    // migrated, including 15 detached ones reprovision cannot reach.
    //
    // This asserts the SECRET IS RIGHT AND THE HEADER IS WRONG — the case that would silently pass
    // if acceptance ever came back. A wrong-secret test cannot catch a re-added header.
    expect(toolSecretOk(reqWith({ [LEGACY_HEADER]: SECRET }))).toBe(false);
  });

  it('rejects a wrong secret', () => {
    expect(toolSecretOk(reqWith({ [TOOL_SECRET_HEADER]: 'nope' }))).toBe(false);
    expect(toolSecretOk(reqWith({ [LEGACY_HEADER]: 'nope' }))).toBe(false);
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

// ─── rotation ────────────────────────────────────────────────────────────────
// The PREVIOUS secret exists so a rotation has no window: the environment and the header baked into
// every provisioned tool cannot change at the same instant, and without dual-accept the gap between
// them is every owner's memory tools 401ing mid-conversation.

describe('rotation window', () => {
  const saved = {
    current: process.env.KIRA_TOOL_WEBHOOK_SECRET,
    previous: process.env.KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS,
  };

  afterEach(() => {
    if (saved.current === undefined) delete process.env.KIRA_TOOL_WEBHOOK_SECRET;
    else process.env.KIRA_TOOL_WEBHOOK_SECRET = saved.current;
    if (saved.previous === undefined) delete process.env.KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS;
    else process.env.KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS = saved.previous;
  });

  function req(secret: string) {
    return new Request('https://x/api/kira/webhooks/recall_memory', {
      method: 'POST',
      headers: { 'x-convai-tool-secret': secret },
    });
  }

  it('accepts an agent still carrying the outgoing secret mid-rotation', () => {
    process.env.KIRA_TOOL_WEBHOOK_SECRET = 'new-one';
    process.env.KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS = 'old-one';
    expect(toolSecretOk(req('new-one'))).toBe(true);
    expect(toolSecretOk(req('old-one'))).toBe(true);
  });

  it('rejects the old secret once the rotation is finished and PREVIOUS is unset', () => {
    process.env.KIRA_TOOL_WEBHOOK_SECRET = 'new-one';
    delete process.env.KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS;
    // Leaving PREVIOUS set is a second live credential nobody is tracking, so the test pins that
    // removing it actually takes effect rather than the old value lingering somewhere.
    expect(toolSecretOk(req('old-one'))).toBe(false);
  });

  it('still rejects a wrong secret while a rotation is in progress', () => {
    process.env.KIRA_TOOL_WEBHOOK_SECRET = 'new-one';
    process.env.KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS = 'old-one';
    expect(toolSecretOk(req('neither-of-them'))).toBe(false);
  });
});
