// Wraps the public page with a way back for owners who are already signed in — see BackToAccount.
// A layout rather than an edit inside the page, because both pages are 'use client' and the auth
// check has to happen on the server.
import type { Metadata } from 'next';

// Per-page title (register P20). "Kira — your part-time general manager" sat on every page, so a
// man comparing his own valuation against the worked example in another tab could not tell the two
// apart. The distinguishing word goes first, because a tab strip shows about twenty characters.
export const metadata: Metadata = {
  title: 'What it costs · Kira',
};

import { BackToAccount } from '@/components/BackToAccount';

export default function PublicWithAccountBarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackToAccount />
      {children}
    </>
  );
}
