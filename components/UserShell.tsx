// components/UserShell.tsx
// Server wrapper: resolves the current app user and renders the user portal chrome.
// Used by the user-facing authenticated layouts (/dashboard, /settings).

import { redirect } from 'next/navigation';
import { getAuthUser, getCurrentAppUser } from '@/lib/auth';
import { PortalShell, type NavItem } from '@/components/PortalShell';
import { TalkFab } from '@/components/TalkFab';

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
      {children}
      {/* Always-there one-tap mic — Siri-simple access from anywhere in the portal. */}
      <TalkFab />
    </PortalShell>
  );
}
