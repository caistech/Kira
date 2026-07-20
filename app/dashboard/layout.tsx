import { UserShell } from '@/components/UserShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
