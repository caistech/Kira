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
export const OWN_CHROME = [
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
  '/knowledge',
  '/start',
  '/discovery',
  '/setup',
  '/admin',
];

export function SiteHeader() {
  const pathname = usePathname() || '/';
  const hasOwnChrome = OWN_CHROME.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (hasOwnChrome) return null;
  return <CorporateHeader productName="Kira" productAcronym="K" />;
}

/**
 * The footer half of the same rule.
 *
 * A route in OWN_CHROME supplies its own header AND its own footer — the landing page carries the
 * legal identity, the link set and a closing CTA — so rendering the corporate one underneath gives
 * the page two of each. Same list, same test, so the two can never disagree about which routes own
 * their chrome.
 */
export function SiteFooter() {
  const pathname = usePathname() || '/';
  const hasOwnChrome = OWN_CHROME.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (hasOwnChrome) return null;
  return <CorporateFooter productName="Kira" />;
}
