# Kira — marketing capability audit

> Codebase-grounded audit for the planned distribution program: three Kira-hosted video series (BBBO
> owner interviews, the adult-children strand, and the consultant/partner series), driving traffic
> through three doorways (owner / helping a parent / adviser) into the existing readiness/valuation
> process and a partner-matching funnel.
>
> **Method.** Read-only review of `C:\Users\denni\PycharmProjects\Kira` (git repo, branch `main`),
> live fetches of specific `kiraexec.com` pages for comparison, one live check of the ElevenLabs
> public Terms of Service/Prohibited Use Policy, and two operator-supplied facts (the live
> `NEXT_PUBLIC_KIRA_VOICE_ID` value; the avatar's origin/IP status) that are not determinable from the
> codebase. No code was run, no paid API calls were made, no messages were sent, nothing was modified.
> Every claim cites a file path (and line numbers where useful). Where something could not be
> confirmed, it's marked **NOT FOUND** with where I looked.
>
> Companion files: `docs/internal/KIRA_EVIDENCE.md` (full verbatim prompts — internal only) and
> `docs/KIRA_FUNNEL_SCOPE.md` (the gap analysis and build scope for the funnel described above).
>
> **Rule I followed throughout:** where the code and the live site disagree, both are reported and
> neither is treated as "more correct" — that's a marketing decision, not mine to make. Product
> features are not designed in this file (funnel scoping is confined to `KIRA_FUNNEL_SCOPE.md`, and
> even there it prefers extending what exists over new builds).
>
> Compiled 2026-09-25; revised same day with operator-supplied answers to two open questions and one
> external ElevenLabs-terms lookup.

---

## 1. KIRA THE PERSONA

### Summary (full verbatim prompts are in `docs/internal/KIRA_EVIDENCE.md` §1-3, §7-8)

Kira runs **three distinct personas depending on who she's talking to** — the single most important
fact for scripting, because "Kira's voice" is not one thing in the code:

| Journey | Who she's talking to | Persona | Source |
|---|---|---|---|
| `business` | The paying business owner (the BBBO series subject) | **"Fractional executive"** — direct, warm, acts fast, one clarifying question then does the thing | `lib/kira/exec-philosophy.mjs:13-80` |
| `consultant` / `distributor` | An advisor/broker/consultant bringing Kira to their own clients (the consultant series subject) | **"Ally"** — same operating style, but explicitly never frames it as the partner's own exit | `lib/kira/exec-philosophy.mjs:101-161` |
| `personal` | A non-business personal-assistant use | **"Curious friend"** — one question, then wait, slower and softer | `lib/kira/prompts.ts:60-147` |

Representative excerpts (full text in the evidence file):

> "You are {{firstName}}'s fractional executive... You are not a chatbot, not a search engine, and
> NOT a slow 'curious friend.' You earn trust by being useful in the first exchange, then by getting
> things done." — `lib/kira/exec-philosophy.mjs:16-19`

> "Do NOT warm up with a single question and wait. That wastes a paying owner's time... Ask only the
> ONE clarifying question a great EA would need to ACT well... then act." — `exec-philosophy.mjs:24-28`

> "You are {{firstName}}'s ally in bringing Kira to the clients they already work with — not their own
> fractional executive, and this is not about {{firstName}}'s own business being captured or sold." —
> `exec-philosophy.mjs:104-106` (the consultant persona)

**⚠️ No dedicated "adult child" persona exists.** There is no `journeyType` or persona branch for
talking to a business owner's adult child — only `personal`, `business`, `consultant`/`distributor`.
For the adult-children strand, Kira-in-character would be produced entirely on the video-production
side (scripted dialogue in her voice, per §2), not driven by a live product conversation mode. NOT
FOUND anywhere in `lib/kira/prompts.ts`, `discovery-config.ts`, or `exec-philosophy.mjs`.

### Her interviewing style — actual diagnostic questions, verbatim from code

Kira has no dedicated "interview mode" as a product feature (see §6). The closest real source of her
interviewing voice is the valuation question set (`lib/valuation/questions.ts`) and the behavioural
prompt rules. Verbatim, and directly usable as script seeds:

- "If you took a 3-month holiday tomorrow, what happens?" — options "It would fall apart / I am the
  business" · "It would struggle" · "It would mostly run" · "It would run fine, fully under
  management." — `questions.ts:263-270`
- "This is the single biggest driver of what your business is worth — and the thing most owners never
  think about until they try to sell." — `questions.ts:264`
- "Your processes, pricing and know-how are…" — `questions.ts:278`
- "How much revenue is locked in ahead of time?" — `questions.ts:292`
- "How spread out is your revenue?" — `questions.ts:243`, with the callback framing: "A buyer worries
  when too much rides on a handful of clients — especially ones who deal with you personally." —
  `questions.ts:244`

**How she follows up / pushes back**, from the prompt rules (not a scripted line, a behavioural
instruction): "Do not talk yourself out of the second one by inventing the first" (when refusing
something, `lib/kira/prompts.ts:443`); "Ask for what is missing. Do not fill it in" (on a call
debrief, `lib/kira/prompts.ts:757`); "One clarifying question max before you act" (never
interrogating, `exec-philosophy.mjs:69`). Her interviewing register is fast, warm, and single-question
— never a checklist read aloud.

**The demo-script narration** (`lib/genome/timeline.ts`, quoted in full in §7 of the evidence file) is
the closest thing to a finished "Kira talking to camera" script, already written and reviewed for
exactly this kind of public use — e.g. the owner-storyline opener:

> "You've thought about what happens next. Maybe you've mentioned it to nobody — not the staff, not
> the kids, some weeks not even your wife." — `lib/genome/timeline.ts:76-79`

and the advisor-storyline opener:

> "You already know this client. Thirty years in, genuinely profitable, and every decision still
> routes through one person. You'd take the listing tomorrow if the owner weren't the product." —
> `lib/genome/timeline.ts:307-309`

### What she must never say — disclaimers, verbatim

| Claim | Exact wording | Source |
|---|---|---|
| Not a licensed adviser (spoken to an advisor about her own liability) | "Kira is not a licensed adviser and does not give financial, legal, tax or valuation advice. The valuation she produces is an indicative figure from the owner's own self-reported numbers... It is a conversation-starter for the work you do, not a substitute for it." | `lib/trust.ts:29-35` |
| Not a licensed adviser (advisor FAQ) | "Kira is not a licensed adviser and gives no financial, legal, tax or valuation advice." | `lib/faq.ts:189` |
| Product terms | "Kira produces decision support, not professional advice. Valuations, readiness scores and suggestions are indicative... not financial, legal, accounting or valuation advice." | `lib/terms.ts:42` |
| On-screen, at the valuation result | "An indicative estimate for guidance only, adjusted for size, owner-dependence, recurring revenue, client concentration and growth. Not a formal valuation and not financial advice — real sale prices depend on many factors specific to your business and your buyer." | `app/business-valuation/page.tsx:1817-1819` |
| On the exported/printed handover document | "Prepared with Kira. Figures are indicative and self-reported; a buyer should verify them independently." | `lib/genome/render.ts:391-392` |

**Prompt-level rules for what she must never say (spoken behaviour, not just disclaimers):** never
claim to have checked something she has no tool for (`lib/kira/prompts.ts:410-472`); never say a
message was sent unless the tool reports `sent: true` (`prompts.ts:788-813`); never claim she
"watches, monitors or observes" (`prompts.ts:1164-1166`); never say "no one else can see it" about
confidentiality (`prompts.ts:618-624`); never offer to write "a summary, a document, a guide, a
manual or a report" — only a drafted quote, a drafted email, or a reminder (`prompts.ts:320-329`).

### How she describes herself, BBBO, the partner model, and consultants/advisers

**No scripted "what is BBBO" answer exists inside her conversational prompt** — that framing lives
entirely in marketing copy, not anything she's instructed to say mid-call. The video series' BBBO
framing must be written from scratch; it isn't extractable from her existing voice.

What does exist and is directly usable:
- Her self-description to a partner (persona, not a scripted line): "You are {{firstName}}'s ally in
  bringing Kira to the clients they already work with... Your job is to understand how {{firstName}}
  actually works... well enough that when their first client shows up, Kira already fits the practice
  that client is coming through." — `exec-philosophy.mjs:104-111`
- The commission disclosure text supplied to a partner to forward to their client, in the *partner's*
  first person, not Kira's: "Disclosure: I have a commercial interest in this introduction... Corporate
  AI Solutions pays [me] a commission of 10% of what you pay them, each month, for as long as you
  remain a subscriber." — `lib/introducer/disclosure.ts:66-73`
- The BBBO mission statement, verbatim: "The BBBO mission is to help 10,000 Baby Boomer-owned
  businesses maximise the proven True-Value of what they have built and prepare those businesses for
  eventual ownership transition." — `components/landing/LandingConsultant.tsx:328-331`. Milestones:
  1,000 businesses by 31 December 2026, 10,000 by 31 December 2027 (`docs/HLD.md:293-294`).
- "BBBO" confirmed to mean **Baby Boomer Business Owner(s)** — `lib/invitation/invitation-service.ts:312-314`.

### Visual assets

- **`public/female_avatar.jpeg`** — 586×589px, 59,553 bytes. The **only** image of "Kira" in the
  repository. Displayed at 56×56px next to the voice widget (`components/KiraShape.tsx:141-145,173`).
- **✅ Origin resolved directly by the operator (2026-09-25, not from the codebase): AI-generated, to
  Dennis's own design; he holds the IP.** No rights/provenance blocker. Two things worth still
  carrying forward: the file has **no EXIF metadata** (bare JFIF header only — checked directly),
  consistent with an AI-generated origin; and the introducing commit (`a4f0ee2`, 24 Jul 2026)
  describes it as "the shared Morgan coach face" — the same asset is reused as a different CAIS
  product's voice persona. That's a brand decision (exclusive face vs. shared asset), not a legal
  one, worth making before the series locks its visual identity.
- **The "kitchen table" scene is not a photo of Kira** — a hand-drawn SVG illustration, deliberately
  faceless: "The viewer is meant to see HIMSELF here, and a drawn face is always somebody else." —
  `components/DemoScene.tsx:1-13`. The `kitchen-table` scene ("Two chairs at a table — the
  conversation he has not had yet," `DemoScene.tsx:86-102`) opens the landing walkthrough on: "You've
  thought about what happens next. Maybe you've mentioned it to nobody..." (`timeline.ts:76-79`).
- Six other placeholder scenes exist on the same no-faces principle: `site`, `office`, `handshake`,
  `document`, `phone`, `ute` (`components/DemoScene.tsx:32-153`), each explicitly labelled a
  **placeholder** pending real photography — `DemoScene.tsx:1-10`.

---

## 2. KIRA THE VOICE AGENT

### Provider and model

- **Provider: ElevenLabs Conversational AI (ConvAI)**, via the internal shared package
  `@caistech/elevenlabs-convai` v0.17.1 (`package.json:21`). Not OpenAI Realtime, not Vapi.
- **LLM (reasoning, not voice):** `gpt-4.1-mini` (`DEFAULT_AGENT_LLM`,
  `app/api/kira/create/route.ts:32,52`; defined in
  `node_modules/@caistech/elevenlabs-convai/dist/agent-client.js:21`). Comment warns never to use
  `gpt-4o-mini` — it "drops tool calls" on long conversations. — `app/api/kira/create/route.ts:47-51`
- **TTS model:** `eleven_flash_v2` — "English-only, 75ms latency, purpose-built for conversational
  AI." — `app/api/kira/create/route.ts:44-46`
- **Temperature:** `0.7` — `app/api/kira/create/route.ts:53`

### ⚠️ Voice ID — CONFIRMED, and it exposes three different voices live in the product at once

`NEXT_PUBLIC_KIRA_VOICE_ID` is confirmed (operator-supplied, 2026-09-25) as `M7ya1YbaeFaPXljg9BpK` —
**"Hannah Jayne."** Tracing every place a voice ID is actually consulted shows this is not one voice,
but at least three, by design of the current code:

| Surface | Voice actually used | How it's wired |
|---|---|---|
| Pre-generated demo-narration audio (landing-page walkthrough mp3s) | **Hannah Jayne** (`M7ya1YbaeFaPXljg9BpK`) | Reads `NEXT_PUBLIC_KIRA_VOICE_ID` directly; the script *refuses to run* unless it equals this exact ID — `scripts/generate-demo-audio.mjs:25,31-39` |
| The optional "Discovery" onboarding call | **Hannah Jayne** | Same env var — `lib/kira/discovery-config.ts:16` |
| **The actual operational Kira every paying customer talks to, ongoing** (created at signup, `app/api/kira/create/route.ts`; re-verified at `app/api/kira/ensure/route.ts`) | **"Sarah"** (`EXAVITQu4vr4xnSDxMaL`) | **Hardcoded as a literal string** — does not read any env var. `create/route.ts:45`, `ensure/route.ts:44` |
| The public landing page's *live, interactive* voice widget (separate from the pre-recorded demo — `LandingConsultant.tsx`/`LandingNew.tsx`, provisioned by `scripts/provision-landing-agent.mjs`) | **Unconfirmed — a third, DIFFERENT env var**, `KIRA_VOICE_ID` (no `NEXT_PUBLIC_` prefix) | Falls back to Sarah if unset — `lib/kira/landing-agent.mjs:30` |

**Consequence for production, not just a fact to note:** the existing demo audio and Discovery calls
speak in Hannah Jayne; the voice a real customer builds an ongoing relationship with is Sarah. **If
the series is produced in Hannah Jayne to match the existing demo clips, it will not match the voice
of the actual product a viewer signs up for.** This needs a deliberate decision: (a) produce in Sarah,
matching the real operational product, and treat the existing demo-audio clips as themselves
inconsistent and due for regeneration; or (b) standardise every surface — demo audio, Discovery, the
landing widget, and the operational agent — onto one voice going forward. Continuing to let three
surfaces disagree by accident is the one option that shouldn't be chosen by default.

**Voice settings for the pre-generated narration** (the only place these are explicitly configured):
```
model_id: 'eleven_multilingual_v2'
voice_settings: { stability: 0.55, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true }
```
— `scripts/generate-demo-audio.mjs:56-60`. "Steady rather than expressive: she is explaining something
to a sceptical 66-year-old, not performing." **No separate voice-settings block exists for the live
conversational agent** — its `tts` config sets only `voice_id` and `model_id`
(`app/api/kira/create/route.ts:317-320`), so it runs on ElevenLabs' own defaults for
stability/similarity/style.

**Language/accent:** `en` only, no accent selection (`app/api/kira/create/route.ts:315`). **Speed:**
not configured anywhere — NOT FOUND; ElevenLabs default applies.

### Speech-to-text and conversation flow

- **STT:** entirely inside ElevenLabs ConvAI's own pipeline — no separate/custom STT component in
  this repo. NOT FOUND as a standalone piece; vendor-internal.
- **Consent before listening:** ElevenLabs' own vendor consent modal, unmodified — the product does
  not configure custom consent text (`regulatory.config.json:32-35`). The privacy policy reconciles
  it in plain words: "The voice conversation itself is processed by ElevenLabs, which is why they ask
  for your consent before a call starts." — `lib/privacy.ts:122`
- **Greeting:** a single, fixed first message baked into the agent at creation, never regenerated:
  **"Hey {firstName} — good to hear from you. Let me see where we got to."** —
  `lib/kira/prompts.ts:1236`.
- **The landing widget does not auto-connect.** Mic access is never requested until the visitor taps
  — deliberately, to avoid reading as "an application that started listening to him"
  (`components/KiraShape.tsx:13-34`).
- **Turn-taking:** standard ElevenLabs SDK voice-activity detection; no custom logic. NOT FOUND;
  vendor default.
- **Text fallback exists as a real second channel** — typing reaches the same agent and memory as
  speaking (`components/KiraShape.tsx:111-129`, `/api/kira/chat/text`).
- **Max conversation length:** `max_duration_seconds: 3600` (1 hour) on the live agent
  (`app/api/kira/create/route.ts:54`), overriding the shared package's default of 1200s.

### Existing audio samples

`public/demo-audio/` — 24 `.mp3` files plus `manifest.json` mapping a content-hash key to each file.
Pre-generated narration for the landing-page walkthrough: six selected owner-storyline beats
(`ICP_BEATS_DEMO`, `lib/genome/timeline.ts:276-297`) and the full advisor storyline (`ADVISOR_BEATS`,
`lib/genome/timeline.ts:303-422`). Generated one-shot via ElevenLabs' TTS endpoint by
`scripts/generate-demo-audio.mjs` — not a live conversation.

### Production recipe — rendering an arbitrary host line in her production voice

Describes the existing, working mechanism (`scripts/generate-demo-audio.mjs`). **Not executed** —
description only.

1. **Confirm which voice ID the production decision lands on** — this is now a decision (see the
   table above), not an unknown.
2. Take the script line as plain text, e.g. *"When did you last take a proper holiday?"*
3. `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`, header `xi-api-key: <key>`,
   `Accept: audio/mpeg`, body:
   ```json
   {
     "text": "When did you last take a proper holiday?",
     "model_id": "eleven_multilingual_v2",
     "voice_settings": { "stability": 0.55, "similarity_boost": 0.85, "style": 0.2, "use_speaker_boost": true }
   }
   ```
   — exact shape at `scripts/generate-demo-audio.mjs:50-64`.
4. Response body is raw MP3 bytes; the existing script writes them straight to disk (line 95).
5. **One-shot TTS call** — no live conversation, no consent modal (that only gates the interactive
   widget), no customer data touched.
6. Reuse the existing content-addressed-filename pattern (`{voiceId}:{text}` hash,
   `generate-demo-audio.mjs:41-44`) for a video-line batch rather than building a new one.

**Exact existing function:** `scripts/generate-demo-audio.mjs`, function `synthesise()` at line 50 —
the only TTS-for-arbitrary-text code path in the repo.

### Commercial use of the voice in public video (YouTube/TikTok/Instagram)

**Not in the codebase — checked live against ElevenLabs' public Terms of Service and Prohibited Use
Policy (2026-09-25; re-check before production, vendor terms change):**

- **Commercial use is gated by plan tier, not which voice is used.** Free ElevenLabs accounts are
  non-commercial only; a **paid plan** is required to use generated audio in monetised public content
  — YouTube/TikTok/Instagram ads all count. No distinction is drawn between a premade/stock voice
  (both Sarah and Hannah Jayne are premade library voices, not custom clones) and a cloned voice.
- **A disclosure requirement exists and should be built into the series, not just noted.**
  ElevenLabs' Prohibited Use Policy: organisations using their tech to power an AI agent "must clearly
  and prominently disclose to their users they are interacting with AI rather than a human." No
  mandated label/watermark format — a plain "Kira is an AI" statement (on-screen or in each video's
  description) satisfies the spirit of it.
- Real-person impersonation without consent is the hard prohibition; using a licensed premade voice as
  a consistent branded AI character (what Kira already is) is not restricted.
- Output ownership stays with the account holder; ElevenLabs holds a service-improvement licence over
  inputs/outputs but commits not to commercialise the voice itself standalone.
- **Action item:** confirm the CAIS ElevenLabs account is on a paid tier before publishing anything,
  and add a plain AI disclosure to each video.

---

## 3. THE EXISTING READINESS / VALUATION PROCESS

*Reuse only — this is the product's single existing process; the funnel does not get a second one.*

### Every question, in order, with answer type

Full source: `lib/valuation/questions.ts:160-405`, array `STEPS`. **13 screens, 15 underlying
questions** (a group screen at the end asks three things at once — `QUESTION_COUNT` vs `SCREEN_COUNT`,
`questions.ts:443-458`; the product's own code comment flags that some prose elsewhere still says
"eleven questions" and is stale — `questions.ts:445-449`).

1. **Industry** — autocomplete/free text (`questions.ts:161-169`)
2. **Annual turnover** — money input (`questions.ts:170-179`)
3. **Annual profit (SDE)** — money input (`questions.ts:180-193`)
4. **Profit trend, 5 years** — 4-way choice (`questions.ts:194-208`)
5. **Margin trend** — 3-way choice (`questions.ts:209-222`)
6. **Client base trend** — 3-way choice (`questions.ts:223-236`)
7. **Client concentration/spread** — 3-way choice (`questions.ts:237-256`)
8. **Owner dependence** — "3-month holiday" 4-way choice (`questions.ts:257-271`)
9. **Systems/documentation** — 3-way choice (`questions.ts:272-285`)
10. **Recurring revenue** — 3-way choice (`questions.ts:286-299`)
11. **Tangible assets** — money input (`questions.ts:300-309`)
12. **Business debt** — money input, **optional**, explicitly "leave blank if you'd rather not say"
    (`questions.ts:329-341`)
13. **Closing group screen (3 questions, one screen, all optional):** work-in-progress/retentions,
    premises ownership, desired exit timeframe (device-only, never transmitted) —
    `questions.ts:361-404`

### Approximate completion time

**Stated in the product's own marketing copy, not measured/logged anywhere**: "Eleven questions,
about three minutes, no card" (`lib/genome/timeline.ts:224-226`), also "three minutes" repeated at
`timeline.ts:349-350,415-416`. **⚠️ That figure is stale by the code's own admission** — the question
count grew to 13 screens/15 questions after the debt and closing-group screens were added, and a
source comment flags the "eleven questions" line elsewhere on the dashboard as "true before the debt
question... has been wrong since" (`questions.ts:445-449`). No actual completion-time telemetry
exists (no analytics at all, per §6) — "about three minutes" is a design intent, not a measured fact,
and is likely a mild undercount today.

### Mobile behaviour

No dedicated mobile-specific logic found in the valuation flow's own code, but the product-wide
responsive design rule applies as a floor: 16px+ base text, 44px+ touch targets, single-column
mobile-first layout (`DESIGN.md:23,108-111`; portfolio-wide standard). The flow is a client component
using `sessionStorage` to persist progress screen-to-screen so an interrupted session resumes rather
than restarting (`app/business-valuation/page.tsx:13-18`) — favourable for mobile, where
interruption (a call, switching apps) is more common than on desktop. No separate "mobile-only
shortened flow" exists — see `KIRA_FUNNEL_SCOPE.md` §2 for whether a shortened front-end is worth
building for cold Facebook traffic.

### Scoring logic, formulas, and bands

Full engine: `lib/valuation/model.ts`, function `computeValuation` (lines 497-730). Deterministic
**SDE-multiple model**, not an AI/LLM judgement: "The valuation is arithmetic... No AI model is
involved in the number, and nobody reviews it before you see it." — `lib/privacy.ts:150`

- **SDE** = reported annual profit, defined as "net profit + the owner's salary and perks + interest +
  depreciation + one-off items a new owner would not carry" (`model.ts:5,71-80`).
- Sector-median SDE multiple looked up from an Australian-evidence-calibrated table
  (`lib/valuation/sde-multiples.ts`, `lib/valuation/au-evidence.ts`).
- **Floor/ceiling multiples** derived from that sector median (floor ratio scales with the sector's
  own level; ceiling = median × 1.35, hard-capped at 5.0×) — `model.ts:414-472`.
- **Readiness** (0–1): a weighted score across five factors, 10 points total: owner dependence (3),
  documented systems (2), recurring revenue (1.75), client concentration (1.25), growth/trend (2) —
  `model.ts:218-220,509-569`.
- **Walk away** = tangible assets entered — `model.ts:674`. Meaning shown: "if you closed the doors
  tomorrow and sold the gear" — `lib/valuation/headline-numbers.ts:40`.
- **Today** = annual profit × (floor + readiness × spread) — `model.ts:650,675`. Meaning: "what a
  buyer would pay as it stands, buying himself a job" — `headline-numbers.ts:46`.
- **Captured (potential)** = annual profit × a bounded higher multiple, capped at 0.75 turns of extra
  multiple regardless of gap size, scaled by remaining headroom (`DOCUMENTATION_UPLIFT = 0.75`,
  `model.ts:448,652-669`). Meaning: "once it runs, and sells, without you" — `headline-numbers.ts:52`.
- **Gap** = `potential − today`, floored at 0 — `model.ts:677`.
- Model is version-stamped (`MODEL_VERSION = '2026-08-14.1'`, `model.ts:195`) so a re-weighting never
  silently rewrites a figure already shown to a real person.

### Exact terminology, verbatim, and the "valuation engine" question

The product never calls this a "valuation" without qualification: "indicative valuation" (small
label, `app/business-valuation/page.tsx:1171`) → "indicative estimate for guidance only... Not a
formal valuation" (result page, `page.tsx:1817-1819`) → "indicative figure from the owner's own
self-reported numbers" (advisor copy, `lib/trust.ts:31-32`) → "Figures are indicative and
self-reported" (export footer, `lib/genome/render.ts:391`).

**✅ Checked directly against the live site (2026-09-25, `kiraexec.com/business-valuation`): no
tension found.** The live page reads "Indicative estimate for guidance only — not a formal business
valuation," matching the code's own wording closely enough to call this consistent. The exact phrase
"not a valuation engine" wasn't found on that page or in the codebase; if marketing has seen it
phrased that way somewhere else, check that specific URL before scripting around it.

### Fee band selection

`lib/valuation/pricing.ts`, function `priceForProfit` (lines 107-128). **Chosen by the owner's
self-reported annual profit (SDE), deliberately not by the calculated gap** — reversed from an
earlier gap-based version after a tester caught the conflict of interest in ~90 seconds: "I now have
a number I like, that you've told me not to rely on, from a company that gets paid more if the number
is bigger." — `pricing.ts:42-58`

| Annual profit (SDE) | Monthly price |
|---|---|
| $0+ | $499 (Starter) |
| $250,000+ | $999 (Growth) |
| $750,000+ | $1,999 (Scale) |
| $2,000,000+ | $3,499 (Enterprise) |
| $5,000,000+ | $4,999 (Legacy) |

**GST:** every displayed price carries "+ GST" (`lib/valuation/currency.ts:110-112`, derived from the
currency's own `tax` field, not hardcoded — for a GBP/EUR display it would read "+ VAT"). **Price
itself is AUD-only regardless of display currency** — only the valuation *figures* convert for
display; the *price* never does (`pricing.ts:7-19`, fixing a prior bug where a UK visitor was shown
£499 as if it were an FX conversion, when it was a separate, unrelated marketing figure). **12-month
cap and step-down** (billing-relevant, §4): after 12 months at full rate, price drops to one third
(`MAINTAIN_FRACTION = 1/3`, `pricing.ts:172-184`).

### All disclaimer text, verbatim

Already tabulated in §1's disclaimer table — the same constants back both her spoken instructions and
the on-screen/export text, so not duplicated here.

### The plumber example — illustrative, with a correction

Two distinct, explicitly-labelled fictional examples exist:

1. **The worked "Business Genome" example** — "A plumbing business, 31 years old, 9 staff." Own code
   comment: "This is a REAL-SHAPED example, not lorem ipsum... labelled as an example everywhere it
   appears... deliberately a plumbing business." — `lib/genome/example.ts:6-13,46-49`. Every fact
   inside it is invented to be realistic, not drawn from a real customer.
2. **The advisor-demo "Bob the plumber" figures** — $2.4M turnover, $260,000 owner earnings, a
   **$438,000 gap**. Also explicitly fictional, inviting substitution: "Pick one of them, or make one
   up with numbers you'd recognise, and run him through the valuation." —
   `lib/genome/timeline.ts:326-333,412-419`

**⚠️ Correction to the figures given.** `$220,000 / $626,000 / $821,000` was not found anywhere in the
codebase as a set. The nearest match is figures quoted **inside an internal engineering bug-tracker
comment**, not a designed marketing example: **"WALK AWAY $220k / TODAY $684k / CAPTURED $879k,"**
cited as a real screenshot a tester flagged for having no explanation of what "walk away" meant
(`lib/valuation/headline-numbers.ts:5-9`). Whose account produced those numbers isn't stated, and the
comment predates the current model version — even regenerated today with identical inputs the output
would likely differ. **Treat $220k/$626k/$821k as unconfirmed**; use the labelled plumbing/Bob
examples above instead — the ones actually designed and reviewed for public use.

### Can someone other than the owner start it?

**Yes, by design — no gate exists.** The page's own header comment: "Public, no auth, free instant
result (no gate). Answers are parked in sessionStorage as they go, so an interrupted owner resumes
rather than restarting eleven questions." — `app/business-valuation/page.tsx:13-14`. Nothing in the
flow checks who's typing — the same flow is equally reachable by the owner, a family member, or an
adviser filling it in on a client's behalf. **What's genuinely missing** (confirmed by absence, not
found anywhere): there's no field or flag capturing *who* is completing it (owner / family member /
adviser-on-behalf-of), and the result screen and downstream signup flow both assume it's the owner
speaking in first person ("what YOU stand to unlock" framing throughout `timeline.ts` and the result
page copy). A family member or adviser can complete it today, but the product doesn't know that
happened, and the language wasn't written with that reader in mind — see
`KIRA_FUNNEL_SCOPE.md` §4 for what a shortened family-labelled path would need.

---

## 4. BILLING AND OFFER TERMS

### There is no free month — billing is in arrears, a materially different promise

`lib/billing/arrears.ts:1-18`: card captured at signup, charged nothing immediately; the first month
is owed from day one but not invoiced until it closes. Cancel before then and **the month in progress
is waived entirely**.

> "One month is not valuable enough in terms of output to make it important to grab and run, it's the
> continual flow... thanks for trying us out and off you go." — `arrears.ts:8-9`

Explicitly **not** a trial: a trial gives month one away and bills a month ahead; arrears charges every
month and always bills behind. Identical for 30 days, then they invert.

Live-mode copy: *"It is saved, not charged. Your first payment is [price] at the end of your first
month, and we email you three days before it. Cancel before then and the month is written off."* —
`lib/billing/copy.ts:43-44`

**⚠️ Production is billing real cards today.** `STRIPE_LIVE_MODE` is confirmed on
(`docs/BUILD_REGISTER.md:684-688,1119-1122`: *"real `cs_live_` sessions minted"*). Test-mode "free
while in beta" copy exists in code (`lib/billing/copy.ts:61-78`) but is not the live state.

### Maintain rate and 12-month cap

After **12 months at full rate** (`FULL_RATE_PERIOD_CAP = 12`, `pricing.ts:184`), price automatically
steps down to **one third** (`MAINTAIN_FRACTION = 1/3`, `pricing.ts:173`), enforced mechanically
(`lib/billing/arrears.ts:208-265`), regardless of whether "the manual is finished." Narrow in scope —
reduces the price of keeping the manual current, not the ongoing assistant work
(`pricing.ts:145-153`).

### Trial, coupon, or promo-code support

**No Stripe coupon/promo-code mechanism exists or has ever been used.** `allowPromotionCodes: false`
is set deliberately: "there are no Stripe coupons in this account and none have ever been issued." —
`app/api/checkout/route.ts:166-188`. Turned off after a real tester typed a **beta invitation code**
into Stripe's own promo-code field and was told "Invalid promo code" — a dead end that cost a signup.

The only access-gating mechanism is the **beta invitation code system**
(`lib/billing/beta-codes.ts`) — a 12-character code bound to a specific email and pre-set
organisation, minted by an operator script, single-use. Not a discount — it gates account creation.
Adding real Stripe coupon support for a campaign would be new work, not a flag flip.

---

## 5. PARTNER PROGRAM (current state)

### Commission logic

`lib/introducer/disclosure.ts:29`: `COMMISSION_RATE_PCT = 10` — **10% of what the introduced owner
pays**, monthly, for as long as they remain a subscriber. Given the price bands, that's $49.90–$499.90
per referred owner per month (`disclosure.ts:42-47`). Paid only on an actual paying subscriber —
never on a trial (there are none).

### First-touch attribution — full mechanism, now with schema

Built on `@caistech/attribution`, HMAC-signed cookie, database-enforced first-touch-wins:

> "First touch WINS: if a valid attribution cookie is already present, this does not overwrite it."
> — `app/r/[token]/route.ts:6-7`

**This is enforced at the database level, not just in application code** — a Postgres trigger
(`enforce_attribution_immutability()`) blocks any change to `referrer_id`/`first_touch_at` once set;
NULL→value is allowed, value→different-value raises unless an explicit admin-override header is
present, and every override is written to an `attribution_overrides` audit table —
`supabase/migrations/20260726000000_introducer_channel.sql:139-202`. This is a genuinely strong
guarantee: a commission can't be silently reassigned by a bulk import or an admin screen.

**How referral links and codes carry through:** each introducer gets a unique `referral_token`
(`introducers.referral_token`, `..._channel.sql:22-41`). Their link is `kiraexec.com/r/<token>`
(`app/r/[token]/route.ts`) — visiting it looks up the introducer, sets the signed first-touch cookie
if none exists, records a click (creates an `introductions` row with `status: 'clicked'` even before
signup — `..._channel.sql:74-90`), and **redirects unconditionally to the plain home page (`/`) — no
campaign/UTM parameters are appended or preserved.** When the visitor eventually signs up, the cookie
is read and `referrer_id`/`first_touch_at` are written onto their `users` row
(`lib/introducer/index.ts:314-336`).

**⚠️ Gap for the funnel: attribution does not currently ride through the readiness/valuation flow at
all.** The valuation is anonymous and pre-account (§3); the attribution cookie is only ever consumed
at *account signup*, not at valuation start or completion. So today, a partner's link → valuation →
signup path is attributed correctly **only because the cookie survives in the browser from click to
eventual signup** — there's no code connecting a specific valuation *result* to a specific
introducer's token before an account exists. See `KIRA_FUNNEL_SCOPE.md` §6.

An introducer also gets a **magic-link sign-in** to their own dashboard
(`/introducer/enter/<token>`), a separate, single-use-hashed, 7-day-expiry token
(`lib/introducer/index.ts:148-178`).

### Partner data actually held today

Confirmed directly from the schema (`supabase/migrations/20260726000000_introducer_channel.sql:22-41`)
— the `introducers` table holds: `id, email, name, org_name, org_abn, payee_type, payee_name, role,
status, referral_token`. **That's the complete list.** No location/region, no industry specialisation,
no capacity/availability, no bio, no photo field anywhere on this table.

**⚠️ Worth flagging precisely, because the data almost exists already, just not where matching would
need it.** The public advisor-enquiry form (`app/advisors/AdvisorEnquiryForm.tsx`) — a different,
earlier stage than the `introducers` table — already collects **first/last name, firm (via ABN
lookup, which resolves an entity name, ABN, and **state**), practice type** (business broker /
accountant / bookkeeper / financial adviser / lawyer / other), and **client band** (Under 20 / 20–50 /
50–200 / 200+) — `AdvisorEnquiryForm.tsx:27-36`, `app/api/advisors/enquiry/route.ts:42-108`. But this
lands in a **separate `advisor_enquiries` table**, not `introducers`
(`app/api/advisors/enquiry/route.ts:95-108`), and an operator manually creates the `introducers` row
from `/admin/introducers` after review (`app/api/advisors/enquiry/route.ts:6-8`) — a step that, as
built, does not carry state/practice-type/client-band across into the record that would actually be
used for matching. The gap is the join, not a from-scratch data-collection build. See
`KIRA_FUNNEL_SCOPE.md` §8.

### What partners can see in their dashboard

`app/introducer/page.tsx` — a table of every owner introduced, each row showing: **status** (Looking
→ Signed up → Paying → Lapsed, `page.tsx:25-33`; a legacy "First month" state exists for pre-arrears
rows and can't be reached by any new introduction); **readiness movement** — from→to change, or
"starting position" until ≥2 data points (`page.tsx:60-89`, never faked into a trend). **Never
shown**: the owner's actual conversations, transcripts, or memory — enforced at the database level via
`introducer_owner_projection()`, a Postgres function that structurally cannot select content columns
(`..._channel.sql:216-253`; `lib/trust.ts:69-78`).

### Existing lead routing, assignment, matching, or booking logic

**NOT FOUND.** I searched `lib/introducer/` for any match/assign/routing logic — none exists; every
introduction is tied to exactly the introducer whose link produced the first touch, with no concept
of "which of several partners should this lead go to." I searched the entire repo for a calendar
booking integration (Calendly, Cal.com, or a custom booking table) and found exactly one Calendly
reference: a generic `NEXT_PUBLIC_VENDOR_CALENDLY` link in the site footer
(`components/corporate/CorporateFooter.tsx:13,65-69`) that opens Dennis's own personal Calendly — not
a partner-specific booking system, and not wired to any owner/partner match. **Both the matching
engine and any booking integration are entirely new builds** — see `KIRA_FUNNEL_SCOPE.md` §7, §10.

### Co-branded or white-label partner links/pages

**NOT FOUND — none exists.** `/r/<token>` redirects straight to the standard, un-personalised home
page; nothing carries the introducer's name, firm, or branding through to what the referred owner
sees. Kira is treated as a single, CAS-branded product throughout, not white-label
(`regulatory.config.json:5-13`, `operator.brand_owner: "cais"`).

**Effort estimate:** the introducer row already carries `name`/`org_name`, and the disclosure-text
generator already composes personalised copy from those fields (`lib/introducer/disclosure.ts:62-77`)
— a co-branded "Introduced by [Name] at [Firm]" banner on the standard landing would be moderate,
scoped work (the token is already resolved in `app/r/[token]/route.ts`; what's missing is passing
that identity through the currently-discarded redirect into the landing render). A true visual
white-label (per-partner logo/colours) would be materially larger — nothing in the token system
(`app/tokens.css`) or landing components is per-tenant parameterised today.

### Partner onboarding, approval, and performance tracking

**Onboarding/approval:** manual, by design — see above (`advisor_enquiries` → operator review →
manual `introducers` row via `/admin/introducers`). Not self-serve, deliberately: "an introducer is
added by an operator, who checks the practice is real before their link starts attributing
commission" (`app/api/advisors/enquiry/route.ts:6-8`). Before a link goes live, the partner also must
accept a portal **undertaking** — version-tracked, and the board is gated on it
(`lib/introducer/index.ts:56-63,86-111`; `app/introducer/terms/`).

**Performance/SLA tracking:** **NOT FOUND.** No response-time tracking, no conversion-rate-by-partner
metric, no service-level enforcement anywhere in the codebase. This would be new work — see
`KIRA_FUNNEL_SCOPE.md` §13.

---

## 6. TRACKING AND CAMPAIGN READINESS

### Analytics installed

**None.** No PostHog, no Google Analytics/`gtag`, no Segment, no `@vercel/analytics` anywhere in the
repo (checked `app/layout.tsx` specifically — not present). Confirmed deliberate and current:
"Session cookie only, strictly necessary... No analytics, no advertising, no cross-site tracking...
**Re-declare the moment any analytics is added.**" — `regulatory.config.json:40-43`

### UTM and source capture

**None.** No code anywhere reads or stores `utm_source`/`utm_campaign`/etc. The only capture
mechanism is the introducer first-touch cookie (§5), which identifies *which human introducer*
referred someone — not which series, video, platform, or campaign.

### Conversion events — check started, check completed, doorway chosen, guide downloaded, "send to parent" used, call booked, partner application, sign-up

No event-tracking layer exists (nothing to send named events to). What exists as raw signal:
- A completed valuation is persisted as a `business_valuations` row
  (`app/api/kira/create/route.ts:696-703`).
- Readiness snapshots exist over time for the introducer board's "movement" feature
  (`lib/introducer/index.ts:130-146`).
- Sign-up/subscription-status transitions run through the Stripe webhook path
  (`lib/introducer/index.ts:369-408`).
- **Partner application** = a row in `advisor_enquiries` (§5) — this one genuinely is a recorded
  event, just not instrumented as "an event" in an analytics sense.
- **"Doorway chosen," "guide downloaded," "send to parent used," "call booked"** — NOT FOUND, all
  four. None of these concepts exist in the current product at all (see §5 for booking; the other
  three don't exist as features yet — see `KIRA_FUNNEL_SCOPE.md`).

### Can a booking or sign-up be attributed to a specific series, video, platform, or partner today?

**Only to a partner** (via the first-touch cookie), and only if that partner's link was actually
used. **Not** to a series, video, or platform (Facebook/LinkedIn/YouTube/Instagram) — no such concept
exists anywhere in the schema or code.

**Smallest change to add it (described, not implemented):** `/r/<token>` already resolves and signs a
first-touch payload before redirecting (`app/r/[token]/route.ts:36-49`); the signed cookie shape
already supports an arbitrary scope per touch (`@caistech/attribution`). The lightest addition:
accept and pass through a `utm_*` (or a lighter `?src=`) query string on `/r/<token>` and on plain
landing URLs, persist it inside the same signed cookie payload alongside `referrerId` (which already
exists as a field, `route.ts:38-43`), and write it onto the `users`/`business_valuations` row at the
same point `referrer_id`/`first_touch_at` are already written (`lib/introducer/index.ts:314-336`).
Reuses the existing signed-cookie, first-touch-wins mechanism — still new code, since no
campaign/source field exists on any current table.

### Adding campaign landing routes (`/before-you-sell`, `/family`, `/advisers`)

Low-effort, based on the existing pattern. The site already runs three interchangeable landing
variants behind one flag-driven switch (`app/page.tsx:37-56`), and a dedicated, differently-scoped
page already exists for a different audience at `app/advisors/page.tsx`. A new route composing
existing components and pointing its CTA at `/business-valuation` (already the pattern, e.g.
`lib/genome/timeline.ts:229`) is straightforward — no schema change, no new backend for the route
itself. Wiring UTM capture onto it rides on the change described immediately above.

### Roleplay / simulated-dialogue feature

**NOT FOUND**, as expected — searched the whole prompt system, no such mechanic exists distinct from
the real per-owner conversational product in §1. The three fictional-owner/child/consultant video
series are correctly a production-side construct (scripted dialogue in Kira's voice via §2), not a
product feature to build.

---

## 7. BRAND

### Colours

**⚠️ The product's own design system explicitly retired `#fb7185`, and several live surfaces still
use it — an internal inconsistency, not a website disagreement.**

- **Current, documented system:** green-forward, locked 2026-08-03 (`DESIGN.md:1-42`). Primary action
  `--brand-600 = #15803D` ("5.02:1 on white — body text, links, fills"), full token system in
  `app/tokens.css:1-148`. Warm neutral greys kept for an older readership. Stated authoritative: "When
  this file and the code disagree, this file is right and the code is a bug." — `DESIGN.md:6`
- **`#fb7185` (pink/rose) is a retired value still live**, contradicting that system:
  `app/layout.tsx:52` (PWA `themeColor`), `app/manifest.ts:15`, `app/my-genome/page.tsx:182`,
  `app/onboarding/page.tsx:127`, `app/business-valuation/page.tsx:507`,
  `components/auth/AuthForm.tsx:50`, `components/DemoScene.tsx:16`. The repo's own token validator
  names it directly: "pink (#f472b6, #fb7185, #fce7f3)... none of which are in the palette." —
  `scripts/validate-tokens.cjs:6-8`

**Marketing implication:** if the series adopts `#fb7185` because it's what's currently in the phone
icon and a few live pages, it's building on a colour the product's own design system calls a bug.

### Fonts

**Inter, exclusively, today** — `sans`/`display`/`body` all alias to Inter
(`tailwind.config.ts:56-66`), a recorded decision, not an oversight. A second face (Lexend, for
reading proficiency in an older readership) is open but not yet applied (`DESIGN.md:114-117`). No
font-size below 15px anywhere by design rule (`DESIGN.md:111`); body 17px.

### Logo files

**NOT FOUND.** No logo asset (SVG/PNG) anywhere in `public/`, `components/`, or `app/` — the product
currently uses typography for its wordmark rather than a logo file.

### Tone/style guide

`DESIGN.md` (repo root) is the canonical design document. Worth keeping in front of anyone writing
video copy: *"A 60–70-year-old owner-operator of a physical trade business... Playful, jokey or
novelty design reads as not taking him seriously... Trust is the conversion."* — `DESIGN.md:18-28`

### BBBO mission wording and milestones, exactly as they appear in code

> "The BBBO mission is to help 10,000 Baby Boomer-owned businesses maximise the proven True-Value of
> what they have built and prepare those businesses for eventual ownership transition." —
> `components/landing/LandingConsultant.tsx:328-331`

Milestones: **1,000 businesses by 31 December 2026, 10,000 by 31 December 2027** —
`docs/HLD.md:293-294` (consistent across multiple internal directive docs and outreach scripts, e.g.
`scripts/send-relationship-first.mjs:152-154`). The live `LandingConsultant.tsx` page renders "1,000
businesses" as a standalone stat (`components/landing/LandingConsultant.tsx:336`).

---

## 8. CAPACITY, PRIVACY AND RISK

### Scenario (a): 1,000 readiness checks + 100 bookings over a month

- The readiness/valuation compute path is stateless arithmetic with **no external API call**
  (`model.ts` calls nothing but its own lookup tables) — 1,000 checks cost nothing in third-party API
  terms.
- **100 sign-ups = 100 real ElevenLabs conversational agents provisioned** (one per organisation per
  journey, `app/api/kira/create/route.ts:255-293`), each a ~10-second, multi-call creation flow
  (agent create, webhook bind, allowlist set, 18 tools attached —
  `app/api/kira/create/route.ts:414-554`). An idempotency guard exists against double-submission
  creating duplicate paid agents (`route.ts:174-212`), but **no visible rate limit or queue** on
  concurrent creations — NOT FOUND.
- **100 sign-ups = 100 real Stripe subscriptions**, live mode confirmed on. Billed in arrears (§4),
  distributed across each subscriber's own billing anniversary, not a batch charge.
- **"100 bookings"** has no product equivalent to size against — there's no booking feature yet (§5,
  §6); this scenario can't be assessed until `KIRA_FUNNEL_SCOPE.md` §10 is built.
- A known, documented race condition can silently produce a zero-tool (no-memory) agent under
  concurrent writes to the same agent — mitigated by a read-back retry, cause still recorded as
  "unknown" (`app/api/kira/create/route.ts:419-554`).

### Scenario (b): a campaign-weekend spike

- **No rate limiting found anywhere.** No `middleware.ts` exists at any path in the repo; no
  `rate limit`/`withTrust`/`platform-trust-middleware` usage relevant to request throttling (only
  unrelated matches in PubGuard's own vendor-API handling). **NOT FOUND**: no request throttling, no
  WAF/bot-mitigation layer.
- **No concurrency cap found** on simultaneous ElevenLabs agent creations, live voice conversations,
  or Stripe checkout sessions.
- **ElevenLabs workspace is shared across the whole CAIS portfolio** (11 products per shared-services
  docs) and has previously accumulated hundreds of orphaned tools/agents from unrelated products — a
  Kira-driven spike lands inside that shared workspace's own account-level limits, which are outside
  this repo. NOT FOUND for Kira-specific headroom.

### Cost per readiness check / voice conversation

**Per readiness check: effectively $0 in third-party terms** — pure arithmetic, no external call.
**Per voice conversation: NOT FOUND, not derivable from the code.** ElevenLabs pricing is
per-minute/per-character at the account/plan level, not embedded in this repo. The codebase fixes the
*ceiling* on a single conversation (1 hour, §2) but not typical length, and records no internal
cost-per-conversation metric. A genuine ElevenLabs-account question, confirmed unattemptable — I
tried the connected Vercel MCP to reach account-level facts and it returned `403 Forbidden — wrong
scope` for this project; there's no equivalent ElevenLabs account tool connected at all.

### Database growth, serverless/Supabase limits

**NOT FOUND** — hosting-plan facts, not application-code facts.

### Manual/non-automated steps

- **Minting a beta invitation code** — manual, via `scripts/mint-beta-code.mjs`
  (`lib/billing/beta-codes.ts:98`).
- **Approving a new partner** — manual, via `/admin/introducers`, described in §5.
- The welcome/handover-ready email sends automatically on first agent creation
  (`app/api/kira/create/route.ts:761-793`) — not manual.
- No manual approval gate exists in the ordinary signup→agent→billing path itself.

### Privacy, terms, consent, and AI-disclosure text relevant to marketing claims

The single most load-bearing sentence for what the product does with an owner's data: "Your business
details stay in your account. They are used to build your Operating Manual and nothing else — not
sold, not pooled, not used to train anyone's model." — `app/about/page.tsx:102-103`, matched by
`lib/privacy.ts:169-170`.

**⚠️ Specifically asked: is there consent to share an owner's results with a named third-party
partner? NOT FOUND — no such consent mechanism exists today.** The privacy policy states the opposite
direction plainly for the one third party that *does* currently exist (the introducer): "Our support
team can see what Kira has captured... It is never shared with anyone who referred you, and never
shown to a buyer." (`lib/privacy.ts:71-73`), and the introducer board is architecturally blind to
content (§5). The funnel's proposed "owner consents at booking to their results going to a named
partner" is a **new consent flow and a new data-sharing capability, not an extension of anything that
exists** — today's product is built around the opposite promise (an introducer sees status/movement
only, never anything substantive). See `KIRA_FUNNEL_SCOPE.md` §12.

**Family-member/adviser-on-behalf-of data handling:** **NOT FOUND.** Because the valuation flow has
no concept of who's filling it in (§3), there's no privacy-policy language, consent flow, or data
model distinguishing "this is the owner's own data" from "a family member entered this about someone
else's business" or "an adviser entered this on a client's behalf." The current privacy policy is
written entirely in the second person to a single actor assumed to be the account owner
(`lib/privacy.ts:92-216`).

---

## 9. MARKETING CLAIMS TABLE

| Claim | Code-supported? | Evidence (path:line) | Website says | Safe for marketing? | Required wording/caveat |
|---|---|---|---|---|---|
| Kira is an AI part-time general manager | **Yes** | `app/manifest.ts:7`; business persona = "fractional executive," `lib/kira/exec-philosophy.mjs:16` | Consistent | Yes | Use "part-time general manager" or "fractional executive" — both are the product's own terms |
| Kira interviews owners via voice | **Yes** | `lib/kira/prompts.ts` persona + `lib/valuation/questions.ts`; live ElevenLabs agent, §2 | Consistent | Yes | — |
| Kira remembers business information across sessions | **Yes** | Memory tools throughout `lib/kira/prompts.ts`; `lib/privacy.ts:118-124` | Consistent | Yes | "A distilled summary of what mattered," not "a full recording" — `lib/privacy.ts:120` |
| Kira identifies owner dependence | **Yes** | `lib/valuation/model.ts:163-168,257-271` (the "3-month holiday" question and its weighting) | Consistent | Yes | — |
| Kira builds an "Operating Manual" the owner can export | **Yes** | `lib/genome/render.ts`; `lib/kira/prompts.ts:330` | Consistent | Yes | Export is "yours... opens without any account and without us" — `render.ts:392` |
| Staff can consult Kira | **No** | `/talk`'s resolver: "NO org-level fallback — an agency belonging to another member can never satisfy this caller's lookup" — `app/talk/page.tsx:65-72` | NOT FOUND on the live site in this review | **No** | Say "the account owner's Kira," not "your whole team can talk to Kira" |
| Kira values/appraises a business | **No, deliberately qualified** | Every surface says "indicative estimate," never a bare "valuation" — §3 | Consistent (checked live) | **With wording** | Always pair with "indicative" / "not a formal valuation" |
| Kira helps prepare a business for sale | **Yes** | `lib/genome/timeline.ts`, `app/business-valuation` | Consistent | Yes | — |
| Kira gives financial, legal, or tax advice | **No — explicitly disclaimed** | §1 disclaimer table | Consistent | **Never without the disclaimer** | Always: "not financial, legal, tax or valuation advice" |
| Kira replaces a human adviser | **No — explicitly disclaimed** | "It is a conversation-starter for the work you do, not a substitute for it." — `lib/trust.ts:34-35` | Consistent | **Never** | Frame as a lead-generation/conversation-starter tool, never a replacement |
| Client/owner data is isolated per account | **Yes** | `lib/trust.ts:43-51`; entity-separation rule, `lib/kira/prompts.ts:631-664` | Consistent | Yes | — |
| Data isn't used to train models | **Yes** | `lib/privacy.ts:169-170`, `app/about/page.tsx:102-103` | Consistent | Yes | — |
| Kira matches owners with a suitable adviser | **No — does not exist** | No matching logic anywhere in `lib/introducer/`; confirmed by absence, §5 | NOT FOUND | **No** | Do not claim this until `KIRA_FUNNEL_SCOPE.md` §7 is built |
| Partner advisers have Kira embedded in their process | **Partial** | The `consultant` persona exists for a partner's OWN conversational use (`exec-philosophy.mjs:101-161`), but no product surface embeds Kira *inside a partner's own client-facing workflow* | NOT FOUND | **With wording** | Describe as "Kira works alongside you," not "embedded in your practice tooling" |
| Partners earn recurring revenue from Kira | **Yes, with a figure** | 10% of what the owner pays, monthly, while subscribed — `lib/introducer/disclosure.ts:29` | Consistent | Yes | State the exact 10% figure and "for as long as they remain a subscriber" — don't round up or imply a bonus/tier structure that doesn't exist |
| Partners can offer wealth advisory, legal/IP review, and readiness services through Kira | **No — does not exist** | No product surface for licensed-referral routing of any kind; not in `lib/introducer/`, not in the advisor form, not in the schema | NOT FOUND | **No** | These would be the CONSULTANT's own separately-licensed services, referred to alongside Kira — not something Kira "provides." See `KIRA_FUNNEL_SCOPE.md` |
| Kira gives consultants a low-cost, scalable entry point for prospects | **Partial** | The consultant/partner referral+commission mechanism genuinely exists and is low-cost to the consultant (§5) — but "sharing BBBO episodes and a readiness check with prospects" as a packaged consultant tool does not exist as a product feature | NOT FOUND as a packaged feature | **With wording** | Frame as "share your link, they take the free check" — accurate today; don't imply a dedicated prospect-sharing toolkit exists |
| Families can help a parent get started | **Yes, incidentally; no, as a designed feature** | The valuation flow has no owner-identity gate (§3) so a family member CAN complete it — but there's no "send to your parent" mechanism, no family-labelled path, no conversation guide artefact anywhere in the code | NOT FOUND as a designed feature | **With wording** | Accurate to say "anyone can run the free check," inaccurate to describe a "family strand" feature as already built |
| Free valuation, no card, ~3 minutes | **Yes, timing is stale** | No auth gate before result (`app/business-valuation/page.tsx:13-14`); "no card" language throughout `timeline.ts:224-226` | Consistent | Yes, with a caveat | "~3 minutes" is the product's own aspirational copy, not measured — the question set has grown since that line was written (§3); consider testing actual completion time before quoting it in ads |
| First month free / free trial | **No — this is arrears, not a trial** | §4 | Live site: "never invoiced for the month they are in" (matches arrears framing) | **With wording** | Never say "free trial" or "free month" — say "you're never billed for the month you're still in" |
| 1,000 / 10,000 Baby Boomer businesses mission | **Yes** | §7 | Consistent (live fetch confirms same figures/dates) | Yes | Use the exact dated milestones: 1,000 by 31 Dec 2026, 10,000 by 31 Dec 2027 |

---

## 10. MARKETING VIDEO BOUNDARIES

**Kira CAN say** (directly supported — see claims table): she's a part-time general manager/fractional
executive who talks to owners, remembers what they tell her, asks about owner-dependence and
succession-relevant risk, builds a durable Operating Manual/handover document the owner owns and can
export any time, keeps each account's data isolated and never trains on it, produces a free,
indicative estimate of what the business is worth today versus once it's documented, and that
introducing advisers earn a disclosed 10% recurring commission.

**"Coming" — only ONE item in the entire codebase qualifies as a genuinely scheduled, dated
commitment rather than a wish:** ElevenLabs "background listening"/"privacy mode" is explicitly named
as not yet built, in copy already written for the advisor audience: *"Privacy mode — where I sit in
the background and only wake when I'm called — isn't built. Today your client opens a conversation
deliberately. I'd rather you heard that from us than had to ask."* — `lib/genome/timeline.ts:401-404`.
Nothing else in the codebase carries a dated commitment. **Matching, booking, family-share links,
consultant prospect-sharing tools, and licensed-partner referral routing are NOT "coming" claims —
they don't exist and aren't scheduled anywhere in code; they're aspirations for the funnel described
in `KIRA_FUNNEL_SCOPE.md`,** and none should be described as imminent in a public video without a
build decision behind them.

**Kira MUST NOT say:**
- That she gives financial, legal, tax, or valuation advice.
- That her indicative estimate is a formal valuation or an offer.
- Anything implying a guaranteed sale outcome or guaranteed uplift — the model explicitly caps its own
  claim (`DOCUMENTATION_UPLIFT`) specifically to avoid overclaiming.
- That she watches, monitors, or listens in the background.
- That an introducer/partner can see an owner's conversations — the opposite is true, enforced at the
  database level.
- That she matches owners with advisers today, or that partners can offer wealth advisory/legal
  services through her — neither exists.
- Anything implying real customer results, testimonials, or that a fictional character is a real
  client or partner.

**Fictional owners, adult children, and consultants — always labelled AI/fictional.** No invented
testimonials, no invented outcomes, no implication anywhere (on-screen text, description, captions)
that a fictional character used Kira or is a real client or partner.

**Consultant series specifically:** no income or earnings claims beyond the mechanics as actually
implemented (10% of collected subscription revenue, disclosed) — no invented partner results, no
implied volume of leads or pipeline value. **Wealth advisory and legal/IP** are presented only as
referrals to appropriately licensed/qualified partners, never as something Kira herself does or
provides.

**Family strand specifically:** always framed as care for the parent and respect for the parent's
autonomy. Never pressure, and never inheritance framing — the product's own framing throughout is
about the owner's own outcome (what they walk away with), and the family strand should carry that
same register rather than introduce a beneficiary angle nothing in the product supports.

---

## 11. OPEN QUESTIONS

1. **Decision needed, not a lookup: which voice does the series use, given three different ones are
   live in the product today** (Hannah Jayne for demo audio/Discovery, Sarah hardcoded for the actual
   ongoing customer relationship, and a third unconfirmed `KIRA_VOICE_ID` for the live landing
   widget). See §2's table and decision framing.
2. **The landing-page live widget's voice (`KIRA_VOICE_ID`, unprefixed — a different variable from the
   one already checked) is still unconfirmed.** Same access path as before would resolve it (Vercel
   dashboard, or a re-authenticated Vercel MCP connection).
3. **Whether "Kira is not a valuation engine" appears verbatim on some other live page** —
   `/business-valuation` was checked directly and doesn't use that phrasing (it says "indicative
   estimate... not a formal business valuation"); not every route on the site was individually
   diffed.
4. **ElevenLabs cost-per-minute/conversation and current account usage headroom** — an account-billing
   fact, not in the codebase; I attempted the connected Vercel MCP as a possible path to related
   account facts and it 403'd on scope (see §8); no ElevenLabs account tool is connected at all.
5. **Vercel/Supabase plan limits** (concurrent executions, DB connections, bandwidth) — same
   access-blocked situation as #4.
6. **Whether the Vercel MCP connection can be re-scoped** to `mcmdennis-7206s-projects` — if so, several
   of the above become answerable directly rather than needing the dashboard.
7. **Whether Stripe coupon support should be added for this campaign** — a decision, not a research
   gap; currently deliberately off (§4).
8. **The `firm_state`/`advisory_type`/`client_band` fields captured at advisor-enquiry time are not
   currently visible anywhere in the `introducers` schema an operator promotes a partner into** — worth
   confirming with whoever runs `/admin/introducers` today whether that data is being kept anywhere
   informally (a spreadsheet, notes) even though it doesn't persist in the database, since that would
   change the "smallest change" estimate in `KIRA_FUNNEL_SCOPE.md` §8.

---

## SUMMARY — 10 facts for the marketing team

1. **Kira has three different voices in code; the relevant one for the BBBO/consultant series is the
   "fractional executive" persona** (direct, acts fast) — not the softer "curious friend" mode, which
   is a different, non-business product path entirely.
2. **She always, everywhere, qualifies the valuation as "indicative" and "not a formal valuation," and
   explicitly disclaims financial/legal/tax/valuation advice.** This wording is checked live against
   the site and matches the code exactly — inherit it rather than inventing softer language.
3. **⚠️ Three different ElevenLabs voices are live in the product at once, and this needs a decision
   before recording anything.** Sarah is what an actual customer's Kira sounds like, ongoing; Hannah
   Jayne is what the existing demo audio and the optional Discovery call sound like; a third,
   still-unconfirmed voice runs the live landing widget. Produce to match the real product (Sarah) or
   standardise the whole product onto one voice — don't let the series inherit the mismatch by
   accident.
4. **The avatar is confirmed AI-generated to the operator's own design, IP owned — no legal blocker.**
   It's also reused as a different CAIS product's persona face, which is a brand call, not a legal
   one.
5. **There is no free trial — it's arrears billing**, and it's a materially more generous, checkable
   claim than "free trial": never billed for the month you're currently in, cancel before the first
   invoice and owe nothing.
6. **No analytics, no UTM capture, and no matching/booking system exist today.** A campaign cannot be
   attributed to a specific video, platform, or matched partner right now — attribution only reaches
   "which human introducer's link was used," and even that doesn't yet connect through the readiness
   check itself (only through eventual signup).
7. **The readiness/valuation flow has no owner-identity gate — anyone can run it, including a family
   member or an adviser on a client's behalf** — but the product has no idea that happened, and every
   surface (copy, downstream signup, results) assumes it's the owner speaking in the first person.
8. **The partner program's commission and attribution mechanics are genuinely solid** (10%, monthly,
   database-enforced first-touch immutability with an audit trail) — but the partner *data model* has
   none of what matching would need (no location, industry, capacity, bio, or photo field), even
   though some of that data is already being collected one step earlier, at the enquiry form, and
   simply isn't carried through.
9. **The plumber/"Bob" examples throughout the product are explicitly fictional and already designed
   for public use** — reuse them. The specific figures given in the original brief
   ($220k/$626k/$821k) could not be confirmed; the closest match is an unrelated internal bug-tracker
   quote.
10. **Production is billing real cards today** (`STRIPE_LIVE_MODE` is on) — every sign-up the video
    series drives is a real subscription on real arrears terms, with no consequence-free test mode.
