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
import { createServiceClient } from '@/lib/supabase/server';
import { displayedFigures } from '@/lib/valuation/displayed';
import { DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { PortalShell, type NavItem } from '@/components/PortalShell';
import { ClaimStoredValuation } from '@/components/ClaimStoredValuation';

const USER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview' },
  // The thing he is paying for. It was reachable only by typing the URL, which for this audience
  // means it did not exist.
  { href: '/my-genome', label: 'My Genome' },
  // ⚠️ REACHABLE, because the alternative is what happened to Ray: he asked where a document was,
  // she offered to EMAIL it and asked him for a recipient — and there was no screen in the product
  // that would show it to him. "The document exists somewhere and I cannot look at it."
  { href: '/drafts', label: 'Drafts' },
  // ⚠️ ITS OWN DESTINATION, NOT A BLOCK ON THE OVERVIEW.
  //
  // The outstanding-work list used to be the FIRST section of the dashboard — so the page every
  // owner lands on when he opens the app led with twelve things Kira had not done, up to seventeen
  // days old, under a heading that said "Waiting on you". A man deciding whether to trust her with
  // thirty years of undocumented knowledge opened the product and read a case against her.
  //
  // The list is worth keeping and worth reaching; it is not worth being the first thing he sees
  // every morning. So it moves here, where he goes when he wants it.
  { href: '/requests', label: 'Requests' },
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
export async function UserShell({
  children,
  claimValuation = false,
}: {
  children: React.ReactNode;
  /**
   * Offer to adopt (or replace the baseline with) a valuation sitting on this device.
   *
   * ⚠️ OFF BY DEFAULT, AND THAT IS THE FIX. It used to render on every surface this shell wraps —
   * which includes Settings, where Ray met it while looking at his password:
   *
   *   "It is the wrong screen and the wrong moment: ask me when I finish the valuation, not later
   *    when I am looking at my password."
   *
   * The result page now tells him he will be asked on his Overview, so it appears there and on My
   * Genome — the two screens that show the figure it would change — and nowhere else. A prompt about
   * his valuation on the drafts page or the knowledge page is noise; on Settings it is a decision
   * ambushing him mid-task.
   */
  claimValuation?: boolean;
}) {
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

  // ⚠️ WHAT HE ALREADY HAS, so the claim card can name BOTH figures.
  //
  // The card asked "make this your starting point?" without ever saying what the current starting
  // point was. Ray, 2026-08-17: "it does not tell me what my current starting point is, so it is
  // asking me to choose between $300,000 and a number it will not show me." A replace decision with
  // one of the two numbers missing is not a decision.
  let existingBaseline: { gapText: string; takenOn: string } | null = null;
  try {
    if (appUser?.id) {
      const { data: row } = await createServiceClient()
        .from('business_valuations')
        .select('worth_today, worth_potential, currency, created_at')
        .eq('user_id', appUser.id)
        .maybeSingle();
      if (row) {
        const figures = displayedFigures(
          { worthToday: Number(row.worth_today) || 0, worthPotential: Number(row.worth_potential) || 0 },
          (row.currency as string) || DEFAULT_CURRENCY,
        );
        existingBaseline = {
          gapText: figures.gapText,
          takenOn: new Date(String(row.created_at)).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' }),
        };
      }
    }
  } catch (error) {
    // Never fatal — a card that names one figure is worse than one that names two, and far better
    // than a shell that fails to render.
    console.error('[user-shell] could not read the existing baseline:', error);
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
      {claimValuation && <ClaimStoredValuation existing={existingBaseline} />}
      {/* BOTTOM GUTTER. Originally reserved for the FAB; it stays because SayFix's reporter is also
          fixed and also blind to what it lands on — a tester found it covering the primary button at
          the foot of a page on a phone. Reserving the space in the shell fixes every page at once. */}
      <div className="pb-28">{children}</div>
      {/* ⚠️ NO FLOATING PILL. `TalkFab` is gone from the shell for good — 2026-08-18 — and this
          note is the reason, because it has now been removed once, restored once and removed again
          inside four days, which is what happens when a symptom keeps being treated as the thing.

          It was never the point. The pill was a <Link href="/talk"> standing in for a surface that
          had never been placed: before 2026-08-18 not ONE authenticated page in this product had
          Kira on it. She lived at /chat, /start and /business-valuation, none of which are in the
          nav. So the pill was carrying six pages by itself — which is why removing it in August
          read as the product losing its voice, and why restoring it read as the fix. Neither was.

          The actual fix is that she is now ON the pages: /dashboard, /my-genome, /drafts, /requests
          and /knowledge each render <KiraShapeSection>. /settings and /setup/* opt out by name with
          a stated reason. scripts/check-voice-reachable.mjs enforces the arrangement and scores an
          embedded shape differently from a text link, so this cannot quietly regress to a corner
          button again.

          components/TalkFab.tsx is KEPT rather than deleted: it is still the right answer for a
          surface that genuinely cannot host her inline, and it costs nothing while unmounted. */}
    </PortalShell>
  );
}
