# Testing — automated-tester authentication (Kira)

How `/naive-tester`, `/qa`, and `/voice-auditor` authenticate against Kira as **real accounts**
(never an auth bypass — a test bypass is a critical vulnerability, PRODUCT_STANDARDS §9.5).

## Red-team runs (`scripts/red-team.mjs`)

Tier-2 conversational red team (drives `/api/kira/chat/text` as a synthetic owner — NEVER
`QA_TEST_USER_EMAIL`). Canonical env names:

```
QA_REDTEAM_EMAIL         QA_REDTEAM_PASSWORD     # provisioned by scripts/provision-redteam-identity.mjs
OPENAI_API_KEY                                   # judges the WORDS half of each verdict
```

Run: `node --env-file=.env.local scripts/red-team.mjs [--verbose]`.

**Free local judge (2026-08-23):** set `LOCAL_JUDGE_MODEL` (e.g. `llama3.2`) and optionally
`LOCAL_JUDGE_API` (default `http://localhost:11434/api/generate`) instead of `OPENAI_API_KEY`.
Behaviour verdicts and the retry→INCONCLUSIVE fail-safe are unchanged. CI (`red-team.yml`)
still requires the OpenAI secret.

## The two standard tester identities (minimal §9.5 set)

| Role | Email (env) | In `ADMIN_EMAILS`? | Drives |
|---|---|---|---|
| **User-agent** (non-admin) | `QA_TEST_USER_EMAIL` (`dennis@factory2key.com.au`) | **No** | user portal (`/login` → `/dashboard`, `/discovery`, `/start`, `/chat`) + the blocked-from-`/admin` check |
| **Admin-agent** | `QA_TEST_ADMIN_EMAIL` (`dennis+qaadmin@factory2key.com.au`) | **Yes** | admin portal (`/admin/login` → `/admin`) — safe checks only |

**INVARIANT:** admin-agent ∈ `ADMIN_EMAILS`; user-agent ∉ `ADMIN_EMAILS`. A user identity in the
admin set fails the cross-access check AND is a real security defect.

Human-operator admins (`dennis@corporateaisolutions.com`, `mcmdennis@gmail.com`) are used **by hand
only** and are never handed to an agent. Destructive admin actions (**Sign Out Everywhere**, **Delete
Account**) are operator-verified, never agent-run.

## Credentials (canonical env var names)

```
QA_TEST_USER_EMAIL      QA_TEST_USER_PASSWORD
QA_TEST_ADMIN_EMAIL     QA_TEST_ADMIN_PASSWORD
```

### Where they come from — one canonical source, never a copy in this repo

**Read them from the canonical QA secrets; do NOT copy them into Kira's `.env.local`.**

| Context | Source |
|---|---|
| CI (workflows) | GitHub Actions secrets, pushed from the canonical source by `cais-shared-services/scripts/sync-qa-secrets.mjs` |
| Local tester runs | `~/PycharmProjects/cais-shared-services/.secrets/qa-secrets.json` (gitignored), injected into the run's environment |

Copying them into a per-repo `.env.local` creates a second copy that has to be
found and rotated later — across ~38 repos, that is how a rotated credential
keeps working somewhere nobody remembers. One source, injected at run time.

Inject at the point of use rather than exporting into the shell, so the values
never reach shell history or the process list:

```bash
node -e "Object.assign(process.env,require(process.env.HOME+'/PycharmProjects/cais-shared-services/.secrets/qa-secrets.json'));\
require('child_process').spawnSync(process.argv[1],process.argv.slice(2),{stdio:'inherit',env:process.env,shell:true})" \
  node scripts/provision-qa-accounts.mjs
```

Passwords are never committed, never passed on a command line (argv is visible
in the process list), and never pasted into a tester report.

## One-time provisioning

```bash
# 1. Create/confirm both accounts (idempotent; sets email_confirm:true so they work even though
#    mailer_autoconfirm is OFF). Run it with the canonical creds injected, as above.
# 2. Ensure ADMIN_EMAILS (Vercel prod+preview AND .env.local) contains QA_TEST_ADMIN_EMAIL
#    and NOT QA_TEST_USER_EMAIL. Note this is the ADMIN EMAIL — an identity, not a credential —
#    which is why it belongs in the app's own config while the PASSWORDS do not.
```

> **Note (auth confirmation):** the provisioning script creates the accounts with `email_confirm:
> true` (a genuinely confirmed account, never an auth bypass) so testers never depend on reading a
> confirmation mail — this holds whether `mailer_autoconfirm` is ON (current) or OFF. See the
> auth-link-confirm-gate migration: the account-takeover fix is code-complete but only becomes
> ACTIVE once `mailer_autoconfirm` is turned OFF, which is deferred until the signup "check your
> email" UX is built (turning it off today breaks login — documented gotcha).

