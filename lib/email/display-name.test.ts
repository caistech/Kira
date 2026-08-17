import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { sanitiseDisplayName } from './sender';

// WHOSE NAME THE BROKER SEES.
//
// Kira sends from the one Resend-verified subdomain and that cannot change until an owner's own
// domain is verified with us — forging his address in From fails SPF/DKIM at his broker's mail
// server, and being binned is worse than being plain. But the thing he objected to was never the
// envelope:
//
//   "it goes out under our name means my broker gets an email from Corporate AI Solutions. He will
//    ask what that is. I would rather it went from me." — Ray, 2026-08-17
//
// For a man who has told nobody he is selling, a stranger's company name on the covering email is
// the exposure. A DISPLAY NAME is not authenticated by SPF or DKIM, so it is both honest and
// deliverable.

describe('sanitiseDisplayName — a header injection boundary, not a formatter', () => {
  it('⚠️ strips CR and LF, which is the whole reason this function exists', () => {
    // The value is typed by the owner and interpolated into a From: header. A newline would let him
    // append arbitrary headers — a Bcc to a third party being the obvious one, on the single feature
    // in this product that sends his business to another human.
    expect(sanitiseDisplayName('Wilson Electrical\r\nBcc: someone@example.com')).toBe(
      'Wilson Electrical Bcc: someone@example.com'.replace(/[:]/g, ''),
    );
    expect(sanitiseDisplayName('A\nB')).not.toContain('\n');
    expect(sanitiseDisplayName('A\rB')).not.toContain('\r');
  });

  it('removes the characters that carry meaning inside a header', () => {
    expect(sanitiseDisplayName('Wilson "Sparky" Electrical <hi@x.com>')).toBe('Wilson Sparky Electrical hi@x.com');
    expect(sanitiseDisplayName('Smith, Jones & Co;')).toBe('Smith Jones & Co');
  });

  it('leaves an ordinary trading name alone', () => {
    expect(sanitiseDisplayName('Wilson Electrical & Mechanical')).toBe('Wilson Electrical & Mechanical');
    expect(sanitiseDisplayName("O'Brien Contracting")).toBe('OBrien Contracting');
  });

  it('returns empty when nothing usable survives, so the caller falls back to a bare address', () => {
    expect(sanitiseDisplayName('   ')).toBe('');
    expect(sanitiseDisplayName('<<>>')).toBe('');
    expect(sanitiseDisplayName(null as unknown as string)).toBe('');
  });

  it('bounds the length', () => {
    expect(sanitiseDisplayName('x'.repeat(200)).length).toBeLessThanOrEqual(64);
  });
});

describe('the share route uses it', () => {
  it('builds a From with his name and OUR address', () => {
    const src = readFileSync('app/api/genome/share/route.ts', 'utf8');
    expect(src).toContain('sanitiseDisplayName(displayName)');
    // ⚠️ The address must stay ours. If his ever appears here, SPF/DKIM fail at the recipient and
    // the document silently does not arrive — the worst possible failure for this feature.
    expect(src).toContain('<${DEFAULT_FROM}>');
    // "via Kira" stays: the recipient is entitled to know a tool sent it, and omitting it would be
    // the forgery the address rule exists to avoid.
    expect(src).toContain('(via Kira)');
  });
});
