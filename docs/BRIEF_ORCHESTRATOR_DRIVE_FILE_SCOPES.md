# Brief for the orchestrator session — `drive.file`, and whether this app needs CASA at all

**From:** Kira session, 2026-08-15
**Re:** the scope set in `scopesFor()`, ahead of filing Google verification
**Status:** a question, not a decision. Nothing here is confirmed against Google's live list.

---

## 0. The one-line claim

**If the requestable scope set drops `drive` / `drive.readonly` and `gmail.readonly`, the app has no
restricted scopes — and a sensitive-only app needs no third-party CASA security assessment.**

That is potentially weeks of calendar time and a real invoice, decided by which Drive tier is
offered. It is worth an hour of checking before the submission is filed.

---

## 1. Why this is being raised now

Your own note already contains the load-bearing observation, and it is the right one:

> *"the union is what gets reviewed: offering read Gmail or wide Drive as an option costs you the
> assessment even for tenants who never pick them."*

That is exactly the point this brief extends. Kira's connect layer types Drive access as **three
tiers**:

```ts
// kira/lib/connectors/google-connect.ts
export type DriveAccess = 'full' | 'readonly' | 'picked';
```

`picked` is already in the type. If `picked` maps to `drive.file`, then two of those three tiers —
`full` and `readonly` — are the *only* reason the app is in restricted territory for Drive. They are
offered; therefore they are reviewed; therefore CASA applies to every tenant, including the majority
who would have been perfectly served by `picked`.

**The three-tier type is the cost.** Not the code, not the agent, not the number of users.

---

## 2. The tier table, with confidence stated

⚠️ **Treat every row as unconfirmed.** You have now been wrong in both directions on `gmail.send`
and said so; I am working from the same general knowledge and cannot do better than agree with you
carefully. **Check each against Google's published restricted-scope list before anything is filed.**
The rows below are what to check, not what to rely on.

| Scope | My read | Note |
|---|---|---|
| `drive` (full) | **Restricted** | |
| `drive.readonly` | **Restricted** | |
| `drive.file` | **Neither sensitive nor restricted** | Per-file, granted through the Picker. This is the whole point of the brief |
| `drive.appdata` | Sensitive | |
| `gmail.readonly` / `.metadata` / `.modify` / `.insert` / `mail.google.com` | **Restricted** | Reading mailbox contents is what the restricted tier is about |
| `gmail.compose` | **Sensitive** | Agrees with your corrected position |
| `gmail.send` | **Sensitive** | Agrees with your corrected position |
| `contacts.readonly` / `contacts.other.readonly` | **Sensitive** | Agrees with `google-contacts.ts` |
| `userinfo.email` / `userinfo.profile` / `openid` | Basic | No verification burden |

**If those hold**, a set of `drive.file` + `gmail.compose` + both contacts scopes + `userinfo.*`
contains **zero restricted scopes**. Verification becomes the sensitive-scope review — brand
verification, per-scope justification, a demo video — with no third-party security assessment.

---

## 3. What `drive.file` actually costs, honestly

It is not free. `drive.file` grants access **only to files the user explicitly picks through the
Google Picker, plus files the app itself created.** Concretely:

| Capability | `drive.readonly` | `drive.file` |
|---|---|---|
| Kira searches the Drive for a document she has not seen | ✅ | ❌ |
| Owner points at a document, Kira reads it | ✅ | ✅ (via Picker) |
| Kira writes a document and later reads it back | ✅ | ✅ |
| Kira files something into a folder | ✅ | ✅ (folder picked once) |

So the thing lost is **discovery** — *"go and find the pricing sheet"*. The things kept are
*"here, read this"*, *"write that up and put it in the jobs folder"*, and everything she authored.

⚠️ **CHECKED, AND THE ANSWER IS THE EXPENSIVE ONE.** An earlier draft of this brief asked you to
verify whether any shipped tool searches rather than taking a handle. It does. `search_drive` is a
live fleet tool (`lib/kira/lookup-tools-def.mjs`, webhook `/api/kira/webhooks/search_drive`), and
`read_document` is explicitly its second half — its own description says *"pass the `id` from that
search result; never invent one, and if you do not have an id yet, run search_drive first."*

So the shipped Drive capability is **search-first by design**, and `drive.file` breaks it as wired:

| Fleet tool | Under `drive.file` |
|---|---|
| `search_drive` | ❌ breaks — it searches the whole Drive |
| `read_document` | ❌ as wired (takes an id from `search_drive`); ✅ if the id comes from a Picker |
| `lookup_contact` | ✅ unaffected — People API, sensitive not restricted |
| `search_knowledge` | ✅ unaffected — it searches Kira's OWN store of what the owner shared, not Drive |

