// Pushing the identity to the system that actually sends.
//
// Kira stores the identity so its own surfaces can show it; the ORCHESTRATOR is what puts it in the
// footer, and the two live in separate Supabase projects on purpose — the orchestrator holds Xero
// refresh tokens, so neither product holds the other's service-role key. State both sides need is
// COPIED across the boundary over HTTP, never read across it.
//
// THIS CALL REPORTS ITS OUTCOME RATHER THAN SWALLOWING IT.
//
// The dispatch adapter is deliberately fail-soft: the owner is mid-sentence, and an intent must
// never vanish into an exception. This is the opposite situation. Nobody is waiting on a voice
// call, and a silent failure here produces the single worst state available — Kira showing a
// completed business profile while the sender still refuses every send, which is indistinguishable
// from working until a quote does not arrive. So the caller records `synced_to_orchestrator_at`
// only on a 200, and an unsynced row stays visibly unsynced.

import 'server-only';
import { composePostalAddress, formatAbn, type BusinessIdentity } from './index';

const CONTRACT_VERSION = '1';
const AUTH_HEADER = 'x-orchestrator-secret';

/** Longer than the dispatch adapter's 12s: this is a form submit, not a spoken turn. */
const TIMEOUT_MS = 15_000;

export interface SyncResult {
  ok: boolean;
  /** True when the orchestrator confirms the tenant may now send. */
  canSend: boolean;
  /** Operator-facing reason. Shown to the owner in plain words, never raw. */
  reason?: string;
}

function configured(): { baseUrl: string; secret: string } | null {
  const baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
  const secret = process.env.ORCHESTRATOR_SECRET || '';
  return baseUrl && secret ? { baseUrl, secret } : null;
}

/**
 * PUT the identity to /v1/tenants/:tenantId/identity.
 *
 * `tenantId` is the Kira user id — the two systems agree on that key, and the mirror in `kira_tasks`
 * is built on the same assumption.
 */
export async function pushIdentityToOrchestrator(
  tenantId: string,
  identity: Omit<BusinessIdentity, 'user_id' | 'created_at' | 'updated_at' | 'synced_to_orchestrator_at'>,
): Promise<SyncResult> {
  const config = configured();
  if (!config) {
    // Not an error the owner caused, and not something to hide either — his identity is saved here
    // and the sender does not have it, which is precisely what the unsynced state is for.
    console.error('[identity-sync] ORCHESTRATOR_URL / ORCHESTRATOR_SECRET unset — identity saved locally only.');
    return { ok: false, canSend: false, reason: 'The sending system is not connected yet.' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${config.baseUrl}/api/v1/tenants/${tenantId}/identity`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', [AUTH_HEADER]: config.secret },
      signal: controller.signal,
      body: JSON.stringify({
        version: CONTRACT_VERSION,
        legalName: identity.legal_name,
        abn: identity.abn,
        tradingName: identity.trading_name ?? undefined,
        postalAddress: composePostalAddress(identity),
        replyEmail: identity.reply_email,
        authorisedAt: identity.authorised_at,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as { canSend?: boolean; error?: string };

    if (!response.ok) {
      console.error(`[identity-sync] ${tenantId}: ${response.status} ${body.error ?? ''}`);
      return {
        ok: false,
        canSend: false,
        reason:
          response.status === 401 || response.status === 503
            ? 'The sending system rejected the connection.'
            : body.error || 'The sending system could not save it.',
      };
    }

    console.log(`[identity-sync] ${tenantId}: accepted (ABN ${formatAbn(identity.abn)}).`);
    return { ok: true, canSend: body.canSend !== false };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    console.error(`[identity-sync] ${tenantId}: ${aborted ? 'timed out' : 'unreachable'}:`, error);
    return {
      ok: false,
      canSend: false,
      reason: aborted ? 'The sending system took too long to respond.' : "Couldn't reach the sending system.",
    };
  } finally {
    clearTimeout(timer);
  }
}
