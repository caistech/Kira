// Portal / persona selection authority.
//
// The selector must only ever offer a portal the person is ALREADY authorised
// to enter — the list is derived from the same gates each portal route uses, not
// from client-supplied state. These tests pin that contract:
//
//   user            → active organisation membership (UserShell's own gate)
//   org-admin       → superadmin membership in the org (ManageShell's gate)
//   corporate-admin → ADMIN_EMAILS operator allowlist (admin layout's gate)
//
// Organisation count is deliberately irrelevant: a single-org person with
// multiple roles is the exact case this feature exists for.

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
  getCurrentOrganisationContext: vi.fn(),
  getSuperadminContext: vi.fn(),
  isCurrentUserAdmin: vi.fn(),
}));

import {
  getAuthUser,
  getCurrentOrganisationContext,
  getSuperadminContext,
  isCurrentUserAdmin,
} from '@/lib/auth';
import {
  PORTAL_OPTIONS,
  getAuthorisedPortals,
  portalForPathname,
  type PortalId,
} from '@/lib/portal';

const authUser = vi.mocked(getAuthUser);
const orgContext = vi.mocked(getCurrentOrganisationContext);
const superadminContext = vi.mocked(getSuperadminContext);
const isOperator = vi.mocked(isCurrentUserAdmin);

const ANY_AUTH_USER = { id: 'auth-user-1' } as Awaited<ReturnType<typeof getAuthUser>>;
const ANY_ORG = { personId: 'person-1' } as Awaited<ReturnType<typeof getCurrentOrganisationContext>>;

beforeEach(() => {
  vi.clearAllMocks();
  authUser.mockResolvedValue(ANY_AUTH_USER);
});

describe('getAuthorisedPortals', () => {
  it('returns no portals when unauthenticated', async () => {
    authUser.mockResolvedValue(null);
    await expect(getAuthorisedPortals()).resolves.toEqual([]);
  });

  it('single-organisation, single-role user → only the user portal', async () => {
    orgContext.mockResolvedValue(ANY_ORG);
    superadminContext.mockResolvedValue(null);
    isOperator.mockResolvedValue(false);

    const portals = await getAuthorisedPortals();
    expect(portals.map((portal) => portal.id)).toEqual(['user']);
  });

  it('multi-organisation user with no extra roles → still only the user portal', async () => {
    orgContext.mockResolvedValue(ANY_ORG);
    superadminContext.mockResolvedValue(null);
    isOperator.mockResolvedValue(false);

    const portals = await getAuthorisedPortals();
    expect(portals.map((portal) => portal.id)).toEqual(['user']);
  });

  it('user + operator → user and corporate-admin portals (org count irrelevant)', async () => {
    orgContext.mockResolvedValue(ANY_ORG);
    superadminContext.mockResolvedValue(null);
    isOperator.mockResolvedValue(true);

    const ids = (await getAuthorisedPortals()).map((portal) => portal.id);
    expect(ids).toContain('user');
    expect(ids).toContain('corporate-admin');
    expect(ids).not.toContain('org-admin');
  });

  it('user + superadmin → user and org-admin portals', async () => {
    orgContext.mockResolvedValue(ANY_ORG);
    superadminContext.mockResolvedValue(ANY_ORG);
    isOperator.mockResolvedValue(false);

    const ids = (await getAuthorisedPortals()).map((portal) => portal.id);
    expect(ids).toContain('user');
    expect(ids).toContain('org-admin');
    expect(ids).not.toContain('corporate-admin');
  });

  it('all three authorities → all three portals', async () => {
    orgContext.mockResolvedValue(ANY_ORG);
    superadminContext.mockResolvedValue(ANY_ORG);
    isOperator.mockResolvedValue(true);

    const portals = await getAuthorisedPortals();
    expect(portals.map((portal) => portal.id).sort()).toEqual([
      'corporate-admin',
      'org-admin',
      'user',
    ]);
  });

  it('never fabricates a portal from a missing authority', async () => {
    // No membership, no superadmin function, not an operator.
    orgContext.mockResolvedValue(null);
    superadminContext.mockResolvedValue(null);
    isOperator.mockResolvedValue(false);

    await expect(getAuthorisedPortals()).resolves.toEqual([]);
  });
});

describe('PORTAL_OPTIONS', () => {
  it('maps each portal to a real existing route', () => {
    const hrefs = Object.values(PORTAL_OPTIONS).map((option) => option.href);
    expect(hrefs).toContain('/dashboard'); // User / CEO → user portal
    expect(hrefs).toContain('/manage'); // Organisation Admin → org management shell
    expect(hrefs).toContain('/admin'); // Kira Corporate Admin → operator console
  });
});

describe('portalForPathname', () => {
  const cases: Array<[string, PortalId]> = [
    ['/dashboard', 'user'],
    ['/my-genome', 'user'],
    ['/dialog', 'user'],
    ['/admin', 'corporate-admin'],
    ['/admin/loi', 'corporate-admin'],
    ['/manage', 'org-admin'],
    ['/manage/members', 'org-admin'],
  ];
  it.each(cases)('%s → %s', (pathname, expected) => {
    expect(portalForPathname(pathname)).toBe(expected);
  });
});