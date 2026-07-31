// What is connected, for the owner's Settings page.
//
// Kira does not hold the tokens and must not read the orchestrator's database, so the fact is
// fetched over the same authenticated seam everything else uses. Nothing secret comes back — the
// endpoint returns provider, account and granted access, never a credential.

import 'server-only';

const AUTH_HEADER = 'x-orchestrator-secret';

/** A settings page is not worth blocking a render on. */
const TIMEOUT_MS = 6_000;

export type DriveAccessLevel = 'full' | 'readonly' | 'picked';

export interface ConnectionStatus {
  provider: string;
  account: string | null;
  driveAccess: DriveAccessLevel | null;
  gmail: boolean;
  /**
   * The two contact books, separately. Null when the seam did not say (an older orchestrator).
   *
   * Shown rather than assumed because declining it is invisible in use: every send addressed by
   * name simply stops and asks for an address, which reads as Kira being forgetful rather than as a
   * permission that was never granted — and the fix is a reconnect he has no reason to think of.
   */
  contacts: { contacts: boolean; otherContacts: boolean } | null;
  connectedAt: string | null;
  revoked: boolean;
  lastError: string | null;
}

/**
 * Connections for this owner, or null when we could not find out.
 *
 * NULL IS NOT "NOTHING CONNECTED", and the caller must keep them distinct. Rendering an unreachable
 * orchestrator as "no accounts connected" invites an owner to reconnect something that is already
 * working — degrade, don't fake.
 */
export async function fetchConnections(tenantId: string): Promise<ConnectionStatus[] | null> {
  const baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
  const secret = process.env.ORCHESTRATOR_SECRET || '';
  if (!baseUrl || !secret) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/api/v1/tenants/${tenantId}/connections`, {
      headers: { [AUTH_HEADER]: secret },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error(`[connections] ${tenantId}: ${response.status}`);
      return null;
    }
    const body = (await response.json()) as { connections?: ConnectionStatus[] };
    return body.connections ?? [];
  } catch (error) {
    console.error(`[connections] ${tenantId}: unreachable`, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const DRIVE_ACCESS_LABEL: Record<DriveAccessLevel, string> = {
  full: 'read and write',
  readonly: 'read only',
  picked: 'only files you pick',
};
