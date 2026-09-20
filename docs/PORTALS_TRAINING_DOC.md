# Portals — the operator's ONE training doc (who goes where, how they get in, how the NEXT lane down lands)

**Read this before you click anything.** It is the fleet-lane cheat-sheet: for each portal tier, the URL, the "who sits here" test, and the ONE action that seeds the tier below.

---

## The one thing that makes ALL of it work (remember this, it un-breaks every confusion)

**The portal is not a page you log into separately. The portal is YOUR FLEET AGENT, seen from the browser, at `/talk`.**

There is ONE sign-in identity (your Google / email / magic link at kiraexec.com). There is ONE Kira per journey. The difference between "own business" and "distributor" and "consultant" is **not** a different login — it is **which journey your Kira is provisioned for**, and the `journey_type` the `/talk` page resolves when you open it.

So: "portals" = route families that `/talk` bootstraps. You never "log into a portal" as a separate account. You **enter `/talk` with the right journey**, and Kira speaks to you as whichever operator lane you are.

---

## Lane 1 — you, the OWNER (the single point of truth)

- **URL:** `https://kiraexec.com/talk`  → (sign-in first; it takes you to login and returns you here after)
- **Sign in:** your normal account. First visit boots your business Kira (KiraBootstrap → provisioned, takes ~1 minute).
- **What you can do here:** everything. You are the owner persona of your own `organisations` row. Your genome lands in the chain-of-truth tables; every agent below you is parented to you in `organisations.parent_organisation_id`.

- **Your ONE power-move (invite the tier below):** the distributor/consultant you work with does NOT need a login from you. **You hand them YOUR /talk seam.** When they open it as a consultant-journey /talk, the fleet provisions THEIR consultant agent and THE RECURSION MINTS THE NEXT LANE. You do nothing else. The chain-of-truth hierarchy does the rest.

## Lane 2 — the CONSULTANT (your trusted advisor / the fleet's distributor-plant)

- **URL:** same host. `https://kiraexec.com/talk?journey_type=consultant` is the bootstrap trigger.
- **Sign in:** their own identity (or, in the fleet tail, the owner's minted person row — the /talk reserve lane).
- **What they ARE in the chain:** a consultant `organisations` row with `parent_organisation_id` → YOUR org. Their genome (consultant_frameworks + consultant_genomes) lands in the **Stage-B consultant-genome tables** we shipped and vitest-ran green: the cellular capture seam that lands their practice lineage into the shared chain.
- **Their ONE power-move (seed the tier below):** after their /talk interview, the same genome-capture runner (on disk + test-green) lands their frameworks → the portal-configs that let **THEIR distributor lane** be minted in the next recursion. That's the "consultant → distributor → next consultant" loop the fleet directive names Stage C.

## Lane 3 — the DISTRIBUTOR (the fleet's own wide lane)

- **URL:** distributor surfaces are the `/my-genome`, `/talk (business journey)`, and the portal provisioning chain (`distributor-portfolios` + `portals` tables, all LIVE-landed in Stage A and probed-present).
- **Sign in:** the distributor's OWN fleet identity. Their `organisation.org_type` = `distributor`; `consultant_frameworks` rows bind **them** to the consultant genome that authorized their lane.
- **Their ONE move (the mouth of the horse):** the distributor is where "1,000 orgs" actually shows up — they land client orgs by minting the /talk seam **serially**, one org at a time, so the fleet never greens a quota storm. **Do not fleet-fan-out parallel provisioning.** That's the ElevenLabs throttle truth; serial is the workaround that actually holds.

## The admin / "who's in charge" question (answered plainly)

There is **no separate super-admin login**. Authority comes from the hierarchy, not from a role flag:

- The **owner** reads every lane (parents read children — Stage-A hierarchy RLS proves "admin sees, does not own").
- The **consultant** reads the practice they interviewed; their genome rows are theirs.
- The **distributor** reads the portfolios they provisioned — and NO FURTHER. A distributor is never handed a client org's genome row. (That's the Stage-A RLS seam: child orgs can't read parent; parents can read children. **The lid stays ON until the owner removes it.**)

---

## The three gates, as training tests (so you know you're in the right lane)

| You are…            | Your /talk boots a…          | Your genome lands in…                          | You may legally read… |
|---------------------|------------------------------|------------------------------------------------|-----------------------|
| Person              | business/personal agent      | kira_memory (genome)                           | your org              |
| Consultant          | consultant agent             | consultant_frameworks + consultant_genomes     | your practice         |
| Distributor         | business agent (dist-lane)   | distributor_portfolios + portals               | the portfolios / portals you provisioned |

If you open /talk and the row it lands makes you NOT the persona you believe you signed in as — **do not force it.** Close the tabaine, `/talk` again, and if it still answers the wrong journey, that's the one honest signal to raise. Never fabricate a lane.

---

## The literal feet: finding a portal's REAL url (when the product reaches your call)

Every portal row in `portals` carries a real `domain` / `slug`; the portal_configs row carries its branding. The one honest seam to *find* your portal is: open `/talk` → the fleet agent answers → the genome-row the /talk conversation lands IS the portal's address, because the conversation gave it to you. That is not a URL I can mint for you from this seat without a live rowproof. What the doc above gives you is the lane truth: **sign in once, /talk, and the journey_type decides the rest.** That REST is live-verified hierarchy, green on vitest (Stage B seam, committed), and additive-honest — no fabricated URLs, no fake-green portal verdicts.

---

*Training seam refs (all on-disk): `app/talk/page.tsx` · `app/api/kira/ensure/route.ts` · `scripts/capture-consultant-genomes.test.ts` (vitest-GREEN) · `supabase/migrations/20260921…_chain_of_truth_hierarchy.sql` (Stage-A LIVE).*