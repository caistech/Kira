import { describe, it, expect } from 'vitest';

import {
  validateBusinessIdentity,
  composePostalAddress,
  normaliseAbn,
  canSend,
  displayName,
  type BusinessIdentity,
  type BusinessIdentityInput,
} from './index';

/** A valid ABN (passes the modulus-89 check) — Global Buildtech Australia's, spaced as printed. */
const VALID_ABN = '54 672 395 685';

function input(overrides: Partial<BusinessIdentityInput> = {}): BusinessIdentityInput {
  return {
    legalName: 'Factory2Key Pty Ltd',
    abn: VALID_ABN,
    street: '76-84 Brunswick Street',
    locality: 'Fortitude Valley',
    state: 'QLD',
    postcode: '4006',
    replyEmail: 'dennis@factory2key.com.au',
    authorised: true,
    ...overrides,
  };
}

function row(overrides: Partial<BusinessIdentity> = {}): BusinessIdentity {
  return {
    user_id: 'u1',
    legal_name: 'Factory2Key Pty Ltd',
    abn: '54672395685',
    trading_name: null,
    street: '76-84 Brunswick Street',
    locality: 'Fortitude Valley',
    state: 'QLD',
    postcode: '4006',
    country: 'Australia',
    reply_email: 'dennis@factory2key.com.au',
    sign_off_name: 'Dennis',
    authorised_at: '2026-07-31T00:00:00.000Z',
    synced_to_orchestrator_at: null,
    created_at: '2026-07-31T00:00:00.000Z',
    updated_at: '2026-07-31T00:00:00.000Z',
    ...overrides,
  };
}

describe('normaliseAbn', () => {
  it('strips spaces and keeps 11 digits', () => {
    expect(normaliseAbn(VALID_ABN)).toBe('54672395685');
  });

  it('rejects the right length with a wrong checksum', () => {
    // The whole reason to consume @caistech/abn-lookup rather than test the length ourselves: a
    // transposed digit is exactly the typo that survives a length check and goes out in the footer.
    expect(normaliseAbn('54 672 395 686')).toBeNull();
  });

  it('rejects a short number and empty input', () => {
    expect(normaliseAbn('5467239568')).toBeNull();
    expect(normaliseAbn('')).toBeNull();
  });

  it('accepts the hyphenated form that appears on plenty of invoices', () => {
    expect(normaliseAbn('54-672-395-685')).toBe('54672395685');
  });
});

describe('composePostalAddress', () => {
  it('reads as one address line a recipient could reply to', () => {
    expect(composePostalAddress(row())).toBe(
      '76-84 Brunswick Street, Fortitude Valley QLD 4006, Australia',
    );
  });

  it('defaults the country rather than emitting a dangling comma', () => {
    expect(
      composePostalAddress({ street: '1 A St', locality: 'Perth', state: 'wa', postcode: '6000' }),
    ).toBe('1 A St, Perth WA 6000, Australia');
  });
});

describe('validateBusinessIdentity', () => {
  it('accepts a complete identity and normalises it', () => {
    const result = validateBusinessIdentity(input());
    expect(result.ok).toBe(true);
    expect(result.value?.abn).toBe('54672395685');
    expect(result.value?.state).toBe('QLD');
    expect(result.value?.tradingName).toBeNull();
  });

  it('upper-cases a lower-case state rather than rejecting it', () => {
    const result = validateBusinessIdentity(input({ state: 'qld' }));
    expect(result.ok).toBe(true);
    expect(result.value?.state).toBe('QLD');
  });

  it('refuses to save without the authority checkbox', () => {
    // Mail goes out under his ABN. The consent is not a formality and cannot default to true.
    const result = validateBusinessIdentity(input({ authorised: false }));
    expect(result.ok).toBe(false);
    expect(result.errors.authorised).toBeTruthy();
  });

  it('distinguishes a missing ABN from a wrong one, because the fix differs', () => {
    expect(validateBusinessIdentity(input({ abn: '' })).errors.abn).toMatch(/search your business name/i);
    expect(validateBusinessIdentity(input({ abn: '12345678901' })).errors.abn).toMatch(/doesn't check out/i);
  });

  it('rejects a non-Australian state — we are cleared for AU email only', () => {
    const result = validateBusinessIdentity(input({ state: 'CA' }));
    expect(result.ok).toBe(false);
    expect(result.errors.state).toBeTruthy();
  });

  it('requires a reply address, and a plausible one', () => {
    expect(validateBusinessIdentity(input({ replyEmail: '' })).errors.replyEmail).toBeTruthy();
    expect(validateBusinessIdentity(input({ replyEmail: 'dennis at f2k' })).errors.replyEmail).toBeTruthy();
  });

  it('reports every bad field at once, not just the first', () => {
    // A form that surfaces one error per submit makes a seven-field form feel like seven forms.
    const result = validateBusinessIdentity(
      input({ legalName: '', abn: '', postcode: 'abcd', replyEmail: '' }),
    );
    expect(Object.keys(result.errors).sort()).toEqual(['abn', 'legalName', 'postcode', 'replyEmail']);
  });

  it('never returns a value when anything failed — partial saves cannot send', () => {
    expect(validateBusinessIdentity(input({ street: '' })).value).toBeUndefined();
  });
});

describe('canSend', () => {
  it('is true only when the sender has everything it checks', () => {
    expect(canSend(row())).toBe(true);
  });

  it('is false for no identity at all', () => {
    expect(canSend(null)).toBe(false);
  });

  it('is false when a row exists but the address is incomplete', () => {
    // "A row exists" is the easier question and the wrong one: the connector refuses a tenant that
    // is missing any part of the address, so answering the easy one shows a green tick over a
    // sender that will refuse every send.
    expect(canSend(row({ locality: '' }))).toBe(false);
    expect(canSend(row({ postcode: '' }))).toBe(false);
  });

  it('is false when the ABN is not 11 digits', () => {
    expect(canSend(row({ abn: '5467239568' }))).toBe(false);
  });

  it('does not depend on the sync stamp — that is a different question', () => {
    expect(canSend(row({ synced_to_orchestrator_at: '2026-07-31T01:00:00Z' }))).toBe(true);
  });
});

describe('displayName', () => {
  it('prefers the trading name customers know', () => {
    expect(displayName(row({ trading_name: 'Factory2Key' }))).toBe('Factory2Key');
  });

  it('falls back to the registered entity', () => {
    expect(displayName(row())).toBe('Factory2Key Pty Ltd');
  });

  it('ignores a blank trading name rather than rendering an empty sender', () => {
    expect(displayName(row({ trading_name: '   ' }))).toBe('Factory2Key Pty Ltd');
  });
});
