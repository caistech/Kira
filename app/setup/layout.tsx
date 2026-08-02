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

import { UserShell } from '@/components/UserShell';

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
