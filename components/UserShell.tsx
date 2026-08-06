// components/UserShell.tsx
// Server wrapper: resolves the current app user and renders the user portal chrome.
// Used by the user-facing authenticated layouts (/dashboard, /chat, /settings, /knowledge).
//
// ONE KIRA, AND SHE IS HIS.
//
// The nav used to say "My Kiras" and "+ New Kira". The entire pitch is a single exec who learns YOUR
// business over months; a menu offering to make another one silently contradicts it, and it was the
// first thing an owner saw after paying. He does not want a fleet. He wants the one that knows him.
//
// The chrome is titled with HIS BUSINESS rather than the product. Everything before the login is
// warm and addressed to him personally, and then the app said "Kira" at him like a filing cabinet —
// the tone break that two testers hit at the same moment. Naming the business is not decoration: it
// is the difference between arriving somewhere of his and arriving in software.

import { redirect } from 'next/navigation';
import { getAuthUser, getCurrentAppUser, isCurrentUserAdmin } from '@/lib/auth';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { PortalShell, type NavItem } from '@/components/PortalShell';
import { TalkFab } from '@/components/TalkFab';
import { ClaimStoredValuation } from '@/components/ClaimStoredValuation';

const USER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview' },
  // The thing he is paying for. It was reachable only by typing the URL, which for this audience
  // means it did not exist.
  { href: '/my-genome', label: 'My Genome' },
  { href: '/knowledge', label: 'Knowledge' },
];

/**
 * What to call the place he has just arrived in.
 *
 * His trading name if he gave one, else the legal name, else the product. Trading name first
 * because that is what he calls his own business — "Factory2Key", not "The Trustee for Factory2Key
 * Unit Trust", which is what the register calls it and what nobody says out loud.
 */
function shellTitle(identity: { trading_name?: string | null; legal_name?: string | null } | null): string {
  const trading = identity?.trading_name?.trim();
  if (trading) return trading;
  const legal = identity?.legal_name?.trim();
  if (legal) return legal;
  return 'Kira';
}

/**
 * THE FIRST-RUN GATE IS GONE, AND IT IS NOT COMING BACK IN THIS SHAPE.
 *
 * This wrapper used to redirect to `/setup/business` on every owner surface whenever
 * `canSend(identity)` was false. `canSend` requires an **11-digit ABN** and an Australian state, so
 * the gate had no key for anyone outside Australia: sign in, get bounced to a form you cannot
 * complete, and every route in the product bounces you back to it. Reported by Shah Hussain
 * (2026-08-06) as "it redirects me to setting up business" — not a loop bug, a locked door.
 *
 * It also compounded a second defect: the middleware dropped refreshed auth cookies on every
 * redirect (see `middleware.ts` → `redirectPreservingSession`), so the people this gate bounced were
 * the same people losing their session. Two bugs, one symptom, and the gate was feeding the other.
 *
 * The requirement itself is real and unchanged — `canSend` still governs SENDING, because the Spam
 * Act footer identifies the sender and an email with no ABN behind it is not a thing we may send.
 * What changed is that it now gates the send rather than the product. An owner who never asks Kira
 * to email anyone never needs to answer it, and one who does is told plainly, on the dashboard,
 * before he asks.
 *
 * ⚠️ If you are re-adding a first-run requirement here, gate it on something every user on earth can
 * satisfy. An Australian tax identifier is not that.
 */
export async function UserShell({ children }: { children: React.ReactNode }) {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');
  const appUser = await getCurrentAppUser(); // ensures the bridged users row is resolvable

  // Read only to TITLE the chrome with his business. Never fatal: an unreachable identity store
  // means the title falls back to "Kira" — the same screen he saw yesterday — rather than failing
  // the page he was trying to open.
  let identity = null;
  try {
    identity = appUser?.id ? await getBusinessIdentity(appUser.id) : null;
  } catch {
    identity = null;
  }

  const isOperator = await isCurrentUserAdmin();

  return (
    <PortalShell
      title={shellTitle(identity)}
      homeHref="/dashboard"
      /* THE WAY BACK, for the one person who needs it.
         The admin console's Settings link points at THIS portal's settings page — correctly, because
         an operator's account settings are his own. But there was no route back: he left the console
         and the user nav had nothing to return him to it, so a tester walking the admin path ended up
         retyping the URL. §8.5 says an admin may reach user routes; it does not say he should get
         stranded there. Rendered only for operators, so a customer never sees a door he cannot open. */
      items={isOperator ? [...USER_NAV, { href: '/admin', label: 'Admin console' }] : USER_NAV}
      userEmail={authUser.email ?? ''}
    >
      {/* If they ran a valuation before signing up, attach it to the account now. Mounted on the
          shell rather than in each signup flow, because the condition is "is signed in", not
          "arrived via checkout" — which is how the free-signup path lost it entirely. */}
      <ClaimStoredValuation />
      {/* ROOM FOR THE FAB. It is fixed bottom-right, so whatever is last on the page sits under it —
          a tester found it covering the "Run the numbers again" link at the foot of the valuation
          card on a phone. Reserving the space in the shell fixes every page at once, rather than
          each page remembering to leave a gap for a button it does not render. Sized past the
          button's 56px plus its 20px offset. */}
      <div className="pb-28">{children}</div>
      {/* Always-there one-tap mic — Siri-simple access from anywhere in the portal.
          TalkFab hides ITSELF on the pages that already are the conversation (see the component):
          the decision lives there because the FAB is the thing that knows where it points, and this
          shell is a server component that cannot read the path anyway. */}
      <TalkFab />
    </PortalShell>
  );
}
