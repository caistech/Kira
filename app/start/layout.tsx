import type { Metadata } from 'next';

// Per-page title (register P20). "Kira — your part-time general manager" sat on every page, so a
// man comparing his own valuation against the worked example in another tab could not tell the two
// apart. The distinguishing word goes first, because a tab strip shows about twenty characters.
export const metadata: Metadata = {
  title: 'Set up your Kira · Kira',
};

import { UserShell } from '@/components/UserShell';

// /start had NO layout, so it rendered bare: no navbar, no Settings, no Sign Out, one card and a
// "Back to home" link. It is also where a brand-new owner lands — /talk resolves to the user's
// agent, and someone who has just signed up has none, so they fall through to here. The first
// authenticated screen of their life was a dead end (naive-tester, Ray, 2026-07-28).
//
// The chrome already existed and was already applied to /dashboard, /chat, /knowledge and
// /discovery. This page was simply missed. Same shell, so the fix is one file rather than a
// rebuild — and now the nav item that points at /start leads somewhere with a way back out.
export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
