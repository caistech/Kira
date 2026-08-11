# Call capture — P1 spec, and the size of the full build

11 August 2026. Companion to `BRIEF_CALL_CAPTURE.md`.

---

# PART ONE — P1: the call debrief

## What it is

Thirty seconds after hanging up: *"That was Dave about Lot 109. He's agreed to the revised slab date,
wants the variation in writing by Friday."*

No recording, no third party, no consent question, no telephony. And it captures the thing the ask
was actually about — **the decision** — rather than the audio nobody re-listens to.

## Why it is the right P1 beyond being cheap

It answers the only question that decides whether the full build is worth anything: **will an owner
actually do the capture step?** If he will not spend thirty seconds telling her, he will not change
how he dials either — and finding that out now costs a prompt section instead of a telephony stack.

## What already exists

Everything downstream. `save_memory`, `lookup_contact`, `dispatch_task` → `approve_task`,
`kira_tasks.due_at`, the hourly reminder sweep, and `facts_to_confirm` / `confirm_fact` for reading a
decision back before anyone relies on it.

## What is missing — and it is small

**A defined debrief behaviour.** `lib/kira/prompts.ts` has twenty-one sections and not one of them is
about a call that just happened. She will do something sensible if asked, but she will not
*consistently* pull the five things that make the debrief worth having.

The five, every time:

| | Why it matters |
|---|---|
| **Who** | resolve against contacts; an unresolved name is a dead memory |
| **Which project** | Lot 109 vs Lot 91 — the tagging that Chris actually specified |
| **What was decided** | the thing that was being lost |
| **What is owed, by whom** | his commitment or theirs — the direction changes what happens next |
| **By when** | without a date it is a note, not a task |

**The two writes, not one.** A decision must land as a **memory** (it is a fact about the business,
and it belongs in the Genome) *and*, where something is owed, as a **task with a `due_at`** so the
existing sweep chases it. Filing it as only one of the two is how the ask stays half-solved.

**Missing anything → ask, do not guess.** No date means ask for the date. A name that resolves to two
contacts means ask which. This is a debrief, not a dictation — the one-question follow-up is the
feature.

## Deliberately NOT in P1

No trigger detection, no calendar integration, no "did you just finish a call?" nudging. Prompt and
habit only. If he uses it, the triggers are worth building; if he does not, they would have been
scaffolding around an unused feature.

## How we will know it worked

Debriefs filed in a fortnight, and — the harder test — **at least one task created from a debrief
that he then completed because she chased it.** That is the loop closing, and it is falsifiable.

---
---

# PART TWO — how big the full build actually is

Scope, not costing.

## The decision that halves it

**Bridge model, not softphone.**

- **Softphone** — the app becomes the phone (WebRTC/SIP). Needs CallKit on iOS, ConnectionService on
  Android, background audio, push wake, network handoff, battery. **Kira has no native app at all —
  it is a web app you add to the home screen.** This route means building one.
- **Bridge / click-to-call** — the platform rings *his* mobile, then rings the other party, and joins
  the two legs. Audio never touches the app. He uses his normal phone, on the normal cellular
  network, at normal quality. The web app is a button.

**Take the bridge.** It removes the entire native-app workstream, the hardest reliability problems,
and the worst failure mode — a dropped client call caused by our software. Inbound works the same way
in reverse: the Kira number answers, plays the announcement, then rings his mobile and joins them.

## The components, and which are hard

| Component | Size | Notes |
|---|---|---|
| Telephony account + programmable voice | small | well-trodden |
| **Number provisioning per owner** | **unknown — check first** | AU number supply, address requirements, and any obligations that attach to carriage. **The sneaky one.** |
| Outbound bridge (his mobile ↔ other party) | small–medium | provider primitives |
| Inbound routing + announcement before connect | medium | he must publish or forward to the number — an **adoption** problem more than a build one |
| Consent state machine | small | per-call decision, per-contact memory with a date, revocation |
| Record → transcribe → **delete audio** | medium | the delete must be *verified at the provider*, not assumed |
| Diarisation (who said what) | medium | off-the-shelf, but "he agreed" vs "I agreed" depends on it |
| **Segment → project tagging** | **largest, and least predictable** | entity resolution against the Genome. The differentiator |
| Commitment extraction → task ledger | small | reuses the P1 work entirely |
| Retention, owner-visible deletion | small–medium | must match the existing Genome delete story |
| Call UI (dial, in-call, post-call review) | small | it is a web page and three buttons |
| Legal | **blocking, not sizeable** | see below |

## The three things that are bigger than they look

**1. The counterparty is a data subject who never signed up.** Everything Kira does today processes
the owner's own information, with his consent. Recording a client means collecting a third party's
personal information — someone with no account, no relationship with us, and rights under the Privacy
Act. That is a genuinely new posture and it touches the privacy policy, retention, deletion and
access. It is not a paragraph; it is a position.

**2. Deleting the audio has to be provable.** "Transcription saved, not audio" is the right call and
a good claim — and it is only true if the provider's copy is gone too. Most providers record to their
own storage by default. **Verify the deletion, keep the evidence, and never state the claim before it
is observed** — this repo has an expensive history of correct edits that were silently defeated
downstream.

**3. Tagging is the product and the least predictable part.** Transcription is a commodity; anyone can
buy it. Knowing that "the slab on 109" means Lot 109 in Geraldton, and that the commitment belongs to
Dave rather than to him, is entity resolution against a Genome that is different for every owner.
Everything else here is plumbing. Budget accordingly, and do not start it until there are real
transcripts to work against.

## Staging

1. **P1 — debrief.** Prompt work. Proves the habit.
2. **Outbound bridge, recording opt-in per call, transcript kept, audio deleted.** One owner.
   Outbound first because consent is simplest when he chose to make the call.
3. **Inbound** — where the adoption problem lives, and where the announcement has to fire before he
   has said a word.
4. **Tagging and extraction** against the Genome. The differentiator, last, deliberately.

## Recurring cost — the thing to decide before it ships

Per-number monthly, per-minute both directions, transcription per minute, storage. **This is the
first part of Kira whose cost scales with how much a customer talks**, and a flat $499 + GST does not
absorb that. A premium metered add-on is the obvious answer and matches how you described it — but it
needs the cap-and-warn shape the portfolio already uses (`@caistech/beta-gate` does exactly this:
warn at 80%, hard cut at the ceiling), not an open tap.

## The order of the unknowns

Before any build commits, three answers change the plan:

1. **The legal position on recording a third party in WA versus Queensland.** Not a disclaimer — it
   decides whether inbound is even offerable, and whether the default is opt-in or unavailable.
2. **AU number provisioning and what obligations attach.** Cheap to research, expensive to discover
   late.
3. **Whether the provider will delete audio on demand and prove it.**

None of the three needs a line of code, and all three can be settled while P1 is running.
