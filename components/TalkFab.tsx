'use client';

// components/TalkFab.tsx
// Persistent one-tap "Talk to Kira" mic button on the user portal — always a thumb away. Links to
// /talk, which resolves the owner's Kira and drops straight into the mic.
//
// IT HIDES ITSELF ON THE PAGES THAT ARE ALREADY THE CONVERSATION.
//
// The old note here said it was "not rendered on /chat itself (that surface IS the mic) because
// /chat isn't wrapped in the user shell" — true of /chat, and an accident rather than a rule. Every
// OTHER conversation surface IS wrapped: /start, /talk and /discovery all rendered a floating
// button inviting the owner to go where he already was, sitting on top of the voice widget itself.
//
// The operator walked the real funnel and counted three floating things stacked on one screen —
// this FAB, the voice embed and the bug reporter — and said so in exactly those terms. A button
// that duplicates the page underneath it is not convenience; it is clutter with a drop shadow.
//
// The decision lives HERE, not in UserShell, for two reasons: the FAB is the thing that knows where
// it points, so it is the thing that can know when that is redundant; and UserShell is a server
// component that cannot read the path at all. A prop would have meant every future conversation
// surface remembering to pass it, which is the class of rule that holds until someone adds a route
// at 1am.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Surfaces that ARE the conversation. Prefix match, so /chat/[agentId] is covered. */
const CONVERSATION_SURFACES = ['/talk', '/start', '/chat', '/discovery'];

export function TalkFab() {
  const pathname = usePathname() || '';
  if (CONVERSATION_SURFACES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <Link
      href="/talk"
      aria-label="Talk to Kira"
      className="fixed bottom-5 right-5 z-40 inline-flex min-h-[56px] items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-3 text-white shadow-xl shadow-rose-200 transition-transform hover:scale-105 active:scale-95"
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>
      <span className="hidden font-semibold sm:inline">Talk to Kira</span>
    </Link>
  );
}
