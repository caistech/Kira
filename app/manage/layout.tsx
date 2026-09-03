import { ManageShell } from '@/components/ManageShell';

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return <ManageShell>{children}</ManageShell>;
}
