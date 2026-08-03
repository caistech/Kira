// lib/admin/exec.test.ts
//
// The exec cohort screen claimed "this view excludes test accounts" while the query had no such
// filter, so the synthetic identities were counted as clients on the screen the operator reads
// numbers off. These pin BOTH directions, and the second set matters more than the first: a
// stranger in the list is visible and annoying, a real client silently missing is neither.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isNonClientAccount } from './exec';

const ORIGINAL = process.env.ADMIN_EMAILS;

describe('isNonClientAccount', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'dennis@corporateaisolutions.com,mcmdennis@gmail.com';
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = ORIGINAL;
  });

  it('excludes the canonical QA identities on our own domains', () => {
    expect(isNonClientAccount('dennis+qauser@factory2key.com.au')).toBe(true);
    expect(isNonClientAccount('dennis+qaadmin@factory2key.com.au')).toBe(true);
    expect(isNonClientAccount('dennis+redteam@factory2key.com.au')).toBe(true);
    expect(isNonClientAccount('anyone+test@corporateaisolutions.com')).toBe(true);
  });

  it('excludes the operator admins from ADMIN_EMAILS', () => {
    expect(isNonClientAccount('dennis@corporateaisolutions.com')).toBe(true);
    expect(isNonClientAccount('mcmdennis@gmail.com')).toBe(true);
    // Case and surrounding whitespace must not be a way back in.
    expect(isNonClientAccount('  MCMDennis@Gmail.com  ')).toBe(true);
  });

  /**
   * THE HALF THAT PROTECTS REVENUE. Excluding a real client is the worse of the two errors, because
   * nothing on screen shows you a row that is not there.
   */
  it('never excludes a real client, however suspicious the address looks', () => {
    expect(isNonClientAccount('ray@nolanbuilding.com.au')).toBe(false);
    // Real people and real businesses use these words.
    expect(isNonClientAccount('test@bigplumbing.com.au')).toBe(false);
    expect(isNonClientAccount('accounts@qaplumbing.com.au')).toBe(false);
    expect(isNonClientAccount('redteam@securityfirm.com.au')).toBe(false);
    // Plus-addressing on somebody ELSE's domain is their business, not our test rig.
    expect(isNonClientAccount('owner+qa@someclient.com.au')).toBe(false);
    // Our domain, but not a QA tag — a genuine person at one of our businesses.
    expect(isNonClientAccount('dennis@factory2key.com.au')).toBe(false);
    expect(isNonClientAccount('dennis+invoices@factory2key.com.au')).toBe(false);
  });

  it('is safe on empty and missing values', () => {
    expect(isNonClientAccount(null)).toBe(false);
    expect(isNonClientAccount(undefined)).toBe(false);
    expect(isNonClientAccount('')).toBe(false);
    expect(isNonClientAccount('not-an-email')).toBe(false);
  });
});
