import type { Metadata } from 'next';

// Per-page title (register P20). The page itself is a client component, so it cannot export
// metadata — this layout exists for that reason alone, exactly as /plan and /business-valuation do.
export const metadata: Metadata = {
  title: 'PubGuard · Kira',
};

export default function PubGuardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
