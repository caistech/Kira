# Kira — funnel gap analysis and build scope

> Companion to `docs/KIRA_MARKETING_BRIEF.md`. That file audits what Kira does today; this file scopes
> the 16 capabilities the described funnel (three doorways → the existing readiness process → a
> matched-partner result → booking) would need, against what already exists in the codebase.
>
> **Method note carried over from the brief:** read-only, cites file paths, marks NOT FOUND rather
> than guessing. This file scopes the gap — it does not implement anything — and per the brief that
> governs it, prefers extending what exists over proposing a parallel new build wherever the existing
> primitive is close enough to reuse.
>
> **Effort scale:** S = a day or two of focused work on top of existing primitives. M = a genuinely
> new, scoped feature (new table, new route, new UI), roughly a week. L = a new subsystem with several
> moving parts (a matching engine, a consent-and-sharing pathway, a booking integration), likely
> several weeks and its own design decisions.
>
> Compiled 2026-09-25.

---

## 1. Website doorways (owner / helping a parent / adviser) + landing routes per series

**Status: Partial.** The routing *infrastructure* for multiple landing experiences already exists and
is proven — the site runs three interchangeable landing variants behind one flag
(`app/page.tsx:37-56`: `LandingClassic`/`LandingNew`/`LandingConsultant`), and a fully separate,
differently-scoped page already exists for a different audience at `app/advisors/page.tsx`. What
doesn't exist is the **three-doorway pattern itself** — no page anywhere presents "I own a business /
I'm helping a parent / I'm an adviser" as a first choice. Searched for "doorway," "helping a parent,"
"I'm an adviser" as literal UI copy — NOT FOUND.

**Evidence:** `app/page.tsx:37-56`; `app/advisors/page.tsx`; no doorway pattern found anywhere.

**Smallest change:** a new top-level route (or a new landing variant) presenting the three choices,
each linking to: the existing `/business-valuation` (owner doorway, unchanged), a new `/family` route
(§4), and the existing `/advisors` (adviser doorway, largely unchanged). This is composition of
existing destinations behind a new front door, not three new products.

**Effort:** S–M (the doorway page itself is S; it's only M if built alongside the family route in §4,
which is the genuinely new piece).

**Dependencies:** §4 (family route) should exist before the "helping a parent" doorway has somewhere
real to send people.

**Risks:** low. The main risk is sequencing — shipping the doorway before the family path exists
sends that doorway's traffic to a dead end.

---

## 2. Readiness process fitness for cold Facebook traffic on mobile

