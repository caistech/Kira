# Testing — automated-tester authentication (Kira)

How `/naive-tester`, `/qa`, and `/voice-auditor` authenticate against Kira as **real accounts**
(never an auth bypass — a test bypass is a critical vulnerability, PRODUCT_STANDARDS §9.5).

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
