# Handoff — Kira work done from the BucketLyst session (2026-07-27)

**What this is.** A BucketLyst session was asked some Kira questions and carried out one Kira
change before we realised the instructions were meant for you. This is everything it touched and
everything it was about to touch, so you can adopt it, finish it, or bin it without re-deriving
any of it. Read alongside your own `docs/NEXT_SESSION.md` — nothing here supersedes it.

**Written by:** the BucketLyst session. **Branch:** `feat/advisor-practice-details`, committed,
not pushed, no PR.

---

## ⚠️ Read first: a near-miss on PR #28

The session started work while checked out on **`fix/canonical-memory-guard`** — the branch behind
your open, CI-green PR #28 — and an `npm install` dirtied its `package.json` and `package-lock.json`
before anyone noticed. It was moved to a fresh branch off `main` and **PR #28 is untouched.**

The general point, since two sessions are now working in this repo: uncommitted changes are not
branch-scoped. They follow whoever runs `git checkout`. That is why the work below was committed
rather than left in the tree for you to find — a dirty tree is how one session's change lands in
another's PR.

---

## Shipped: `1a834e1` on `feat/advisor-practice-details`

Closes **release-blocker ❌6** from your `NEXT_SESSION.md` — *"/advisors form has no ABN field on a
form registering a party we intend to pay, and does not capture the 'one condition' the page says
they confirm on joining."* It also incidentally closes the `/advisors` half of **❌5** (the success
state was a dead end; it now offers a next action).

**The shape of it.** The firm field is the canonical ABR lookup instead of free text, so one
interaction returns the registered entity name, its ABN and its state together. That is *less*
typing than the old free-text firm field, not more — which is what made it possible to add
verification to a form we deliberately keep under a minute.

| File | What changed |
|---|---|
| `app/api/abn-lookup/route.ts` | **New.** Mounts `@caistech/corporate-components/abn-lookup`. |
| `components/AbnLookupField.tsx` | **New.** Name-search combobox → fills entity name + ABN + state. |
| `supabase/migrations/20260727010000_advisor_enquiry_practice_details.sql` | **New.** `first_name`, `last_name`, `advisory_type`, `firm_abn`, `firm_state`, `undertaking_confirmed_at`. |
| `app/advisors/AdvisorEnquiryForm.tsx` | Split name, ABR firm field, practice type, undertaking checkbox, success-state next actions. |
| `app/api/advisors/enquiry/route.ts` | Validates + persists the above; operator email now shows practice, verified ABN, and the undertaking. |
| `app/introducer/terms/*` + `lib/introducer/index.ts` | Collects who we pay into the **existing** `org_name` / `org_abn` / `payee_type` / `payee_name` columns. |

**Decisions inside it worth not re-litigating:**

- `advisor_enquiries.name` is **kept and still NOT NULL**, written from the parts. Existing readers
  keep working; the migration backfills the split best-effort for rows created before it.
- The ABN field **never blocks submission**. `ABR_GUID` unset, ABR down, or no match → it silently
  becomes a plain text input and submits what was typed. An outage at the register must not cost a
  broker enquiry.
- Typing after selecting **clears** the ABN. Leaving a verified ABN attached to edited text is how
  you silently misattribute an entity.
- `payee_name` is **derived**, not asked for — paying the firm means the registered entity, paying
  the person means the name already on file. A third field only invites a fourth spelling.
- The enquiry undertaking is the **weaker, earlier** record. `introducers.terms_accepted_at` at the
  portal is still the binding one and still gates the board.
- `introducers` already had all four payee columns from the channel migration. Nothing had ever
  collected them.

**Verification:** typecheck clean · build compiles · `ƒ /api/abn-lookup` confirmed **dynamic**.

**Not verified:** no live browser pass. The field has never been used against the real ABR by a
human, because of the config gap below.

### The one thing that makes this inert in production

**`ABR_GUID` is not set in Kira** — not in `.env.local`, and not in `portfolio-manifest.yaml`
either (it is in BucketLyst's and DealFindrs' `.env.local`, so the credential exists, it just was
never made canonical). Until it is set, the route returns `{configured:false}` and every firm field
degrades to plain text: **the feature ships and does nothing, quietly, exactly as designed to fail
safe.** Set it in `.env.local` + Vercel, and consider adding it to the manifest `shared:` block so
the next product does not repeat this.

