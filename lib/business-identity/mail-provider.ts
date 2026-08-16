// Where does this owner's business actually run — Google or Microsoft?
//
// ⚠️ THIS DETECTS IN ORDER TO SUGGEST, NEVER TO ROUTE. Read that before using it.
//
// The obvious implementation reads the email address, and on this ICP it fails. Every real business
// here is on a custom domain — `ray@garda.com.au` — which is provider-agnostic by design and reveals
// nothing. `isFreeMailDomain` in ./index already documents the other half of the problem: this ICP
// is commonly on bigpond or optusnet, which tells you neither.
//
// The MX record on the business domain DOES answer it, and cheaply. That is how the Microsoft
// majority in the contact base was measured in the first place
// (docs/BRIEF_ORCHESTRATOR_DRIVE_FILE_SCOPES.md §7).
//
// BUT MX IS WHERE THE MAIL LIVES, NOT WHERE THE DOCUMENTS LIVE. They correlate strongly and not
// perfectly — Microsoft 365 for mail with Dropbox for files is ordinary in trades, and plenty of
// owners run company mail one place and keep their quotes somewhere else entirely. So this returns a
// SUGGESTION with its reasoning attached, and the owner still chooses.
//
// Auto-routing on this signal would put a man who has never had a Microsoft account in front of a
// Microsoft login, at the single most abandonment-prone moment in the product, with an error he
// cannot interpret. He would not report it; he would stop. It is also the `/setup/drive` defect in a
// new costume — the screen said Drive and Google asked for his address book. He never chose
// Microsoft, and now Microsoft is asking.
//
// So: the detected provider is pre-selected and listed first. The other is always visible. The
// reasoning is shown in one sentence so he can see it is a guess and correct it.

import 'server-only';

import { resolveMx } from 'node:dns/promises';

import { isFreeMailDomain, normaliseDomain } from './index';

export type DocumentProvider = 'google' | 'microsoft';

export interface ProviderDetection {
  /** Null means "we genuinely do not know" — which is a real and common answer, not a failure. */
  provider: DocumentProvider | null;
  /**
   * How much the suggestion is worth. `high` = the vendor's own mail servers answered for this
   * domain. `low` = inferred from a consumer address, which says where his personal mail is and not
   * much about his business.
   */
  confidence: 'high' | 'low';
  basis: 'mx' | 'email-domain' | 'unknown';
  /** One sentence in the owner's language, shown on the page. Null when there is nothing to say. */
  explanation: string | null;
}

const UNKNOWN: ProviderDetection = {
  provider: null,
  confidence: 'low',
  basis: 'unknown',
  explanation: null,
};

/**
 * Consumer mail domains that DO identify a provider.
 *
 * A deliberate subset of `FREE_MAIL_DOMAINS` in ./index — that set answers a different question
 * ("can he publish DKIM here?", where bigpond and optusnet belong). Here bigpond and optusnet are
 * correctly absent, because an ISP mailbox says nothing about where his documents are.
 */
const CONSUMER_PROVIDER: Record<string, DocumentProvider> = {
  'gmail.com': 'google',
  'googlemail.com': 'google',
  'outlook.com': 'microsoft',
  'outlook.com.au': 'microsoft',
  'hotmail.com': 'microsoft',
  'hotmail.com.au': 'microsoft',
  'live.com': 'microsoft',
  'live.com.au': 'microsoft',
  'msn.com': 'microsoft',
};

/** Pure. A consumer mail domain → its provider, or null for a custom or unknown domain. */
export function providerFromMailDomain(domain: string | null | undefined): DocumentProvider | null {
  const host = normaliseDomain(domain);
  return host ? (CONSUMER_PROVIDER[host] ?? null) : null;
}

/**
 * Pure. MX hostnames → the provider running that domain's mail.
 *
 * Matched on suffix rather than equality: Google publishes five hosts
 * (`aspmx.l.google.com`, `alt1.aspmx.l.google.com`, …) and Microsoft publishes a per-tenant name
 * (`garda-com-au.mail.protection.outlook.com`), so an equality check would recognise neither.
 */
export function providerFromMxHosts(hosts: string[]): DocumentProvider | null {
  const lower = hosts.map((h) => h.toLowerCase().replace(/\.$/, ''));
  if (lower.some((h) => h.endsWith('mail.protection.outlook.com'))) return 'microsoft';
  if (lower.some((h) => h.endsWith('google.com') || h.endsWith('googlemail.com'))) return 'google';
  return null;
}

/**
 * DNS is on the render path of a page an owner is waiting for, and `resolveMx` has no timeout of its
 * own — a slow or blackholed resolver would hang the page rather than fail it. Two seconds is longer
 * than any healthy lookup and short enough that nobody notices losing it.
 */
const MX_TIMEOUT_MS = 2000;

async function mxHosts(domain: string): Promise<string[] | null> {
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('mx timeout')), MX_TIMEOUT_MS)),
    ]);
    return records.map((r) => r.exchange);
  } catch {
    // NXDOMAIN, no MX records, a timeout, a resolver that is having a bad day — all the same answer
    // here, which is "we do not know". A detection failure must never surface as an error: the page
    // simply shows both options with neither pre-selected.
    return null;
  }
}

/**
 * Suggest a provider for this owner.
 *
 * `businessDomain` is preferred when known, because it is the question actually being asked — where
 * does the BUSINESS run. The account email is the fallback, and on a consumer address it produces a
 * `low` confidence answer that says so.
 *
 * Never throws. Never blocks longer than MX_TIMEOUT_MS.
 */
export async function detectDocumentProvider(params: {
  accountEmail?: string | null;
  businessDomain?: string | null;
}): Promise<ProviderDetection> {
  const business = normaliseDomain(params.businessDomain);
  const fromEmail = normaliseDomain(params.accountEmail);

  // A custom business domain is the strongest signal available, so it is asked first.
  const custom = business ?? (fromEmail && !isFreeMailDomain(fromEmail) ? fromEmail : null);

  if (custom) {
    const hosts = await mxHosts(custom);
    const provider = hosts ? providerFromMxHosts(hosts) : null;
    if (provider) {
      return {
        provider,
        confidence: 'high',
        basis: 'mx',
        explanation:
          provider === 'microsoft'
            ? `Your email at ${custom} runs on Microsoft 365, so we have put OneDrive first.`
            : `Your email at ${custom} runs on Google Workspace, so we have put Google Drive first.`,
      };
    }
    // MX answered and it was neither — an ISP, a cPanel host, a self-managed server. That is a real
    // answer and it is "we do not know where his documents are", so nothing is suggested. Falling
    // through to guess from a personal Gmail here would be worse than silence: the business plainly
    // does not run on Google, and pre-selecting it because his personal address does would point him
    // at the wrong account.
    if (hosts) return UNKNOWN;
  }

  // No custom domain to go on — he signed up with a consumer address and has not told us a business
  // domain. His personal provider is a weak but honest hint.
  const consumer = providerFromMailDomain(fromEmail);
  if (consumer) {
    return {
      provider: consumer,
      confidence: 'low',
      basis: 'email-domain',
      explanation:
        consumer === 'microsoft'
          ? 'You signed up with a Microsoft address, so we have put OneDrive first — change it if your work files are elsewhere.'
          : 'You signed up with a Google address, so we have put Google Drive first — change it if your work files are elsewhere.',
    };
  }

  return UNKNOWN;
}
