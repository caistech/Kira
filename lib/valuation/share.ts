// lib/valuation/share.ts
//
// How a completed valuation travels from the result screen to the sales page and on into checkout.
//
// It used to travel in the URL — `/plan?v=<base64 of the answers>`. base64 is not encryption; it is
// a reversible encoding anyone can paste into a decoder. So the owner's annual turnover, profit and
// owner-dependence rode in a link that lands in browser history, in the Referer header of every
// outbound click, in server and proxy logs, and — the case that actually bites — in the email chain
// when someone forwards "look what this said about my business" to their accountant.
//
// None of that was needed. Both ends are client components in the SAME TAB, one navigation apart.
// sessionStorage carries it without the figures ever entering a URL.
//
// Trade-off, taken deliberately: sessionStorage is per-tab, so opening /plan in a NEW tab loses the
// valuation and the visitor is asked to run it again. That is a minor annoyance, weighed against a
// financial disclosure leaking into places nobody intended. The result page is the thing worth
// re-running; the leak is not worth having.
//
// `decodeValuationParam` is KEPT — links already sent still work — but nothing generates them now.

import type { ValuationInputs } from './model';

export interface ValuationPayload {
  inputs: ValuationInputs;
  currency: string;
}

/**
 * Where the valuation is parked between the two pages.
 *
 * sessionStorage, not localStorage: this is a handoff, not a saved document. localStorage would
 * leave someone's turnover on a shared or public machine indefinitely, with nothing that clears it.
 */
const STORAGE_KEY = 'kira_valuation_handoff';

/** Park the valuation for the next page in this tab. No-op (and never throws) outside a browser. */
export function storeValuation(payload: ValuationPayload): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private-browsing modes and storage quotas both throw here. The next page falls back to its
    // empty state and asks for the valuation again — worse UX, but not a broken page.
  }
}

/** Read a parked valuation, if this tab has one. */
export function readStoredValuation(): ValuationPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validate(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Clear the handoff — e.g. once checkout has captured it. */
export function clearStoredValuation(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do; an uncleared handoff dies with the tab */
  }
}

function validate(parsed: unknown): ValuationPayload | null {
  const candidate = parsed as ValuationPayload | null;
  if (candidate && candidate.inputs && typeof candidate.inputs.annualProfit === 'number') {
    return candidate;
  }
  return null;
}

/**
 * Decode the legacy `?v=` parameter.
 *
 * RETAINED FOR LINKS ALREADY IN THE WILD ONLY. Nothing produces these any more — see the note at
 * the top of this file. Do not reach for this to build a new link; use `storeValuation`.
 */
export function decodeValuationParam(s: string | null | undefined): ValuationPayload | null {
  if (!s) return null;
  try {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return validate(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
