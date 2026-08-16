# Handoff — provider routing, the orchestrator end, and per-tenant capability

**From:** the Microsoft/routing session, 2026-08-16
**To:** the main Kira session
**Re:** what is built, what is not, and the three things left in order
**Status:** two branches committed and unpushed; nothing merged; no agent touched.

**⚠️ REVIEWED 2026-08-16 by the area_agenda session.** Every factual claim in the original was
checked and holds. Four things were added, each marked in place: a **new open item 0 in §3** (the
Microsoft consent copy has no consumers and has repeated a defect closed the day before), an
**answer to §2's open item 1** that is worse than the question (onboarding has no document step at
all), a **reprovision collision** in §4, and the **sequencing constraint cleared**. §6 reordered
accordingly.

---

## 0. The one-line state

An owner can now be **routed** to Google or Microsoft and **consent** on either. Nothing downstream
knows the difference: the status contract is Google-shaped, the agent prompt says "their Google
Drive" to every tenant, and no tool is gated on what a given owner actually connected.

So the work splits exactly as you framed it: **(a) is largely done, (b) is half done, (c) is not
started** — and (c) is where the user-visible failure lives.

---

## 1. What exists, and where

| Branch | Repo | Commits |
|---|---|---|
| `feat/microsoft-graph-files` | orchestrator | `a653c40`, `3c4c0a2` |
| `feat/document-provider-routing` | kira | `aa48e6c` |
| `main` | cais-shared-services | `c65ba03` (doc, already on main) |

**Read `cais-shared-services/MICROSOFT_GRAPH_CONNECTOR.md` before touching any of this.** It carries
the traps — rotating refresh tokens, the missing scope prefix on read-back, OData escaping, and the
`.docx` problem in §5.6 which decides part of (a).

---

## 2. (a) The ingestion path — what, why, when, how

### The rule, and it is the whole design

> **Detect to SUGGEST. Never to route.**

MX on the business domain reliably says where the owner's **mail** runs. It does **not** say where
his **documents** are — Microsoft 365 for mail with Dropbox for files is ordinary in trades. So the
detected provider is pre-selected and listed first, the other is always beside it, and the reasoning
is printed in one sentence so he can see it is a guess.

Auto-routing on that signal puts a man who has never had a Microsoft account in front of a Microsoft
login at the most abandonment-prone moment in the product. He would not report it; he would stop.

### How the divert actually works

`/setup/documents` (new) is the front door:

1. `detectDocumentProvider({ accountEmail, businessDomain })` in
   `lib/business-identity/mail-provider.ts`.
2. It prefers **`business_identity.sending_domain`** — his website domain, asked for rather than
   derived — and falls back to the account email domain. ⚠️ It is *not* on the user row; the first
   draft read `user.business_domain`, which typechecked (`select('*')` is untyped) and would have
   been `undefined` forever.
3. MX suffix match → `microsoft` / `google` / `null`, `confidence: high`. Consumer address
   (`@gmail`, `@hotmail`) → the same, `confidence: low`. ISP address (`@bigpond`, `@optusnet`) →
   **null**, which is the correct answer for a large slice of the ICP.
4. Null suggests nothing, reorders nothing, and shows both options plainly.

Two-second DNS timeout, never throws, never blocks the render.

### The three destinations

| Path | Page | State |
|---|---|---|
| Google | `/setup/drive` | Unchanged, working |
| Microsoft | `/setup/onedrive` | New, working, needs env (see §3) |
| Neither | `OtherProviderForm` | Records a captured ask via `sendUnansweredRequestAlert` |

"Somewhere else" is deliberately **not** a dead end. It is the demand-capture mechanism
`CONNECTOR_POLICY.md` §A asks for — a refusal is "measured demand with a timestamp" — and it is how
Dropbox earns a place in the queue rather than being guessed at. It promises nothing.

### ⚠️ Open in (a)

