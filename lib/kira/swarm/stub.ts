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
  due_hint: z.string().nullable(),        // the owner's own words ("tomorrow 9am") — kept for the readback
  // The same instant, resolved. A reminder cannot fire off "tomorrow 9am"; something has to turn it
  // into a timestamp, and the model already holds the sentence. Null when no time was stated.
  due_at_iso: z.string().nullable(),
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

TIMING: when the owner states a time ("tomorrow morning", "next Tuesday", "in two hours"), resolve it
against the current time given below and return it as due_at_iso, an absolute ISO-8601 timestamp with
offset. Keep their words in due_hint as well. If they stated no time, both are null — do not invent
one. Prefer a sensible hour when they name only a day ("Tuesday" → 09:00 local).
`.trim();

// The owner's wall-clock. A relative time cannot be resolved without one, and the model has no clock
// of its own. Kira has no per-user timezone yet (users carries no timezone column), so this is a
// portfolio default and NOT a per-owner truth — an owner in Sydney saying "9am" currently gets 9am
// Perth. Recorded on the artifact so a wrong reminder is diagnosable rather than mysterious.
const DEFAULT_TIMEZONE = process.env.KIRA_DEFAULT_TIMEZONE || 'Australia/Perth';

function localNow(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-AU', {
      timeZone, dateStyle: 'full', timeStyle: 'short', hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Build the drafting instruction per kind. Kept terse — the owner reviews before anything sends.
 *
 * `preview` is sent VERBATIM on approval (see execute()), so a placeholder the model leaves in the
 * sender's sign-off does not get filled in by anything downstream — it goes to the client as typed.
 * The first live round trip did exactly that and mailed "Thanks, [Owner's Name]". Hence: pass the
 * owner's name in, and when we genuinely don't know it, say so and forbid inventing one rather than
 * leaving a gap that looks fillable but isn't (degrade, don't fake).
 */
function draftSystem(kind: OwnedKind, ownerName: string | null): string {
  const signoff = ownerName
    ? `The owner you are drafting as is ${ownerName} — sign off as them. `
    : 'You do not know the owner\'s name: end after the final sentence with no sign-off name. ';
  const common =
    'You draft on behalf of a hands-on business owner. Match a busy, plain, professional tradesperson/' +
    'operator voice — warm, direct, no corporate fluff, no emoji. Return summary (one line the owner ' +
    'hears) and preview (the full draft they will approve). ' +
    signoff +
    'NEVER write a placeholder for the sender (no [Owner\'s Name], [Your Name], [Company]) — the ' +
    'preview is sent exactly as written.';
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
      input: `Current time: ${localNow(DEFAULT_TIMEZONE)} (${DEFAULT_TIMEZONE})\n\n${intent.utterance}`,
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
    const ownerName = await this.ownerName(intent.tenantId);
    const { result: draft } = await this.runner().run({
      model: MODEL,
      system: draftSystem(kind, ownerName),
      input:
        `Owner said: "${intent.utterance}"\n` +
        (ownerName ? `You are drafting as: ${ownerName}\n` : '') +
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
        due_at: cls.due_at_iso,
        due_timezone: DEFAULT_TIMEZONE,
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

  async resolveApproval(
    taskGroupId: string,
    tenantId: TenantId,
    approve: boolean,
    patch?: { recipientEmail?: string },
  ): Promise<DispatchResult> {
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

    // Merge anything the owner supplied at approval time (e.g. the recipient email the classifier
    // couldn't invent) into the task's artifact before executing, so a real send can complete.
    const email = patch?.recipientEmail?.trim();
    if (email) {
      const artifact = { ...((row.artifact || {}) as Record<string, unknown>), recipient_email: email };
      await this.supabase.from('kira_tasks').update({ artifact }).eq('id', taskGroupId);
      (row as KiraTaskRow).artifact = artifact;
    }

    // A reminder is not DONE when it is approved — it is SCHEDULED. Marking it done here was the
    // product promising something it could not deliver: the row was written, "Done." was spoken,
    // and nothing ever fired because nothing swept the table. It now waits for its due time and
    // /api/cron/reminders delivers it.
    if (row.kind === 'reminder') {
      const dueAt = parseDueAt((row.artifact || {}) as Record<string, unknown>);
      if (!dueAt) {
        // Degrade, don't fake: a reminder with no time is not a reminder. Say so rather than
        // accept it and silently never fire.
        const updated = await this.setStatus(
          taskGroupId,
          'failed',
          { channel: 'reminder', error: 'no due time captured' },
          'I could not work out when to remind you.',
        );
        return this.toResult(updated);
      }
      const updated = await this.setStatus(
        taskGroupId,
        'scheduled',
        { channel: 'reminder', due_at: dueAt, scheduled_at: nowIso() },
        'Scheduled.',
        { due_at: dueAt },
      );
      return this.toResult(updated);
    }

    // Execute the owned task. Email and quote go through Resend, which is in-stack.
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

  // --- execution ---
  //
  // Reaches only the send kinds: reminders branch to 'scheduled' in resolveApproval and are
  // delivered later by /api/cron/reminders, which calls sendReminder below.

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

    throw new Error(`execute() called for unexpected kind '${row.kind}'`);
  }

  /**
   * Deliver a due reminder to the owner. Called by the cron sweeper, not by the voice path — the
   * whole point of a reminder is that it arrives when the owner is not talking to Kira. Email is
   * the only transport Kira has; when there is a push/SMS channel this is where it changes.
   */
  async deliverDueReminders(limit = 50): Promise<{ due: number; sent: number; failed: number }> {
    const { data: rows, error } = await this.supabase
      .from('kira_tasks')
      .select('*')
      .eq('status', 'scheduled')
      .lte('due_at', nowIso())
      .order('due_at', { ascending: true })
      .limit(limit);
    if (error) throw new Error(`kira_tasks sweep failed: ${error.message}`);

    const out = { due: rows?.length ?? 0, sent: 0, failed: 0 };
    for (const row of (rows ?? []) as KiraTaskRow[]) {
      try {
        const { data: owner } = await this.supabase
          .from('users')
          .select('email')
          .eq('id', row.user_id)
          .maybeSingle();
        const to = (owner?.email || '').trim();
        if (!to) throw new Error('owner has no email address');

        const body = row.preview || row.summary || 'You asked me to remind you about this.';
        const sent = await sendEmail({
          to,
          subject: `Reminder: ${row.summary || 'from Kira'}`.slice(0, 120),
          html: `<p>${escapeHtml(body)}</p><p style="color:#666">You asked me to remind you: “${escapeHtml(row.utterance)}”</p>`,
          text: `${body}\n\nYou asked me to remind you: "${row.utterance}"`,
        });
        await this.setStatus(row.id, 'done', {
          channel: 'reminder', to, provider_id: (sent as { id?: string })?.id ?? null, fired_at: nowIso(),
        }, 'Done.');
        out.sent += 1;
      } catch (e) {
        // One bad row must not stop the sweep. Leave it 'scheduled' so the next run retries rather
        // than burning the reminder on a transient mail failure.
        console.error(`[reminders] ${row.id} failed:`, e);
        out.failed += 1;
      }
    }
    return out;
  }

  /**
   * The owner's given name, for the draft's sign-off. `users` is the app-user record of truth
   * (bridged to auth by users.auth_user_id), and tenantId IS users.id. Returns null rather than a
   * guess — draftSystem handles not knowing, and a wrong name on a client email is worse than none.
   */
  private async ownerName(tenantId: TenantId): Promise<string | null> {
    try {
      const { data } = await this.supabase
        .from('users')
        .select('first_name, name')
        .eq('id', tenantId)
        .maybeSingle();
      const first = (data?.first_name || '').trim();
      if (first) return first;
      const full = (data?.name || '').trim();
      return full ? full.split(/\s+/)[0] : null;
    } catch {
      return null; // never block a draft on the name lookup
    }
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
    patch?: Record<string, unknown>,
  ): Promise<KiraTaskRow> {
    const { data, error } = await this.supabase
      .from('kira_tasks')
      .update({ status, result, ...(patch ?? {}) })
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
        : row.status === 'scheduled'
          ? `Set — I’ll remind you ${spokenWhen(row.due_at)}.`
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
  due_at: string | null;
}

/**
 * The reminder's absolute time, taken from the classifier's resolved value. Rejects anything
 * unparseable or in the past — a reminder already overdue at approval would fire on the very next
 * sweep, which is not what the owner asked for and reads as a bug.
 */
function parseDueAt(artifact: Record<string, unknown>): string | null {
  const raw = artifact.due_at;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const when = new Date(raw);
  if (Number.isNaN(when.getTime())) return null;
  if (when.getTime() <= Date.now()) return null;
  return when.toISOString();
}

/** How Kira says the due time out loud, in the owner's timezone. */
function spokenWhen(dueAt: string | null): string {
  if (!dueAt) return 'then';
  try {
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: DEFAULT_TIMEZONE, weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(dueAt));
  } catch {
    return 'then';
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function nowIso(): string {
  return new Date().toISOString();
}
