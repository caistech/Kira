// Minting the ticket that lets the owner start a Google consent flow.
//
// Kira has authenticated the user; the orchestrator has the Google credentials and holds the tokens.
// Rather than pass `?tenant=<uuid>` to a publicly reachable route and hope, Kira signs a claim with
// the secret both systems already share, and the orchestrator verifies it. The tenant is asserted by
// something that knows who is logged in, which is the only place that fact exists.
//
// ⚠️ COUNTERPART: `orchestrator/src/connect-token.ts`. Same payload shape, same encoding, same
// algorithm, deliberately — a divergence here fails as "that link is not valid", with the cause on
// the other side of an HTTP boundary. Kept mirror-image (the SHARED_SERVICES build-alike rule) so
// that when this is extracted into a @caistech package it is a lift rather than a rewrite.

import 'server-only';
import { createHmac } from 'node:crypto';

export type DriveAccess = 'full' | 'readonly' | 'picked';

/**
 * How much of his mailbox, chosen by him — the twin of DriveAccess.
 *
 *   none  — she never sees his email.
 *   draft — she can write into his drafts; he reviews and sends himself, from his own address.
 *   read  — additionally read the mailbox, so "did Roger ever reply?" has an answer.
 *
 * `send` is deliberately not a level. Outbound goes through the compliant path that carries his
 * identity, the Spam Act footer and the approval gate.
 */
export type GmailAccess = 'none' | 'draft' | 'read';

export interface ConnectClaim {
  tenantId: string;
  access: DriveAccess;
  /**
   * Optional, and absent means 'none' on the far side.
   *
   * A ticket minted before this existed carries no value, and the safe reading of silence about a
   * mailbox is "do not ask for it" — an owner who never chose Gmail must not meet a consent screen
   * requesting his mail because a field was missing.
   */
  gmail?: GmailAccess;
  email?: string | null;
  returnTo?: string | null;
  exp: number;
}

/** Long enough to survive a click, short enough that a leaked link is worthless tomorrow. */
const TTL_SECONDS = 3600;

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function signConnectToken(claim: ConnectClaim, secret: string): string {
  const payload = b64url(JSON.stringify(claim));
  const mac = b64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${mac}`;
}

export interface ConnectLinkResult {
  url: string | null;
  /** Why there is no link, in words an owner can act on. */
  reason?: string;
}

/**
 * The URL to send the owner to.
 *
 * Returns a reason rather than throwing when the seam is unconfigured: an operator gap must render
 * as "not available yet", not as a crashed settings page.
 */
export function googleConnectLink(params: {
  tenantId: string;
  access: DriveAccess;
  /** Omitted means 'none'. Never defaulted to "some" — asking for a mailbox nobody asked for. */
  gmail?: GmailAccess;
  email?: string | null;
  returnTo?: string | null;
}): ConnectLinkResult {
  const baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
  const secret = process.env.ORCHESTRATOR_SECRET || '';
  if (!baseUrl || !secret) {
    return { url: null, reason: 'The system that connects to Google is not configured yet.' };
  }

  const token = signConnectToken(
    {
      tenantId: params.tenantId,
      access: params.access,
      gmail: params.gmail ?? 'none',
      email: params.email ?? null,
      returnTo: params.returnTo ?? null,
      exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    },
    secret,
  );

  return { url: `${baseUrl}/api/connect/google?t=${encodeURIComponent(token)}` };
}
