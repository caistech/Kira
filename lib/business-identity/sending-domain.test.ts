// The sending domain: his own website, asked for, never derived.
//
// WHY DERIVING IS WRONG. The obvious shortcut is to take the domain off the reply address he has
// already given. That works only for owners who already run their own mail, which in this ICP is the
// minority — a tradesman replies from bobsplumbing@bigpond.com, and deriving from it yields
// `bigpond.com`: a domain he does not control and can NEVER verify, because Telstra owns it. He
// would be handed DKIM records that are impossible to publish, and the setup would dead-end weeks
// later as "nothing sends" with no explanation.
//
// So the free-mail rejection is not input hygiene, it is the difference between a true answer and a
// silent dead end.

import { describe, expect, it } from 'vitest';

import { isFreeMailDomain, normaliseDomain, validateBusinessIdentity } from './index';

describe('normaliseDomain — owners paste what they see in the address bar', () => {
  it.each([
    ['bobsplumbing.com.au', 'bobsplumbing.com.au'],
    ['https://bobsplumbing.com.au', 'bobsplumbing.com.au'],
    ['http://www.bobsplumbing.com.au/', 'bobsplumbing.com.au'],
    ['www.bobsplumbing.com.au/contact?ref=1', 'bobsplumbing.com.au'],
    ['  BobsPlumbing.COM.AU  ', 'bobsplumbing.com.au'],
    ['bobsplumbing.com.au:443', 'bobsplumbing.com.au'],
  ])('%s -> %s', (input, expected) => {
    expect(normaliseDomain(input)).toBe(expected);
  });

  it('recovers a domain from an email address pasted into the wrong box', () => {
    // Predictable, given the field above it asks for an email.
    expect(normaliseDomain('bob@bobsplumbing.com.au')).toBe('bobsplumbing.com.au');
  });

  it('returns null for things that are not hostnames', () => {
    for (const junk of ['', '   ', 'bobs plumbing', 'localhost', 'not a domain', '...']) {
      expect(normaliseDomain(junk)).toBeNull();
    }
  });
});

describe('isFreeMailDomain — the answers no DNS can rescue', () => {
  it.each(['gmail.com', 'bigpond.com', 'bigpond.net.au', 'optusnet.com.au', 'outlook.com', 'icloud.com', 'iinet.net.au'])(
    'rejects %s',
    (domain) => {
      expect(isFreeMailDomain(domain)).toBe(true);
    },
  );

  it('normalises before checking, so a pasted URL or address is still caught', () => {
    expect(isFreeMailDomain('https://www.gmail.com/')).toBe(true);
    expect(isFreeMailDomain('bob@bigpond.com')).toBe(true);
  });

  it('accepts a real business domain', () => {
    for (const domain of ['bobsplumbing.com.au', 'factory2key.com.au', 'kiraexec.com']) {
      expect(isFreeMailDomain(domain)).toBe(false);
    }
  });
});

describe('validateBusinessIdentity — the sending domain field', () => {
  const base = {
    legalName: 'Bob’s Plumbing Pty Ltd',
    abn: '54672395685',
    street: '1 Example Street',
    locality: 'Fortitude Valley',
    state: 'QLD',
    postcode: '4006',
    replyEmail: 'bob@bigpond.com',
    authorised: true,
  };

  it('BLANK IS VALID — an owner with no website is a supported state, not an incomplete record', () => {
    const result = validateBusinessIdentity({ ...base, sendingDomain: '' });
    expect(result.ok).toBe(true);
    expect(result.value?.sendingDomain).toBeNull();
  });

  it('omitting the field entirely is also valid', () => {
    expect(validateBusinessIdentity(base).ok).toBe(true);
  });

  it('stores a real domain normalised', () => {
    const result = validateBusinessIdentity({ ...base, sendingDomain: 'https://www.BobsPlumbing.com.au/' });
    expect(result.ok).toBe(true);
    expect(result.value?.sendingDomain).toBe('bobsplumbing.com.au');
  });

  it('rejects a free-mail domain, and says what to do instead', () => {
    // The reply address in `base` IS bigpond — so this is exactly what deriving would have produced,
    // and exactly what an owner copies across when asked for "your address".
    const result = validateBusinessIdentity({ ...base, sendingDomain: 'bigpond.com' });
    expect(result.ok).toBe(false);
    expect(result.errors?.sendingDomain).toMatch(/email provider/i);
    // Crucially it tells him blank is fine, rather than leaving him stuck on a required-looking field.
    expect(result.errors?.sendingDomain).toMatch(/leave it blank/i);
  });

  it('rejects unparseable input without pretending it is a free-mail domain', () => {
    const result = validateBusinessIdentity({ ...base, sendingDomain: 'my plumbing business' });
    expect(result.ok).toBe(false);
    expect(result.errors?.sendingDomain).toMatch(/web address/i);
  });

  it('does not force the sending domain to match the reply address', () => {
    // He sends from his website domain and reads replies in bigpond. That is normal and correct;
    // forcing them to match would exclude most of this ICP.
    const result = validateBusinessIdentity({ ...base, sendingDomain: 'bobsplumbing.com.au' });
    expect(result.ok).toBe(true);
    expect(result.value?.replyEmail).toBe('bob@bigpond.com');
    expect(result.value?.sendingDomain).toBe('bobsplumbing.com.au');
  });
});
