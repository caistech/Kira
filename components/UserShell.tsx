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
import { getAuthUser, getCurrentAppUser } from '@/lib/auth';
import { canSend } from '@/lib/business-identity';
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

export async function UserShell({
  children,
  /**
   * Whether this surface enforces first-run setup.
   *
   * On for every owner surface, and OFF for Settings — which is the one place he must always be
   * able to reach, because it holds Sign Out. A gate that also blocks the way out is not an
   * onboarding step, it is a trap, and the person most likely to hit it is the one who signed up
   * and changed his mind.
   */
  requireSetup = true,
}: {
  children: React.ReactNode;
  requireSetup?: boolean;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');
  const appUser = await getCurrentAppUser(); // ensures the bridged users row is resolvable

  // Never fatal. An unreachable identity store means the chrome falls back to "Kira" — the same
  // screen he saw yesterday — rather than failing the page he was trying to open.
  let identity = null;
  let identityReadFailed = false;
  try {
    identity = appUser?.id ? await getBusinessIdentity(appUser.id) : null;
  } catch {
    identity = null;
    identityReadFailed = true;
  }

  // FIRST RUN, ON EVERY DOOR — not just the dashboard.
  //
  // Kira cannot send anything for a business she cannot name (the Spam Act footer identifies the
  // SENDER), so this is asked once, up front, rather than surfacing as his first request being the
  // one that silently fails. It lived on /dashboard alone, and sign-in sends an owner with an
  // active agent straight to /chat — so the person most likely to skip setup was the one furthest
  // into the product.
  //
  // Gated on the identity being COMPLETE rather than on a row existing: the sender refuses a tenant
  // missing any of entity / ABN / address, and "there is a row" is the easier question whose answer
  // reassures someone about a send that will be refused. A FAILED READ never redirects — bouncing a
  // configured owner back through setup because the database hiccuped is its own bug.
  if (requireSetup && appUser?.id && !identityReadFailed && !canSend(identity)) {
    redirect('/setup/business');
  }

  return (
    <PortalShell
      title={shellTitle(identity)}
      homeHref="/dashboard"
      items={USER_NAV}
      userEmail={authUser.email ?? ''}
    >
      {/* If they ran a valuation before signing up, attach it to the account now. Mounted on the
          shell rather than in each signup flow, because the condition is "is signed in", not
          "arrived via checkout" — which is how the free-signup path lost it entirely. */}
      <ClaimStoredValuation />
      {children}
      {/* Always-there one-tap mic — Siri-simple access from anywhere in the portal. */}
      <TalkFab />
    </PortalShell>
  );
}
