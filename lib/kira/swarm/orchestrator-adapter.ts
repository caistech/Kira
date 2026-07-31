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

import { createServiceClient } from '@/lib/supabase/server';
import { asTaskState } from './coordinator';
import type {
  SwarmCoordinator,
  DispatchedIntent,
  DispatchResult,
  TaskStatus,
  TaskSummary,
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
  /**
   * DELIBERATELY `unknown`. It is whatever the other side sent, and typing it `TaskState` was the
   * fiction that let an object through as a status — read it only via `state()` below.
   */
  status?: unknown;
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

  /**
   * Read a status off the wire, or say so and fall back.
   *
   * The fallback differs by call site — an unreadable dispatch is still queued somewhere, an
   * unreadable poll is not something to claim as progress — so it is passed in rather than assumed.
   * Logged loudly either way: a status we could not parse means the two sides disagree about the
   * contract, and that is worth knowing before it becomes three invisible rows again.
   */
  private state(raw: unknown, fallback: TaskState, where: string): TaskState {
    const parsed = asTaskState(raw);
    if (parsed) return parsed;
    console.error(
      `[orchestrator] ${where}: unusable status ${JSON.stringify(raw)?.slice(0, 200)} — using '${fallback}'.`,
    );
    return fallback;
  }

  /**
   * The owner's given name, for the draft's sign-off.
   *
   * Looked up HERE and passed across, because the identity of a PERSON belongs to Kira — the
   * orchestrator holds a tenant, which is a business. Sending it means a drafted email signs off as
   * him rather than ending with a placeholder, which is the failure that once mailed
   * "Thanks, [Owner's Name]" to a real address.
   */
  private async ownerName(tenantId: TenantId): Promise<string | null> {
    try {
      const { data } = await createServiceClient()
        .from('users')
        .select('first_name, name')
        .eq('id', tenantId)
        .maybeSingle();
      const first = (data?.first_name || '').trim();
      if (first) return first;
      const full = (data?.name || '').trim();
      return full ? full.split(/\s+/)[0] : null;
    } catch {
      return null; // the drafter is told to omit the sign-off rather than invent one
    }
  }

  async dispatchIntent(intent: DispatchedIntent): Promise<DispatchResult> {
    const ownerName = await this.ownerName(intent.tenantId);
    const wire = await this.call('/api/v1/dispatch', {
      version: CONTRACT_VERSION,
      tenantId: intent.tenantId,
      intentId: intent.intentId,
      // SAY: this arrived because a person spoke. The orchestrator's other four ingresses are
      // events, schedules and thresholds it raises itself.
      ingress: 'SAY',
      utterance: intent.utterance,
      context: { ...(intent.context ?? {}), ownerName },
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
      status: this.state(wire.status, 'queued', 'dispatch'),
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
        status: this.state(wire.status, 'failed', `tasks/${taskGroupId}`),
        draft: wire.draft ? { ...wire.draft, artifact: wire.draft.artifact ?? {} } : undefined,
        message: wire.message,
      };
    } catch {
      return { taskGroupId, status: 'failed', message: 'Could not check that just now.' };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Everything the orchestrator holds for one tenant — the discovery leg behind the mirror repair.
   *
   * Returns [] on ANY failure, and the distinction matters: the caller INSERTS what it finds, so a
   * network blip that returned a partial list must read as "found nothing this run" and be retried,
   * never as "the tenant has these three and no others". Nothing is ever deleted from a short answer.
   *
   * An unreadable status skips that row rather than defaulting. This whole repair exists because an
   * unvalidated status was written into a status column; inventing one here to fill a NOT NULL
   * column would be the same mistake wearing a different hat.
   */
  async listTasks(
    tenantId: TenantId,
    opts: { statuses?: TaskState[]; limit?: number } = {},
  ): Promise<TaskSummary[]> {
    if (!this.configured()) return [];
    const params = new URLSearchParams({ tenantId });
    if (opts.statuses?.length) params.set('status', opts.statuses.join(','));
    if (opts.limit) params.set('limit', String(opts.limit));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/tasks?${params}`, {
        headers: { [AUTH_HEADER]: this.secret },
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error(`[orchestrator] list tasks → ${res.status}`);
        return [];
      }
      const wire = (await res.json()) as { tasks?: unknown[]; truncated?: boolean };
      if (wire.truncated) {
        // Loud on purpose. A truncated page means the repair is incomplete this run, and the failure
        // being repaired is precisely a screen that looked complete.
        console.warn(`[orchestrator] task list for ${tenantId} was truncated — more remain.`);
      }
      return (wire.tasks ?? []).flatMap((raw) => {
        const t = raw as Record<string, unknown>;
        const status = asTaskState(t.status);
        if (!status || typeof t.taskGroupId !== 'string' || !t.taskGroupId) {
          console.error(`[orchestrator] skipping an unusable task row: ${JSON.stringify(raw)?.slice(0, 200)}`);
          return [];
        }
        return [
          {
            taskGroupId: t.taskGroupId,
            status,
            kind: typeof t.kind === 'string' ? t.kind : null,
            utterance: typeof t.utterance === 'string' ? t.utterance : null,
            summary: typeof t.summary === 'string' ? t.summary : null,
            createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
          },
        ];
      });
    } catch (e) {
      console.error('[orchestrator] list tasks failed:', e);
      return [];
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
      status: this.state(wire.status, 'queued', 'approve'),
      message: wire.message ?? (approve ? 'Sent through.' : 'Discarded — nothing sent.'),
    };
  }
}
