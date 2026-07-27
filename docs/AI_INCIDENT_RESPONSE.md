# Kira — AI Incident Response Standard

**Version** 1.0 · **Effective** 2026-07-27 · **Next review** 2027-07-27
**Owner** Dennis McMahon, Corporate AI Solutions
**Operator entity** Global Buildtech Australia Pty Ltd · ABN 54 672 395 685

> **Why this exists.** Australian accounting firms are now being trained to ask vendors a specific
> question — *"do you have a response protocol for when an AI output turns out to be wrong?"* Until
> today the honest answer was "partly." This is the answer.
>
> It is also the smaller half of the point. An incident standard written after the first incident is
> written by someone who is frightened, at speed, with a client on the phone. This one is written
> while nothing is wrong.
>
> ⚠️ **Pending lawyer review**, alongside the introducer agreement and the regulatory surfaces
> (`BROKER_CHANNEL_BUILD_STATE.md` guardrails). The Privacy Act timeframes cited below should be
> confirmed against current OAIC guidance before this is relied on in a client commitment.

---

## 1. Two classes of incident, and why they route differently

Conflating these is the standard mistake. They need different first moves.

**Class A — DATA incident.** Someone saw, took, or lost information they should not have.
Cross-account memory leakage, an introducer seeing content rather than status, a subprocessor
breach, credentials exposed, a database misconfiguration.
→ **Privacy Act 1988 territory**, including the Notifiable Data Breaches scheme. Clock starts.

**Class B — AI OUTPUT incident.** The system said or did something wrong. A hallucinated figure, a
valuation that misreports, memory that attributes one conversation's facts to another, an agent
acting outside its intended scope, or advice-shaped output where none should exist.
→ **Not automatically a privacy matter.** Correctness, reliance and trust.

**They overlap.** Memory contamination across accounts is both — Class A because content crossed a
boundary, Class B because the assistant will now say wrong things confidently. When in doubt, treat
an incident as **both**, because the Class A clock is the one with a statutory consequence.

---

## 2. Severity, and what each triggers

| Sev | Meaning | Examples | First response | Owner decision |
|---|---|---|---|---|
| **S1** | Content crossed an account boundary, or an output caused or could cause real-world harm | Cross-account memory leak · introducer able to see client content · valuation figure materially wrong and acted on | **Immediately** — contain before diagnosing | Same day |
| **S2** | Wrong output reached a user, contained to one account | Hallucinated figure in conversation · memory attributing the wrong fact · assistant giving advice-shaped output | Within 1 business day | Within 2 business days |
| **S3** | Degraded or unreliable, nothing wrong delivered | Assistant not recalling · voice failing over to text · re-score not running | Normal backlog | Not required |

**S1 is deliberately broad on the second limb.** "Could cause harm" catches the valuation being
wrong *before* anyone acts on it, which is the only useful time to catch it.

---

## 3. How an incident reaches us

- **In-product reporting** — the SayFix widget is mounted in the root layout (`app/layout.tsx`), so
  every screen carries it. Reports file directly to the engineering backlog and a person reads them.
- **Direct contact** — reply to any Kira email; these reach a monitored inbox.
- **Our own detection** — error monitoring, the memory-loop CI probe, and the valuation snapshot
  series (an implausible jump is visible in a way a single overwritten row never was).
- **A subprocessor telling us.** Supabase, Vercel, Resend, Stripe, ElevenLabs or a model provider
  notifying us of a breach on their side **is an incident on our side** and enters here at the
  severity its data exposure warrants.

**Anyone may report. There is no triage gate on reporting** — a user, an introducer, a subprocessor
or a passer-by all reach the same queue.

---

## 4. The response

### 4.1 Contain (S1: immediately)

Stop it getting worse before understanding why. Actions available today:

- **Revoke access** — suspend an introducer (revokes live sign-in links immediately, deliberately
  without touching attribution), or disable a user account.
- **Cut the memory** — delete what the assistant remembers for an affected account. Supported as a
  user-facing action; it works as a containment action too.
- **Roll back** — redeploy a previous known-good build via Vercel.
- **Rotate** — any credential suspected of exposure, including the tool secret and webhook secrets.
- **Withdraw the output** — where a wrong figure or statement has been shown, tell the affected user
  directly. Do not wait for the root cause.

- **Throw the kill switch** — halts new work product-wide within ~10 seconds, no redeploy:

  ```sql
  UPDATE system_flags SET halted = TRUE, reason = '<what is wrong>', set_by = '<who>'
  WHERE flag = 'all';        -- or 'conversations' / 'outbound_email' for a narrower stop
  ```

  `conversations` refuses the signed URL, so no new conversation starts (calls already in progress
  are not torn down — this stops the bleeding, it does not reach into a live call).
  `outbound_email` makes the commercial send path **throw**, so a caller in a loop stops rather than
  skipping one and continuing. Clearing it is the same statement with `halted = FALSE`.

  It **fails closed on an unknown state** — if the flag has never been read and cannot be read, work
  halts. The trade is deliberate: the flags live in the same Postgres everything else needs, so an
  unreadable database is already an outage, and the moment you most want this switch is the moment
  you least want "we weren't sure, so we carried on."