`drive.file` is therefore **not a free win**. It is a re-shape: the owner grants access through a
Picker at setup instead of Kira ranging over the Drive.

### The pivotal sub-question — please settle this one first

**Does picking a FOLDER in the Google Picker grant `drive.file` access to its contents, recursively
and persistently?**

- **If yes** — `drive.file` is nearly free. The owner picks "Jobs" and "Quotes" once during setup,
  `search_drive` is rewritten to search within granted folders, and almost nothing about the
  experience changes. This is the outcome worth chasing.
- **If no** (per-file only) — `search_drive` cannot survive in any form, the product loses document
  discovery entirely, and the trade becomes a genuine product decision for Dennis rather than an
  implementation detail.

I do not know the answer with enough confidence to act on, and the whole recommendation turns on it.

**Whether the trade is acceptable is a product question, not a scopes question.** My own read, for
what it is worth: Kira's stated value is capture-by-conversation and making the owner's knowledge
transferable, not search-my-Drive — the job Glean-class tools already own and which Kira's
positioning explicitly declines. And `search_knowledge` — searching what the owner has actually
handed her — is untouched either way, which is arguably the more used path. On that reading the cost
is real but survivable. That is a view, not a decision.

---

## 4. The staged option, which may be the best of both

1. **Ship `picked` / `drive.file` as the only Drive tier.** No restricted scopes; sensitive-only
   verification; no CASA. Serves every owner who wants Kira to read what he hands her.
2. **Add `drive.readonly` later, if owners actually ask for search** — at which point there is
   revenue to fund the assessment, and demand evidence to justify the scope in the submission, which
   is itself what the reviewer asks for.

This also fits the sequencing argument you already made about `gmail.send`: you cannot demo a
toggled-off scope, and declaring one you have not built reads as over-asking. Same logic, applied to
Drive.

---

## 5. Two things this does NOT change

- **`gmail.send` should still stay out**, and your three reasons stand — particularly the second.
  Sending via Gmail routes around Resend, the Spam Act footer, the suppression store, the AU-only
  jurisdiction guard and the approval gate. That is a compliance rebuild, not a scope toggle, and no
  amount of agent confidence retires it. The fourth `GmailAccess` level (`none | draft | read |
  send`) is the right shape when it does come.
- **The `gmail-no-send` guard is right and should be widened**, not narrowed. See §7.

---

## 6. What we need settled, in order

1. **Confirm the tier of `drive.file`** against Google's live restricted-scope list. Everything else
   here depends on this single row.
2. **Confirm `gmail.readonly` is restricted** (it is the other thing keeping the app in the tier).
3. **Settle the folder question in §3** — does a Picker folder grant recursive, persistent access?
   This decides whether `drive.file` is a small re-wire or the end of document discovery.
4. **Decide with Dennis** whether losing Drive discovery is acceptable for v1 — only necessary if
   (3) comes back "per-file only".
5. Only then: freeze the scope set and file. The set is frozen at submission — changing it later
   triggers re-verification, so this ordering is not bureaucratic, it is the cheap path.

~~3. Check whether any shipped Drive tool performs a search rather than taking a file handle.~~
**Done — it does.** `search_drive` is live and search-first; see §3.

---

## 7. One request unrelated to scopes

**Widen the `gmail-no-send` guard to cover Microsoft Graph before Graph exists.**

Kira's real contact base is roughly two-thirds Microsoft, not Google — measured by MX record across
every known non-internal user (`plausible.gg`, `linkbusiness.com.au`, `aerion.com.au`,
`garda.com.au` all resolve to Microsoft; `garda.com.au` is the live first-customer lead). Graph work
is therefore likely, and Graph's `Mail.Send` routes around exactly the same compliance layer that
`gmail.send` does, for exactly the same reasons.

A guard that names Gmail specifically will pass a Graph send path on day one. Writing the assertion
as "nothing in this repository sends mail outside the compliance path" — rather than "nothing sends
Gmail" — costs nothing today and closes the hole before it is opened. It is also much easier to
argue for now than after someone has a working Graph draft flow and a deadline.

---

## 8. Confidence

Low-to-moderate on every scope classification in §2, deliberately stated as such. The reasoning in
§1, §3 and §7 does not depend on the classifications being right — the *union* argument, the
`drive.file` capability trade, and the Graph guard all hold regardless. It is only the size of the
prize (CASA or no CASA) that turns on §2, and that is precisely the part to verify rather than
believe.
