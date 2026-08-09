// app/talk/layout.tsx
//
// THIS IS THE SAME BUG AS `app/chat/[agentId]/layout.tsx`, REINTRODUCED AT A NEW URL — and reading
// that file's header first is the fastest way to understand why this one exists.
//
// The chat route once had no layout, so it rendered outside the portal chrome: no nav, no Settings,
// no Sign Out. Sign-in landed there, so it was the first authenticated screen an owner ever saw, and
// the only route to his own account was to type /settings into the address bar. That was found by a
// tester on 2026-07-27 and fixed by giving the route a layout.
//
// On 2026-08-02 `/talk` was added to keep a machine identifier out of the address bar, and it renders
// `ChatPage` AS A COMPONENT rather than redirecting to `/chat/<id>`. That is a good change on its own
// terms — but importing a page skips the layout of the route it came from, so the chrome fix stayed
// attached to `/chat` while sign-in moved to `/talk`. The comment in `login/page.tsx` still asserts
// "the dashboard stays reachable from the app chrome", which was true of every route it had ever
// described and false for this one.
//
// A tester found it again the same week, in the same words: signed in, landed on a page with a text
// box and a "More" menu, no way to anything, and only found the product by guessing /dashboard. For
// the owner this is built for — 66, selling, not technical, will not go exploring — that is where the
// tab closes.
//
// THE LESSON IS NOT "REMEMBER THE LAYOUT". A rule enforced by remembering is a rule that holds until
// someone adds a route at 1am. The §4 chrome requirement needs a mechanical check that fails CI when
// an authenticated route renders without the shell, the same way the canonical-feed guard fails on a
// forked feed. Tracked in BUILD_REGISTER.md.

import type { Metadata } from 'next';

// Per-page title (register P20). "Kira — your part-time general manager" sat on every page, so a
// man comparing his own valuation against the worked example in another tab could not tell the two
// apart. The distinguishing word goes first, because a tab strip shows about twenty characters.
export const metadata: Metadata = {
  title: 'Talk to Kira · Kira',
};

import { UserShell } from '@/components/UserShell';

export default function TalkLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
