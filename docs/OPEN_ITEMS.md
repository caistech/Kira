# Open items — Kira

> Everything raised and not closed, as at **2026-07-31**. Written after a long session so nothing
> raised in passing is lost. Ordered by what blocks what, not by size.
>
> Closed items are not listed. What shipped today: the task mirror + discovery pass, contact lookup,
> valuation persistence, the sign-in chrome, the Genome register + entity split, the migration
> ledger. See `PROJECT_STATUS.md`.

---

## 1. Blocking a real client

### 1.1 Factory2Key needs its own sending domain in Resend
**Why:** the footer now correctly names Factory2Key with its ABN, and `Reply-To` reaches
`dennis@factory2key.com.au` — but the visible **From** is still
`noreply@updates.corporateaisolutions.com`, because that is the only Resend-verified sending domain
in the portfolio. A construction client receives F2K mail from the AI company's domain. Technically
valid, and precisely the wrong signal for the entity separation.

**What it needs — DNS records, NOT website access.** Whoever controls DNS for `factory2key.com.au`
(registrar or DNS host) adds the records Resend generates: a DKIM record, an SPF/return-path record,
and optionally DMARC. No hosting, no CMS, no FTP.

**Use a SUBDOMAIN** — `updates.factory2key.com.au` or `mail.factory2key.com.au` — not the apex.
The apex already carries their real mail (Google Workspace or similar), and adding an SPF record
there can break it. A subdomain isolates the sending reputation and cannot affect existing email.

Code side is small: `drainEmailOutbox` already accepts `from`; it currently comes from one env var
(`EMAIL_FROM`) and needs to be resolved per tenant instead.

### 1.2 Naive-tester re-run, and the share gate
The production URL is **not shareable** until a naive-tester pass is recorded
(`PRODUCT_STANDARDS` §0.5). Three of the findings that closed the last run are now fixed, so this is
the natural next step — and it now has considerably more to walk than it did.

---

## 2. Decisions only the operator can make

### 2.1 The one refused Genome rewrite
```
Factory to Key is managing multiple modular site deliveries including Lot 109, Lot 91,
and Lot 442, with a current issue at Lot 91 due to premature delivery without building approval.
```
The rewrite drops "Factory to Key" as the subject. Every lot number survives. If this Genome belongs
to F2K, dropping it reads naturally; if a different entity manages those deliveries, it erases who.
Unchanged until decided.

### 2.2 Three memories the entity classifier could not place
Left exactly where they were, deliberately:
- *"Dennis runs multiple businesses including Corporate AI Solutions for AI development and Factory
  to Key for modular building logistics."* — true of both; arguably worth keeping in either Genome.
- *"Wants photo capture integrated within app for job-related photo organization."*
- *"Wants to build an in-app phone call system … tag parts to specific projects like lot 109."*

The last two are Kira feature requests (AI business) whose use case is F2K work.

### 2.3 The tasks awaiting approval
Four sit in the queue. Under this account's identity, approving one sends it **under Factory2Key's
ABN**. The AI-related ones were tests — discard rather than approve.

### 2.4 Roger's email for the Lot 109 contour survey
Task `562ccf05` has `request.to = null` and the drain correctly refuses it. Contacts lookup is now
live, so re-asking may resolve it — otherwise it needs the address from you.

---

## 3. Built but not yet proven live

| Item | State |
|---|---|
| **Contact lookup end-to-end** | Scopes granted and verified in the connection record; no live voice test has resolved a name yet. "Roger at Quantum Surveys" is the natural first test. |
| **`genome-classify` cron** | New, runs at :30 past the hour. Write-time classification is wired into the post-call path; the straggler sweep has not been observed running. |
| **Valuation carrying into an account** | Persistence is fixed and `/api/valuation/claim` exists (first-valuation-wins). The full path — run valuation, close tab, sign up next day, see the baseline — has not been walked since the change. |
| **One full doing-loop round trip** | Long-standing. Dispatch → approve → send → callback → mirror has never been walked end to end in one sitting by voice. |

---

## 4. Known residuals

- **The register rewrite can shift meaning in ways the guard cannot see.** It checks that figures and
  proper nouns survive; it cannot catch *"Dennis is based in Perth"* → *"The business is based in
  Perth"*, which keeps every noun and changes the claim. Originals are in
  `kira_memory.content_original`; `--revert --apply` restores them.
- **`billing.integration.test.ts` flakes.** Failed once on an out-of-order-event assertion, then
  passed in isolation and on three subsequent full runs. It talks to live Stripe test mode and
  Supabase, so it is stateful. If CI goes red there, this is the likely cause before anything else.
- **Four memories still name the owner** but are all `none`-classified, so the Genome filters them
  out and they are never displayed.

---

## 5. Deferred by decision

- **A second Kira account for Global Buildtech Australia.** The architecture supports it with nothing
  new: tenant = user id, so a second login is a second tenant with its own identity, Drive, contacts
  and Genome. The 52 parked memories are the corpus it would start from
  (`scripts/split-genome-entity.mjs --restore --apply`). Deferred, not blocked.
- **Migration ledger** — reconciled 2026-07-31; 39/39 recorded. Nothing outstanding, noted so the
  next session does not re-investigate it.
