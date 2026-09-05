import { redirect } from 'next/navigation';
import { getAuthUser, isCurrentUserAdmin } from '@/lib/auth';
import { PortalShell, type NavItem } from '@/components/PortalShell';

// This layout wraps ONLY the admin dashboard (the (panel) route group), NOT /admin/login or the
// admin reset pages — so the login entry stays public while the panel is guarded. Middleware
// already enforces the ADMIN_EMAILS allowlist; this is defense-in-depth + the chrome.

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/exec', label: 'Kira Exec' },
  { href: '/admin/introducers', label: 'Introducers' },
  { href: '/admin/loi', label: 'LOIs' },
  { href: '/admin/asked-for', label: 'Asked for' },
  { href: '/admin/trust', label: 'Trust' },
  { href: '/admin/invitations', label: 'Invitations' },
];

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/admin/login');
  if (!(await isCurrentUserAdmin())) redirect('/admin/login?error=not_admin');

  return (
    <PortalShell title="Kira Admin" homeHref="/admin" items={ADMIN_NAV} userEmail={authUser.email ?? ''}>
      {children}
    </PortalShell>
  );
}