1. ~~**Only the Settings page routes into the chooser.**~~ **CHECKED 2026-08-16 by the area_agenda
   session — and the answer is worse than the question.**

   Nothing in onboarding links `/setup/drive`, so a new Microsoft owner does **not** land on the
   Google form. He lands **nowhere**: `lib/onboarding/gate.ts` is `baseline → identity → agent` and
   has **no document-connection step at all**. The only links to either page are
   `app/settings/page.tsx` (243 → `/setup/drive`, 260 → `/setup/documents`) and the chooser itself.

   So the connector is discoverable **only from Settings**, which a 66-year-old will not go looking
   for. That is not a routing bug to confirm; it is a missing onboarding step, and it arguably
   outranks the Entra registration in §6 — the registration makes real a page that nobody reaches.

   ⚠️ It is a *step*, not a *gate*. `lib/onboarding/gate.ts` renders in place and never redirects,
   deliberately: this product has twice held an owner at a setup screen he could not pass (the
   thirteen-hop `/setup` loop, and the `canSend` gate that trapped every owner outside Australia).
   Add it as something he is offered, not something he is stopped by.
2. **`drive.file` has no Picker.** The Google `picked` tier is offered and Graph-side there is no
   equivalent, but on the Google path `picked` cannot open anything the app did not create without a
   Google Picker, which is not built. Pre-existing, not introduced here.
3. **The `.docx` gap is disclosed, not solved.** `/setup/onedrive` tells the owner she can read text,
   CSV and web documents today and that Word files are not there yet. That paragraph is load-bearing
   honesty — **remove it only when the shared text extractor lands**, and see §5.

---

## 3. (b) The orchestrator end — getting the right connection

### Built

- `src/connectors/microsoft.ts` — scopes, consent URL, exchange, refresh with **rotation handling**,
  granted-scope read-back, search/read, folder ensure, doc upsert.
- `app/api/connect/microsoft/{route,callback}` — signed ticket in, `connections` row out.
- `microsoft-consent-copy.ts` — owner-facing claims derived from the scopes, asserted by tests.
- `graph-no-send.test.ts` — repo-wide mail-send perimeter, written before any Graph mail path exists.
- `.env.example` — all 34 vars, enumerated from source.

The ticket is **shared** with Google: same `ConnectClaim`, same secret, provider chosen by which URL
Kira sends him to. `connections` is one row per tenant **per provider**, so both can be connected at
once — that is legal at the data layer today.

### ⚠️ Open in (b), in order

0. **`microsoft-consent-copy.ts` HAS NO CONSUMERS — this has repeated a defect closed yesterday.**
   *(Added 2026-08-16 by the area_agenda session.)*

   §3 lists it as built: *"owner-facing claims derived from the scopes, asserted by tests."* Both
   halves are true, and **nothing renders it** — `grep` returns the file and its test, nothing else.
   `app/api/connect/microsoft/route.ts` verifies the ticket and **redirects straight to Microsoft
   with no interstitial**, exactly as the Google route does.

   That is the same shape as `google-consent-copy.ts`, whose only importer for its entire life was
   `scripts/send-test-connection-email.ts` — and it produced a real, live defect: `scopesFor()`
   spreads `CONTACTS_SCOPES` in **unconditionally**, including `contacts.other.readonly` (every
   address Google auto-saved from mail he has sent), and because there is no interstitial, **Kira's
   page was the owner's only description of what he was granting and it never mentioned contacts.**
   He pressed *Continue to Google* expecting Drive and Google asked for his address book. Closed in
   Kira `d74b499` by stating it on the form; the derived-copy half is still owed and is asked for in
   `docs/BRIEF_ORCHESTRATOR_CONSENT_SUMMARY.md` (`GET /api/connect/summary`).

   **Do the Microsoft equivalent now, while the branch is unmerged.** It is the same route with a
   different provider, and the alternative is finding out after a real owner has consented to
   something no page told him about. This is the `feedback-correct-tested-and-unreachable` class:
   correct, tested, deployed, and rendered to nobody.

