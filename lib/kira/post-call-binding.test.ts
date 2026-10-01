// The post-call binding must be PROVEN by read-back, not assumed from a call that returned.
// 4 of 5 agents minted 2026-09-22..29 logged `webhook_bind: success` and ended up unbound.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const bindWorkspaceWebhook = vi.fn();
const getAgent = vi.fn();
vi.mock('@caistech/elevenlabs-convai', () => ({ bindWorkspaceWebhook, getAgent }));

const { bindPostCallWebhookVerified } = await import('./post-call-binding');

const boundTo = (id: string | null) => ({
  platform_settings: { workspace_overrides: { webhooks: { post_call_webhook_id: id } } },
});

describe('bindPostCallWebhookVerified', () => {
  beforeEach(() => {
    bindWorkspaceWebhook.mockReset();
    getAgent.mockReset();
  });

  it('reports bound only when the agent reads back the webhook it was bound to', async () => {
    bindWorkspaceWebhook.mockResolvedValue({ webhookId: 'wh_1' });
    getAgent.mockResolvedValue(boundTo('wh_1'));
    const result = await bindPostCallWebhookVerified('key', 'agent_x', 'https://x/post-call');
    expect(result).toMatchObject({ bound: true, attempts: 1, observedWebhookId: 'wh_1' });
  });

  it('retries once when a later write erased the binding, then succeeds', async () => {
    bindWorkspaceWebhook.mockResolvedValue({ webhookId: 'wh_1' });
    getAgent.mockResolvedValueOnce(boundTo(null)).mockResolvedValueOnce(boundTo('wh_1'));
    const result = await bindPostCallWebhookVerified('key', 'agent_x', 'https://x/post-call');
    expect(result).toMatchObject({ bound: true, attempts: 2 });
    expect(bindWorkspaceWebhook).toHaveBeenCalledTimes(2);
  });

  it('says NOT bound — never success — when the read-back never matches', async () => {
    bindWorkspaceWebhook.mockResolvedValue({ webhookId: 'wh_1' });
    getAgent.mockResolvedValue(boundTo(null));
    const result = await bindPostCallWebhookVerified('key', 'agent_x', 'https://x/post-call');
    expect(result.bound).toBe(false);
    expect(result.error).toContain('reads back none');
  });

  it('does not throw when the vendor call fails', async () => {
    bindWorkspaceWebhook.mockRejectedValue(new Error('fetch failed'));
    const result = await bindPostCallWebhookVerified('key', 'agent_x', 'https://x/post-call');
    expect(result).toMatchObject({ bound: false, error: 'fetch failed' });
  });
});

describe('creation routes bind the webhook LAST, never concurrently with the allowlist', () => {
  it.each(['app/api/kira/create/route.ts', 'app/api/kira/ensure/route.ts'])('%s', (path) => {
    const source = readFileSync(path, 'utf8');
    expect(source).toContain('bindPostCallWebhookVerified');
    expect(source).not.toContain('bindWorkspaceWebhook(');
    // The verified bind must come after both the allowlist write and the tool attach.
    const bindAt = source.indexOf('await bindPostCallWebhookVerified(');
    expect(bindAt).toBeGreaterThan(source.indexOf('await setAllowlist('));
    expect(bindAt).toBeGreaterThan(source.indexOf('await setAgentOverrides('));
  });
});
