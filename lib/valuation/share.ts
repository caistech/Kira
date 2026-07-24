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
    // Compact base64url of the raw UTF-8 JSON (no double-encoding), URL-safe.
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function decodeValuationParam(s: string | null | undefined): ValuationPayload | null {
  if (!s) return null;
  try {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (parsed && parsed.inputs && typeof parsed.inputs.annualProfit === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}
