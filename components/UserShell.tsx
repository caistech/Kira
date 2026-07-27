// components/UserShell.tsx
// Server wrapper: resolves the current app user and renders the user portal chrome.
// Used by the user-facing authenticated layouts (/dashboard, /settings).

import { redirect } from 'next/navigation';
import { getAuthUser, getCurrentAppUser } from '@/lib/auth';
import { PortalShell, type NavItem } from '@/components/PortalShell';
import { TalkFab } from '@/components/TalkFab';
import { ClaimStoredValuation } from '@/components/ClaimStoredValuation';

const USER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'My Kiras' },
  { href: '/knowledge', label: 'Knowledge' },
  { href: '/start', label: 'New Kira' },
];

export async function UserShell({ children }: { children: React.ReactNode }) {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');
  await getCurrentAppUser(); // ensures the bridged users row is resolvable

  return (
    <PortalShell title="Kira" homeHref="/dashboard" items={USER_NAV} userEmail={authUser.email ?? ''}>
      {/* If they ran a valuation before signing up, attach it to the account now. Mounted on the
          shell rather than in each signup flow, because the condition is "is signed in", not
          "arrived via checkout" — which is how the free-signup path lost it entirely. */}
      <ClaimStoredValuation />
      {children}
      {/* Always-there one-tap mic — Siri-simple access from anywhere in the portal. */}
      <TalkFab />
    </PortalShell>
  );
}
