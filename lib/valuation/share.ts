// lib/valuation/share.ts
// Encode/decode the valuation so it can ride in a URL from the result screen to the sales page and
// on into checkout. Browser-only (btoa/atob); both endpoints are client components.

import type { ValuationInputs } from './model';

export interface ValuationPayload {
  inputs: ValuationInputs;
  currency: string;
}

export function encodeValuationParam(payload: ValuationPayload): string {
  try {
    // base64url so it's safe in a URL query (no +, /, = to be mangled by URLSearchParams).
    return btoa(encodeURIComponent(JSON.stringify(payload)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function decodeValuationParam(s: string | null | undefined): ValuationPayload | null {
  if (!s) return null;
  try {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const parsed = JSON.parse(decodeURIComponent(atob(b64)));
    if (parsed && parsed.inputs && typeof parsed.inputs.annualProfit === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}
