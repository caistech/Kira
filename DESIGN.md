# Kira — design system

> **The one place the look is decided.** Written 2026-08-03. Before this file existed, every session
> that touched UI re-derived the palette, the type scale and the spacing from scratch — which is why
> the product reads inconsistent even though each individual screen is defensible. **When this file
> and the code disagree, this file is right and the code is a bug.**
>
> **How it was authored** (so it can be re-derived rather than re-invented): a deterministic base from
> `ui-ux-pro-max` (`--design-system --variance 3 --motion 2 --density 3`), then an interrogation pass
> against the real ICP, which rejected three of its recommendations outright — see §8. Palette
> direction chosen by the operator: **green-forward, for continuity.** Every contrast figure below is
> computed, not estimated.

---

## 1. Who this is for — the constraint everything else follows from

A **60–70-year-old owner-operator of a physical trade business**, on a phone as often as a laptop,
frequently in a vehicle or on site, reading about **selling the business he has run for decades**.

Three consequences, and they outrank aesthetic preference every time:

1. **Legibility is not a nicety.** Presbyopia is near-universal in this age band. 16px is a floor, not
   a target, and low-contrast grey-on-grey is unusable rather than merely subtle.
2. **The subject matter is grave.** Succession, valuation, "I haven't told my wife." Playful, jokey or
   novelty design reads as not taking him seriously.
3. **Trust is the conversion.** He is deciding whether to hand this thing his accounts, his contacts
   and his documents. Anything that looks unfinished or generated costs more here than in a consumer app.

---

## 2. The decisions, locked

| | Decision |
|---|---|
| **Direction** | Green-forward. Green stays the brand colour; it is renamed honestly and given a compliant ramp. |
| **Neutrals** | The existing **warm** greys are kept. Warm suits an older reader and is the one part of the current identity that was never broken. |
| **Type** | **Inter throughout, for now.** Hierarchy from weight and size. **Lexend for display is the one OPEN decision** — see §4. |
| **Density** | Spacious. 8pt grid. |
| **Motion** | Subtle, CSS-only, no new dependency, always `prefers-reduced-motion`-aware. |

---

## 3. Colour

### 3.1 The rule that matters most

**`#22c55e` — the current `kira.warm` — is 2.28:1 on white.** That fails even the 3:1 minimum for UI
components, let alone the 4.5:1 for text. It must never carry text or an icon on a light surface again.

The green ramp exists so that **role decides the shade**:

| Token | Hex | On white | Allowed use |
|---|---|---|---|
| `--green-500` | `#16A34A` | 3.30:1 | **Large text (≥24px) and UI fills only.** Never body text. |
| `--green-600` | `#15803D` | 5.02:1 | **Body text, links, primary button fill with white label** (white on it = 5.02:1). |
| `--green-700` | `#166534` | 7.13:1 | Text needing extra weight; hover/pressed states. |
| `--green-050` | `#F0FDF4` | — | Tint backgrounds only. Never a text colour. |

⚠️ **A primary button filled `#16A34A` with a white label is 3.30:1 and fails AA.** Fill primary
buttons with `--green-600`. This is the single most likely mistake when implementing this file.

### 3.2 Neutrals — kept, with one correction

| Token | Hex | On `#FAFAF9` | Use |
|---|---|---|---|
| `--ink-900` | `#2D2A26` | 13.67:1 | Body text, headings |
| `--ink-700` | `#4A4541` | — | Secondary text |
| `--ink-500` | `#736B63` | 5.01:1 | **Muted text — corrected.** The old `#7D756D` was 4.34:1 and failed AA. |
| `--ink-100` | `#F5F3F0` | — | Borders, dividers, inset panels |
| `--surface` | `#FAFAF9` | — | Page background |

### 3.3 Three-layer tokens

Primitive (the ramp above) → **semantic** (what it means) → component (what it paints). Only semantic
tokens may be used in a component; a raw hex in a component is a defect the validator catches.

```
--color-primary          → --green-600     /* actions, links, focus */
--color-primary-hover    → --green-700
--color-primary-subtle   → --green-050     /* tint backgrounds */
--color-on-primary       → #FFFFFF         /* verified 5.02:1 on --green-600 */
--color-foreground       → --ink-900
--color-foreground-muted → --ink-500
--color-surface          → --surface
--color-border           → --ink-100
--color-destructive      → #B91C1C         /* darker than #DC2626 so it passes AA as text */
```

---

## 4. Typography

| Role | Face | Size | Notes |
|---|---|---|---|
| Display | Inter 600 *(Lexend proposed)* | `clamp(1.75rem, 4vw, 2.75rem)` | Page and section titles |
| Heading | Inter 600 | 1.25–1.5rem | |
| Body | **Inter** 400 | **17px** | One notch above the 16px floor, deliberately, for this ICP |
| Small | Inter 400 | 15px | Never below 15px anywhere in the product |

**No `font-size` below 15px exists in this system.** If a layout needs 12px to fit, the layout is wrong.
Line length capped at `65ch` for prose. Line height 1.6 for body.

⚠️ **The open decision: Lexend for display.** It is designed for reading proficiency, which is exactly
this ICP's problem, and it is the one *new* dependency this system would add. It is **not applied**,
deliberately: adding a second face changes every heading in the product, and that is a visual break
during a live tester round.

**And the `display`/`body` aliases stay pointing at Inter, which needs saying plainly.** The original
plan was to delete them — until a grep found **256 usages**, making removal a breaking change rather
than a cleanup. So all three aliases resolve to one face *by recorded decision* rather than by
accident, and the config says so at the point of definition. When Lexend lands, `display` becomes true
and 256 call sites gain a real hierarchy for free — which is the argument for leaving them alone now.

