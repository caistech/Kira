# Brief — call capture ("the largest ask")

Drafted 11 August 2026. Scoping only — not a decision.

**The ask, in Chris's words:** *"currently making phone calls without note-taking, leading to lost
verbal decisions and a knowledge gap."* Specified: his existing contacts · normal call quality ·
records · transcribes · **auto-tags segments to specific projects** (Lot 109, Lot 91).

---

## 1. The constraint that decides the architecture

**A third-party app cannot access the audio of a normally-dialled cellular call.**

- **iOS** — no API exists. Apple's own Call Recording (18.1+) sits inside the Phone app, announces
  itself, and is not exposed to third parties.
- **Android** — the accessibility-service and mic-capture routes were closed progressively from
  Android 10–11. Some OEM dialers record natively in some regions; no third-party app can depend on
  it.

⚠️ **Verify against current OS versions before committing budget** — this moves. But the position has
been stable for years and no serious product is built on the other side of it.

**Consequence: "Kira listens in while you call normally" is not a buildable feature.** Anything
scoped on it would fail at the first platform review. What is buildable is the call travelling
*through* Kira.

## 2. The four options, honestly

| | How it works | Real cost |
|---|---|---|
| **A. In-app calling (softphone)** | Kira holds a real number; calls are placed and received in the app | Owner must call from the app. Call quality and reliability become **your** problem. Needs a telephony vendor. |
| **B. Conference bridge** | Normal call, owner merges in a recording participant | Works on any handset, no app change — but merging mid-call is clumsy, and it will be forgotten exactly when it matters |
| **C. Post-call dictation** | Owner tells Kira what was decided, right after hanging up | No recording, no third party, **no consent question at all**. Loses verbatim, keeps the decision |
| **D. Ambient / in-person** | Phone or wearable records the room | A different product. Same consent problem, no telephony |

**Recommendation: C now, A as the build.** C is prompt-and-habit on machinery that already exists,
and it tests the real question — *will an owner actually do the capture step?* — for approximately
nothing. If he won't dictate for thirty seconds, he won't change how he dials either, and A would be
an expensive way to learn that.

## 3. Option A, specified

### Numbers and routing
- Kira provisions a real number per owner (Twilio, Telnyx or equivalent).
- **Outbound:** dialled from the app, presenting the owner's business number as caller ID.
- **Inbound:** the Kira number rings the owner's handset. Adoption comes from him publishing it, or
  conditionally forwarding his mobile to it — **his choice, and it is the hardest adoption step in
  the whole feature.**
- Contacts come from the Google connection Kira already holds (`lookup_contact` is live).

### Consent — your sketch, developed
Because the leg belongs to us, this can be done properly rather than hopefully:

1. **Default OFF.** Recording is opt-in per call, never a standing state.
2. **Owner side** — a *"record this one?"* prompt at dial, and a visible indicator plus a stop
   control for the whole call.
3. **Other party, outbound** — on answer, before connect: *"This call may be recorded for [business
   name]'s records."* Continuing is the commercial norm; see the warning below.
4. **Other party, inbound** — the same announcement before the call connects.
5. **Remembered per contact, with a date.** Asking the same supplier every Tuesday is the friction
   that kills the feature — and a dated record of who consented and when is precisely what an
   all-party jurisdiction would want to see.
6. **A way to revoke**, and a way for either party to say "not this one".

⚠️ **An automated announcement is not automatically consent.** Implied consent by continuing is the
common commercial practice; whether it satisfies the WA Surveillance Devices Act is a legal question,
not a design one. **You operate in WA and Queensland and they do not take the same position.** Get
advice before this ships, and treat the answer as a design input rather than a disclaimer.

### Recording vs transcription — the cheaper legal posture
**Keep the transcript and the decisions. Discard the audio** (or hold it 7 days for dispute, then
delete). The value in the ask is *"lost verbal decisions"*, not the recording — and audio is the part
that carries the retention risk, the storage cost and the discovery exposure.

### The part that is actually the product
Transcription is a commodity. **Auto-tagging a segment to Lot 109 is not**, and it is the thing Chris
specified and nobody else does. That is entity resolution against his own Genome — projects, sites,
people Kira already holds — followed by extracting the commitment, the owner and the date, and
dropping it into the task ledger with a `due_at`.

Everything downstream of the transcript already exists: `save_memory`, `dispatch_task`,
`approve_task`, `due_at`, the hourly sweep, and the confirmation loop for reading a decision back
before anyone relies on it.

## 4. What already exists vs what is new

| | |
|---|---|
| **Exists** | STT (`@caistech/elevenlabs-voice`), `@caistech/stt-noise-filter`, contacts, the Genome to tag against, the task ledger with dates, the approval loop |
| **New** | telephony vendor + number provisioning, the call UI, the consent state machine, per-contact consent records, diarisation, segment→project tagging, retention and deletion |

**Nothing telephony-related is in the codebase today** — no dependency, no route, no table.

## 5. Staging

- **Stage 0 — post-call dictation.** Prompt work only. Answers *will he do the capture step?*
- **Stage 1 — outbound only, one owner, recording opt-in per call, transcript kept and audio
  discarded.** Outbound first because consent is simplest when he chooses to place the call.
- **Stage 2 — inbound**, which is where the adoption problem lives (he has to route calls to the
  number) and where consent has to fire before he has said anything.
- **Stage 3 — segment tagging against the Genome.** The differentiator, deliberately last, because it
  is worthless until there are transcripts to tag.

## 6. Costs that recur

Per-number monthly, per-minute inbound and outbound, transcription per minute, storage. **This is the
first part of Kira with a per-use cost that scales with how much a customer talks** — which collides
with the flat $499 + GST. Either it is a metered add-on or the price changes. Decide before it ships,
not after the first heavy user.

## 7. Decisions needed

1. **Stage 0 first, or straight to A?** I would not skip Stage 0.
2. **Which jurisdiction sets the default** — build to the strictest (WA), or gate by state?
3. **Audio retained at all, or transcript-only?** I would go transcript-only, 7-day audio at most.
4. **Who is the telephony vendor**, and does the owner keep his existing number or take a new one?
5. **How is it priced**, given it is the first metered thing in the product.

---

⚠️ **One thing to correct in the meantime:** Neil was told on 10 August that this is being integrated
— *"I'm building that in as well."* Nothing is started. Not a problem yet, but do not let it become a
capability Craig is expecting to see.
