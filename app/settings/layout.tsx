import { UserShell } from '@/components/UserShell';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  // Settings holds Sign Out, so it must stay reachable no matter what state the account is in —
  // gating it would trap the one person most likely to want out. It used to say that with
  // `requireSetup={false}`; the first-run gate was removed entirely on 2026-08-06 (it was
  // un-passable without an Australian ABN), so the exemption is now the rule and the prop is gone.
  return <UserShell>{children}</UserShell>;
}
