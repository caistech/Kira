// app/personal-journey/page.tsx
// DEPRECATED. Kira is now all-business (owner-operator fractional exec); the personal-journey
// surface is retired. Redirect any inbound link to the business valuation flow rather than 404,
// so old links / bookmarks land somewhere useful. The underlying personal agent plumbing is left
// intact (shared with business) — only the public surface is deprecated.

import { redirect } from 'next/navigation';

export default function PersonalJourneyPage() {
  redirect('/business-valuation');
}
