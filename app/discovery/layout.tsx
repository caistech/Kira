import type { Metadata } from 'next';

// Per-page title (register P20). "Kira — your part-time general manager" sat on every page, so a
// man comparing his own valuation against the worked example in another tab could not tell the two
// apart. The distinguishing word goes first, because a tab strip shows about twenty characters.
export const metadata: Metadata = {
  title: 'Discovery · Kira',
};

import { UserShell } from '@/components/UserShell';

export default function DiscoveryLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
