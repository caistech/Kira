// Which provider we suggest, and — more importantly — when we suggest nothing.
//
// The dangerous direction here is a CONFIDENT WRONG ANSWER, because the whole design rests on the
// suggestion being honest enough to pre-select. A false "microsoft" points a man who has never had a
// Microsoft account at a Microsoft login and he stops. So most of these tests assert silence rather
// than a result: the null cases are the load-bearing ones.
//
// The pure halves are tested directly and the DNS half through a mocked resolver, so the suite never
// touches the network — a test that depends on the live MX of a real customer's domain fails on a
// plane and passes in CI for reasons unrelated to the code.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveMx = vi.fn();
vi.mock('node:dns/promises', () => ({ resolveMx: (d: string) => resolveMx(d) }));

const { detectDocumentProvider, providerFromMailDomain, providerFromMxHosts } = await import('./mail-provider');

const mx = (...hosts: string[]) => hosts.map((exchange, i) => ({ exchange, priority: (i + 1) * 10 }));

beforeEach(() => {
  resolveMx.mockReset();
});

describe('providerFromMxHosts', () => {
  it('recognises Microsoft 365 by its per-tenant hostname', () => {
    // The real shape: the tenant name is baked in, so an equality check would recognise nothing.
    expect(providerFromMxHosts(['garda-com-au.mail.protection.outlook.com'])).toBe('microsoft');
  });

  it('recognises Google Workspace across all five published hosts', () => {
    expect(providerFromMxHosts(['aspmx.l.google.com'])).toBe('google');
    expect(providerFromMxHosts(['alt1.aspmx.l.google.com', 'alt2.aspmx.l.google.com'])).toBe('google');
  });

  it('tolerates the trailing dot and mixed case DNS actually returns', () => {
    expect(providerFromMxHosts(['ASPMX.L.GOOGLE.COM.'])).toBe('google');
    expect(providerFromMxHosts(['Garda.mail.protection.outlook.com.'])).toBe('microsoft');
  });

  it('says nothing for an ISP, a cPanel host or a self-managed server', () => {
    // These are not failures — they are the correct answer for a large slice of this ICP.
    expect(providerFromMxHosts(['mail.bigpond.com'])).toBeNull();
    expect(providerFromMxHosts(['mx.iinet.net.au'])).toBeNull();
    expect(providerFromMxHosts(['mail.garda.com.au'])).toBeNull();
    expect(providerFromMxHosts([])).toBeNull();
  });

  it('is not fooled by a lookalike domain', () => {
    // Each fixture must contain the WHOLE matched string and still be rejected — that is what
    // distinguishes `endsWith` from `includes`. An earlier version of this test used
    // `outlook.com.attacker.io`, which does not contain `mail.protection.outlook.com` at all, so
    // relaxing the check to a substring match left it green. Mutation testing found that; the
    // fixtures below are the ones that actually pin the suffix rule.
    expect(providerFromMxHosts(['mail.protection.outlook.com.evil.net'])).toBeNull();
    expect(providerFromMxHosts(['aspmx.l.google.com.evil.net'])).toBeNull();
    expect(providerFromMxHosts(['mx.google.com.evil.net'])).toBeNull();
    expect(providerFromMxHosts(['outlook.com.attacker.io'])).toBeNull();
  });
});

