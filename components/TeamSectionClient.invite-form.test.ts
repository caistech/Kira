// components/TeamSectionClient.invite-form.test.ts
//
// Proves that the Settings team invite form includes a Last name field
// and sends it to the /api/members/invite API. The form now has a 2×2
// responsive grid (First + Last on top, Email + Role below) and the
// POST body includes `lastName`.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

const PAGE = stripComments(readFileSync(join(__dirname, 'TeamSectionClient.tsx'), 'utf8'));

describe('Settings invite form includes Last name and sends it', () => {
  it('finds the component at all', () => {
    expect(PAGE.length).toBeGreaterThan(5_000);
    expect(PAGE).toContain('inviteMember');
  });

  it('has a Last name state and input', () => {
    expect(PAGE).toContain('inviteLastName');
    expect(PAGE).toContain('setInviteLastName');
    expect(PAGE).toContain('Last name');
    expect(PAGE).toContain('placeholder="Doe"');
  });

  it('uses a 2×2 responsive grid (sm:grid-cols-2)', () => {
    // The fix changed from sm:grid-cols-3 to sm:grid-cols-2 so First+Last
    // share a row and Email+Role share the next row.
    expect(PAGE).toContain('sm:grid-cols-2');
  });

  it('sends lastName in the invite POST body', () => {
    expect(PAGE).toContain('lastName: inviteLastName');
  });
});