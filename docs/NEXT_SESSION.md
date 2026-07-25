# Kira — next session: what to review and update

**Written 2026-07-26 at session close.** Read with `BROKER_CHANNEL_BUILD_STATE.md` (the channel
plan) and `naive-tester-reports/2026-07-26-prod/anneke.md` (the full walkthrough this list comes
from).

---

## ⛔ Read this first: the URL is gated

`/naive-tester` ran against production on 2026-07-26 and **FAILED**. Until the ❌ items below are
fixed and a PASS is recorded, **the production URL must not be shared — not even with the operator**
(PRODUCT_STANDARDS §0.5, enforced by the url-share-gate hook).

```bash
node ~/PycharmProjects/cais-shared-services/scripts/gate-check.mjs \
  record kira naive-tester pass --deployment <live-id>
```

The tester's verdict, verbatim, because it is the honest summary: *"I would not sign up today, and
I would not send a client to it today."* The bones were rated better than anything else aimed at
this problem — the failures are all fixable, and three of them are an afternoon.

---

## Three decisions the operator owes before the work can be done

These are **not** bugs with an obvious fix. Each was explained in session and is waiting on a call.

### 1. Voice consent modal — whose wording wins?

ElevenLabs shows its own consent modal before any call: *"I consent to the recording, storage, and
**sharing of my communications with third-party service providers**… as described in the Privacy
Policy."*

Against our own copy — `/pricing`: *"what you tell Kira stays between you and your business"*;
`/plan`: *"your knowledge stays private and yours to keep"*; `/terms` cl.3: *"we do not sell it."*
And it links a Privacy Policy **that does not exist**.

**The modal is not wrong.** ElevenLabs genuinely is a third-party processor. Our copy is the loose
part. Verified in session: `@caistech/elevenlabs-convai` **never configures consent text**, so every
product in the portfolio shows the vendor default — this will hit BucketLyst identically the moment
Wren goes live.

| option | cost | effect |
|---|---|---|
| Reconcile the COPY — "processed by our AI providers under contract, never sold, never trained on" | words only | honest; softens the privacy pitch that sells to exit-stage owners |
| Override the CONSENT text at agent level (ElevenLabs supports custom terms) | provisioning change | keeps the pitch; needs the privacy policy to exist first |
| Both | afternoon | recommended |

**Either way the privacy policy must exist** — the modal links to it today and it 404s.

### 2. Valuation contradiction — words only, or a repricing?

**The mechanism** (`lib/valuation/model.ts`): `readiness` is a weighted average — owner-dependence
3, systems 2, recurring 2, concentration 1.5, growth 1.5. `i_am_the_business` scores **0**, but the
other four carry **7 of 10**, so someone who says the business collapses without them can still
reach `readiness ≈ 0.70` and cross the `>= 0.67` **"high"** band (line 300).

The high branch then asserts *"You have done the hard part. A buyer can largely see how this
business runs without you"* (line 329) while the weakness line, built from the individual factor,
says *"the business runs on you"* (line 266). Two strings, one result, nothing reconciling them.
The tester answered "I am the business" and scored **69/100 transferability**.

| option | changes | note |
|---|---|---|
| **A — owner-dependence caps the band.** Can't claim "high" when they say they ARE the business | **words only** — `band` is used solely for narrative, no number moves | domain-true; a broker would say no amount of recurring revenue compensates |
| **B — reweight** so owner-dependence dominates | **every number moves**, including ones already shown to people | honest, but it is a repricing |
| **C — copy-only.** High branch stops claiming "runs without you"; says "strong on most fronts, one outlier" | words only | minimal |

Recommended: **A + C**. **B is the operator's call** because it re-prices.

### 3. Industry field accepts any text

The input free-types into `industry` on every keystroke (`app/business-valuation/page.tsx:351`);
picking from the dropdown is optional. `zzqq nonsense trade` produced a full valuation.

The sector multiple is the spine of the model. On no match it falls back to *"market average,
flagged"* (`model.ts:40`) and still renders a confident three-number result — while the helper text
promises *"we'll use its sector-average multiple"*, which is then not what happened.

| option | trade-off |
|---|---|
| Require a selection | cleanest; a plumber typing "civil earthmoving" who sees no exact match may bounce |
| Free text + disclose the fallback on the result | keeps the funnel, keeps the number honest |
| **Require selection with an explicit "Other / not listed"** → market average, stated | recommended — never silently substitutes, and tells you which sectors to add |

---

