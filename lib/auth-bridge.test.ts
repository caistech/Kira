// The auth bridge: `users.auth_user_id` joins the credential to everything else the product owns.
//
// When it is NULL the account signs in perfectly and then behaves as though it does not exist —
// and the symptom is deceptive rather than obvious. Live on BOTH operator accounts on 2026-08-05:
// the dashboard rendered normally (it tolerates a null user) while /genome said "We could not find
// your account record." Same session, same second, two different answers to whether the account
// exists.
//
// getCurrentAppUser now self-heals by adopting an orphan row that matches the confirmed email. The
// tests that matter are the two guards, because without them the fallback IS account takeover:
// an unconfirmed signup on someone else's address would be handed their Genome.

import { describe, expect, it, vi } from 'vitest';

/**
 * Minimal stand-in for the service client, shaped to the exact call chains in getCurrentAppUser.
 * Records the update it was asked to make so the test can assert the write, not just the return.
 */
function makeSupabase({ bridged, orphan }: { bridged?: unknown; orphan?: unknown }) {
  const updates: Array<{ values: Record<string, unknown>; guardedNull: boolean }> = [];

  const from = vi.fn(() => {
    const state = { isNull: false, values: {} as Record<string, unknown>, isUpdate: false };
    const chain: Record<string, unknown> = {
      select: () => chain,
      update: (values: Record<string, unknown>) => {
        state.isUpdate = true;
        state.values = values;
        return chain;
      },
      eq: () => chain,
      ilike: () => chain,
      is: () => {
        state.isNull = true;
        if (state.isUpdate) updates.push({ values: state.values, guardedNull: true });
        return state.isUpdate ? Promise.resolve({ error: null }) : chain;
      },
      maybeSingle: () =>
        Promise.resolve({ data: state.isNull ? (orphan ?? null) : (bridged ?? null), error: null }),
    };
    return chain;
  });

  return { client: { from }, updates };
}

async function load(authUser: Record<string, unknown> | null, supa: { from: unknown }) {
  vi.resetModules();
  vi.doMock('@/lib/supabase/server', () => ({ createServiceClientV2: () => supa }));
  vi.doMock('@/lib/supabase/server-session', () => ({
    createSessionClientV2: async () => ({ auth: { getUser: async () => ({ data: { user: authUser } }) } }),
  }));
  const mod = await import('./auth');
  return mod;
}

const CONFIRMED = {
  id: 'auth-1',
  email: 'owner@example.com',
  email_confirmed_at: '2026-08-01T00:00:00Z',
};

describe('getCurrentAppUser — the bridged path is unchanged', () => {
  it('returns the row joined on auth_user_id without touching the fallback', async () => {
    const { client, updates } = makeSupabase({ bridged: { id: 'app-1', auth_user_id: 'auth-1' } });
    const { getCurrentAppUser } = await load(CONFIRMED, client);
    expect(await getCurrentAppUser()).toMatchObject({ id: 'app-1' });
    expect(updates).toHaveLength(0); // nothing to heal — no write at all
  });

  it('returns null with no session', async () => {
    const { client } = makeSupabase({});
    const { getCurrentAppUser } = await load(null, client);
    expect(await getCurrentAppUser()).toBeNull();
  });
});

describe('getCurrentAppUser — self-heal', () => {
  it('adopts an orphan row matching a CONFIRMED email and persists the bridge', async () => {
    // The live defect: confirmed auth user, app row with auth_user_id NULL, everything downstream
    // reporting the account does not exist.
    const { client, updates } = makeSupabase({ orphan: { id: 'app-2', email: 'owner@example.com', auth_user_id: null } });
    const { getCurrentAppUser } = await load(CONFIRMED, client);

    const user = await getCurrentAppUser();
    expect(user).toMatchObject({ id: 'app-2', auth_user_id: 'auth-1' });
    expect(updates).toHaveLength(1);
    expect(updates[0].values).toEqual({ auth_user_id: 'auth-1' });
    // The write re-checks NULL, so a concurrent request cannot be overwritten.
    expect(updates[0].guardedNull).toBe(true);
  });
});

describe('getCurrentAppUser — the guards, which are the security of the fallback', () => {
  it('GUARD 1: an UNCONFIRMED email adopts nothing', async () => {
    // Anyone can sign up with any address. Confirmation is what proves control — without this the
    // fallback hands the victim's Genome to whoever typed their address into the signup form.
    const { client, updates } = makeSupabase({ orphan: { id: 'app-2', email: 'owner@example.com', auth_user_id: null } });
    const { getCurrentAppUser } = await load({ ...CONFIRMED, email_confirmed_at: null }, client);

    expect(await getCurrentAppUser()).toBeNull();
    expect(updates).toHaveLength(0);
  });

  it('GUARD 1: no email on the auth user adopts nothing', async () => {
    const { client, updates } = makeSupabase({ orphan: { id: 'app-2', auth_user_id: null } });
    const { getCurrentAppUser } = await load({ ...CONFIRMED, email: null }, client);

    expect(await getCurrentAppUser()).toBeNull();
    expect(updates).toHaveLength(0);
  });

  it('GUARD 2: an already-bridged row is never re-pointed', async () => {
    // The orphan query filters `.is('auth_user_id', null)`, so a row belonging to another identity
    // is not a candidate. Two auth identities can share an address over time (delete, re-signup),
    // and quietly moving the second onto the first one's data is the same breach by a slower route.
    const { client, updates } = makeSupabase({ orphan: null });
    const { getCurrentAppUser } = await load(CONFIRMED, client);

    expect(await getCurrentAppUser()).toBeNull();
    expect(updates).toHaveLength(0);
  });
});
