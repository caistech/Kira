import { UserShell } from '@/components/UserShell';

export default function MyGenomeLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
