import { describe, expect, it } from 'vitest';

import { shouldInviteBaseline } from './baseline-invite';

describe('shouldInviteBaseline', () => {
  // The straight-in signup — no valuation, no agent yet. The entire reason this exists, and the
  // case an "unknown intent, don't ask" simplification would silently drop.
  it('invites a brand-new account with no agents at all', () => {
    expect(shouldInviteBaseline([])).toBe(true);
  });

  it('invites an owner who has a business Kira', () => {
    expect(shouldInviteBaseline([{ journey_type: 'business' }])).toBe(true);
  });

  // Asking a thinking-partner owner what his business turns over is a confident question about
  // something that may not exist.
  it('does NOT invite an owner whose only Kiras are personal', () => {
    expect(shouldInviteBaseline([{ journey_type: 'personal' }])).toBe(false);
    expect(shouldInviteBaseline([{ journey_type: 'personal' }, { journey_type: 'coach' }])).toBe(false);
  });

  it('invites when a business Kira sits alongside personal ones', () => {
    expect(shouldInviteBaseline([{ journey_type: 'personal' }, { journey_type: 'business' }])).toBe(true);
  });

  // journey_type arrives from a Supabase row typed as Record<string, unknown>, so the guard has to
  // survive a null or a missing column rather than assume a string.
  it('treats a missing or null journey as not-business', () => {
    expect(shouldInviteBaseline([{ journey_type: null }])).toBe(false);
    expect(shouldInviteBaseline([{}])).toBe(false);
  });
});