**Status: Exists (the process itself), Partial (fitness for the intended traffic source).** The full
process is public, unauthenticated, resumable via `sessionStorage`
(`app/business-valuation/page.tsx:13-18`), and inherits the product-wide responsive floor (16px+ text,
44px+ touch targets — `DESIGN.md:23,108-111`). It was built and tested for a visitor who arrived
*already motivated* (via a landing page's own persuasion sequence), not for someone three seconds off
a cold Facebook video.

**The friction risk is real and specific, not general:** 13 screens / 15 questions (§3 of the brief),
against a product claim of "about three minutes" that is itself stale (the question count grew after
that line was written — the code's own comment admits the "eleven questions" prose elsewhere "has
been wrong since," `lib/valuation/questions.ts:445-449`). No completion-time telemetry exists to know
the real number (no analytics at all — see §15).

**Evidence:** `app/business-valuation/page.tsx:13-18`; `lib/valuation/questions.ts:160-405,445-449`;
`DESIGN.md:23,108-111`.

**Smallest change — do not replace the existing process, add a short front end feeding it:** a 3–4
question qualifier (e.g. industry, rough profit band, owner-dependence in one question, and an email
or phone capture) that either (a) routes straight into the existing full 13-screen flow with those
answers pre-filled, or (b) captures the lead and offers the full check as a follow-up ("takes 3
minutes, we'll text you the link"). This reuses `lib/valuation/questions.ts`'s existing `stage`
field distinction (`baseline` vs `genome`, `questions.ts:71-84`) as a precedent for "not every
question belongs on the first screen a stranger sees" — the same design principle, applied one level
earlier.

**Effort:** M (a genuinely new short flow + lead-capture storage; the scoring/model logic itself is
fully reused, zero changes to `lib/valuation/model.ts`).

**Dependencies:** none blocking — can ship independently of the doorway/matching work.

**Risks:** a poorly-designed short front end could itself become a second thing to maintain and a
second source of drop-off measurement confusion. Recommend treating it as a strict superset (same
question wording, same industry list) rather than a rewrite.

---

## 3. Capture of match fields: location/state, industry, turnover band, preferred exit path, main concern

**Status: Partial, field by field — and one important architectural conflict.**

| Field | Status | Evidence |
|---|---|---|
| Industry | **Exists** | `lib/valuation/questions.ts:161-169` (question 1) |
| Turnover / turnover band | **Exists** | `lib/valuation/questions.ts:170-179` (raw turnover; a "band" is a trivial bucket over this) |
| Location/state | **Missing** | No address/state/region field anywhere in `STEPS` (`questions.ts:160-405`) |
| Preferred exit path/timeframe | **Exists, but architecturally blocked from being used for matching** | `exitTimeframe` is asked (`questions.ts:392-403`) but is explicitly designed to **never leave the device**: "This one answer stays on this device — it is not sent anywhere, not attached to any account, and it changes none of the figures." (`questions.ts:399`, a deliberate promise pinned by a test per the source comments). Using it for matching means reversing a specific, deliberate privacy commitment already made to the person answering it — not just wiring up a field. |
| Main concern | **Missing as a structured field** | No "what's your main concern" question exists; the closest proxies are the free-form weakest-readiness-factor narrative (`lib/valuation/model.ts:799-907`), which is generated prose, not a selectable category |

**Smallest change:** add one location question to the existing `STEPS` array (following the exact
pattern of any existing `choice`/`money` step — trivial mechanically). For preferred exit path,
**the smallest change is a decision, not code**: either add a *second*, explicitly-labelled,
send-anywhere version of the exit-timeframe question for the matching flow (so the existing
"stays on this device" promise for the original question is never broken), or get explicit,
separate consent to transmit the existing answer. For "main concern," add a single new
choice/free-text question, or derive a best-guess category from the existing readiness factors
(`model.ts:509-569`) as a fallback rather than a new question — cheaper, less reliable.

**Effort:** S (location, main-concern-as-new-question) to M (properly resolving the exit-timeframe
conflict without breaking the existing promise).

**Dependencies:** none.

**Risks:** the exit-timeframe conflict is the one genuine risk here — silently starting to transmit
an answer the product has explicitly told people never leaves their device is exactly the kind of
"code and stated promise disagree" defect this whole audit exists to catch before it happens, not
after.

---

## 4. Family path: shortened flow, guide delivery, "send to your parent" share link

**Status: Missing, entirely.** No shortened flow, no conversation-guide content or delivery mechanism,
no "send to your parent" share link, no attribution-carrying mechanism for a family-originated share
exists anywhere in the codebase. Searched broadly — NOT FOUND on all counts.

**What's reusable:** the existing `@caistech/attribution` first-touch cookie mechanism (already used
for partner links, §6) is the right primitive for "this link, when the parent opens it, should be
remembered as having come from their child" — it's designed for exactly this shape (a signed,
scoped, first-touch-wins cookie), just not currently wired to anything but partner referral tokens
(`lib/introducer/index.ts:20-30`).

**Smallest change:** (a) a static conversation-guide page/downloadable asset — pure content, no new
data model; (b) a `/family` route offering the shortened flow from §2, or a direct link into the full
existing valuation flow reframed for a family reader ("run this for your parent's business"); (c) a
share link using the same signed-cookie pattern as `/r/<token>` but scoped to "family share" rather
than "partner referral" (`ATTRIBUTION_SCOPE` already supports multiple scopes per the package's own
design, `lib/introducer/index.ts:18-20`).

**Effort:** L overall (new content, new route, new share mechanism, and — per §3 — new copy across the
existing valuation flow's exclusively-second-person-to-the-owner language, which doesn't currently
accommodate a reader who isn't the subject).

**Dependencies:** §2 (short front-end) if the family path is meant to be the shortest, lowest-friction
entry point, which the funnel's stated framing implies.

**Risks:** the biggest risk isn't technical, it's tonal — the existing valuation copy is written
entirely in second person to the owner ("what YOU stand to unlock"), and the family strand's stated
requirement (care for the parent, never inheritance framing, never pressure) means the shortened flow
and guide need their own careful copywriting pass, not just a relabelled version of the owner copy.

---

## 5. Adviser path: partner info page, application, onboarding

**Status: Exists (info page + application), Partial (onboarding).**

- **Partner info page:** exists — `app/advisors/page.tsx`.
- **Application:** exists and is well-built — `app/advisors/AdvisorEnquiryForm.tsx` posts to
  `app/api/advisors/enquiry/route.ts`, collecting first/last name, firm (via live ABN lookup — entity
  name, ABN, **state**), practice type (business broker / accountant / bookkeeper / financial adviser
  / lawyer / other), client band (Under 20 / 20–50 / 50–200 / 200+), and an undertaking confirmation,
  with a honeypot + time-trap anti-bot guard (`app/api/advisors/enquiry/route.ts:82-92`). Lands in a
  dedicated `advisor_enquiries` table, and the operator is emailed.
- **Onboarding:** **Partial, and manual by explicit design.** "It does NOT self-serve an account: an
  introducer is added by an operator, who checks the practice is real before their link starts
  attributing commission." — `app/api/advisors/enquiry/route.ts:6-8`. An operator manually creates
  the `introducers` row from `/admin/introducers`. There is no structured checklist, no tracked
  "minimum Kira onboarding" step, and — critically — **the state/practice-type/client-band data
  collected at enquiry does not carry across into the `introducers` row** (confirmed by the schema,
  §8 below), so today's manual promotion step is also where that data is silently dropped unless an
  operator copies it by hand somewhere.

**Evidence:** `app/advisors/page.tsx`; `app/advisors/AdvisorEnquiryForm.tsx:1-36`;
`app/api/advisors/enquiry/route.ts:1-145`.

**Smallest change:** extend the `introducers` schema to carry the fields already captured at enquiry
(§8), and have the `/admin/introducers` promotion step populate them from the matching
`advisor_enquiries` row instead of starting blank.

**Effort:** S (the data already exists one table over; this is a join/carry-through, not new
collection).

**Dependencies:** §8 (partner profile data model).

**Risks:** low — this is tidying up a real but narrow gap, not building something new.

---

## 6. Attribution: partner link/code persists from first click through check, booking, and sign-up

**Status: Partial.** Click → signup is solid and database-enforced (§5 of the brief: signed
first-touch cookie, immutability trigger, audit trail on any override —
`supabase/migrations/20260726000000_introducer_channel.sql:139-202`). **The gap is the middle of the
funnel:** the readiness/valuation flow is anonymous and pre-account (brief §3), and nothing today
connects a specific *valuation result* to the referrer token that was already sitting in the
visitor's cookie — the cookie is only ever read at *account signup*
(`lib/introducer/index.ts:314-336`), not at valuation-start or valuation-completion. In practice this
means attribution survives today **only because the same browser carries the cookie all the way to
signup** — if the funnel ever separates "run the check" from "sign up" by more than one browser
session (e.g. the check is done on a phone via a shared link, signup happens later on a laptop), the
attribution breaks silently, with no error and no record.

**Booking** doesn't exist as a feature yet (§10), so there's nothing to attribute through there today.

**Evidence:** `app/r/[token]/route.ts:22-51`; `lib/introducer/index.ts:314-336`;
`lib/valuation/questions.ts` (no referrer field anywhere in the valuation payload).

**Smallest change:** read the existing attribution cookie at the point a valuation is saved (whether
anonymous or signed-in) and stamp the referrer token onto the `business_valuations` row alongside
whatever identifies the session — so the link survives even if signup happens in a different session,
and so a matched-vs-attributed decision (§7) can be made *before* signup rather than only after.

**Effort:** S–M (reads an already-existing cookie; the new part is one column and one write, at an
existing save point).

**Dependencies:** none blocking; ideally done before §7 (matching), since matching's first rule —
"attribution beats matching" — needs the attribution to actually be known at valuation-completion
time, not just at signup.

**Risks:** low technically. The risk is sequencing: if matching logic ships before this fix, it may
incorrectly treat an attributed lead as unattributed simply because the check happened before signup.

---

## 7. Matching engine for unattributed leads

**Status: Missing, entirely.** No match/assign/routing logic exists anywhere in `lib/introducer/` or
elsewhere in the codebase — confirmed by direct search, not inference.

**Phase 1 (location + capacity, manual review queue).** Needs: a location field on both the owner
(§3) and the partner (§8); a capacity field on the partner (§8, also missing); a simple query
("partners in this state with capacity") plus a manual review UI — the closest existing precedent is
`/admin/introducers`, which is already an operator-facing admin surface for partner records, so a
review queue is a natural sibling page rather than a new admin surface from scratch.

**Phase 2 (industry, size, exit path, main concern, performance weighting).** Needs everything in
Phase 1, plus: industry/exit-path/concern fields resolved per §3 (including the exit-timeframe
architectural conflict), a partner-side industries/deal-range field (§8), and a weighting mechanism
fed by the performance data that §13 doesn't currently track either.

**Evidence:** absence confirmed across `lib/introducer/index.ts`, `lib/introducer/disclosure.ts`,
`lib/introducer/undertaking.ts`, and the full `introducers`/`introductions` schema.

**Effort:** Phase 1: M. Phase 2: L (it's gated on §8 and §13 both being built first, plus the actual
weighting logic being designed — a genuinely new algorithm, not a database query).

**Dependencies:** §3 (owner-side fields), §6 (attribution-first rule needs to be checkable before
matching runs), §8 (partner-side fields), §13 (for Phase 2's weighting input).

**Risks:** the manual-review requirement in Phase 1 is a feature, not a compromise — matching a real
person to a real adviser with no human check is the kind of mistake that's expensive to undo (a bad
match is a bad first conversation with a stranger about someone's retirement). Recommend keeping
Phase 1's manual review step even after Phase 2 ships, as a spot-check rather than removing it
entirely.

---

## 8. Partner profile data (photo, bio, regions, industries, deal range, capacity, availability)

**Status: Missing on the record that matters, present one step earlier and dropped.** The live
`introducers` table holds exactly: `id, email, name, org_name, org_abn, payee_type, payee_name, role,
status, referral_token` — confirmed directly from the migration
(`supabase/migrations/20260726000000_introducer_channel.sql:22-41`). **No** photo, bio, regions,
industries, deal range, capacity, or availability field exists.

**But state and practice-type and a rough client-count band ARE already collected**, one stage
earlier, at the advisor-enquiry form (§5) — they just land in `advisor_enquiries`, a table the
`introducers` promotion step doesn't read from. This changes the honest effort estimate: this is not
"design and collect five new data points from scratch," it's "carry three already-collected fields
across a join that doesn't exist yet, plus add photo/bio/deal-range/availability as genuinely new
fields the enquiry form doesn't ask for at all."

**Evidence:** `supabase/migrations/20260726000000_introducer_channel.sql:22-41`;
`app/advisors/AdvisorEnquiryForm.tsx:27-36`; `app/api/advisors/enquiry/route.ts:42-108`.

**Smallest change:** (a) add `region`/`state`, `practice_type`, `client_band` columns to `introducers`
and populate them from the matching `advisor_enquiries` row at promotion time (cheap, data already
exists); (b) add `photo_url`, `bio`, `industries` (array), `deal_range`, `capacity`/`availability` as
new columns and a simple self-serve or operator-entered profile-edit surface (genuinely new).

**Effort:** S for (a), M for (b).

**Dependencies:** feeds §7 (matching) and §9 (the match card needs a photo/bio/one-line-reason to
render at all).

**Risks:** low, mostly a scoping question — how much profile-editing self-serve to build for partners
vs. operator-entered for now, given onboarding is already manual (§5).

---

## 9. Result page: findings + matched partner card + booking + "request different adviser" + not-ready branch

**Status: Partial.** The **plain-language findings half already exists and is good** — the valuation
result page already renders the three headline figures plus a generated, band-appropriate narrative
explaining *why* the number is what it is (`lib/valuation/model.ts:799-907`, `buildBuyerRationale`),
already varying tone by how "ready" the business reads (low/mid/high readiness bands,
`model.ts:853-907`). **Everything downstream of that — a matched-partner card, "why this adviser,"
a booking button, "request a different adviser," and a distinct not-ready branch — is entirely
missing**, because matching (§7) and booking (§10) don't exist yet to feed it.

**Evidence:** `lib/valuation/model.ts:799-907` (findings, exists); no partner-card component, no
booking button, no "request different adviser" UI found anywhere.

**Smallest change:** once §7 and §10 exist, this is primarily a UI addition to the existing result
page/component — rendering a card from the matched partner's profile data (§8) with a one-line reason
(likely generated the same way `buildBuyerRationale` already generates band-appropriate prose — a
reusable pattern, not a new one), plus a booking CTA (§10) and a "not ready" branch that routes into
the nurture sequence (§11) instead.

**Effort:** M, but only after §7/§8/§10 exist — this item is genuinely gated, not independently
buildable.

**Dependencies:** §7, §8, §10, §11.

**Risks:** low on its own; inherits the risks of everything it depends on.

---

## 10. Booking integration with partner calendars; partner notification

**Status: Missing, entirely.** The only calendar-booking reference anywhere in the codebase is a
generic `NEXT_PUBLIC_VENDOR_CALENDLY` link in the site footer
(`components/corporate/CorporateFooter.tsx:13,65-69`) — that's Dennis's own personal Calendly for
general enquiries, not a partner-specific or matching-aware booking system, and it isn't wired to any
owner/partner match. No booking table, no calendar API integration (Calendly API, Cal.com, or custom)
exists.

**Evidence:** `components/corporate/CorporateFooter.tsx:12-14,65-69`; no booking-specific code found
elsewhere.

**Smallest change:** each partner supplies their own personal booking link (Calendly, Cal.com, or
similar — the same pattern already used for the generic footer link, just per-partner instead of
site-wide) as a new field on the partner profile (§8), and the result page's booking CTA (§9) simply
links out to it. This avoids building a calendar API integration at all for a first version — genuine
two-way calendar sync/embedding would be materially more work and isn't required to get the funnel
working.

**Effort:** S for the link-out version; L if a real embedded/synced booking experience (availability
shown in-page, automatic confirmation) is wanted instead.

**Dependencies:** §8 (partner profile needs the field), §9 (needs somewhere to put the button).

**Risks:** the link-out version has a real weakness worth naming: nothing tells the product *that a
booking happened*, so "call booked" as a conversion event (brief §6) can't be measured without either
a webhook from the booking provider or a "confirm you've booked" click-through step. Worth deciding
which before committing to the link-out approach for the whole first version.

---

## 11. Nurture email sequence for not-yet-ready owners and family members; re-check prompt

**Status: Partial, and pointed at the wrong population today.** A re-engagement email cron already
exists — `app/api/cron/reengagement-emails/route.ts`, running daily, targeting **already-signed-up**
users who've gone quiet for 7+ days and haven't been emailed in the last 3
(`route.ts:22-25`), sending a "welcome back" email. **This is for existing customers going quiet, not
for someone who completed a free valuation and never signed up** — the population the funnel actually
needs nurtured. The mechanism (a scheduled cron, a `get_users_for_reengagement`-style RPC, a
`sendWelcomeBackEmail`-style template) is a reusable pattern, but the population and message need to
be new, not extended.

**Evidence:** `app/api/cron/reengagement-emails/route.ts:1-50`.

**Smallest change:** a new, parallel cron/RPC targeting `business_valuations` rows with no
corresponding signed-up account after N days, sending a distinct nurture sequence (not "welcome
back," since they were never a customer) — reusing the existing cron-auth guard
(`lib/cron-auth.ts`, referenced at `route.ts:6,13`) and email-sending pattern, not the existing
audience-selection logic.

**Effort:** M (new RPC, new email template/sequence, new cron entry — but riding on an already-proven
pattern for all three).

**Dependencies:** none blocking, though it's most useful once §9's "not ready" branch exists to feed
it a clean signal.

**Risks:** low; the main risk is compliance-shaped, not technical — this is commercial email to
someone who gave an email address for a free tool, not an existing customer, so the Spam
Act/consent-basis discipline the product already applies elsewhere
(`regulatory.config.json`) needs to extend cleanly to this new population and message.

---

## 12. Consent: owner consent to share results with a named partner; family data handling; referral-fee disclosure

**Status: Partial, and more nuanced than "missing" — read carefully before scoping this.**

**⚠️ Some of this already happens today, without an explicit consent screen.** The introducer
dashboard **already displays a dollar "Value gap" figure** for every owner attributed to that
introducer, in a plain table column (`app/introducer/page.tsx:165,181`), fed by
`introducer_owner_projection()` (`supabase/migrations/20260726000000_introducer_channel.sql:216-253`),
which explicitly returns `valuation_gap`/`valuation_today`/`readiness` alongside status. This is
disclosed in the privacy policy in general terms ("They see that their referral is progressing... and
whether your valuation is moving," `lib/privacy.ts:158-163`) but **there is no specific, point-in-time
consent click** — it's a standing term of using a partner's referral link, not an opt-in at any
particular moment.

**What's genuinely new for the funnel, and it's a bigger step than it looks:** the funnel's design
extends this from "the introducer whose link you clicked" (today's model — one fixed party, disclosed
generally) to "a partner the SYSTEM matched you to after the fact" (a party the owner had no prior
relationship with when they started). That's a materially different trust claim, and the product's
architecture today is built hard against exactly this shape elsewhere — the content wall
(`introducer_owner_projection` structurally cannot return conversation content;
`lib/trust.ts:69-78` states the boundary is enforced by what the dashboard can query, "not a policy
we promise to observe"). Building matched-partner sharing needs to extend that same discipline
(numbers-and-status only, never content) to a *newly assigned* party, with an explicit, logged
consent moment — not simply relaxing the existing wall.

**Family-member/adviser-on-behalf-of data handling:** confirmed **NOT FOUND**. The valuation flow has
no concept of who's filling it in (brief §3), so there's no privacy-policy language, consent flow, or
data model distinguishing "the owner's own data" from "a family member entered this about someone
else's business." The current privacy policy is written entirely in the second person to a single
assumed owner-actor (`lib/privacy.ts:92-216`).

**Referral-fee disclosure:** this part **already exists and is solid** — a generated, per-partner
disclosure statement citing the exact commission rate and current price-band range, designed to be
forwarded by the partner in their own voice (`lib/introducer/disclosure.ts:29,42-77`), plus an
assurance-conflict carve-out for partners who can't ethically accept the fee
(`lib/introducer/disclosure.ts:88-92`). This mechanism generalises cleanly to a matched (rather than
directly-referred) partner without new design — it's parameterised by partner identity already.

**Smallest change:** an explicit consent step at the booking moment (§9/§10) stating, plainly, which
partner will see which figures — reusing the existing disclosure-generation pattern (§ above) rather
than writing new legal copy from scratch. Family/adviser data handling needs its own, smaller
privacy-policy addendum once §3/§4 exist and it's clear what data a non-owner actually enters.

**Effort:** M for the consent-at-booking UI + copy (the disclosure-generation logic is reusable); the
family/adviser policy addendum is S once the underlying flows in §3/§4 are settled (write the policy
after the data model, not before).

**Dependencies:** §7 (matching, to know who's being consented to), §9/§10 (needs a booking moment to
attach the consent step to), §3/§4 (for the family/adviser addendum).

**Risks:** this is the item most worth getting right before shipping rather than iterating on live —
it's a trust/legal surface, not a UI nicety, and the product's own existing copy (the confidentiality
answer discipline documented at length in `docs/internal/KIRA_EVIDENCE.md` §5) shows this team has
already been burned once by an overclaimed privacy promise reaching a real, vulnerable customer.
Don't repeat that pattern here by shipping a vague or over-broad "share my results" consent line.

---

## 13. Partner standards tracking: response time, outcomes/conversion feedback, allocation weighting

**Status: Missing, entirely.** No response-time tracking, no conversion-rate-by-partner metric, no
service-level enforcement, and no allocation-weighting mechanism anywhere in the codebase.

**Evidence:** absence confirmed across `lib/introducer/`, `app/introducer/`, and `app/admin`
(introducer-related routes).

**Smallest change:** the existing `introductions` table already has a `status` lifecycle
(`clicked → signed_up → trialing/paying → lapsed`,
`supabase/migrations/20260726000000_introducer_channel.sql:82-83`) and a timestamp on every row
(`created_at`/`updated_at`) — a first, cheap version of "response time" and "conversion rate" is
derivable purely from timestamps already being written, with no new columns: time from `clicked` to
`signed_up`, and the ratio of `signed_up`→`paying` per partner. A genuinely new "did the partner
respond within one business day" metric needs a new event to record (a manual "I made contact"
button, or a booking-confirmation webhook once §10 exists) — that part is new.

**Effort:** S for the timestamp-derived metrics (a reporting query, not new data collection); M for
the "did they actually respond" signal, which needs a new event source.

**Dependencies:** feeds §7 Phase 2's weighting.

**Risks:** low technically; the real risk is using immature/low-volume data to weight allocation too
early — with few partners live, one slow week for one partner could swing weighting disproportionately.
Recommend a minimum sample size before weighting kicks in.

---

## 14. Published partner rules page (attribution, allocation, standards)

**Status: Missing, as a dedicated page — but the closest existing analog is close.** No page
publishing "how attribution and matching work" exists. The nearest existing precedent is
`app/introducer/terms/page.tsx` (the undertaking a partner accepts before their link goes live) and
the disclosure text pattern (§12) — both already establish the product's habit of writing plain,
specific, checkable statements about how the mechanics actually work, rather than vague assurances.

**Evidence:** `app/introducer/terms/page.tsx`; `lib/introducer/undertaking.ts`.

**Smallest change:** a new page following the same register as the existing undertaking page, stating
plainly: first-touch attribution always wins (§6); matching only runs on unattributed leads and on
what criteria (§7); how allocation weighting works once it exists (§13); the one-business-day response
standard. This is a documentation task once the mechanisms it describes actually exist — writing it
before §6/§7/§13 are built risks publishing rules for a system that doesn't yet do what the page says.

**Effort:** S, once the underlying mechanisms exist.

**Dependencies:** should be written last among the funnel-mechanics items — after §6, §7, §13.

**Risks:** low, but sequencing matters: a published rules page describing capabilities that don't
exist yet is a marketing-claims-table violation of exactly the kind this audit exists to prevent.

---

## 15. Analytics and events end to end, by series, platform, campaign, and partner

**Status: Missing, entirely.** No analytics tool of any kind is installed (brief §6) — confirmed, not
inferred. Every conversion event named in the funnel spec (check started, check completed, doorway
chosen, guide downloaded, "send to parent" used, call booked, partner application, sign-up) would need
instrumenting from zero, because there's currently nothing to instrument *into*.

**Evidence:** brief §6, full search across the repo for PostHog/GA/Segment/Vercel Analytics — none
found; `regulatory.config.json:40-43` confirms this is a deliberate current state, not an oversight.

**Smallest change:** two decisions, not one build: (a) pick and install an analytics tool (this is the
first time in the whole audit a genuinely new third-party dependency is the right answer, since
nothing in the codebase provides even a first-party event log to build on); (b) wire the UTM-capture
extension already scoped in the brief (§6 there) so events can be tagged by series/platform/campaign,
and tag events by partner using the attribution mechanism already scoped in §6 here. Re-declare the
regulatory-inclusions cookie/analytics state the moment this ships
(`regulatory.config.json:40-43` explicitly calls this out as a required step, not optional).

**Effort:** L — this is the single largest "from zero" item in the whole list, because unlike every
other capability here there's no existing partial mechanism to extend.

**Dependencies:** benefits from §6 (attribution-through-the-flow) landing first, since partner-level
event tagging depends on it.

**Risks:** doing this last, after several funnel features already exist, means retrofitting
instrumentation onto flows built without it — genuinely easier to build analytics-aware from the
first new route onward (§1's doorways) than to bolt it on afterward. Worth sequencing earlier than its
position in this numbered list implies; see the phased sequence below.

---

## 16. Kira on-site assistant answering explanatory questions (so no human is the contact point)

**Status: Missing, as the funnel would need it — and what exists today is architecturally the
opposite, on purpose.** A public "ask a question" surface does exist —
`app/api/kira/ask/route.ts` — but its own header comment states plainly why it is **deliberately not
an answering endpoint**:

> "SO THIS IS DELIBERATELY NOT AN ANSWERING ENDPOINT. It does not put a model in front of an anonymous
> visitor — that is a prompt-injection surface and a cost centre reachable by anyone with the URL. It
> does the honest thing instead: records the question, alerts the operator, and returns a receipt the
> page shows." — `app/api/kira/ask/route.ts:14-18`

This exists precisely because an earlier version tried to answer live and produced a worse failure —
a real visitor's question ("who else can see what I tell you? My staff don't know I'm selling") went
into a text box with no handler and vanished silently (`route.ts:6-12`). The fix chosen was "a human
reads it," not "make the AI answer safely" — the opposite direction from what "no human is the
contact point" requires.

**Evidence:** `app/api/kira/ask/route.ts:1-50` (full header comment explains the design choice).

**Smallest change:** this genuinely can't be scoped as "extend the existing thing" — it needs a
different design decision than the one already made, for reasons the existing code explains clearly
(cost exposure to anonymous traffic, prompt-injection surface). A safer version of "no human contact
point" would likely mean: a scoped, cost-bounded FAQ-style assistant answering only from a fixed,
reviewed knowledge base (not open-ended reasoning about an anonymous visitor's situation) — closer in
shape to the disclaimer-and-FAQ content already written (`lib/faq.ts`, `lib/trust.ts`) than to a live
conversational agent.

**Effort:** L — this is a genuine new build with real safety/cost tradeoffs to design, not a
configuration change to the existing `/ask` endpoint.

**Dependencies:** none blocking, but should be scoped carefully rather than rushed — see risks.

**Risks:** the highest safety/cost risk item in this entire list. The existing code already
demonstrates the two failure modes to avoid: an unhandled box that silently eats real questions from
vulnerable people (the original defect), and an unbounded AI-answering surface exposed to anonymous
traffic (the thing the current design deliberately avoided). Any build here needs to solve both at
once, not trade one for the other.

---

## Recommended build sequence

Phased so that **paid BBBO and family ads do not start until enough partners are live, in the regions
those ads will actually target, to give a matched owner a real adviser to talk to** — running paid
traffic into a funnel with no partner coverage in a viewer's state would waste the ad spend and give a
first-time visitor a dead end at the exact moment they're most receptive.

**Phase 0 — foundations, before any new content ships:**
- §6 Attribution-through-the-flow fix (small, and everything downstream depends on it being right first)
- §15 Analytics, started now rather than retrofitted (even a minimal event log from day one beats
  instrumenting after three new routes already exist)
- §8(a) Carry the already-collected enquiry fields (state, practice type, client band) into
  `introducers` — cheap, and unblocks partner recruitment tracking immediately

**Phase 1 — partner supply, before any consumer-facing funnel work:**
- §5 Tidy adviser onboarding (rides on §8(a))
- §8(b) New partner profile fields (photo, bio, industries, deal range, capacity, availability, a
  booking link per §10's link-out approach)
- §13 (timestamp-derived version) Basic partner performance visibility, even manual, so there's a
  factual basis for deciding "do we have enough partner coverage yet"
- §14 Published partner rules page, once §6/§7-Phase-1/§13 exist to describe truthfully

**Phase 2 — the consumer funnel, gated on Phase 1 producing real partner coverage in target regions:**
- §1 Doorways + landing routes
- §2 Short front-end for cold traffic (feeding the existing full process, never replacing it)
- §3 Location + main-concern fields; resolve the exit-timeframe consent conflict deliberately
- §7 Phase 1 matching (location + capacity, manual review)
- §9 Result-page matched-partner card + booking CTA (link-out version per §10)
- §12 Consent-at-booking step

**Phase 3 — the family strand and richer matching, once Phase 2 is proven:**
- §4 Family path (shortened flow, guide, share link)
- §12 Family/adviser data-handling policy addendum
- §11 Nurture sequence for not-yet-ready leads (both owner and family-originated)
- §7 Phase 2 matching (full criteria + performance weighting), once §13's data has enough volume to
  weight on safely

**Deliberately last, and deliberately not gating anything else:**
- §16 The AI-answering on-site assistant. It's the highest-risk, most novel build in the list, it
  isn't required for the funnel to function (a "we'll get back to you" pattern, or routing questions
  to the FAQ/trust content that already exists, covers the gap adequately for launch), and rushing it
  to hit a "no human contact point" ambition risks recreating either of the two failure modes the
  current code already learned from the hard way.

**Before paid BBBO/family ads specifically:** Phase 1 must be genuinely complete with live partner
coverage in whichever states/regions the ad campaign targets — not just "the matching engine works,"
but "there is a real adviser a matched owner in that region can actually book." Running the ads before
that is spending real money to generate leads with nowhere real to land.
