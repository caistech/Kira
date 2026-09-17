import { redirect } from 'next/navigation';
import { getAuthUser, currentUserIsDistributor } from '@/lib/auth';
import { getAuthorisedPortals } from '@/lib/portal';
import { PortalShell, type NavItem } from '@/components/PortalShell';

const DISTRIBUTOR_NAV: NavItem[] = [
  { href: '/distributor', label: 'Portfolio' },
];

export default async function DistributorPanelLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');

  const isDistributor = await currentUserIsDistributor();
  if (!isDistributor) redirect('/dashboard');

  const portals = await getAuthorisedPortals();

  return (
    <PortalShell
      title="Distributor Portal"
      homeHref="/distributor"
      items={DISTRIBUTOR_NAV}
      userEmail={authUser.email ?? ''}
      portals={portals}
      currentPortalId="distributor"
    >
      {children}
    </PortalShell>
  );
}
