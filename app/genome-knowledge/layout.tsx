import type { Metadata } from 'next';

// PRODUCT_STANDARDS §4 — every authenticated route renders inside the app chrome. This route had
// no layout at all, so an owner landing on /genome-knowledge or /genome-knowledge/[area] had no
// nav, no Settings and no Sign Out — found live by the gate's app-chrome check the first time it
// ever actually ran (it had been silently unreachable for as long as the Tests step ahead of it
// in the workflow was permanently failing).
export const metadata: Metadata = {
  title: 'Your Operating Manual · Kira',
};

import { UserShell } from '@/components/UserShell';

export default function GenomeKnowledgeLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
