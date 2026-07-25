import { UserShell } from '@/components/UserShell';

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
