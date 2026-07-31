import { UserShell } from '@/components/UserShell';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  // requireSetup=false: Settings holds Sign Out, so it must stay reachable even before first-run
  // setup is done. Gating it would trap the one person most likely to want out.
  return <UserShell requireSetup={false}>{children}</UserShell>;
}