---

## 5. Space, size, targets

- **8pt grid.** Spacing steps: 4, 8, 12, 16, 24, 32, 48, 64.
- **Touch targets ≥44×44px**, no exceptions — this is a portfolio rule and doubly right for this ICP.
- Section rhythm: 48px mobile, 64–80px desktop. Spacious beats dense; he is reading, not scanning a
  dashboard.
- Cards: 16px radius, 1px `--color-border`, no drop shadow deeper than `0 1px 3px rgb(0 0 0 / 0.06)`.

---

## 6. Motion

Subtle and CSS-only. **No GSAP or ScrollTrigger** — the generated base recommended them; that is a new
runtime dependency for decoration, and scroll-reveal actively hurts a reader who needs the content to
be *there*.

- Transitions 150–250ms, `ease-out`. Nothing longer than 300ms.
- Hover and focus states on every interactive element; focus visible for keyboard.
- Wrap every animation in `@media (prefers-reduced-motion: no-preference)`.
- The existing `float` / `pulse-slow` / `spin-slow` keyframes are decorative — keep them off content
  the user has to read.

---

## 7. Avoid

From the generator's own anti-pattern list plus the ICP pass:

- **AI purple/pink gradients.** (The generator flags these unprompted; an earlier naive run *recommended*
  them, which is why §8 exists.)
- **Emoji as icons.** Use Lucide SVG.
- Playful/novelty styling, oversized fashion-editorial type, hidden credentials.
- **Fabricated social proof** — testimonials, client logos, invented percentages. This product removed
  its testimonials on purpose; the design system must not reintroduce a slot that begs for them.

---

## 8. The defects this replaces

Found in the current code on 2026-08-03. Each is mechanical, not a matter of taste:

1. **The palette names lie.** `kira.warm` `#22c55e`, `kira.coral` `#4ade80`, `kira.peach` `#86efac`,
   `kira.cream` `#f0fdf4` — warm-palette names carrying green values. Anyone writing `text-kira-coral`
   expects coral and gets green. This is the clearest single source of the "inconsistent" complaint.
2. **Two sources of truth for the primary colour.** `--primary: oklch(0.586 0.19 145.71)` in
   `globals.css` is unconnected to the Tailwind tokens.
3. **Three font aliases, one font.** `sans`, `display` and `body` all resolve to Inter, so "display"
   promises a hierarchy that does not exist.
4. **Two live contrast failures**: `#22c55e` at 2.28:1, and muted `#7D756D` at 4.34:1.

**And three recommendations from the generated base, rejected here** — recorded because the next person
to run it will get them again:

- *Pattern "Enterprise Gateway"* — "Contact Sales", mega-menu, solutions-by-industry, **client logos**.
  Kira is self-serve for one owner, and it has no client logos to show.
- *Style "Exaggerated Minimalism"* — `clamp(3rem, 10vw, 12rem)` at weight 900, best-for "fashion,
  architecture, luxury brands". A fashion-agency aesthetic for a 66-year-old reading about selling his
  business, and it contradicts the variance dial it was generated under.
- *GSAP ScrollTrigger motion* — see §6.

This is the evidence for why the interrogation pass is not optional: the database selects from 84 known
styles and does not know the customer.

---

## 9. Applying it

**Today (Tailwind v3):** map the semantic tokens into `theme.extend.colors`, delete the four lying
`kira.*` names, remove the duplicate `--primary` from `globals.css`, and either add Lexend or collapse
the font aliases. None of that requires Tailwind v4.

**Later (Tailwind v4 + `ui-styling`):** deferred by decision — v3→v4 is a breaking migration on a live
product and is its own piece of work, not a side effect of adopting this file.

**Enforcement — wired 2026-08-03.** `scripts/check-design-tokens.mjs`, run by `npm run check:tokens`
and by the `portfolio-gate` workflow beside the app-chrome check. *A design system nobody validates is
prose with no mechanism.*

It is a **ratchet, not a sweep**: 92 pre-existing literals across 14 files are baselined in
`design-tokens.baseline.json`, and the gate fails only when a file **gains** one. Fixing lowers the
baseline (`--update`); it can never drift up. A gate that is red on arrival is a gate somebody deletes.

Two exemptions, both correct code rather than debt: **`lib/email/**`** (CSS custom properties do not
survive Outlook or Gmail, so inline hex is required for mail to render — 186 of 187 findings in `lib/`
were here) and **`app/api/**`** (OG images and PDFs render outside the browser's CSS cascade). A file
that must carry a literal opts out with `// @design-tokens-ok: <reason>`; a bare marker is rejected.

Scope is **hex only**, deliberately. Pixel values were tried and dropped: in JSX they appear in SVG
attributes and icon sizing where they are legitimate, and a check with a high false-positive rate
teaches people to ignore it.

**Proven, not assumed:** injecting `#ff0000` into a clean file flipped it to exit 1 naming that file;
removing it returned exit 0.

**Where the debt is:** `app/page.tsx` (27), `app/about/page.tsx` (12), `components/DemoPlayer.tsx` (10)
— the marketing surfaces, which is where the inconsistency was reported.

---

## 10. Provenance

Base generated by `ui-ux-pro-max` at variance 3 / motion 2 / density 3. Interrogated against
`docs/GENOME_BUYER_FORMAT.md`'s ICP and the portfolio `PRODUCT_STANDARDS` responsive + touch-target
rules. Contrast figures computed with the WCAG 2.x relative-luminance formula. Ownership of this chain
and the order it runs in: `cais-shared-services/SKILL_ROUTING.md` §2 "Design system".
