// lib/beta-tester/password.test.ts
//
// The password is the one secret the beta tester is handed in plaintext. What we assert here is the
// contract that makes that defensible: the right shape, the right alphabet (no confusables), enough
// entropy, and that validation catches the human-error cases before an account exists.

import { describe, expect, it } from 'vitest';

import { generateBetaPassword, validateBetaTesterInput } from './password';

const CONFUSABLES = ['0', 'O', '1', 'I', 'l', 'o'];

describe('generateBetaPassword', () => {
  it('produces the dash-grouped shape', () => {
    const password = generateBetaPassword();
    expect(password).toMatch(/^[A-Za-z2-9]{4}(?:-[A-Za-z2-9]{4}){3}$/);
  });

  it('never contains a confusable character', () => {
    for (let i = 0; i < 200; i++) {
      const password = generateBetaPassword();
      for (const bad of CONFUSABLES) {
        expect(password).not.toContain(bad);
      }
    }
  });

  it('is not deterministic', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      seen.add(generateBetaPassword());
    }
    expect(seen.size).toBe(500);
  });
});

describe('validateBetaTesterInput', () => {
  it('accepts a well-formed entry', () => {
    expect(validateBetaTesterInput({ email: ' jane@example.com ', firstName: 'Jane' })).toBeNull();
  });

  it('rejects a missing or malformed email', () => {
    expect(validateBetaTesterInput({ firstName: 'Jane' })).toMatch(/email/i);
    expect(validateBetaTesterInput({ email: 'not-an-email', firstName: 'Jane' })).toMatch(/email/i);
  });

  it('rejects a missing first name', () => {
    expect(validateBetaTesterInput({ email: 'jane@example.com' })).toMatch(/first name/i);
  });

  it('allows a missing last name (many owners go by first name)', () => {
    expect(
      validateBetaTesterInput({ email: 'jane@example.com', firstName: 'Jane' }),
    ).toBeNull();
  });
});