1. **The Entra app registration and `MICROSOFT_*` env vars do not exist.** Until they do,
   `/setup/onedrive` reaches a 503 with a plain-English message. Steps are in
   `MICROSOFT_GRAPH_CONNECTOR.md` §2. The account you register under is the expensive decision —
   §0 of that doc.
2. **The connections status contract is Google-shaped, on BOTH sides.**
   `lib/connectors/status.ts` `ConnectionStatus` is:
   ```ts
   { provider: string; driveAccess: 'full'|'readonly'|'picked'|null;
     gmail: boolean; contacts: {...}|null; ... }
   ```
   A Microsoft connection has no `driveAccess` value it can honestly report, no Gmail, no contacts.
   This needs widening at the orchestrator endpoint (`/api/v1/tenants/:id/connections`) **and** in
   this type **and** in `app/settings/page.tsx` together — the no-orphaned-consumers rule. Suggest a
   discriminated union on `provider` rather than stretching `driveAccess`.
3. **Nothing surfaces a narrowed grant.** `grantedFilesAccess` reads back what actually arrived, but
   if the owner declines write access nothing tells him — he just finds later that nothing saves.
   Same open item exists on the Google side.
4. **No owner-facing disconnect.** `connections.revoked_at` exists; nothing sets it from a UI.

---

## 4. (c) Per-tenant capability — NOT STARTED, and the sharp one

### The problem, stated concretely

**`fetchConnections` has exactly one consumer: the settings page.** Nothing in the agent layer knows
what any given owner has connected. Consequences, all live today:

- `lib/kira/prompts.ts` says **"search_drive — their Google Drive"** to every tenant. An owner who
  connects OneDrive gets an agent offering to search a Google Drive he does not have.
- The prompt's own comment already names the risk: *"it describes search_drive and lookup_contact,
  and an agent that does not hold them would offer to look through a Drive it cannot open."* That
  was written about a Google-only world and Microsoft makes it worse, not different.
- `lib/capabilities.ts` is a **global, hardcoded** list — the same sentences for every owner.
- `CONNECTOR_POLICY.md` §D rule 5 already requires the opposite: *"The agent's capability prompt is
  DERIVED from what is connected for THAT tenant"*, and flags that the hand-maintained lists have
  already diverged.

### What (c) actually requires, in dependency order

1. **A per-tenant capability fact, readable by the agent layer.** Extend `fetchConnections` (or add a
   thin `capabilitiesFor(tenantId)`) so the answer is available where agents are provisioned, not
   only on a settings render. It must keep `status.ts`'s existing distinction: **null means "could
   not find out", which is not "nothing connected"** — degrade, don't fake.
2. **Derive the prompt's tool paragraph from that fact** instead of hardcoding Google. A
   Microsoft-connected owner should hear about *his documents*, not *his Google Drive*; an owner with
   nothing connected should hear neither.
3. **Gate the tool list per tenant**, so she cannot claim a capability she cannot invoke — the
   connector-policy shape (§B item 6).
4. **Re-provision.** ⚠️ A prompt change never reaches a minted agent. This is the step that gets
   forgotten and its failure mode is silent: the capability exists, the tool works, and she keeps
   telling the owner she cannot do it. And `setAgentTools` **REPLACES** the list — see memory
   `project-kira-doing-slice-orphaned`, which is how `dispatch_task` vanished.

   ⚠️ **AND THERE ARE NOW TWO PENDING FLEET CHANGES, WHICH IS A COLLISION.** *(Added 2026-08-16.)*
   `area_agenda` landed on `main` in `8a815d7` and also needs a reprovision; (c) needs one for the
   per-tenant tool gating. Because `setAgentTools` REPLACES, **whoever reprovisions second from a
   stale tree silently drops the other's tools** — and it looks exactly like a successful run.

   **One reprovision, after both land, built from one tree.** Verify with `--dry-run` first and
   confirm the tool count per agent afterwards; a tool-less agent looks completely normal (memory
   `project-kira-silent-toolless-agent`).
