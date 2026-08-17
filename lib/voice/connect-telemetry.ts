// lib/voice/connect-telemetry.ts
//
// The browser's side of voice-connection telemetry. Pure helpers here; the network call is at the
// bottom and is deliberately the least interesting part.
//
// The rule this file exists to obey: REPORTING MUST NEVER AFFECT CONNECTING. A telemetry helper
// that throws, blocks, or retries inside a connect path turns an observability feature into an
// outage. Every export below either returns a value or swallows.

/** The voice surfaces we distinguish. Kept small — a free-form string becomes twelve spellings. */
export type VoiceSurface =
  | 'dashboard'
  | 'my-genome'
  | 'drafts'
  | 'requests'
  | 'knowledge'
  | 'start'
  | 'chat'
  | 'landing'
  | 'valuation'
  | 'pubguard';

export type VoiceConnectOutcome =
  /** The session opened. Recorded so failures have a denominator. */
  | 'connected'
  /** Our own route would not issue a signed URL — this one is ours, always. */
  | 'signed_url_failed'
  /** The widget reported an error. */
  | 'error'
  /** No error and no connection: it simply never arrived. */
  | 'stalled';

/**
 * Strip anything credential-shaped out of a detail string.
 *
 * ⚠️ THE SIGNED URL IS A CREDENTIAL. `/api/kira/start` returns
 * `wss://api.elevenlabs.io/...?conversation_signature=cvtkn_…`, and the natural thing for an error
 * handler to do is include the URL it was trying to open. That would write a live conversation
 * token into a database row, and from there into anything that reads the table.
 *
 * So: URLs are removed wholesale rather than parsed and filtered. A detail string is for a human
 * reading a list of failures; nothing downstream needs the address, and "remove every URL" cannot
 * be got subtly wrong the way "remove the query string" can when a token later moves into a path
 * segment or a fragment.
 *
 * Also caps length — an unbounded error string from a vendor SDK is not a useful column value.
 */
export function redactVoiceDetail(raw: unknown, maxLength = 300): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    // Any scheme, not just http/ws: an SDK may report `blob:` or a bare `//host` form.
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[url]')
    // Bare tokens that look like ElevenLabs signatures, in case one is reported without a URL.
    .replace(/\bcvtkn_[A-Za-z0-9]+/g, '[token]')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength - 1) + '…' : cleaned;
}

/** Does this outcome warrant spending a probe? Only failures — success needs no explanation. */
export function shouldProbeReachability(outcome: VoiceConnectOutcome): boolean {
  return outcome !== 'connected';
}

/**
 * Can this browser reach ElevenLabs at all?
 *
 * THE WHOLE POINT OF THE TABLE. A failed voice session has two completely different causes with
 * identical symptoms on screen: the visitor's network blocks the vendor (corporate proxy, firewall,
 * school or hospital wifi — very common for the sixty-year-old owner inside a family business with
 * managed IT), or our own wiring is broken. From the outside they are the same "Not connected".
 *
 * `mode: 'no-cors'` because we do not need to READ the response — an opaque result still proves the
 * request left the machine and something answered. That also means no CORS configuration is needed
 * at the vendor, so this cannot break when they change headers.
 *
 * Aborts hard at 4s. A probe that hangs is a probe that never reports, and this runs on a path
 * where the user has already failed once.
 */
export async function probeVendorReachable(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 4000,
): Promise<boolean | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await fetchImpl('https://api.elevenlabs.io/v1/models', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      return true;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Reached only when the request could not complete: DNS, TLS, proxy refusal, timeout. An HTTP
    // error status does NOT land here, and must not — a 401 from the vendor still proves the
    // network path is open, which is the question being asked.
    return false;
  }
}

export interface VoiceConnectReport {
  surface: VoiceSurface;
  outcome: VoiceConnectOutcome;
  detail?: unknown;
}

/**
 * Report one connection outcome. Fire-and-forget by contract.
 *
 * ⚠️ NEVER AWAITED BY A CALLER ON THE CONNECT PATH, and never throws if one does. It returns a
 * promise only so tests can settle it.
 *
 * No user id is sent. The route derives the caller from the session cookie — a client-supplied id
 * is an assertion, not an identity, and this endpoint is unauthenticated by necessity (the landing
 * widget runs before sign-in), which is exactly where a trusted client id would be abused.
 */
export async function reportVoiceConnect(report: VoiceConnectReport): Promise<void> {
  try {
    const reachable = shouldProbeReachability(report.outcome)
      ? await probeVendorReachable()
      : null;

    const body = JSON.stringify({
      surface: report.surface,
      outcome: report.outcome,
      detail: redactVoiceDetail(report.detail),
      reachable,
    });

    // `keepalive` so the report survives the user navigating away or closing the tab straight after
    // a failure — which is precisely what someone does when it does not work.
    await fetch('/api/voice/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Swallowed on purpose. See the file header: this must never affect connecting.
  }
}
