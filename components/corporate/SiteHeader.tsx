'use client';

// components/corporate/SiteHeader.tsx
//
// The marketing header — on the marketing pages ONLY.
//
// TWO PROBLEMS, ONE CAUSE. CorporateHeader is rendered from the root layout and is `sticky top-0
// z-50`, so it sat on top of every authenticated page as well:
//
//   1. It COVERED the portal sidebar's heading. PortalShell's rail is `fixed inset-y-0`, so it
//      starts at the top of the viewport and the business name rendered underneath the header —
//      measured at 0,0,255×68 and invisible on desktop. An owner signed in to see "Factory2Key" and
//      the only heading he could read said "Kira by Corporate AI Solutions".
//   2. It put OUR branding inside HIS account. That is the same instinct as the marketplace banner
//      we removed from the chat page: advertising the operator's other work to a man paying for
//      discretion, on the screens he uses every day.
//
// So it is not an offset problem. The header does not belong on authenticated surfaces at all — a
// signed-in owner is not a visitor being marketed to, and his chrome is the portal's own.

import { usePathname } from 'next/navigation';
import { CorporateFooter } from '@/components/corporate/CorporateFooter';

import { CorporateHeader } from '@/components/corporate/CorporateHeader';

/**
 * Route prefixes that carry their own chrome (PortalShell or the admin shell).
 *
 * Listed rather than inferred: a route that gains its own shell and forgets to appear here shows two
 * headers, which is visible immediately — the failure of the opposite default (hide unless listed)
 * is a marketing page with no header at all, which nobody notices for weeks.
 */
const OWN_CHROME_BOTH = [
  // The LANDING page carries its own header — nav, CTA and the avatar — so the corporate strip on
  // top of it made TWO stacked headers. A tester counted them: about 130px of chrome before the
  // headline on a phone, with the corporate logo ghosting through the sticky one on scroll. "It
  // looks like a build mistake, which is a rough way to open when your whole pitch is we're the
  // careful ones." Exact match only: '/' must not swallow every route beneath it.
  '/',
  '/dashboard',
  '/chat',
  '/settings',
  '/my-genome',
  // Wrapped in UserShell like every other authenticated surface, so the marketing strip on top of
  // it would be a second header — the exact duplicate-chrome defect a tester measured at ~130px
  // before the headline. Caught here by own-chrome-coverage.test.ts on the first run.
  '/drafts',
  '/knowledge',
  '/start',
  '/discovery',
  '/setup',
  // ⚠️ `/talk` IS NOT `/chat`, AND THAT IS EXACTLY HOW IT WAS MISSED.
  //
  // `/talk` RENDERS the chat page as a component rather than redirecting to `/chat/<id>` — done
  // deliberately, so a returning owner does not land on a wall of machine identifier ("I know that
  // doesn't matter. It still looks like something has gone wrong." — naive-tester). The consequence
  // is that the same screen exists at two paths, only one of which was listed here, so `/talk`
  // served the marketing header and footer ON TOP of UserShell's nav.
  //
  // Ray, 2026-08-16: "The chat page carries two lots of chrome. Marketing header on top, app
  // navigation underneath, and two footers. It looks like two websites glued together." Every Talk
  // control in the product points at `/talk`, so this is the version most owners actually see.
  '/talk',
  '/admin',
];

/**
 * Routes that supply their OWN header, so the corporate one must not render on top.
 *
 * ⚠️ THIS USED TO BE ONE LIST FOR BOTH HALVES, AND THE COUPLING IS WHAT MADE THE BUG UNFIXABLE.
 * The old comment argued the single list was a safety feature — "same list, same test, so the two
 * can never disagree about which routes own their chrome." They can and they must: `/sample-genome` and
 * `/business-valuation` own their header and have no footer of their own, so listing them in one
 * combined list would have removed the only footer they have, taking the operator's identity off
 * the page with it. A list that cannot express the difference forces you to choose which defect to
 * ship. So: two lists, and a test (`site-chrome.test.ts`) that derives the correct membership from
 * the page files rather than from anyone remembering.
 *
 * Measured on production 2026-08-08, `fd11f62`, by counting `<header` in the served HTML:
 * `/sample-genome` `/business-valuation` `/plan` `/commit` `/privacy` `/pubguard` `/terms` all served TWO.
 * A tester found three of them; the other four were found by looking for the class rather than the
 * instance, which is the only reason they are in this change.
 */
export const OWN_HEADER = [
  ...OWN_CHROME_BOTH,
  '/sample-genome',
  '/business-valuation',
  '/plan',
  '/commit',
  '/privacy',
  '/pubguard',
  '/terms',
  // Behind auth, so a 307 hides them from any anonymous count. The test found them by reading the
  // page files, which is the half of this check that does not depend on a page being reachable.
  '/introducer',
  // Added with the page itself, 2026-08-18 — and only because site-chrome.test.ts failed the moment
  // the page existed. It declares its own <h1> header block, so without this entry it would have
  // served the marketing header on top of its own: the exact duplicate-chrome defect that reached
  // production on seven routes and was found by counting `<header` in the served HTML rather than
  // by anyone noticing. Worth stating that the check caught this before review did.
  '/requests',
];

/**
 * Routes that supply their OWN footer.
 *
 * `/privacy` and `/terms` are here for a reason worth stating: their own footers carry the
 * REGULATORY_INCLUSIONS identity — entity, ABN, trading-as, postal address, contact email — and
 * `CorporateFooter` carries a lighter one with no ABN. On every other page the generic footer is
 * the better of the two; on the two legal pages it is the weaker, so the page's own footer is the
 * one that survives. Do not "simplify" this by collapsing the legal pages onto the generic footer.
 */
export const OWN_FOOTER = [
  ...OWN_CHROME_BOTH,
  '/privacy',
  '/terms',
  // `/pubguard` renders <KiraFooter/> rather than a literal <footer>, so it is here by MEASUREMENT
  // (production served two) and not by the test, which cannot see chrome that arrives through a
  // component. Stated so nobody later "cleans up" an entry that looks unsupported.
  '/pubguard',
  // Two more public pages the tester never opened. Found only because the check asked the
  // question of every page instead of the three that were reported.
  '/advisors',
  '/what-she-does',
];

/** @deprecated Use OWN_HEADER / OWN_FOOTER. Kept only so an external import does not break. */
export const OWN_CHROME = OWN_CHROME_BOTH;

export function ownsChrome(list: readonly string[], pathname: string): boolean {
  return list.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function SiteHeader() {
  const pathname = usePathname() || '/';
  if (ownsChrome(OWN_HEADER, pathname)) return null;
  return <CorporateHeader productName="Kira" productAcronym="K" />;
}

/**
 * The footer half of the same rule, against its OWN list.
 *
 * Measured on production 2026-08-08: `/about` `/privacy` `/pubguard` `/terms` each served TWO
 * `<footer>` elements. On `/about` the two disagreed about the year — a hardcoded "© 2025" sitting
 * directly above the generic footer's `getFullYear()` "© 2026". The tester's note on that is the
 * reason it is not filed as cosmetic: "It's the kind of small thing I notice on an invoice."
 */
export function SiteFooter() {
  const pathname = usePathname() || '/';
  if (ownsChrome(OWN_FOOTER, pathname)) return null;
  return <CorporateFooter productName="Kira" />;
}
