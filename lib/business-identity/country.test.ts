// Non-Australian businesses — the country decides the rules (John Orian, 2026-10-01: a consultant
// in Calgary could not save "ZALEX Systems Corp." because the form demanded an ABN, an Australian
// state and a 4-digit postcode).
import { describe, expect, it } from 'vitest';

import {
  canSend,
  composePostalAddress,
  countryName,
  isAustralia,
  normaliseCountry,
  validateBusinessIdentity,
  type BusinessIdentity,
  type BusinessIdentityInput,
} from './index';

function canadian(overrides: Partial<BusinessIdentityInput> = {}): BusinessIdentityInput {
  return {
    country: 'CA',
    legalName: 'ZALEX Systems Corp.',
    tradingName: 'ZALEX Systems',
    abn: '',
    street: '100 Example Ave SE',
    locality: 'Calgary',
    state: 'Alberta',
    postcode: 'T2C 0A1',
    replyEmail: 'john@playatcreation.com',
    authorised: false,
    ...overrides,
  };
}

function row(overrides: Partial<BusinessIdentity> = {}): BusinessIdentity {
  return {
    user_id: '',
    legal_name: 'ZALEX Systems Corp.',
    abn: '',
    trading_name: null,
    street: '100 Example Ave SE',
    locality: 'Calgary',
    state: 'Alberta',
    postcode: 'T2C 0A1',
    country: 'CA',
    reply_email: 'john@playatcreation.com',
    sign_off_name: null,
    sending_domain: null,
    sending_domain_verified_at: null,
    authorised_at: '',
    synced_to_orchestrator_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('normaliseCountry', () => {
  it('accepts a code in any case, or the country name', () => {
    expect(normaliseCountry('CA')).toBe('CA');
    expect(normaliseCountry('ca')).toBe('CA');
    expect(normaliseCountry('Canada')).toBe('CA');
  });

  it('treats blank as Australia — every row saved before countries existed', () => {
    expect(normaliseCountry('')).toBe('AU');
    expect(normaliseCountry(null)).toBe('AU');
    expect(isAustralia(undefined)).toBe(true);
  });

  it('rejects a country it does not know rather than guessing', () => {
    expect(normaliseCountry('Narnia')).toBeNull();
  });
});

describe('validateBusinessIdentity outside Australia', () => {
  it('saves a Canadian business with no ABN, a province and a Canadian postal code', () => {
    const result = validateBusinessIdentity(canadian());
    expect(result.errors).toEqual({});
    expect(result.ok).toBe(true);
    expect(result.value).toMatchObject({ country: 'CA', abn: '', state: 'Alberta', postcode: 'T2C 0A1' });
  });

  it('ignores anything typed in the ABN box — there is no ABN outside Australia', () => {
    expect(validateBusinessIdentity(canadian({ abn: '123' })).value?.abn).toBe('');
  });

  it('does not ask for authority to send, because Kira does not send outside Australia', () => {
    expect(validateBusinessIdentity(canadian({ authorised: false })).errors.authorised).toBeUndefined();
  });

  it('still requires the address and a plausible postal code', () => {
    const result = validateBusinessIdentity(canadian({ state: '', postcode: '!' }));
    expect(result.ok).toBe(false);
    expect(result.errors.state).toBeDefined();
    expect(result.errors.postcode).toBeDefined();
  });

  it('refuses an unknown country', () => {
    expect(validateBusinessIdentity(canadian({ country: 'Narnia' })).errors.country).toBeDefined();
  });
});

describe('Australia keeps every rule it had', () => {
  it('a blank country is validated as Australian — ABN, AU state and 4-digit postcode required', () => {
    const result = validateBusinessIdentity(canadian({ country: '', authorised: true }));
    expect(result.errors.abn).toBeDefined();
    expect(result.errors.state).toContain('not an Australian state');
    expect(result.errors.postcode).toBe('Enter a 4-digit postcode.');
  });
});

describe('canSend — the jurisdiction guard', () => {
  it('is false for a complete Canadian record: saving is not sending', () => {
    expect(canSend(row())).toBe(false);
  });

  it('is false even if an 11-digit number somehow sits in the ABN column outside Australia', () => {
    expect(canSend(row({ abn: '54672395685' }))).toBe(false);
  });
});

describe('composePostalAddress outside Australia', () => {
  it('keeps the province as typed and names the country', () => {
    expect(composePostalAddress(row())).toBe('100 Example Ave SE, Calgary Alberta T2C 0A1, Canada');
  });

  it('turns a stored code into a name', () => {
    expect(countryName('CA')).toBe('Canada');
    expect(countryName('AU')).toBe('Australia');
  });
});
