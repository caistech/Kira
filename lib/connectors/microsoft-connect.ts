// Minting the ticket that lets the owner start a Microsoft consent flow.
//
// The twin of ./google-connect.ts, and the ticket format is SHARED deliberately — same signing
// secret, same payload shape, same `access` field. Kira mints one kind of ticket and the provider is
// decided by which orchestrator URL it is sent to, so there is no second token shape to keep in step.
//
// ⚠️ THE VOCABULARY IS NOT SHARED, even though the field is. `access` carries Google's words on the
// Google path (`full | readonly | picked`) and Microsoft's on this one (`readonly | readwrite | all`),
// because the two vendors do not offer the same things. Graph has no per-file scope, so there is no
// honest Microsoft meaning for `picked`; Drive has no equivalent of `all`. The orchestrator's
// `isFilesAccess` REJECTS Google vocabulary rather than mapping it — a ticket carrying `picked` falls
// to the Microsoft default instead of quietly granting a whole OneDrive under a word that promises
// per-file access.
//
// ⚠️ COUNTERPART: `orchestrator/src/connectors/microsoft.ts` + `app/api/connect/microsoft/route.ts`.
// Same claim shape, same encoding, same algorithm as the Google pair, deliberately — a divergence
// here fails as "that link is not valid", with the cause on the other side of an HTTP boundary.

import 'server-only';
import { createHmac } from 'node:crypto';

/**
 * How much of his storage, chosen by him.
 *
 *   readonly  — his own OneDrive, read. She can learn his format and can never give him anything back.
 *   readwrite — his own OneDrive, read and write. The default, and the one that completes the job.
 *   all       — additionally files shared with him and the company SharePoint. Much wider than it
 *               sounds, and named that way on the form.
 *
 * Mail is deliberately not a level here, and unlike Gmail it is not merely deferred: Graph has NO
 * draft-only permission, so a `draft` tier would grant reading of his entire mailbox. If mail is ever
 * offered on Microsoft it has to be presented in those words.
 */
export type FilesAccess = 'readonly' | 'readwrite' | 'all';

export interface ConnectClaim {
  tenantId: string;
  access: FilesAccess;
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
export function microsoftConnectLink(params: {
  tenantId: string;
  access: FilesAccess;
  email?: string | null;
  returnTo?: string | null;
}): ConnectLinkResult {
  const baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
  const secret = process.env.ORCHESTRATOR_SECRET || '';
  if (!baseUrl || !secret) {
    return { url: null, reason: 'The system that connects to Microsoft is not configured yet.' };
  }

  const token = signConnectToken(
    {
      tenantId: params.tenantId,
      access: params.access,
      email: params.email ?? null,
      returnTo: params.returnTo ?? null,
      exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    },
    secret,
  );

  return { url: `${baseUrl}/api/connect/microsoft?t=${encodeURIComponent(token)}` };
}
