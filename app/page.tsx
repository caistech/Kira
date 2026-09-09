// @public-route
// @accepts-input open=".convai-btn"
//
// `.convai-btn` is the BUTTON. `.convai-launch` is the wrapper div around it and clicking that
// reveals nothing — confirmed against the live DOM, after the catalog's "`.convai-launch` /
// `.convai-btn`" was read as interchangeable and was not.
//
// The assistant box is safe to submit junk into: it answers from /api/kira/ask and writes nothing
// to a person's Genome. Do NOT add this marker to /signup or the auth pages — the audit really
// submits, on every push, against production.
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

import { BetaCodeCarrier } from '@/components/BetaCodeCarrier';
import { LandingClassic } from '@/components/landing/LandingClassic';
import { LandingConsultant } from '@/components/landing/LandingConsultant';
import { LandingNew } from '@/components/landing/LandingNew';

// The consultant-facing landing is now the PRIMARY front door for every visitor.
// To roll back, set NEXT_PUBLIC_LANDING_VARIANT="classic" or "new" in Vercel and redeploy —
// the code stays one static branch away from either alternative.
const LANDING_VARIANT = process.env.NEXT_PUBLIC_LANDING_VARIANT ?? 'consultant';

export default function KiraLandingPage() {
  const Landing =
    LANDING_VARIANT === 'classic' ? LandingClassic : LANDING_VARIANT === 'new' ? LandingNew : LandingConsultant;

  return (
    <>
      <BetaCodeCarrier />
      <Landing />
    </>
  );
}
