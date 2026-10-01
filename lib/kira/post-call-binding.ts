// lib/kira/post-call-binding.ts
//
// Bind an agent's post-call webhook, then PROVE it stuck.
//
// ⚠️ WHY THIS RUNS LAST, AND WHY IT READS BACK. The binding lives in `platform_settings`, and so do
// the allowlist and the override enablement. The creation routes used to run the bind and the
// allowlist write CONCURRENTLY, and whichever PATCH landed second won: the provisioning logs for
// the five agents minted 2026-09-22..29 show that every run where `webhook_bind` finished BEFORE
// `allowlist_set` left the agent with `post_call_webhook_id: null` (John Orian, Alex Phan Vo,
// Ikechukwu, the QA account), and the one run where the allowlist landed first kept its binding
// (Craig). Every one of those runs logged `webhook_bind: success`.
//
// An unbound agent falls back to the workspace default, which pointed at the retired
// /api/kira/webhook alias — disabled. So ElevenLabs had nowhere to send the transcript: no
// conversation row, no distil, no memory, and her next call opened on "this is our first
// conversation". Silent end to end; the only symptom is an owner who feels forgotten.
//
// Calling this after every other platform_settings write removes the race; the read-back catches
// whatever cause comes next.

import { bindWorkspaceWebhook, getAgent } from '@caistech/elevenlabs-convai';

export interface PostCallBindingResult {
  bound: boolean;
  attempts: number;
  webhookId?: string;
  /** Returned by ElevenLabs only when the workspace webhook was CREATED. Never log it. */
  webhookSecret?: string;
  observedWebhookId: string | null;
  error?: string;
}

export async function bindPostCallWebhookVerified(
  apiKey: string,
  agentId: string,
  url: string,
): Promise<PostCallBindingResult> {
  let webhookId: string | undefined;
  let webhookSecret: string | undefined;
  let observedWebhookId: string | null = null;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const bound = await bindWorkspaceWebhook(apiKey, agentId, { name: 'Kira post-call', url });
      webhookId = bound.webhookId;
      webhookSecret = webhookSecret ?? bound.webhookSecret;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const live: any = await getAgent(apiKey, agentId);
      observedWebhookId = live?.platform_settings?.workspace_overrides?.webhooks?.post_call_webhook_id ?? null;
      if (observedWebhookId && observedWebhookId === webhookId) {
        return { bound: true, attempts: attempt, webhookId, webhookSecret, observedWebhookId };
      }
      lastError = `bound ${webhookId} but the agent reads back ${observedWebhookId ?? 'none'}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return { bound: false, attempts: 2, webhookId, webhookSecret, observedWebhookId, error: lastError };
}
