// app/api/members/invite/route.test.ts
//
// Focused unit tests for the canonical invitation wiring in
// app/api/members/invite/route.ts.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const authScope = vi.hoisted(() => ({
  organisationId: 'org-inviter-0000-0000-0000-000000000001',
  calls: { deleteUser: [] as string[] },
}));

const supabaseScope = vi.hoisted(() => ({
  // Used by the mock client to simulate the database state per test.
  credentials: [] as Array<{ person_id: string; auth_user_id: string }>,
  persons: [] as Array<{ person_id: string; email: string }>,
  memberships: [] as Array<{
    organisation_id: string;
    person_id: string;
    role: string;
  }>,
  createUserResult: { data: { user: { id: 'unset' } }, error: null } as
    | { data: { user: { id: string } }; error: null }
    | { data: null; error: { message: string } },
  authUsers: [] as Array<{ id: string; email: string }>,
  insertPersonsError: null as string | null,
  upsertCredentialsError: null as string | null,
  upsertMembershipsError: null as string | null,
}));

vi.mock('@/lib/auth', () => ({
  getCurrentOrganisationContext: vi.fn().mockResolvedValue({
    organisationId: authScope.organisationId,
    role: 'admin',
    canSpend: true,
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientV2: vi.fn().mockImplementation(() => {
    const current: Record<string, unknown> = {};

    function makeChain(table: string) {
      const chain: Record<string, unknown> = {
        select: (_cols?: string) => chain,
        eq: (col: string, val: unknown) => {
          current[col] = val;
          return chain;
        },
        ilike: (col: string, val: unknown) => {
          current[col] = val;
          return chain;
        },
        limit: (_n: number) => chain,
        maybeSingle: async () => {
          if (table === 'auth_credentials') {
            const match = supabaseScope.credentials.find(
              (c) => c.auth_user_id === current.auth_user_id,
            );
            return { data: match ? { person_id: match.person_id } : null, error: null };
          }
          if (table === 'persons') {
            const match = supabaseScope.persons.find(
              (p) => p.email === current.email,
            );
            return { data: match ? { person_id: match.person_id } : null, error: null };
          }
          return { data: null, error: null };
        },
        insert: async (values: Record<string, unknown>) => {
          if (table === 'persons' && supabaseScope.insertPersonsError) {
            const err = new Error(supabaseScope.insertPersonsError);
            if (supabaseScope.insertPersonsError.includes('23505') || /duplicate/i.test(supabaseScope.insertPersonsError)) {
              (err as any).code = '23505';
            }
            return { error: err };
          }
          if (table === 'persons') {
            supabaseScope.persons.push({
              person_id: String(values.person_id),
              email: String(values.email ?? ''),
            });
          }
          return { error: null };
        },
        upsert: async (values: Record<string, unknown>) => {
          if (table === 'auth_credentials' && supabaseScope.upsertCredentialsError) {
            return { error: new Error(supabaseScope.upsertCredentialsError) };
          }
          if (table === 'organisation_memberships' && supabaseScope.upsertMembershipsError) {
            return { error: new Error(supabaseScope.upsertMembershipsError) };
          }
          if (table === 'auth_credentials') {
            supabaseScope.credentials = supabaseScope.credentials.filter(
              (c) => c.auth_user_id !== values.auth_user_id,
            );
            supabaseScope.credentials.push({
              person_id: String(values.person_id),
              auth_user_id: String(values.auth_user_id),
            });
          }
          if (table === 'organisation_memberships') {
            supabaseScope.memberships = supabaseScope.memberships.filter(
              (m) =>
                !(
                  m.organisation_id === values.organisation_id &&
                  m.person_id === values.person_id &&
                  m.role === values.role
                ),
            );
            supabaseScope.memberships.push({
              organisation_id: String(values.organisation_id),
              person_id: String(values.person_id),
              role: String(values.role),
            });
          }
          return { error: null };
        },
      };
      return chain;
    }

    return {
      from: vi.fn((table: string) => makeChain(table)),
      auth: {
        admin: {
          createUser: vi.fn(async () => supabaseScope.createUserResult),
          listUsers: vi.fn(async () => ({
            data: { users: supabaseScope.authUsers },
            error: null,
          })),
          deleteUser: vi.fn(async (id: string) => {
            authScope.calls.deleteUser.push(id);
            return { error: null };
          }),
        },
      },
    };
  }),
}));

vi.mock('@/lib/terms', () => ({ TERMS_VERSION: '2025-01-01' }));

import { POST } from './route';

const INVITER_ORG = authScope.organisationId;

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/members/invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function tidy(resetId: number): void {
  supabaseScope.credentials = [];
  supabaseScope.persons = [];
  supabaseScope.memberships = [];
  supabaseScope.authUsers = [];
  supabaseScope.insertPersonsError = null;
  supabaseScope.upsertCredentialsError = null;
  supabaseScope.upsertMembershipsError = null;
  supabaseScope.createUserResult = {
    data: { user: { id: `new-auth-${resetId}` } },
    error: null,
  };
  authScope.calls.deleteUser = [];
}

beforeEach(() => tidy(1));

describe('POST /api/members/invite canonical wiring', () => {
  it('new Auth user + new Person: creates one credential and one membership in authCtx org', async () => {
    tidy(2);
    supabaseScope.createUserResult = { data: { user: { id: 'auth-new-person'  } }, error: null };

    const res = await POST(makeRequest({ email: 'new@example.com', firstName: 'New' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.tempPassword).toBeTruthy();
    expect(supabaseScope.persons).toHaveLength(1);
    expect(supabaseScope.persons[0].email).toBe('new@example.com');
    expect(supabaseScope.credentials).toHaveLength(1);
    expect(supabaseScope.credentials[0].auth_user_id).toBe('auth-new-person');
    expect(supabaseScope.credentials[0].person_id).toBe(supabaseScope.persons[0].person_id);
    expect(supabaseScope.memberships).toHaveLength(1);
    expect(supabaseScope.memberships[0].organisation_id).toBe(INVITER_ORG);
    expect(supabaseScope.memberships[0].person_id).toBe(supabaseScope.persons[0].person_id);
    expect(supabaseScope.memberships[0].role).toBe('member');
    expect(authScope.calls.deleteUser).toHaveLength(0);
  });

  it('new Auth user + existing Person: reuses the Person, single credential, single membership', async () => {
    tidy(3);
    supabaseScope.persons.push({
      person_id: 'person-existing-0000-0000-000000000003',
      email: 'existing@example.com',
    });
    supabaseScope.createUserResult = { data: { user: { id: 'auth-new-for-existing-person'  } }, error: null };

    const res = await POST(
      makeRequest({ email: 'existing@example.com', firstName: 'Existing' }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(supabaseScope.persons).toHaveLength(1);
    expect(supabaseScope.credentials).toHaveLength(1);
    expect(supabaseScope.credentials[0].person_id).toBe('person-existing-0000-0000-000000000003');
    expect(supabaseScope.memberships).toHaveLength(1);
    expect(supabaseScope.memberships[0].person_id).toBe('person-existing-0000-0000-000000000003');
    expect(supabaseScope.memberships[0].organisation_id).toBe(INVITER_ORG);
  });

  it('existing Auth user + new Person: reuses the Auth user, creates one Person/credential/membership', async () => {
    tidy(4);
    supabaseScope.createUserResult = {
      data: null,
      error: { message: 'User already registered: existing-auth@example.com' },
    };
    supabaseScope.authUsers = [{ id: 'auth-existing', email: 'existing-auth@example.com' }];

    const res = await POST(
      makeRequest({ email: 'EXISTING-AUTH@example.com', firstName: 'Auth' }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.existing).toBe(true);
    expect(json.tempPassword).toBeUndefined();
    expect(supabaseScope.persons).toHaveLength(1);
    expect(supabaseScope.credentials).toHaveLength(1);
    expect(supabaseScope.credentials[0].auth_user_id).toBe('auth-existing');
    expect(supabaseScope.memberships).toHaveLength(1);
    expect(supabaseScope.memberships[0].organisation_id).toBe(INVITER_ORG);
    expect(authScope.calls.deleteUser).toHaveLength(0);
  });

  it('existing Auth user + missing credential + existing Person: wires both without deleting the Auth user', async () => {
    tidy(5);
    supabaseScope.persons.push({
      person_id: 'person-linked',
      email: 'linked@example.com',
    });
    supabaseScope.createUserResult = {
      data: null,
      error: { message: 'User already registered: linked@example.com' },
    };
    supabaseScope.authUsers = [{ id: 'auth-linked', email: 'linked@example.com' }];

    const res = await POST(makeRequest({ email: 'linked@example.com', firstName: 'Linked' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.existing).toBe(true);
    expect(supabaseScope.credentials).toHaveLength(1);
    expect(supabaseScope.credentials[0].person_id).toBe('person-linked');
    expect(supabaseScope.memberships).toHaveLength(1);
    expect(supabaseScope.memberships[0].person_id).toBe('person-linked');
    expect(authScope.calls.deleteUser).toHaveLength(0);
  });

  it('existing Auth user + existing Person: reuses both, upserts membership to authCtx org', async () => {
    tidy(6);
    supabaseScope.persons.push({ person_id: 'person-6', email: 'six@example.com' });
    supabaseScope.credentials.push({ person_id: 'person-6', auth_user_id: 'auth-6' });
    supabaseScope.createUserResult = {
      data: null,
      error: { message: 'User already registered: six@example.com' },
    };
    supabaseScope.authUsers = [{ id: 'auth-6', email: 'six@example.com' }];

    const res = await POST(makeRequest({ email: 'six@example.com', firstName: 'Six' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.existing).toBe(true);
    expect(supabaseScope.credentials).toHaveLength(1);
    expect(supabaseScope.credentials[0].person_id).toBe('person-6');
    expect(supabaseScope.memberships).toHaveLength(1);
    expect(supabaseScope.memberships[0].person_id).toBe('person-6');
    expect(supabaseScope.memberships[0].organisation_id).toBe(INVITER_ORG);
    expect(authScope.calls.deleteUser).toHaveLength(0);
  });

  it('concurrent invites converge on one Person/credential/membership (re-read winner on UNIQUE(email) race)', async () => {
    tidy(7);
    // First request wins the Person insert. Second request sees no Person, its
    // insert hits a 23505 duplicate — the route must re-read and adopt winner.
    supabaseScope.persons.push({
      person_id: 'person-winner',
      email: 'race@example.com',
    });
    supabaseScope.insertPersonsError = 'duplicate key value violates unique constraint persons_email_key';
    supabaseScope.createUserResult = { data: { user: { id: 'auth-race-2'  } }, error: null };

    const res = await POST(makeRequest({ email: 'race@example.com', firstName: 'Race' }));
    await res.json();

    expect(res.status).toBe(200);
    expect(supabaseScope.persons.filter((p) => p.email === 'race@example.com')).toHaveLength(1);
    expect(supabaseScope.credentials).toHaveLength(1);
    expect(supabaseScope.credentials[0].person_id).toBe('person-winner');
    expect(supabaseScope.memberships).toHaveLength(1);
    expect(supabaseScope.memberships[0].person_id).toBe('person-winner');
    expect(supabaseScope.memberships[0].organisation_id).toBe(INVITER_ORG);
  });

  it('failure after new Auth creation cleans up ONLY the newly created Auth user', async () => {
    tidy(8);
    supabaseScope.createUserResult = { data: { user: { id: 'auth-new-fail'  } }, error: null };
    supabaseScope.insertPersonsError = 'connection reset';

    const res = await POST(makeRequest({ email: 'fail@example.com', firstName: 'Fail' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Could not complete invite.');
    expect(authScope.calls.deleteUser).toEqual(['auth-new-fail']);
  });

  it('failure involving an existing Auth user does NOT delete that user', async () => {
    tidy(9);
    supabaseScope.createUserResult = {
      data: null,
      error: { message: 'User already registered: keep@example.com' },
    };
    supabaseScope.authUsers = [{ id: 'auth-keep', email: 'keep@example.com' }];
    supabaseScope.upsertMembershipsError = 'constraint violated';

    const res = await POST(makeRequest({ email: 'keep@example.com', firstName: 'Keep' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Could not complete invite.');
    expect(authScope.calls.deleteUser).toHaveLength(0);
  });

  it('membership is always written to authCtx.organisationId, never to a client-supplied value', async () => {
    tidy(10);
    supabaseScope.createUserResult = { data: { user: { id: 'auth-org-check'  } }, error: null };

    const res = await POST(
      makeRequest({
        email: 'org@example.com',
        firstName: 'Org',
        organisationId: 'org-attacker-controlled',
      }),
    );
    await res.json();

    expect(res.status).toBe(200);
    expect(supabaseScope.memberships).toHaveLength(1);
    expect(supabaseScope.memberships[0].organisation_id).toBe(INVITER_ORG);
    expect(supabaseScope.memberships[0].organisation_id).not.toBe('org-attacker-controlled');
  });

  it('rejects owner as an invitation role', async () => {
    tidy(11);
    supabaseScope.createUserResult = { data: { user: { id: 'auth-owner-reject'  } }, error: null };

    const res = await POST(
      makeRequest({ email: 'owner@example.com', firstName: 'Owner', role: 'owner' }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid role.');
    expect(supabaseScope.credentials).toHaveLength(0);
    expect(supabaseScope.memberships).toHaveLength(0);
  });

  it('fails cleanly before creating anything when the invitee email is invalid', async () => {
    tidy(12);

    const res = await POST(makeRequest({ email: 'not-an-email', firstName: 'Bad' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Please enter a valid email address.');
    expect(supabaseScope.createUserResult).toBeTruthy();
    expect(supabaseScope.credentials).toHaveLength(0);
    expect(supabaseScope.memberships).toHaveLength(0);
  });
});