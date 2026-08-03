// @public-route
// The landing page is a SWITCH between two real, maintained designs.
//
// WHY. The classic page was found by a design review to read as a competent, CONSISTENT
// AI-generated landing page — the 3-column grids, the emoji in headings, everything centred, the
// drifting blobs. Recolouring fixed the inconsistency and could not touch any of that, because it
// is structural. LandingNew is the structural answer. Both are kept because the classic page has
// been through three tester walkthroughs and the new one has been through none, and switching a
// front door on judgement alone — mid-tester-round, with a real client on the product — is how you
// find out afterwards which one converted.
//
//   NEXT_PUBLIC_STYLE_NEW = "true"   -> LandingNew   (the less-AI-like rebuild)
//   anything else / unset            -> LandingClassic  (the default, and the safe one)
//
// THE PREFIX IS LOAD-BEARING. This value is read in the browser, so it must be NEXT_PUBLIC_ or it
// resolves to undefined at runtime and silently pins everyone to the classic page — a flag that
// looks set in Vercel and does nothing. It is a feature flag, not a secret, so the prefix is also
// the correct call under the CLAUDE.md rule about what may carry it.
//
// IT IS INLINED AT BUILD TIME. Next replaces NEXT_PUBLIC_* literals during the build, so flipping
// this in Vercel needs a REDEPLOY, not just a save. Locally, put it in .env.local and restart the
// dev server. Read at module scope and compared to the string 'true' so that "TRUE", "1" and "yes"
// all fall through to the classic page rather than half-enabling anything.
//
// DEFAULTS TO CLASSIC ON PURPOSE, exactly like KIRA_SWARM_ADAPTER: a misspelt or missing value
// must not route a visitor at something nobody has looked at.

import { LandingClassic } from '@/components/landing/LandingClassic';
import { LandingNew } from '@/components/landing/LandingNew';

const USE_NEW_STYLE = process.env.NEXT_PUBLIC_STYLE_NEW === 'true';

export default function KiraLandingPage() {
  return USE_NEW_STYLE ? <LandingNew /> : <LandingClassic />;
}
