import type { Metadata } from 'next';

// Per-page title (register P20) — the distinguishing word first, because a tab strip shows about
// twenty characters.
export const metadata: Metadata = {
  title: 'Drafts · Kira',
};

import { UserShell } from '@/components/UserShell';

// ⚠️ THE CHROME IS NOT OPTIONAL ON AN AUTHENTICATED ROUTE. A new page added without a layout renders
// with no nav, no Settings and no Sign Out — the §4 rule — and it happens silently, because the page
// itself looks perfectly correct in isolation. Every other authenticated surface in this product
// wraps in UserShell for exactly this reason.
export default function DraftsLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