## ❌ Release-blocking, no decision needed — just do them

1. **No ABN, no entity, no privacy policy anywhere on the site.** Footer "Privacy" → `#`. The
   canonical sender identity was locked portfolio-wide on 2026-07-26 (`portfolio-manifest.yaml`
   `shared:` + `PRODUCT_STANDARDS.md`) — **Global Buildtech Australia Pty Ltd, ABN 54 672 395 685,
   76-84 Brunswick Street, Fortitude Valley QLD 4006** — and it appears nowhere a customer can see.
   Doubly awkward: we are simultaneously telling BucketLyst's founder to publish hers.
2. **`/unsubscribe` is unbranded** — no logo, no header, no contact, no link back. The tester's
   reaction: *"my first thought is phishing and my second is I'll mark it as spam"*, which is worse
   for deliverability than the unsubscribe itself. Also fails the §5 explanatory-header standard.
3. **"Admin" is in the public customer nav**, desktop and mobile. Move it to a bookmark.
4. **Footer touch targets are 18–20px** (§1 requires ≥44px).
5. **Dead ends:** `/advisors` success state offers no next action; `/introducer/expired` offers only
   "email a human" with no self-serve renewal; login's "verify your email" has no resend. The
   introducer one matters most — an advisor locked out every 8th day has to email a person to see
   their own dashboard, which directly undercuts what `/advisors` sells them.
6. **`/advisors` form has no ABN field** on a form registering a party we intend to pay, and **does
   not capture the "one condition"** the page says they confirm on joining. The undertaking gate
   exists at the introducer portal but the enquiry form collects nothing.
7. **Valuation inputs are base64 in the URL** (`/plan?v=eyJ...`) — decodable, editable, and if the
   link lands in an email chain the owner's turnover and profit ride along in it.

---

## The finding that is strategy, not a bug

> *"10% of $99 is $9.90 a month. To a broker whose fee on a sale is $30k–$80k that is not an
> incentive, and it is **worse than nothing**, because I now have to disclose a commission to a
> client I've acted for since 2011 for a sum that makes me look cheap."*

Her alternative, and it is a better product than the referral link: a **pre-sale transferability
report** the advisor attaches to a listing appraisal. *"I'd introduce every vendor I take on,
commission or not, because it makes my appraisal look better and shortens due diligence."*

That reframes the channel from "forward my link" to "here is a tool that raises your listings'
multiples." **Operator decision — do not implement either way without it.**

---

## Shipped 2026-07-26 (do not redo)

- **PRs #21–#27 merged and deployed.** Workstream B (billing), Workstream C (introducer channel +
  undertaking), terms/unsubscribe/opt-out, advisors front door + FAQ, the Stripe live switch.
- **Stripe live switch is staged and OFF.** `STRIPE_LIVE_MODE=false`; live key + live webhook secret
  both set; test key moved to `STRIPE_SECRET_KEY_TEST` (sensitive, prod+preview). Guards throw in
  BOTH directions — live-key-in-test-slot caught a real misconfiguration in production today.
  **To go live: flip the flag and redeploy.** Nothing else.
- **The Stripe webhook works for the first time** — no endpoint had ever been registered and
  `STRIPE_WEBHOOK_SECRET` was set in no environment. Test-mode endpoint registered, verified by
  firing a real subscription and watching the rows land.
- **Memory loop is on the canonical guard.** `scripts/test-memory-loop.mjs` (a 202-line fork)
  deleted; the workflow runs `portfolio-gate-memory-loop`. **5/5 PASS against production**,
  including continuity. PR #28.
- **Pricing corrected** — `/pricing` said "from $249", the engine's entry band is $99.

## Open PR

**#28** — canonical memory guard + the pricing correction. CI green, unmerged.

---

## Still owed, lower priority

- `EMAIL_SENDER_*` are set in Vercel but **no email has been sent through the compliant path in
  production yet** — the footer is unverified in the wild.
- Migrate the remaining templates in `lib/email/resend.ts` onto `@caistech/email-send` (only the
  trial reminder and introducer invite use it).
- `VOICE_COST_PER_MINUTE_USD` is a $0.10 estimate — recalibrate against real ElevenLabs invoices.
- A **live-mode Stripe webhook endpoint** when the flag is flipped (only a test-mode one exists).
- Kira's **migration history drift**: 6 migrations are local-only in `supabase migration list`
  though their objects exist in prod. Apply via the Management API then
  `migration repair --status applied <version>` — never a blind `db push`.
