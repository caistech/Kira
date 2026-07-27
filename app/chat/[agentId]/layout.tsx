// app/chat/[agentId]/layout.tsx
//
// The chat route had NO layout, so it rendered outside the portal chrome — no nav, no Settings, no
// Sign Out. That matters more than it sounds: sign-in sends an owner with an active agent straight
// here, so this is the FIRST authenticated screen most users ever see, and from it the only way to
// reach their account was to type /settings into the address bar.
//
// A mobile tester put it plainly: he had just handed over a card and had no route to his own
// account. It also made the FAQ's "cancelling takes one click in Settings" untrue — the click did
// not exist. (naive-tester, 2026-07-27: findings #26, #29, #32.)
//
// UserShell is the same chrome /dashboard, /settings and /knowledge already use, so this is
// adopting the existing shell rather than inventing chrome for one route — which is also why the
// pre-signup valuation claim (ClaimStoredValuation, mounted on UserShell) now fires here too, on
// the very first authenticated page load.

import { UserShell } from '@/components/UserShell';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