`force-dynamic` on the route is load-bearing and easy to "tidy" away: route-segment config cannot
travel through a re-export, so without it some Next versions prerender the route static and freeze
a single response for every caller. DealFindrs built the identical file `○` while BucketLyst built
it `ƒ`.

### Pre-existing failure, not caused by this

`npm test` → **43 passed, 1 failed**: `lib/billing/billing.integration.test.ts:191`,
`expected 'stale' to be 'applied'`. **Verified against `main`** with the branch checked out — it
fails identically there. Not from this work, but it is red and someone should own it.

---

## Not done: the Setup Kira decision

The operator made a product call in session. It is **not implemented** and no code was written
toward it. Recording the reasoning so it survives.

### What was found

The FAQ answer to *"What do you mean 'my own Kira'?"* (`lib/faq.ts:30`) says: *"you'll have a quick
conversation with Setup Kira… then we create a unique Kira agent just for you — one that knows your
situation from day one."*

That describes a flow the landing page no longer routes anyone into:

- Every landing CTA (`app/page.tsx` lines 121, 182, 278, 412) goes to `/business-valuation`.
- The paying path is `/business-valuation` → `/plan` → `/api/checkout`
  (`successUrl: /onboarding?session_id=…`) → `/onboarding` (set password) → `/dashboard?welcome=1`.
- **`/onboarding` never mentions Setup Kira.** `/start` is now reachable only from `/about` and
  from links inside `/dashboard`.
- `/login` redirects to `/talk`, which resolves the owner's active agent and **falls through to
  create** for a brand-new user.

So the last clause is the part that is actually wrong rather than merely out of order: a paying
customer who never passes through Setup Kira gets an agent created **without** the context the
sentence sells. `app/create-kira/page.tsx` is a leftover stub that just redirects to `/start`.

### The decision

Do **not** wire `/onboarding` → `/start`. **Retire the separate Setup Kira step and fold the
framework-setting conversation into the first conversation with the owner's own Kira.**

The operator's reasoning, in his words: *"she can set the tone for the relationship — like any good
consultant/new exec, they need to establish the framework in which they will operate."* The
framework conversation is not administrative intake to be done by a stranger and handed over as a
file; it is the first act of the working relationship, and it belongs to the Kira who will hold it.

### Mechanism, as far as it was worked out

Today: `/start` runs the shared Setup Kira agent (`NEXT_PUBLIC_SETUP_KIRA_AGENT_ID`) → writes a
`kira_drafts` row → `/setup/draft/[draftId]` review → `POST /api/kira/create` provisions the
per-user agent with the gathered context.

Folded: provision the per-user agent at `/onboarding` via `ensureUserAgent`, give it a
**first-conversation stage** whose job is to establish the framework, and let it persist what it
learns through the memory tools rather than baking context into a provisioning-time prompt. Per
`VOICE_MEMORY_STANDARD` the agent **pulls** state, so the framework becomes memory — which is
strictly better than a baked prompt because it stays updatable as the business changes.

Then retire: `/start`, the Setup Kira agent, `kira_drafts`, `/setup/draft/[draftId]`, the
`/create-kira` stub — and rewrite the `OWNER_FAQ` entry to describe what actually happens.

**Watch for:** the agent must exist *before* the first conversation, so provisioning moves earlier
in the flow; and `probeMemoryLoop`'s `expectContinuity` defaults TRUE, so the memory loop has to be
genuinely working on this path, not merely present.

### It interacts with your decision #1

Folding setup into the owner's Kira makes the **first thing a paying customer does** a voice call.
That makes the ElevenLabs consent-modal wording *more* load-bearing, not less — and the privacy
policy it links to still has to exist. Decide #1 before, or alongside, this.

---

## For your BucketLyst counterpart

Two findings in your `NEXT_SESSION.md` were carried back and are being actioned there: the voice
consent modal (which hits BucketLyst identically the moment its agent goes live — the package never
configures consent text, so every product shows the vendor default), and the missing
ABN/entity/privacy footer, which is doubly awkward while we are asking BucketLyst's founder to
publish hers.