### 4.2 Assess (Class A: the clock is running)

For any incident where information may have been accessed, disclosed or lost without authorisation,
determine whether it is an **eligible data breach** — unauthorised access/disclosure or loss, where
serious harm to an individual is likely.

Under the Notifiable Data Breaches scheme this assessment must be **completed within 30 days** of
becoming aware of a suspected breach. If it is eligible, notify the **OAIC** and **affected
individuals as soon as practicable**, not at the 30-day mark. *(Confirm against current OAIC guidance
— see the review note at the top.)*

**We do not wait for the assessment to tell the affected user.** The statutory test governs the
formal notification; it does not govern basic decency.

### 4.3 Notify

| Who | When | What they get |
|---|---|---|
| **Affected user** | S1 same day; S2 within 2 business days | What happened, what of theirs was involved, what we've done, what they should do. Plainly. |
| **OAIC** | Where the breach is eligible, as soon as practicable | Per the NDB scheme |
| **Their introducer** | **Only that an incident affected an account they introduced — never its contents** | The content wall is enforced in SQL and an incident does not suspend it. An introducer learning what their client discussed *via an incident notice* would be a second breach. |
| **Subprocessor** | Where their system is implicated | Enough to investigate |
| **PI insurer** | Where a claim is foreseeable | Per policy terms |

**The introducer row is the one most likely to be got wrong under pressure**, because the instinct
in an incident is to tell everyone connected everything. Resist it.

### 4.4 Record

Every S1 and S2 gets a written record: what happened, when we knew, what we did, who was told and
when, root cause, and what changed so it doesn't recur. Kept for at least **seven years**, matching
the billing-record retention already committed to in the privacy policy.

For a **Class B** incident, the record must state whether the output was **AI-generated or
calculated**. The valuation figures are deterministic (`lib/valuation/model.ts`) and every snapshot
stores its inputs and `MODEL_VERSION`, so a wrong figure can be recomputed and the fault localised to
inputs, model version, or code. That is a real advantage in an incident and should be used.

### 4.5 Learn

No S1 closes without a change: a test, a guard, a schema constraint, or a documented decision not to
change anything and why. "We were more careful afterwards" is not a remediation.

---

## 5. Specific playbook — the wrong-output case

Because it is the one the checklist asks about, and the likeliest.

1. **Establish whether it was calculated or generated.** A valuation figure is arithmetic; a
   conversational statement is a model output. Different faults, different fixes.
2. **If calculated** — recompute from the stored `inputs` at the stored `MODEL_VERSION`. Either the
   inputs were wrong (user-entered or adapter-supplied) or the model has a defect. Both are findable.
3. **If generated** — capture the conversation context, determine whether it was memory
   contamination (Class A as well) or a plain hallucination, and check whether it reached anything
   durable.
4. **Tell the user the figure was wrong**, with the corrected one, without being asked twice.
5. **Check the blast radius** — did anything else consume it? A snapshot, a briefing, an introducer
   board figure.
6. **Guard it** — a test that fails on the wrong behaviour.

---

## 6. What we tell people up front

Stated so an accountant assessing us can check it rather than take it on faith:

- Nothing Kira produces is presented as accounting, tax or financial advice, and nothing is filed or
  lodged anywhere.
- The valuation is a deterministic calculation, reproducible from stored inputs and model version.
- Client data is not used to train models.
- An introducer sees status and movement only, enforced in the database.

---

## 7. Known gaps

Listed because a standard that claims completeness is not credible:

- ~~No global kill switch~~ — **built 2026-07-27** (§4.1). Note its limit: it stops *new* work. It
  does not tear down a conversation already in progress, and it cannot recall an email already sent.
- ~~No automated cross-account leakage detector~~ — **built 2026-07-27.** `/api/cron/memory-integrity`
  runs hourly and asserts that every memory row naming an agent has the same owner as that agent.
  **It alarms; it does not auto-halt** — an unproven detector that can take production down on a
  false positive is a worse risk than the thing it watches. Revisit once it has a track record.
- **No formal on-call rotation.** Single-operator product; response is best-effort against the
  timeframes above, not a contracted SLA. Say so rather than implying otherwise. **This one cannot
  be engineered away** — it is resolved by a second person, not a control.
- **The detector samples up to 5,000 memory rows per run.** Fine now; becomes a real ceiling later,
  and a silent one if nobody revisits it.
- **Not yet lawyer-reviewed** (see top).
- **Timeframes are commitments we set, not ones a customer has contracted for.** If a distributor
  agreement ever needs contractual timeframes, they are negotiated there, not assumed from here.
