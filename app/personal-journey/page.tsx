// app/personal-journey/page.tsx
// DEPRECATED. Kira is now all-business (owner-operator fractional exec); the personal-journey
// surface is retired. Redirect any inbound link to the business valuation flow rather than 404,
// so old links / bookmarks land somewhere useful. The underlying personal agent plumbing is left
// intact (shared with business) — only the public surface is deprecated.

import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

// Per-page title (register P20). "Kira — your part-time general manager" sat on every page, so a
// man comparing his own valuation against the worked example in another tab could not tell the two
// apart. The distinguishing word goes first, because a tab strip shows about twenty characters.
export const metadata: Metadata = {
  title: 'Your journey · Kira',
};

export default function PersonalJourneyPage() {
  redirect('/business-valuation');
}
