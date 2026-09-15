// lib/beta-tester/password.ts
//
// Password generation for direct beta-tester invites.
//
// WHY THIS SHAPE. A beta tester receives their password in email — plaintext, by design (Dennis
// approved: beta program, low-risk, the alternative adds a step to a path we are trying to SHORTEN).
// Two things follow:
//
//  1. Strong but TYPABLE. No 0/O, 1/l/I, o/0 confusables, and no symbols that are fiddly on a phone.
//     The owner might type this on a mobile keyboard; "Lhz9-q7pX-Nw3b" should be possible to get
//     right the first time. Neither is it a dictionary word — entropy is real (groups × pool).
//  2. Single source of truth. The generation lives here (pure, testable) so the admin action never
//     hand-rolls a weaker variant inline.

import { randomBytes } from 'node:crypto';

// Unambiguous alphabet: no confusables, mixed case + digits. 53 symbols ≈ 5.73 bits each.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// 4 groups of 4, dash-separated. 16 symbols ≈ 92 bits of entropy — plenty for an account
// credential, and short enough to read back to someone over the phone.
const GROUPS = 4;
const GROUP_LENGTH = 4;

/**
 * Generate a beta-tester password: `${GROUP_LENGTH}×${GROUPS}` unambiguous alphanumerics,
 * dash-separated. Pure and deterministic-free — entropy comes from node:crypto randomBytes.
 */
export function generateBetaPassword(): string {
  const bytes = randomBytes(GROUPS * GROUP_LENGTH);

  const parts: string[] = [];
  for (let group = 0; group < GROUPS; group++) {
    let segment = '';
    for (let i = 0; i < GROUP_LENGTH; i++) {
      segment += ALPHABET[bytes[group * GROUP_LENGTH + i] % ALPHABET.length];
    }
    parts.push(segment);
  }
  return parts.join('-');
}

/** Validation for the invite form fields. Returns an error message or null. */
export function validateBetaTesterInput(input: {
  email?: string;
  firstName?: string;
  lastName?: string;
}): string | null {
  const email = (input.email ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  const firstName = (input.firstName ?? '').trim();
  if (!firstName) {
    return 'Enter the tester\u2019s first name — it goes into the welcome email and the profile.';
  }
  return null;
}