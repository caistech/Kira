// app/setup/layout.tsx
//
// The setup routes had no chrome, and `/setup/business` had no links of any kind — while
// `app/dashboard/page.tsx` redirects into it for any owner whose business identity is incomplete.
// So an owner who could not finish that form was genuinely trapped: no nav, no Settings, no Sign
// Out, and every attempt to reach the app bounced him straight back. Harder to escape than the
// /talk landing that prompted the check which found this.
//
// THE TENSION IS REAL AND THE TRAP WINS. There is a decent argument for keeping a first-run wizard
// chrome-less — a nav invites the user to wander off before finishing the one thing that unblocks
// everything else. But "he might leave the form early" is a conversion problem, and "he cannot sign
// out of his own account" is the kind of thing that ends a relationship with a 66-year-old who was
// already unsure about handing over his details.
//
// The consequence, stated rather than discovered later: clicking Dashboard from here bounces back
// while identity is incomplete. That is a loop, not a trap — Settings and Sign Out both work — and
// it disappears the moment the form is finished. When §4.1's onboarding blocks are built they should
// own this surface properly and the loop goes with them.

// ⚠️ THE LOOP WAS WORSE THAN THE NOTE ABOVE THOUGHT, and this is the fix.
//
// The comment says clicking Dashboard from here "bounces back while identity is incomplete. That is
// a loop, not a trap — Settings and Sign Out both work." That was true of /dashboard. It was not
// true of this page: UserShell redirects to /setup/business when the identity is incomplete, and
// /setup/business is INSIDE UserShell. So it redirected to itself.
//
// Measured on production, walking a brand-new account from signup:
//
//     307 /talk           -> /setup/business
//     307 /setup/business -> /setup/business
//     ... thirteen times, then ERR_TOO_MANY_REDIRECTS
//
// A new owner could sign up, confirm his email, pay, sign in — and never reach the product at all.
// The one page that fixes the incomplete identity was unreachable BECAUSE the identity was
// incomplete, which is the condition every new owner is in by definition.
//
// It survived because nobody had walked it: the QA account and the operator's own account both
// have a complete identity, so both sail past the redirect that traps everyone else.
//
// `requireSetup={false}` is the existing prop, already used by Settings for the same class of
// reason — a gate must never cover the exit, and here it was covering the entrance too.

import { UserShell } from '@/components/UserShell';

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <UserShell requireSetup={false}>{children}</UserShell>;
}
