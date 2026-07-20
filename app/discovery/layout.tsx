import { UserShell } from '@/components/UserShell';

export default function DiscoveryLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
