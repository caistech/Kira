# Naive Tester Remediation — Kira

**Date:** 2026-05-19
**Source report:** `C:\Users\denni\naive-tester-reports\2026-05-19-1711\kira.md`
**Persona:** Margaret, 62, retired teacher, Adelaide — learning Spanish for a Mexico trip
**Outcome:** Closed the tab without reaching a Kira conversation.

---

## Executive summary

Margaret never got inside the product. Within ~8 seconds the tab redirected itself to TourLingo, then on subsequent reloads to HairStylist.ai, Connexions, and a builder-research survey. Her "Start talking" click on the Personal Journey card landed her on HairStylist.ai. She also hit a 404 on `/pricing`.

Two of the three findings (auto-redirect on landing; "Start talking" sending users to other products) are **cross-product routing bleed** — the same symptom is showing up across the portfolio and the cause is shared infrastructure (Vercel project routing, marketplace carousel, or a deployed-build mismatch). Those are deferred to the portfolio-level central plan.

The third finding — `/pricing` returning 404 — is a Kira-local nav defect and is fixed here.

---

## Findings — validation

### F1. Auto-redirect on landing page (8s in) — ROUTING BLEED (defer)

- Margaret reported the landing page redirecting to TourLingo Operator within seconds, and to a different CAS product on each reload.
- **Local code check:** `app/page.tsx` and `app/layout.tsx` contain no client-side redirect, no `router.push`, no `<meta http-equiv="refresh">` to external products. The hero, comparison block, FAQ and pricing anchor all render statically.
- **Conclusion:** the redirect is not authored in this repo. It is coming from the deployed Vercel hosting environment — most likely a misconfigured marketplace carousel embed, an alias collision on `kira-rho.vercel.app`, or a shared script loaded across CAS Vercel projects.
- **Action:** defer to the **portfolio routing-bleed central plan**. Do not patch here.

### F2. "Start talking" CTA lands on HairStylist.ai — ROUTING BLEED (defer)

- The "Start talking" buttons on `app/start/page.tsx:259` and `:276` are `<button onClick={() => selectJourney(...)}>` — pure client-side state changes that reveal the embedded ElevenLabs widget. There is no `href` to any external product.
- **Conclusion:** the cross-product navigation Margaret observed is the same routing bleed as F1, kicking in either before or just after the button click resolves.
- **Action:** defer to the **portfolio routing-bleed central plan**.

### F3. `/pricing` returns 404 — LOCAL (fix here)

- Top-nav link on `app/page.tsx:114` is `href="#pricing"` (anchor on home page). About-page nav at `app/about/page.tsx:161` is `href="/#pricing"`. There is **no `app/pricing/` route**.
- Margaret hit `/pricing` directly (likely typed, bookmarked, search-indexed, or served by an older deployed build). The 404 is real for that URL and Margaret's read — *"site not maintained"* — is the correct one for the over-50 audience this product targets.
- **Action:** add a thin `/pricing` route that either redirects to `/#pricing` or renders the existing pricing section standalone. See Plan §1 below.

### F4. Other report items (copy, voice-first surfacing, export, tortoise mode, sample audio) — out of scope

- These are product/copy enhancements, not breakage. Log them to backlog. Not addressed in this remediation.

---

## Plan

### 1. Fix `/pricing` 404 (LOCAL — fix in this repo)

**Option A (recommended — 5 min):** add `app/pricing/page.tsx` that redirects to `/#pricing`.

```ts
import { redirect } from 'next/navigation';
export default function PricingPage() { redirect('/#pricing'); }
```

This preserves the existing single-page pricing section, kills the 404, and works for direct visitors, search results, and any stale bookmarks.

**Option B (better long-term — 30 min):** build a real `/pricing` page that lifts the pricing block out of `app/page.tsx` and answers the Margaret-questions the report flagged:

- Can my husband and I share one Kira?
- What happens if I cancel after my Mexico trip?
- Does it work on my iPad?

Recommendation: ship Option A immediately to stop the bleed, then schedule Option B when the routing-bleed central plan lands (since both will touch the deploy).

**Verification:**
- After deploy, `curl -I https://kira-rho.vercel.app/pricing` returns 308/200, not 404.
- Direct nav to `/pricing` lands on the pricing section (either via redirect or as a standalone page).
- Mobile (≤414px) and laptop (≥1280px) both render correctly.

### 2. Routing bleed (F1 + F2) — DEFER

- All cross-product redirects from the Kira landing page and the "Start talking" CTA belong to the **portfolio routing-bleed central plan**.
- Do not patch in this repo. Local patches will mask the shared cause and make the central fix harder.
- When the central plan lands, re-run the Margaret walkthrough end-to-end (landing → Personal Journey → "Start talking" → ElevenLabs widget loaded) to confirm.

### 3. Backlog (not fixed here — log for product)

- Persona-specific copy: surface language-learning and skill-practice examples in the Personal Journey card (currently leads with "Career pivots & job decisions").
- Surface "voice-first" on the landing page and add a microphone test before the conversation starts.
- Add one language-learning testimonial.
- "Show, don't tell" the session-memory promise with a mock recap panel.
- Export / printable session recap FAQ line.
- 30-second sample-conversation audio on the landing page.
- "Tortoise mode" toggle (slow speech, simpler vocabulary).
- Trip-countdown view.

---

## Done-when

- `/pricing` no longer 404s on production (`kira-rho.vercel.app`).
- F1 and F2 logged against the portfolio routing-bleed central plan with a link back to this report.
- Backlog items captured in the project tracker.
- Margaret-walkthrough re-run scheduled for after the central routing-bleed fix lands.
