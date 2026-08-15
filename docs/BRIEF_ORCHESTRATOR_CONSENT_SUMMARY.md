# Brief for the orchestrator session — expose `permissionSummary` so the owner reads the truth

**From:** Kira session, 2026-08-15
**Re:** `src/connectors/google-consent-copy.ts`, and the page that actually precedes the Google screen
**Status:** a request, with Kira's half already built and shipped. One route needed on your side.

---

## 0. The one-line ask

**`permissionSummary()` and `connectionBlurb()` are consumed by one test script and nothing else.
Please expose them as `GET /api/connect/summary?drive=…&gmail=…` so the page the owner actually
reads can render claims derived from the scopes rather than typed by hand.**

Everything below is why that matters more than it sounds, and what has already been fixed on this
side so you are not fixing it twice.

---

## 1. The defect, which was live until today

`scopesFor()` spreads `CONTACTS_SCOPES` in **unconditionally** — every combination, including
`contacts.other.readonly`, which is every address Google auto-saved from mail the owner has sent.

`app/api/connect/google/route.ts` verifies the ticket, records `oauth_states`, and **redirects
straight to Google.** There is no interstitial. That is a good design — an extra page at the most
abandonment-prone moment in the product is a real cost — but it has a consequence:

> **Kira's `/setup/drive` page is the owner's ONLY description of what he is granting.**

And until this afternoon that page said *"Let Kira read your Drive"*, listed three Drive levels, and
**never mentioned contacts at all.** He pressed *Continue to Google* expecting Drive and Google asked
for his address book.

For this ICP that is the worst possible surprise. He is a 60–70 year old owner thinking about
selling who has commonly told neither his staff nor his family; his contact list is the most
sensitive thing in the account. Your own comment in `google-consent-copy.ts` already makes the
argument better than I can:

> *"'Other contacts' is named explicitly because it is wider than people assume — it is every
> address Google auto-saved from mail he has sent — and finding that out afterwards feels like
> something was hidden, even though he ticked it."*

That sentence was correct, and it was rendered to nobody.

---

## 2. What Kira has already fixed (no action needed from you)

Shipped this session, so please do not duplicate it:

- **Contacts are now disclosed on the form and in the page header**, stated as unconditional —
  "Every connection includes your contacts… your saved contacts *and* the addresses Google kept from
  people you have emailed before. She can read them. She cannot add, change or delete a contact."
- **The Gmail level is now chosen by the owner** — `none | draft | read`, defaulting to **`none`**.
  It reaches you in the signed claim. Previously `app/setup/drive/actions.ts` never passed `gmail`,
  so **every ticket you have ever received carried `'none'`**, whatever anyone intended. That is now
  wired end to end, and `components/drive-connect-form.test.tsx` asserts the wiring — not just the
  copy — because the copy passed for weeks over a feature that could not work.
- **Read-only now states its cost.** It was recommended with only its upside written down ("she
  cannot edit, move or delete anything"), which is the same fact as "she can never file a finished
  handover pack back into your Drive" — and that half was nowhere on the screen.
- The unmounted `ConnectChoices` component is **deleted**; its content was good and now lives in the
  mounted form.

---

## 3. What is asked of you

### 3.1 The route

```
GET /api/connect/summary?drive=picked|readonly|full&gmail=none|draft|read
→ 200 { can: string[], cannot: string[], blurb: string }
```

Straight passthrough of `permissionSummary(drive, gmail)` + `connectionBlurb(drive, gmail)`.
Unrecognised values should fall to the same defaults the connect route uses (`picked` / `none`) or
400 — your call, but please pick one and say which.

Notes on shape, offered rather than insisted on:

- **No auth, and no tenant.** The response is a pure function of two enum values and leaks nothing
  about any account. Adding a signed ticket would make it un-fetchable from a form that is still
  being filled in, which is exactly when it is needed. It is `/api/*` so it is already outside the
  middleware matcher; please mark it `@machine-callable` for the route audit.
- **CORS.** Kira will call this from the browser as the owner changes a radio, so the response needs
  `Access-Control-Allow-Origin` for Kira's origin (or same-origin proxying on our side — tell us
  which you prefer and we will do the other half).
- **Cache it hard.** Nine possible responses, none of them account-specific.

### 3.2 Why a route rather than us mirroring the copy

Kira could copy the `can`/`cannot` strings across. It should not, and the reason is the one written
at the top of your own file: the claims must be **generated from the same two choices that build the
scope string**, so that `google-consent-copy.test.ts` goes red when a scope moves and the copy does
not. A mirrored copy in this repo cannot see your scopes, so it would drift silently — which is
precisely the failure mode the module was written to end, reintroduced one repo over.

Until the route exists, Kira renders **only the claims that are true of every combination** (contacts
are requested; nothing is sent without approval) and the per-level gain/cost written against
`scopesFor()` as it stands. That is degrade-don't-fake: fewer claims, not invented ones.

---

## 4. Two things we did **not** change, because they are decisions rather than defects

Flagging both rather than acting, since they cost money or contradict a stated product promise.

### 4.1 The recommendation is still `readonly`, and I think that is right for Kira

`app/api/connect/google/route.ts` moved its fallback default to `picked` on 5 Aug with a good
argument — least privilege, write-capable, avoids restricted-scope verification. Kira's page still
**recommends `readonly`**, deliberately, because the page's entire promise is:

> *"she writes it in your format — the one your existing quotes already use"*

`drive.file` cannot open a file the app did not create unless he picks it through the Picker, so a
`picked` connection cannot read the twenty quotes that promise depends on. `picked` is the right
**fallback for an unrecognised ticket** (it grants least); `readonly` is the right **recommendation
for the job this page is selling**. Those are different questions and I think both answers stand.

Both costs are now stated on screen, so whichever he takes, he took it knowingly.

### 4.2 Offering `read` mail and wide Drive is what triggers CASA — that is Dennis's call, not ours

Per `BRIEF_ORCHESTRATOR_DRIVE_FILE_SCOPES.md`: the union of *offerable* scopes is what gets
reviewed, so keeping `readonly` / `full` / `gmail.readonly` on the menu is what puts the app in
restricted territory for every tenant, including the majority who would be served by `picked` +
`draft`.

Kira now offers all six levels because all six exist in your types and the owner was being denied a
choice that the system already supports. **If the verification decision lands the other way, removing
levels is a small edit to one array in `components/DriveConnectForm.tsx` plus one in
`app/setup/drive/actions.ts`** — say the word and we will cut it to `picked` + `draft` the same day.
Please raise it with Dennis before filing, since it is weeks of calendar time and an invoice.

---

## 5. Unrelated finding, filed here because it is yours to see

`grantedGmailAccess()` exists precisely because a consent screen lets the owner untick scopes, and
`oauth_states.metadata` already records `requested_access` / `requested_gmail` so the callback can
compare. Good — but **nothing tells the owner when what he granted is narrower than what he chose.**
He picks "read my mail", unticks it on Google's screen, and lands back on a settings page that says
nothing; later Kira cannot answer "did Roger reply?" and he has no idea why.

If the callback can write the *granted* levels somewhere Kira can read (a column on the connection
row is fine), Kira will surface the difference on `/settings#drive` in plain words. Not urgent, but
it is the same class as everything above: the system knows, and the owner does not.
