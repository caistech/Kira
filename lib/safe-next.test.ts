import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('accepts an origin-relative path', () => {
    expect(safeNextPath('/talk')).toBe('/talk');
    expect(safeNextPath('/dashboard')).toBe('/dashboard');
    expect(safeNextPath('/auth/reset-password')).toBe('/auth/reset-password');
  });

  it('trims surrounding whitespace', () => {
    expect(safeNextPath('  /talk  ')).toBe('/talk');
  });

  it('rejects the open-redirect forms', () => {
    expect(safeNextPath('https://evil.com')).toBeNull();
    expect(safeNextPath('http://evil.com/talk')).toBeNull();
    expect(safeNextPath('//evil.com')).toBeNull();
    expect(safeNextPath('///evil.com')).toBeNull();
    expect(safeNextPath('javascript:alert(1)')).toBeNull();
    expect(safeNextPath('data:text/html,hi')).toBeNull();
  });

  it('rejects backslashes and non-root-relative values', () => {
    expect(safeNextPath('\\evil.com')).toBeNull();
    expect(safeNextPath('talk')).toBeNull();
    expect(safeNextPath('talk/')).toBeNull();
    expect(safeNextPath('/evil\\path')).toBeNull();
    expect(safeNextPath('/path:with:colon')).toBeNull();
  });

  it('returns null for missing / empty input (caller falls back to its default)', () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath('')).toBeNull();
    expect(safeNextPath('   ')).toBeNull();
  });
});
