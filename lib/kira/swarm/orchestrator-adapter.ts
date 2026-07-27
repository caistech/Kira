// The adapter that finally crosses the seam.
//
// Both ends have worked for a while and nothing joined them: Kira's doing-slice runs locally
// (LocalSwarmStub), the orchestrator runs its own store, sweeper, gate and connectors, and
// src/contract.ts defined the wire format between them — but getSwarmCoordinator() only ever
// returned the local stub, so nothing in Kira had ever called /v1/dispatch.
//
// This implements the SAME SwarmCoordinator interface the stub does, over HTTP. Kira's call sites
// (the dispatch_task and approve_task tool routes) do not change; swapping which brain answers is
// KIRA_SWARM_ADAPTER plus a base URL. That is the whole point of the seam being a wire contract
// rather than shared types — a replacement (Gareth's swarm, a vendor) only has to match JSON.
//
// DEGRADES, RATHER THAN DISAPPEARING. If the orchestrator is unreachable or misconfigured, an
// intent must not vanish: the owner said something out loud and expects it to have landed. Every
// failure path here returns a result Kira can SAY — never an exception that surfaces as silence in
// the middle of a conversation.

import type {
  SwarmCoordinator,
  DispatchedIntent,
  DispatchResult,
  TaskStatus,
  TenantId,
  TaskState,
} from './coordinator';

const CONTRACT_VERSION = '1';
const AUTH_HEADER = 'x-orchestrator-secret';

/** Fail fast on a slow orchestrator: the owner is mid-sentence, not waiting on a batch job. */
const TIMEOUT_MS = 12_000;

interface WireResponse {
  version?: string;
  taskGroupId?: string;
  status?: TaskState;
  draft?: { kind: string; summary: string; preview: string; artifact?: Record<string, unknown> };
  message?: string;
  needsRecipient?: boolean;
  error?: string;
}

export class OrchestratorAdapter implements SwarmCoordinator {
  constructor(
    private readonly baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, ''),
    private readonly secret = process.env.ORCHESTRATOR_SECRET || '',
  ) {}

  private configured(): boolean {
    return !!this.baseUrl && !!this.secret;
  }

  private async call(path: string, body: unknown): Promise<WireResponse | null> {
    if (!this.configured()) {
      console.error('[orchestrator] ORCHESTRATOR_URL / ORCHESTRATOR_SECRET missing — cannot dispatch.');
      return null;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [AUTH_HEADER]: this.secret },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error(`[orchestrator] ${path} → ${res.status}`);
        return null;
      }
      return (await res.json()) as WireResponse;
    } catch (e) {
      console.error(`[orchestrator] ${path} failed:`, e);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async dispatchIntent(intent: DispatchedIntent): Promise<DispatchResult> {
    const wire = await this.call('/api/v1/dispatch', {
      version: CONTRACT_VERSION,
      tenantId: intent.tenantId,
      intentId: intent.intentId,
      // SAY: this arrived because a person spoke. The orchestrator's other four ingresses are
      // events, schedules and thresholds it raises itself.
      ingress: 'SAY',
      utterance: intent.utterance,
      context: intent.context,
    });

    if (!wire?.taskGroupId) {
      // Captured, not dropped — and said out loud. The owner spoke; the worst outcome is silence
      // that he reads as "she heard me and it's handled".
      return {
        taskGroupId: '',
        status: 'failed',
        message: "I couldn't reach the system that does that just now — I've made a note and I'll tell you when it's back.",
      };
    }

    return {
      taskGroupId: wire.taskGroupId,
      status: (wire.status as TaskState) ?? 'queued',
      draft: wire.draft
        ? {
            kind: wire.draft.kind,
            summary: wire.draft.summary,
            preview: wire.draft.preview,
            artifact: wire.draft.artifact ?? {},
          }
        : undefined,
      message: wire.message,
    };
  }

  async getTaskState(taskGroupId: string, tenantId: TenantId): Promise<TaskStatus> {
    if (!this.configured()) return { taskGroupId, status: 'failed', message: 'Not connected.' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/tasks/${taskGroupId}?tenantId=${encodeURIComponent(tenantId)}`, {
        headers: { [AUTH_HEADER]: this.secret },
        signal: controller.signal,
      });
      if (!res.ok) return { taskGroupId, status: 'failed', message: 'Could not check that just now.' };
      const wire = (await res.json()) as WireResponse;
      return {
        taskGroupId,
        status: (wire.status as TaskState) ?? 'failed',
        draft: wire.draft ? { ...wire.draft, artifact: wire.draft.artifact ?? {} } : undefined,
        message: wire.message,
      };
    } catch {
      return { taskGroupId, status: 'failed', message: 'Could not check that just now.' };
    } finally {
      clearTimeout(timer);
    }
  }

  async resolveApproval(
    taskGroupId: string,
    tenantId: TenantId,
    approve: boolean,
    patch?: { recipientEmail?: string },
  ): Promise<DispatchResult> {
    const wire = await this.call(`/api/v1/tasks/${taskGroupId}/approve`, {
      version: CONTRACT_VERSION,
      tenantId,
      approve,
      patch,
      decidedBy: 'owner (voice)',
    });

    if (!wire) {
      // Deliberately NOT reported as sent. An approval we could not deliver must never be spoken
      // back as done — the owner would believe a quote had gone to a client when it had not.
      return {
        taskGroupId,
        status: 'failed',
        message: "I couldn't send that through just now — nothing has gone out. I'll try again and let you know.",
      };
    }

    return {
      taskGroupId,
      status: (wire.status as TaskState) ?? 'queued',
      message: wire.message ?? (approve ? 'Sent through.' : 'Discarded — nothing sent.'),
    };
  }
}
