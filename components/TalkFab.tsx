// components/TalkFab.tsx
// Persistent one-tap "Talk to Kira" mic button on the user portal — always a thumb away. Links to
// /talk, which resolves the owner's Kira and drops straight into the mic. Not rendered on /chat
// itself (that surface IS the mic) because /chat isn't wrapped in the user shell.

import Link from 'next/link';

export function TalkFab() {
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
