import { UserShell } from '@/components/UserShell';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
