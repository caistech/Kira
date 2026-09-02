// lib/email/suppressions.ts
//
// Kira's wiring into the canonical opt-out layer (@caistech/email-compliance).
//
// One secret, one store, one URL shape — so the link in the footer, the route that honours it, and
// the check the send path makes are all guaranteed to agree. They diverge the moment any of the
// three is built separately, and a footer link that doesn't match the route that reads it is
// indistinguishable from a broken promise.
//
// PERSISTENCE PATH. The SuppressionStore implementation now proxies through Orchestrator rather
// than reaching for the service-role key directly. The Orchestrator holds the Supabase credential
// and enforces caller identity; Kira stays unprivileged. The exported interface is unchanged —
// callers do not know the persistence path moved.

import { SuppressionStore, unsubscribeUrlFor } from '@caistech/email-compliance';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';
const ORCH_URL = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
const ORCH_SECRET = process.env.ORCHESTRATOR_WEBHOOK_SECRET || '';

/**
 * The HMAC secret for unsubscribe links.
 *
 * No longer falls back to SUPABASE_SECRET_KEY — that key is removed from Kira.
 * UNSUBSCRIBE_SECRET must be set explicitly in the environment.
 */
export function unsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not set');
  return secret;
}

/**
 * Orchestrator-backed SuppressionStore implementation.
 *
 * Implements the @caistech/email-compliance interface:
 *   - isSuppressed(email) → Promise<boolean>
 *   - suppress(email, reason, detail?) → Promise<void> (idempotent)
 *   - resubscribe?(email) → Promise<void>
 */
class OrchestratorSuppressionStore implements SuppressionStore {
  private async call(action: 'add' | 'remove' | 'check', email: string, reason?: string, detail?: string): Promise<any> {
    if (!ORCH_URL || !ORCH_SECRET) {
      throw new Error('ORCHESTRATOR_URL / ORCHESTRATOR_WEBHOOK_SECRET not configured');
    }
    const res = await fetch(`${ORCH_URL}/api/v1/kira/email/suppressions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-orchestrator-secret': ORCH_SECRET,
      },
      body: JSON.stringify({ action, email, ...(reason ? { reason } : {}), ...(detail ? { detail } : {}) }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown error');
      throw new Error(`Orchestrator suppression ${action} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  async isSuppressed(email: string): Promise<boolean> {
    const result = await this.call('check', email);
    return !!result.isSuppressed;
  }

  async suppress(email: string, reason: 'unsubscribe' | 'bounce' | 'complaint' | 'manual', detail?: string): Promise<void> {
    await this.call('add', email, reason, detail);
  }

  async resubscribe(email: string): Promise<void> {
    await this.call('remove', email);
  }
}

/** The durable opt-out list. Consulted before every commercial send. */
export function suppressionStore(): SuppressionStore {
  return new OrchestratorSuppressionStore();
}

/** The unsubscribe URL for a recipient — goes in the compliance footer. */
export function unsubscribeUrl(email: string): Promise<string> {
  return unsubscribeUrlFor(APP_URL, email, unsubscribeSecret());
}