5. **Microsoft tools do not exist yet.** There is no Graph equivalent of `search_drive` /
   `read_document`. Connecting works and she cannot act on it. This is the last piece, and it depends
   on the `.docx` decision in §5.

### ✅ Sequencing constraint — CLEARED 2026-08-16

The `area_agenda` build is **committed and on `main` at `8a815d7`** (`prompts.ts`,
`tool-manifest.mjs`, `text-tools.ts`, `app/talk`, `app/chat`, `app/my-genome/[area]`). **(c) is
unblocked.** Rebase on `main` before starting — `prompts.ts` moved substantially: two sections were
relocated into tool descriptions and the prompt is 1,719 characters *smaller* than the brief was
written against.

⚠️ **A note on where things got committed.** The working tree was on this branch while the
`area_agenda` work was being built, so `cf02028` on this branch is that same commit; it was
cherry-picked to `main` as `8a815d7`. **Rebase and it drops out by patch-id.** This branch was not
rewritten — it is not mine to rewrite.

### ⚠️ The hardcoding regenerates — which is why (c) is the fix and a sweep is not

Worth stating because it happened *while this brief was being read*: replacing
`BUILDING YOUR KNOWLEDGE BASE` in `prompts.ts`, the area_agenda session wrote *"search his **Drive**
and his uploads first"* — a brand-new Google-shaped assertion to every tenant, in a section that had
just been rewritten for unrelated reasons. Corrected to "his connected file storage" before the
commit.

That is one instance in one hour, written by someone who had read §4 that morning. **A one-off sweep
of the existing strings will not hold**, because every future edit to prompt copy re-creates them.
Deriving the paragraph from what the tenant actually has is the only version that stays true.

---

## 5. The one product decision still open

**Graph gives no text from a `.docx`.** Google exports a Doc to `text/plain` in one call; Graph
converts to PDF only. So *"read his twenty quotes and learn his format"* — usually the whole reason
for the connector — **does not work on Microsoft** without a text extractor.

Three options, and it is Dennis's call:

1. **Build the extractor** — `SHARED_SERVICES.md` already names "Document text extraction
   (PDF/docx/xlsx → text)" as an open extraction candidate that must **not** be forked per product.
   It belongs in `@caistech/dataroom-core`'s unshipped `/ingest` subpath.
2. **Ship Microsoft read/write without format-learning**, with the disclosure now on
   `/setup/onedrive`. Honest, and a materially thinner promise for two thirds of the contact base.
3. **Defer Microsoft** until the extractor exists.

His stated preference this session was "build the extractor at the relevant time", which points at
(2) then (1) — but the disclosure paragraph is what makes (2) defensible, so do not quietly delete it.

---

## 6. Suggested order

*Revised 2026-08-16 after review by the area_agenda session.*

1. **Mirror the consent-summary route for Microsoft** (§3, open 0). Cheapest thing here, and the only
   one where the cost of deferring is an owner consenting to something no page described. Do it while
   the branch is unmerged.
2. **Add a document-connection step to onboarding** (§2, open 1). Moved UP: the registration below
   makes real a page that, today, nobody reaches. An offer, never a gate.
3. Entra registration + env vars → `/setup/onedrive` becomes real (§3.1)
4. Widen the connections contract, both sides + settings together (§3.2)
5. (c) steps 1–4 — **unblocked**, rebase on `main` first (§4)
6. Graph tools + the `.docx` decision (§5)

Steps 1–4 are independent of the other session. Step 5 now only needs a rebase.

⚠️ **The fleet reprovision is NOT a step in this list.** It is one run, after both this work and
`area_agenda` have landed, built from one tree — see the collision note in §4 step 4.
