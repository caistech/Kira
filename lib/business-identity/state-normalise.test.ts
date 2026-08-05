// The state field accepts whatever the address lookup gives it, which is not one thing.
//
// `@caistech/mapbox` returns `short_code.replace('AU-','')` — "WA" — when Mapbox supplies a short
// code, and falls back to the region's plain text — "Western Australia" — when it does not. Both
// come out of the same lookup on the same day, and while the field was a <select> the difference
// was invisible and destructive: the code selected an option, the full name matched nothing, and
// the box silently reverted to "Choose…" with suburb and postcode correct either side of it.
//
// The owner had picked his address, watched two of three boxes fill, and had no reason to look at
// the third again. Then Save did nothing, because the field he could not see was empty.

import { describe, expect, it } from 'vitest';

import { normaliseState, validateBusinessIdentity } from './index';

describe('normaliseState — both shapes the lookup returns', () => {
  it('accepts the short code Mapbox usually gives', () => {
    expect(normaliseState('WA')).toBe('WA');
    expect(normaliseState('NSW')).toBe('NSW');
  });

  it('accepts the full name Mapbox falls back to — the case that used to fail', () => {
    expect(normaliseState('Western Australia')).toBe('WA');
    expect(normaliseState('New South Wales')).toBe('NSW');
    expect(normaliseState('Queensland')).toBe('QLD');
    expect(normaliseState('Australian Capital Territory')).toBe('ACT');
  });

  it('accepts what a person types, in any case, with stray spaces', () => {
    expect(normaliseState('  wa  ')).toBe('WA');
    expect(normaliseState('victoria')).toBe('VIC');
    expect(normaliseState('W.A.')).toBe('WA');
  });

  it('returns null for empty and for things that are not states', () => {
    expect(normaliseState('')).toBeNull();
    expect(normaliseState(null)).toBeNull();
    expect(normaliseState(undefined)).toBeNull();
    expect(normaliseState('Auckland')).toBeNull();
    expect(normaliseState('California')).toBeNull();
  });
});

describe('validateBusinessIdentity — the state field end to end', () => {
  const base = {
    legalName: 'Example Pty Ltd',
    abn: '54672395685',
    street: '76-84 Brunswick Street',
    locality: 'Fortitude Valley',
    postcode: '4006',
    replyEmail: 'owner@example.com',
    authorised: true,
  };

  it('accepts a full state name and stores the CODE', () => {
    const result = validateBusinessIdentity({ ...base, state: 'Western Australia' });
    expect(result.ok).toBe(true);
    // Stored normalised — the footer and the handover document should read "WA", not whatever
    // shape the lookup happened to return that day.
    expect(result.value?.state).toBe('WA');
  });

  it('accepts a short code unchanged', () => {
    expect(validateBusinessIdentity({ ...base, state: 'QLD' }).value?.state).toBe('QLD');
  });

  it('still rejects a missing state, and says "enter" rather than "choose"', () => {
    const result = validateBusinessIdentity({ ...base, state: '' });
    expect(result.ok).toBe(false);
    // It is a typed field now, so the instruction has to match the control.
    expect(result.errors?.state).toMatch(/enter/i);
  });

  it('rejects a non-Australian state with an error naming real options', () => {
    const result = validateBusinessIdentity({ ...base, state: 'California' });
    expect(result.ok).toBe(false);
    expect(result.errors?.state).toMatch(/WA, NSW, VIC/);
  });
});
