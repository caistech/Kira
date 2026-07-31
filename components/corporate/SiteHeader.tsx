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

import { CorporateHeader } from '@/components/corporate/CorporateHeader';

/**
 * Route prefixes that carry their own chrome (PortalShell or the admin shell).
 *
 * Listed rather than inferred: a route that gains its own shell and forgets to appear here shows two
 * headers, which is visible immediately — the failure of the opposite default (hide unless listed)
 * is a marketing page with no header at all, which nobody notices for weeks.
 */
const OWN_CHROME = [
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
