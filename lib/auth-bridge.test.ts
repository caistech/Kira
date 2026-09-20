// The auth bridge: `users.auth_user_id` joins the credential to everything else the product owns.
//
// When it is NULL the account signs in perfectly and then behaves as though it does not exist —
// and the symptom is deceptive rather than obvious. Live on BOTH operator accounts on 2026-08-05:
// the dashboard rendered normally (it tolerates a null user) while /genome said "We could not find
// your account record." Same session, same second, two different answers to whether the account
// exists.
//
// getCurrentAppUser now resolves through the canonical Auth → auth_credentials → persons chain.

import { describe, expect, it, vi } from 'vitest';

/**
 * Table-aware mock for the canonical two-table chain:
 *   auth_credentials (credential lookup)
 *   persons          (person resolution)
 */
function makeSupabase(
  {
    credential,
    person,
  }: {
    credential?: { person_id: string | null };
    person?: { person_id: string; first_name?: string | null; last_name?: string | null; email?: string | null };
  },
) {
  const updates: Array<{ values: Record<string, unknown>; guardedNull: boolean }> = [];

  const from = vi.fn((table: string) => {
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
      limit: () => chain,
      is: () => {
        state.isNull = true;
        if (state.isUpdate) updates.push({ values: state.values, guardedNull: true });
        return state.isUpdate ? Promise.resolve({ error: null }) : chain;
      },
      maybeSingle: () => {
        if (table === 'auth_credentials') {
          const data = credential
            ? {
                auth_credential_id: 'cred-1',
                person_id: credential.person_id,
                status: 'active',
                selected_org_id: null,
              }
            : null;
          return Promise.resolve({ data, error: null });
        }
        if (table === 'persons') {
          return Promise.resolve({ data: person ?? null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
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

const PERSON_ROW = { person_id: 'P1', first_name: 'Owner', last_name: null, email: 'owner@example.com' };

describe('getCurrentAppUser — the bridged path is unchanged', () => {
  it('returns the canonical Person through auth_credentials → persons', async () => {
    const { client, updates } = makeSupabase({ credential: { person_id: 'P1' }, person: PERSON_ROW });
    const { getCurrentAppUser } = await load(CONFIRMED, client);
    expect(await getCurrentAppUser()).toMatchObject({ person_id: 'P1', first_name: 'Owner' });
    expect(updates).toHaveLength(0);
  });

  it('returns null with no session', async () => {
    const { client } = makeSupabase({});
    const { getCurrentAppUser } = await load(null, client);
    expect(await getCurrentAppUser()).toBeNull();
  });
});

describe('getCurrentAppUser — failure modes', () => {
  it('returns null when no credential row exists', async () => {
    const { client } = makeSupabase({});
    const { getCurrentAppUser } = await load(CONFIRMED, client);
    expect(await getCurrentAppUser()).toBeNull();
  });

  it('returns null when the credential has no person_id', async () => {
    const { client } = makeSupabase({ credential: { person_id: null } });
    const { getCurrentAppUser } = await load(CONFIRMED, client);
    expect(await getCurrentAppUser()).toBeNull();
  });

  it('returns null when the credential is missing entirely', async () => {
    const { client } = makeSupabase({ credential: undefined });
    const { getCurrentAppUser } = await load(CONFIRMED, client);
    expect(await getCurrentAppUser()).toBeNull();
  });

  it('returns null when the credential references a missing Person', async () => {
    const { client } = makeSupabase({ credential: { person_id: 'P2' }, person: undefined });
    const { getCurrentAppUser } = await load(CONFIRMED, client);
    // getCurrentAppUser catches the PERSON_NOT_FOUND throw and returns null.
    expect(await getCurrentAppUser()).toBeNull();
  });
});
