// lib/kira/swarm/stub.ts
// The LOCAL implementation of SwarmCoordinator — the doing-slice that ships BEFORE Gareth's swarm.
// It handles the owned tasks Kira can do herself today (quote / follow-up email / reminder) end to
// end: classify the intent → draft the artifact (LLM) → hold for the owner's approval → on approve,
// execute (send / schedule) and mark done. Anything it can't do becomes 'unsupported' — CAPTURED,
// never silently dropped (that row is exactly what Gareth's swarm will later pick up).
//
// Human-in-the-loop is structural: dispatchIntent NEVER sends. It drafts and returns
// awaiting_approval; only resolveApproval(approve=true) executes. A wrong quote that goes out is
// worse than a slow one.
//
// When the swarm lands, getSwarmCoordinator() returns Gareth's adapter instead; nothing else in Kira
// changes (that's the point of the seam).

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { createOpenAIRunner } from '@/lib/kira/structured-runner';
import { sendEmail } from '@/lib/email/resend';
import type {
  SwarmCoordinator,
  DispatchedIntent,
  DispatchResult,
  TaskStatus,
  TaskDraft,
  TenantId,
  TaskState,
} from './coordinator';

const MODEL = { provider: 'openrouter' as const, model: 'gpt-4.1-mini' };

// The owned task kinds the local stub can actually execute today.
type OwnedKind = 'quote' | 'email' | 'reminder';
const OWNED_KINDS: OwnedKind[] = ['quote', 'email', 'reminder'];

const ClassifySchema = z.object({
  kind: z.enum(['quote', 'email', 'reminder', 'unsupported']),
  // best-effort structured fields the draft/execute steps use; null when the utterance doesn't say.
  recipient_name: z.string().nullable(),
  recipient_email: z.string().nullable(),
  subject: z.string().nullable(),
  due_hint: z.string().nullable(),        // e.g. "tomorrow 9am", "next Tuesday" — parsed later/human-set
  reason_if_unsupported: z.string().nullable(),
});

const DraftSchema = z.object({
  summary: z.string(),   // one line the owner hears
  preview: z.string(),   // the full drafted content
});

const CLASSIFY_SYSTEM = `
You triage an owner-operator's spoken request into ONE task their assistant can do:
- "quote": prepare a price quote for a client.
- "email": draft a message to a named person (a follow-up, a reply, an intro).
- "reminder": set a reminder / follow-up for the owner themselves.
- "unsupported": anything else (booking, invoicing to an external system, ordering materials, etc.).
Extract any recipient, subject, and timing the owner stated. Use null for anything not stated; never invent an email address.
`.trim();

/** Build the drafting instruction per kind. Kept terse — the owner reviews before anything sends. */
function draftSystem(kind: OwnedKind): string {
  const common =
    'You draft on behalf of a hands-on business owner. Match a busy, plain, professional tradesperson/' +
    'operator voice — warm, direct, no corporate fluff, no emoji. Return summary (one line the owner ' +
    'hears) and preview (the full draft they will approve).';
  if (kind === 'quote')
    return `${common} Draft a short client-ready quote message. If amounts/scope are missing, draft the ` +
      `covering message and leave clearly-marked [line item] / [$amount] placeholders for the owner to fill.`;
  if (kind === 'email')
    return `${common} Draft the email body only (no subject line inside the body). Keep it a few sentences.`;
  return `${common} Draft a one-line reminder the owner will get back later, plus when it should fire.`;
}

export class LocalSwarmStub implements SwarmCoordinator {
  constructor(
    private readonly supabase: SupabaseClient = createServiceClient(),
    private readonly openaiKey: string = process.env.OPENAI_API_KEY || '',
  ) {}

  private runner() {
    return createOpenAIRunner(this.openaiKey);
  }

  async dispatchIntent(intent: DispatchedIntent): Promise<DispatchResult> {
    // Idempotency: if this intent already dispatched, return its current state (no double-draft/send).
    const existing = await this.supabase
      .from('kira_tasks')
      .select('*')
      .eq('user_id', intent.tenantId)
      .eq('intent_id', intent.intentId)
      .maybeSingle();
    if (existing.data) return this.toResult(existing.data);

    const { result: cls } = await this.runner().run({
      model: MODEL,
      system: CLASSIFY_SYSTEM,
      input: intent.utterance,
      schema: ClassifySchema,
    });

    if (cls.kind === 'unsupported' || !OWNED_KINDS.includes(cls.kind as OwnedKind)) {
      const row = await this.insert(intent, {
        kind: 'unsupported',
        status: 'unsupported',
        summary: cls.reason_if_unsupported || 'Not something I can do myself yet — I’ve noted it.',
        artifact: { classify: cls },
      });
      return this.toResult(row);
    }

    const kind = cls.kind as OwnedKind;
    const { result: draft } = await this.runner().run({
      model: MODEL,
      system: draftSystem(kind),
      input:
        `Owner said: "${intent.utterance}"\n` +
        (cls.recipient_name ? `Recipient: ${cls.recipient_name}\n` : '') +
        (cls.subject ? `Subject: ${cls.subject}\n` : '') +
        (cls.due_hint ? `When: ${cls.due_hint}\n` : '') +
        (intent.context ? `Context you already hold: ${JSON.stringify(intent.context).slice(0, 1500)}\n` : ''),
      schema: DraftSchema,
    });

    const row = await this.insert(intent, {
      kind,
      status: 'awaiting_approval',
      summary: draft.summary,
      preview: draft.preview,
      artifact: {
        recipient_name: cls.recipient_name,
        recipient_email: cls.recipient_email,
        subject: cls.subject,
        due_hint: cls.due_hint,
      },
    });
    return this.toResult(row);
  }

