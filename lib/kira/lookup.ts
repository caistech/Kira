// lib/kira/lookup.ts
//
// search_drive + lookup_contact — Kira reading the Google surfaces the owner has already connected.
//
// WHY THIS EXISTS. On 31 July the owner connected Drive and Contacts, then asked her to find his
// Lot 91 files and to check an address. She could do neither: the connectors live in the
// orchestrator and she had no way to reach them. Then she said "I looked through your documents,
// but I didn't find an exact email … in your contacts" — a search that never happened, reported as
// a result. He came away believing his contact book was missing an address.
//
// The tool-honesty prompt stops her saying that. Only this makes the answer real.
//
// READ-ONLY, like look_up_financials and for the same reason: reading changes nothing, so it
// answers immediately instead of going through the dispatch/approve gate. A wrong read is an
// embarrassing answer; a wrong write is a client who received something.
//
// THE QUERY IS THE OWNER'S WORDS, NOT A CONSTRUCTED QUERY. The agent passes a search term; it never
// composes Drive query syntax. The orchestrator builds the query and escapes it. An LLM-authored
// query string against a business's whole Drive is an injection surface, and the blast radius of
// this one is every document the owner has.
//
// SAY WHICH WAY IT FAILED (DATA_STANDARD R4). The orchestrator's contract is that every response
// carries an explicit `ok`, and a failure carries a `reason` written to be SPOKEN — "no Google
// account is connected", "Drive access wasn't granted", "your connection needs renewing". Those
// send an owner to do three different things and none of them is "nothing found". This module's
// one job on the failure path is to carry that sentence through unaltered. An empty `results` with
// ok:true is the honest "I looked and there is no Roger"; ok:false means we could not look. Do not
// collapse the two — that collapse IS the original bug.

const ORCHESTRATOR_AUTH_HEADER = 'x-orchestrator-secret';

/** Fail fast: the owner is mid-sentence. Matches the swarm adapter's budget. */
const TIMEOUT_MS = 12_000;

export type LookupKind = 'drive' | 'contacts';

export interface DriveHit {
  name: string;
  /** Drive's own file id. The agent passes it to read_document to open the file. */
  id: string;
  link: string | null;
  modifiedAt: string | null;
}

export interface ContactHit {
  name: string;
  email: string;
  source: string;
}

export interface LookupAnswer {
  ok: boolean;
  /** Present on success. Empty means genuinely nothing matched. */
  results?: Array<DriveHit | ContactHit>;
  count?: number;
  /** A machine-side code for OUR failures only; the orchestrator's spoken reason goes in `message`. */
  reason?: string;
  /** The sentence to say. On a failure this is the orchestrator's own wording, unaltered. */
  message?: string;
}

interface WireLookup {
  ok?: boolean;
  reason?: string;
  results?: unknown;
}

/**
 * One call for both kinds — the two differ only in what a result looks like, and splitting them
 * would mean two copies of the failure handling, which is the part that must not drift.
 *
 * `organisationId` is the tenant identifier for the orchestrator. The organisation is the
 * enduring subject; the orchestrator's tenant scope must be organisational, not personal.
 * This value is resolved at the request/authentication boundary and passed down —
 * lookup() performs no Person → Organisation resolution.
 */
async function lookup(organisationId: string, kind: LookupKind, q: string): Promise<LookupAnswer> {
  const baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
  const secret = process.env.ORCHESTRATOR_SECRET || '';

  const thing = kind === 'drive' ? 'files' : 'contacts';

  if (!baseUrl || !secret) {
    // Our own misconfiguration. Say it is ours — an owner told "nothing found" because we failed to
    // set an environment variable has been given a false answer about his own business.
    console.error('[lookup] ORCHESTRATOR_URL / ORCHESTRATOR_SECRET missing — cannot look.');
    return {
      ok: false,
      reason: 'not_configured',
      message: `I can't get to your ${thing} just now — that's a problem at my end, not yours.`,
    };
  }

  const term = q.trim();
  if (!term) {
    return { ok: false, reason: 'no_query', message: `Tell me what to look for and I'll search your ${thing}.` };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url =
      `${baseUrl}/api/v1/tenants/${encodeURIComponent(organisationId)}/lookup` +
      `?kind=${kind}&q=${encodeURIComponent(term)}`;
    const res = await fetch(url, {
      headers: { [ORCHESTRATOR_AUTH_HEADER]: secret },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`[lookup] ${kind} → ${res.status}`);
      return {
        ok: false,
        reason: 'upstream_error',
        message: `I couldn't get into your ${thing} just now — nothing's wrong with them, I just couldn't look.`,
      };
    }

    const body = (await res.json()) as WireLookup;

    if (!body.ok) {
      // The orchestrator wrote this sentence to be spoken. Pass it through verbatim: rewording it
      // is how "you didn't grant Drive access" becomes "I couldn't find anything".
      return {
        ok: false,
        reason: 'upstream_declined',
        message: body.reason || `I couldn't look through your ${thing} just now.`,
      };
    }

    const results = Array.isArray(body.results) ? (body.results as Array<DriveHit | ContactHit>) : [];
    return {
      ok: true,
      count: results.length,
      results,
      // Give her the honest empty sentence explicitly, so "found nothing" cannot be delivered in the
      // same words as "could not look".
      message: results.length
        ? undefined
        : `I searched your ${thing} for "${term}" and there's nothing matching.`,
    };
  } catch (error) {
    console.error(`[lookup] ${kind} failed:`, error);
    return {
      ok: false,
      reason: 'upstream_error',
      message: `I couldn't reach your ${thing} just now — worth trying again in a moment.`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Search the organisation's Drive by name and full text. Returns links, because the owner opens them himself. */
export function searchDrive(organisationId: string, query: string): Promise<LookupAnswer> {
  return lookup(organisationId, 'drive', query);
}

/** Look a person up in the organisation's contacts. Zero matches with ok:true means genuinely no match. */
export function lookUpContact(organisationId: string, name: string): Promise<LookupAnswer> {
  return lookup(organisationId, 'contacts', name);
}
