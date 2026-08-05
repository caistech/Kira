// The ABN gate, and the shape of the function behind it.
//
// `validateAbn` from @caistech/abn-lookup RETURNS AN ERROR MESSAGE, OR null WHEN VALID. It reads
// like a predicate and is not one, and Kira used it as one:
//
//     if (v.abn && !validateAbn(v.abn)) reject
//
//     validateAbn('54672395685') -> null                  -> !null  === true  -> REJECTED
//     validateAbn('99999999999') -> 'Invalid ABN checksum' -> !'...' === false -> ACCEPTED
//
// Perfectly inverted. Every real business was refused and every fake one waved through — by a guard
// added specifically to stop a fake one, which is still sitting in the table it was written to keep
// out. It blocked 100% of new-owner setups: nobody with a genuine ABN could finish the form.
//
// Neither half is loud. A real owner is told his own ABN is wrong and concludes our form is broken
// rather than filing a bug; a fake one saves silently and surfaces later on a handover document, or
// as the identification half of a Spam Act footer, where an invalid ABN is worse than a missing one
// because it looks discharged.
//
// So this file pins the CONTRACT of the third-party function, not just Kira's behaviour. If a future
// version returns a boolean, these fail loudly instead of silently re-inverting the gate.

import { describe, expect, it } from 'vitest';
import { validateAbn } from '@caistech/abn-lookup';

import { normaliseAbn } from './index';

const REAL = {
  'Global Buildtech Australia': '54672395685',
  Factory2Key: '51700805298',
};
const FAKE = {
  'right shape, bad checksum': '99999999999',
  'too short': '5467239568',
  'not digits': 'abcdefghijk',
};

describe('validateAbn returns an ERROR MESSAGE, not a boolean', () => {
  it.each(Object.entries(REAL))('%s (%s) returns null — meaning valid', (_name, abn) => {
    expect(validateAbn(abn)).toBeNull();
  });

  it.each(Object.entries(FAKE))('%s (%s) returns a non-empty string', (_name, abn) => {
    const result = validateAbn(abn);
    expect(typeof result).toBe('string');
    expect(result).toBeTruthy();
  });

  it('is never a boolean — the assumption that caused the inversion', () => {
    // If this ever fails, the package changed its contract and app/setup/business/actions.ts must be
    // re-read before anything else is believed about the gate.
    for (const abn of [...Object.values(REAL), ...Object.values(FAKE)]) {
      expect(typeof validateAbn(abn)).not.toBe('boolean');
    }
  });
});

describe('the gate as the action applies it', () => {
  /** Exactly the expression in app/setup/business/actions.ts, post-fix. */
  const rejected = (raw: string) => {
    const abn = normaliseAbn(raw) || '';
    return Boolean(abn ? validateAbn(abn) : null);
  };

  it.each(Object.entries(REAL))('accepts %s', (_name, abn) => {
    expect(rejected(abn)).toBe(false);
  });

  it('accepts a real ABN typed with spaces, as the register formats it', () => {
    expect(rejected('54 672 395 685')).toBe(false);
  });

  it.each(Object.entries(FAKE))('%s never reaches this gate — normaliseAbn stops it first', (_name, abn) => {
    // WHERE THE REAL CHECK LIVES. normaliseAbn does `validateAbn(digits) === null`, which is the
    // CORRECT reading of the contract, so a bad checksum is already null by the time the action
    // runs and validateBusinessIdentity has already produced "That ABN doesn't check out".
    //
    // Which means the inverted expression in the action was not a hole — it was pure harm. It could
    // never admit a bad ABN, because it never saw one. All it did was refuse every good one.
    expect(normaliseAbn(abn)).toBeNull();
    expect(rejected(abn)).toBe(false); // vacuous here: there is no abn left to test
  });

  it('the OLD inverted expression rejected every REAL ABN — the whole defect', () => {
    const oldGate = (raw: string) => {
      const abn = normaliseAbn(raw) || '';
      return Boolean(abn && !validateAbn(abn));
    };
    for (const abn of Object.values(REAL)) {
      expect(oldGate(abn)).toBe(true); // rejected, wrongly — nobody could complete setup
    }
  });
});
