# kiraexec.com — setup runbook

Registered at Namecheap (order 210254757, 2026-08-05). Namecheap **BasicDNS**
(`dns1/dns2.registrar-servers.com`), so every record below goes in **Domain List →
kiraexec.com → Advanced DNS**, not at a nameserver level.

**Status (2026-08-05): LIVE.** `https://kiraexec.com` serves the app, `www` 308s to the apex, both
Vercel domains report `misconfigured: false`. Resend stays on `updates.corporateaisolutions.com`
(decision A below) — `kiraexec.com` carries **no** mail records at all.

Two things the domain switch exposed, both fixed at the same time and neither obvious:

- **Supabase redirect allow-list did not contain the new host.** The domain went live before the
  allow-list did, so for a window anyone signing in or resetting a password from `kiraexec.com` had
  their callback rejected. Both hosts are allow-listed now; `site_url` is `https://kiraexec.com`.
- **Supabase was still on the BUILT-IN MAILER, rate-limited to 2/hour.** Every auth email — password
  reset, magic link, confirmation — was arriving from a `supabase.io` address with nothing to do
  with Kira. `PRODUCT_STANDARDS` §9 calls the built-in mailer never-acceptable past a first smoke
  test, and it was still on. Now `smtp.resend.com:465`, sender `Kira
  <noreply@updates.corporateaisolutions.com>`, limit 30/hr. This mattered most for the first
  external tester, who sits behind a corporate mail filter that would have eaten a Supabase-domain
  message and produced a silent "I never got it".

---

## 1. Vercel — DONE

Both domains are attached to project `kira` (`prj_itVurDE9CD77K9rGWEQZNDmn33yz`,
team `team_hwN7IFtd2Fo3DCj9C67ZwI1t`):

- `kiraexec.com` — the canonical host
- `www.kiraexec.com` — **308 redirect to the apex** (set, not left as a second live copy;
  two hosts serving identical content splits every link and every search signal)

Both currently report `misconfigured: true`, which is correct and expected — it stays that way
until the DNS below resolves.

## 2. Namecheap DNS — YOU PASTE THIS

Advanced DNS → Host Records. Delete Namecheap's default **parking page CNAME/URL redirect on `@`
and `www`** first, or it will fight the records below.

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | `@` | `216.150.1.1` | Automatic |
| A Record | `@` | `216.150.16.1` | Automatic |
| CNAME Record | `www` | `2282016c00a8ab30.vercel-dns-016.com.` | Automatic |

Notes that matter:

- **Two A records on `@`, both of them.** Vercel's current recommendation is this pair, not the
  older single `76.76.21.21`. The legacy address still works if Namecheap refuses two apex A
  records, but use the pair if it accepts them.
- The CNAME value is **project-specific** and ends with a dot. `cname.vercel-dns.com.` is the
  generic fallback if the project-specific one is rejected.
- Namecheap appends the domain automatically — enter `@` and `www`, never the full hostname.

Verify (propagation is usually minutes, occasionally hours):

```bash
nslookup kiraexec.com 8.8.8.8
curl -sI https://kiraexec.com | head -3
curl -sI https://www.kiraexec.com | head -3   # expect 308 -> https://kiraexec.com
```

## 3. Resend — BLOCKED, needs a decision

`POST /domains` for `updates.kiraexec.com` returns:

```
403 "Your plan includes 1 domain. Upgrade to add more."
```

The one slot is used by `updates.corporateaisolutions.com` (verified, `ap-northeast-1`), which is
the **portfolio-wide** sender named in `PRODUCT_STANDARDS` §9 and used by every other product.
Replacing it is not an option — it would silently break sending everywhere else.

So there are two real choices:

**A. Leave Kira sending from `noreply@updates.corporateaisolutions.com`** (status quo, costs
nothing, works today). The legal identity in the footer is Global Buildtech Australia trading as
Corporate AI Solutions either way, so nothing is misrepresented. The cost is recognition: an owner
who just signed up to *Kira* gets mail from a domain he has never seen, which is exactly the shape
of a phishing mail and exactly the audience least likely to give it the benefit of the doubt.

**B. Upgrade Resend to Pro (~US$20/mo, 10 domains)** and add `updates.kiraexec.com`.

⚠️ **If B: a new sending domain has zero reputation.** `updates.corporateaisolutions.com` is warmed;
`updates.kiraexec.com` starts from nothing, and the first mail it sends will be a
transactional-looking message to a business address behind a corporate filter. Warm it before it
carries anything that matters — and do not point Simon's or any tester's mail at it on day one.

**Do not change the from-address until the domain shows `verified`.** Sending from an unverified
domain fails at Resend, and `@caistech/email-send` surfaces Resend's own error text — but only
after the mail has already not gone.

### When B is chosen, the records follow this shape

Resend returns them on create; **do not guess them**. But know where they land, because this is the
trap that reads identically to "never added" (already hit once on `updates.factory2key.com.au`):

- SPF `TXT` **and** `MX` go on **`send.updates.kiraexec.com`** — not on `updates.kiraexec.com`
- DKIM `TXT` goes on **`resend._domainkey.updates.kiraexec.com`**

In Namecheap's Advanced DNS the Host column would therefore read `send.updates` and
`resend._domainkey.updates`, since Namecheap appends the apex itself. Querying the bare
`updates.kiraexec.com` returns nothing even when everything is correct.

## 4. After DNS resolves — what NOT to rush

`NEXT_PUBLIC_APP_URL` is still `https://kira-rho.vercel.app`, and **that is fine for now**.

The reason to be deliberate: the ElevenLabs tool webhooks have the base URL **baked into each
agent's tool config** at provision time (`?uid=` identity, per `@caistech/elevenlabs-convai`).
Changing `NEXT_PUBLIC_APP_URL` does not move them — it would need a fleet reprovision across all
live agents, which has twice caused a real regression here (tools cut to 15 of 17; four prompt
sections deleted).

The Vercel alias `kira-rho.vercel.app` keeps resolving indefinitely, so the baked tool URLs keep
working. Sequence it as: DNS resolves → confirm the site serves on the new host → *then* decide
whether the env change plus a reprovision is worth doing, and do it with `--tools-only` and a
verification pass, not as a side effect of a domain switch.

Sequenced correctly there is no outage. Done as one change there is.
