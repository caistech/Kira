// lib/safe-next.ts
//
// Validate a `?next=` redirect target before it is handed to client-side `window.location.href`
// or embedded in an email `redirectTo`. Prevents open redirects: a malicious `?next=` must never
// be able to ship an authenticated user (or a pre-auth hit on /login) off the product's origin.
//
// Rule: accept ONLY an origin-relative path that starts with a single `/` and nothing else.
// Rejected:
//   - `https://evil.com`, `javascript:...`        → contains `:` (scheme/colon)
//   - `//evil.com`                                → protocol-relative (starts with `//`)
//   - `/foo/../../etc` is fine (path-normalised by the browser) but backslash is rejected
//   - empty / missing                             → caller falls back to its own default
export function safeNextPath(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith('/')) return null;      // must be root-relative
  if (value.startsWith('//')) return null;       // no protocol-relative
  if (/[:\\]/.test(value)) return null;          // no scheme/colon, no backslash
  return value;
}
