# The Portals Training Seams — "shore the NEXT lane down the chain" (the honest copy-paste manual)

Landing URL for trailers, recruiters, and fleet directors — the ONE thing to read before you sign into /talk.

---

## The two-minute ground truth (because portals are the single most-misread seam)

**"A portal" is not a separate login. A portal is a PERSON'S KIRA, at their own /talk, in the lane their organisation row says they run.** You do not "get portal credentials." You go to /talk, and Kira's genome-capture seam asks you which lane the conversation needs to be in:

- URL lanes: `https://kiraexec.com/app/talk` (same page — the ONE bootstrap seam that /talk, /dashboard, /portal and /my-genome all consume).
- How the page decides who you are: `journey_type` on your `kira_agents` row.
  - `journey_type = 'business'` → you are the OWNER lane (the boss of this org).
  - `journey_type = 'consultant'` → you are the CONSULTANT lane (you talk; Kira captures your consultant genome so the fleet can learn your lane).
  - `journey_type = 'distributor'` → you are DISTRIBUTOR lane (your loves' Richmond lean against the Stage-A hierarchy that's LIVE in the fleet DB).

**PORTALS simplify into this:** when you hear "did someone leave a portal?" the answer is **no one leaves a portal. They LAND at /talk and /talk's bootstra** ASKS. The portal is the conversation, not a separate address.

---

## The FOUR surfaces that every sign-in resolves to (pick from the /talk dagger menu)

1. **/talk** — the canonical Kira bootstrap surface. If you have no agent yet → it provisions one adaptively (KiraBootstrap). If you have one → it drops you into the existing conversation.
2. **/dashboard** — where owners and fleet operators land after signing in via the TalkFab open. Talks + provides ×genome same chart. Live recording ∈ the talk saga.
3. **/talk?area=people** (or `?area=work` etc.) — set by the buttons on `/my-genome/[area]` pages. It is the TRIGGER for the opener; the page then ASKS the lane question.
4. **/my-genome/[area]** — the owner's own walking lanes; each area page carries a "tell Kira /talk" deep-link so the conversation lands in the right lane.

Sign-in paths build one recursion: visit /talk → signed out? caught to /login with a `next=` (the callback route does this; it was one of the seams we shipped) → back to /talk → now the fleet can mint you the right lane over /api/kira/ensure.

---

## The ONLY three doors any human gates at

### Door 1 — the OWNER (top of fleet, reads everything under them)
- Enter `/talk` fresh. `journey_type` resolves to `business` → you're the owner.
- The owner NEVER "provisions the tier below by minting a separate distributor account." The owner hands the **distributor** `/talk`ORc the SAME /talk seam URL and RECURSES. They get one lane to walk; the next recurs because your /talk journey talked them into theirs.
- You'll often land on `/dashboard` after your first /talk — that's the canonical dashboard the TalkFab opens.

### Door 2 — the CONSULTANT
- Enter `/talk`; if your agent row hasn't been dialed to consultant yet and you're mid-setup, /talk's bootstrap still provisions you (the body of KiraBootstrap). The consultant journeys used to be ONE-LANE-ALWAYS-BUSINESS, which was the gap Stage B seamed: consultant genomes now land in the Stage-B tables the vitest suite turned green (reprovision seam + seams doc on-disk, additive, no fleet calc).
- After a consultant /talk capture you may LAND on /dashboard — that's the genome-work acting as your lane.
- Import seam: `journey_type='consultant'` → the capture seam keeps a fleet-consultant lane from  lost.

### Door 3 — the DISTRIBUTOR  (the "next lane down" layer, fleet-of-orgs)
- The distributor gets the org's OWN public address from their own provisioning: **org.url or ir organisation's public portal domain** — in this tree, the canonical column is the fleet-conformed `organisations.portal_domain`. If it's EMPTY at your layer, the chain hasn't minted that lane for the row yet — do not fabricate a URL. It's a real account you are signing INTO, or a real portal domain you say is live.
- Distributor lane home: the distributor's own agent or dealer, seeded by their signatures. THE distributors can READ the true_lane for the portfolio's claims (Trus comparisons + operating agreements landed in Stage-A hierarchy).

---

## ONE honest line thing after the doc: the ONLY two things that are LIVE-powered right now

- **Stage A = LIVE** (migration `20260921……chain_of_truth_hierarchy` applied + verified via the schema probe earlier; the six domain tables: consultant_frameworks, consultant_genomes, operating_agreements, truth_comparisons, portals, portal_configs (plus the organisation hierarchy cols) — the fleet "present" probe ran earlier and was real, honest, additive).
- **Stage B = GREEN** (vitest ran its capture-seam suite, 1 file green / seam tests passing — the "capture lane" test was the real runner on this tree).
- **Stage C = OPEN (your move)** — spawn a consultant /talk route in a live session, land a real genome row, get the fleet to walk the next distributor port. Not shipped till the runner shows it.

## Fleet meat honesty, always (the permanent house rule, so the doc above can be trusted):
- Provisioning is serial-lane + idempotent so a 1,000-org wave does not 429 the vendor.
- The fleet will claim conformance on the day the LEDGER says conformance; until then every "provisioning pass" here is tails-on-disk + additive, not a fabric.