  async getTaskState(taskGroupId: string, tenantId: TenantId): Promise<TaskStatus> {
    const { data } = await this.supabase
      .from('kira_tasks')
      .select('*')
      .eq('id', taskGroupId)
      .eq('user_id', tenantId)
      .maybeSingle();
    if (!data) return { taskGroupId, status: 'failed', message: 'Task not found.' };
    const r = this.toResult(data);
    return { taskGroupId, status: r.status, draft: r.draft, message: r.message };
  }

  async resolveApproval(taskGroupId: string, tenantId: TenantId, approve: boolean): Promise<DispatchResult> {
    const { data: row } = await this.supabase
      .from('kira_tasks')
      .select('*')
      .eq('id', taskGroupId)
      .eq('user_id', tenantId)
      .maybeSingle();
    if (!row) return { taskGroupId, status: 'failed', message: 'Task not found.' };
    if (row.status !== 'awaiting_approval') return this.toResult(row); // already resolved — idempotent

    if (!approve) {
      const updated = await this.setStatus(taskGroupId, 'failed', { discarded: true }, 'Discarded — nothing sent.');
      return this.toResult(updated);
    }

    // Execute the owned task. Only email is wired to real delivery today (Resend is in-stack);
    // reminder persists as a scheduled row (a cron/notification transport is the next increment);
    // quote sends its covering message through the same email path when a recipient is known.
    try {
      const result = await this.execute(row);
      const updated = await this.setStatus(taskGroupId, 'done', result, 'Done.');
      return this.toResult(updated);
    } catch (err) {
      const updated = await this.setStatus(
        taskGroupId,
        'failed',
        { error: String(err) },
        'Could not complete it — I’ll flag it for you.',
      );
      return this.toResult(updated);
    }
  }

  // --- execution (the honest seam: real where cheap, marked where it needs transport) ---

  private async execute(row: KiraTaskRow): Promise<Record<string, unknown>> {
    const art = (row.artifact || {}) as Record<string, unknown>;
    const to = (art.recipient_email as string) || '';

    if (row.kind === 'email' || row.kind === 'quote') {
      if (!to) {
        // No address captured — can't send. Surface honestly rather than fake a send.
        throw new Error('no recipient email captured — owner must supply it before I can send');
      }
      const subject = (art.subject as string) || (row.kind === 'quote' ? 'Your quote' : (row.summary || 'A message'));
      const sent = await sendEmail({ to, subject, html: `<p>${escapeHtml(row.preview || '')}</p>`, text: row.preview || '' });
      return { channel: 'email', to, subject, provider_id: (sent as { id?: string })?.id ?? null, sent_at: nowIso() };
    }

    // reminder: persisted; the notification transport (cron → owner's preferred channel) is the
    // next increment. The row itself IS the durable reminder; done = it's captured + scheduled.
    return { channel: 'reminder', due_hint: art.due_hint ?? null, scheduled_at: nowIso() };
  }

  // --- persistence helpers ---

  private async insert(intent: DispatchedIntent, fields: Partial<KiraTaskRow>): Promise<KiraTaskRow> {
    const { data, error } = await this.supabase
      .from('kira_tasks')
      .insert({
        user_id: intent.tenantId,
        intent_id: intent.intentId,
        utterance: intent.utterance,
        handled_by: 'local-stub',
        ...fields,
      })
      .select('*')
      .single();
    if (error) throw new Error(`kira_tasks insert failed: ${error.message}`);
    return data as KiraTaskRow;
  }

  private async setStatus(
    id: string,
    status: TaskState,
    result: Record<string, unknown>,
    _message: string,
  ): Promise<KiraTaskRow> {
    const { data, error } = await this.supabase
      .from('kira_tasks')
      .update({ status, result })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(`kira_tasks update failed: ${error.message}`);
    return data as KiraTaskRow;
  }

  private toResult(row: KiraTaskRow): DispatchResult {
    const draft: TaskDraft | undefined =
      row.status === 'awaiting_approval'
        ? { kind: row.kind, summary: row.summary || '', preview: row.preview || '', artifact: (row.artifact || {}) as Record<string, unknown> }
        : undefined;
    const message =
      row.status === 'awaiting_approval'
        ? 'Drafted — say the word and I’ll send it.'
        : row.status === 'done'
          ? 'Done.'
          : row.status === 'unsupported'
            ? (row.summary || 'Noted — I can’t do that one myself yet.')
            : undefined;
    return { taskGroupId: row.id, status: row.status, draft, message };
  }
}

interface KiraTaskRow {
  id: string;
  user_id: string;
  intent_id: string;
  kind: OwnedKind | 'unsupported';
  status: TaskState;
  utterance: string;
  summary: string | null;
  preview: string | null;
  artifact: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  handled_by: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function nowIso(): string {
  return new Date().toISOString();
}