## Mode A — type the login form (default; also tests the auth path)

The tester navigates the real form and types the creds (never DOM-injects — React ignores injected
values). User-agent → `/login`; admin-agent → `/admin/login`. This exercises the auth flow itself.

## Mode B — inject a real session cookie (skip the flaky form for deep surface testing)

Mint the `@supabase/ssr` session cookie with the shared minter and load it into the browse context:

```bash
node ~/PycharmProjects/cais-shared-services/scripts/qa-session.mjs \
  --url "$NEXT_PUBLIC_SUPABASE_URL" --email "$QA_TEST_USER_EMAIL" --password "$QA_TEST_USER_PASSWORD"
```

Run it with the canonical creds injected (see above) so `$QA_TEST_USER_PASSWORD`
resolves from `.secrets/qa-secrets.json` rather than from anything stored here.
Note the minter takes the password on the command line — fine in an injected
one-shot, but do not put it in a script that someone might run on a shared box.

Kira has a password field, so the standard password-grant minter applies (no magic-link mode
needed). The minter auto-matches the repo's installed `@supabase/ssr` version.

## What each tester covers (dual-auth, one report)

- `/naive-tester`: Landing → User Path (as user-agent, must reach `/dashboard` ≠ `/admin`) → Admin
  Path (as admin-agent) → Cross-Path.
- `/voice-auditor`: User voice surfaces (`/start`, `/discovery`, `/chat`) + Admin surfaces; the
  memory loop must be observed *working* (welcome-back recall fires), not just present.

---

## Beta invitation codes — how a tester gets INSIDE the product without a card

**The gap this closes.** `TESTING_STANDARD` §4: a persona has a contract, and the contract bounds
coverage. Kira's conversion persona will not create an account and will not pay — so **every run so
far has ended at the paywall.** Three runs in, the funnel has been tested three times and the
authenticated product zero times, roughly 8 of 42 routes. That is not a tester failing; it is the
persona structurally being unable to reach the thing we charge for.

A beta code is the way through. It creates a real, confirmed account with no card and no
subscription, on the same funnel every owner walks.

### ⚠️ Bind codes only to addresses with NO existing account

A code is bound to one email when it is minted, and redeeming it for an address that already has an
account hits the deliberate no-mutation branch: *"You already have an account with this email — your
code has been used."* That is the guard working correctly, and a tester will file it as a blocker.

**The two canonical QA identities BOTH already have accounts** (`dennis+qauser@…` since 2026-08-01,
`dennis+qaadmin@…` since 2026-07-20), so **never bind a beta code to `QA_TEST_USER_EMAIL` or
`QA_TEST_ADMIN_EMAIL`.** Check before minting:

```sql
select id from users where email = lower('<address>');   -- must return nothing
```

### Codes in play (2026-08-15)

| Code | Bound to | For | Expires |
|---|---|---|---|
| `4GBG-9VV7-AFGF` | `dennis+betatest@factory2key.com.au` | operator smoke test | 2026-09-14 |
| `6JUG-L7W3-94K4` | `dennis+betatester2@factory2key.com.au` | **naive-tester, authenticated persona** | 2026-09-14 |

**One code per persona, decided before the run.** Two personas sharing one code means the second one
meets the already-used branch and spends the run diagnosing it.

**FRESH ACCOUNT, deliberately** (operator decision, 2026-08-15). The authenticated persona walks an
account with nothing captured — nine empty Genome buckets, an empty export — because that is what
every real invitee actually meets and what nobody has ever walked. Seeding it would test the
populated surfaces at the cost of testing the one state guaranteed to occur.

### Redeeming

Either enter the code at `/plan` ("Been invited to the beta?"), or go straight to
`/plan?code=<code without hyphens>`. Capitals and punctuation do not matter. Redemption is
**single-use** — it burns the code, so re-running the same persona needs a fresh mint:

```bash
node --env-file=.env.local scripts/mint-beta-code.mjs \
  --email <clean address> --label "<who, why, when>" --days 30
node --env-file=.env.local scripts/mint-beta-code.mjs --list
node --env-file=.env.local scripts/mint-beta-code.mjs --revoke <code>
```

### Before the run

1. `npx portfolio-gate-deploy-status --public-url https://kiraexec.com --app-marker "Kira" --wait`
   — gate zero. A green tester run against a stale build manufactures false confidence.
2. Confirm both codes still read `open` (`--list`).
3. Note which persona holds which code, here, before anyone starts.