describe('providerFromMailDomain', () => {
  it('maps the consumer domains that genuinely identify a provider', () => {
    expect(providerFromMailDomain('gmail.com')).toBe('google');
    expect(providerFromMailDomain('hotmail.com.au')).toBe('microsoft');
    expect(providerFromMailDomain('live.com')).toBe('microsoft');
  });

  it('says nothing for an ISP address — the ICP case that tells you neither', () => {
    // Deliberately absent from the map even though ./index treats them as free-mail domains: that
    // set answers "can he publish DKIM here?", which is a different question.
    expect(providerFromMailDomain('bigpond.com')).toBeNull();
    expect(providerFromMailDomain('optusnet.com.au')).toBeNull();
    expect(providerFromMailDomain('iinet.net.au')).toBeNull();
  });

  it('says nothing for a custom business domain, which is the whole ICP', () => {
    expect(providerFromMailDomain('garda.com.au')).toBeNull();
  });

  it('survives whatever the owner typed', () => {
    expect(providerFromMailDomain('ray@gmail.com')).toBe('google');
    expect(providerFromMailDomain('  GMAIL.COM ')).toBe('google');
    expect(providerFromMailDomain('')).toBeNull();
    expect(providerFromMailDomain(null)).toBeNull();
  });
});

describe('detectDocumentProvider', () => {
  it('uses the business domain MX, at high confidence, and says why', async () => {
    resolveMx.mockResolvedValue(mx('garda-com-au.mail.protection.outlook.com'));
    const result = await detectDocumentProvider({ businessDomain: 'garda.com.au' });

    expect(result.provider).toBe('microsoft');
    expect(result.confidence).toBe('high');
    expect(result.basis).toBe('mx');
    // The explanation is shown to the owner, so it must name the domain it reasoned from — that is
    // what lets him see it is a guess about his MAIL and correct it.
    expect(result.explanation).toContain('garda.com.au');
  });

  it('falls back to the account email domain when no business domain is known', async () => {
    resolveMx.mockResolvedValue(mx('aspmx.l.google.com'));
    const result = await detectDocumentProvider({ accountEmail: 'ray@garda.com.au' });
    expect(result.provider).toBe('google');
    expect(result.basis).toBe('mx');
    expect(resolveMx).toHaveBeenCalledWith('garda.com.au');
  });

  it('does NOT do a DNS lookup for a consumer address', async () => {
    const result = await detectDocumentProvider({ accountEmail: 'ray@gmail.com' });
    expect(result.provider).toBe('google');
    expect(result.confidence).toBe('low');
    expect(result.basis).toBe('email-domain');
    expect(resolveMx).not.toHaveBeenCalled();
  });

  it('marks a consumer-address guess as LOW confidence, and says it may be wrong', async () => {
    const result = await detectDocumentProvider({ accountEmail: 'ray@hotmail.com' });
    expect(result.confidence).toBe('low');
    expect(result.explanation?.toLowerCase()).toContain('elsewhere');
  });

  it('suggests NOTHING when the business runs its own mail, even if he signed up with Gmail', async () => {
    // The trap: his personal Gmail would pre-select Google, pointing him at an account with none of
    // the business's documents in it. The business plainly does not run on Google — MX answered and
    // it was neither — so silence is the only honest output.
    resolveMx.mockResolvedValue(mx('mail.garda.com.au'));
    const result = await detectDocumentProvider({
      businessDomain: 'garda.com.au',
      accountEmail: 'ray@gmail.com',
    });
    expect(result.provider).toBeNull();
    expect(result.basis).toBe('unknown');
    expect(result.explanation).toBeNull();
  });

  it('suggests nothing, and does not throw, when DNS fails', async () => {
    resolveMx.mockRejectedValue(new Error('ENOTFOUND'));
    const result = await detectDocumentProvider({ businessDomain: 'garda.com.au' });
    expect(result.provider).toBeNull();
    expect(result.basis).toBe('unknown');
  });

  it('gives up rather than hanging the page when DNS never answers', async () => {
    // A blackholed resolver returns nothing at all, forever. The page must still render.
    resolveMx.mockImplementation(() => new Promise(() => {}));
    const result = await detectDocumentProvider({ businessDomain: 'garda.com.au' });
    expect(result.provider).toBeNull();
  }, 5000);

  it('suggests nothing when there is nothing to go on', async () => {
    expect((await detectDocumentProvider({})).provider).toBeNull();
    expect((await detectDocumentProvider({ accountEmail: 'ray@bigpond.com' })).provider).toBeNull();
  });
});
