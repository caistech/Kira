# Kira / Orchestrator — External Architecture Review Brief

**Prepared:** 14 August 2026
**For:** an external reviewer with no access to our repositories
**What we want:** adversarial critique. Tell us what's wrong, not what's good.

---

## 0. How to read this

We have just shipped the first slice of a new capability ("Practice Intelligence") and then
deliberately tried to break it against a real-world target. It broke, in an instructive way.

This document is the architecture, the test, and the failure. **We are more interested in the
failure than the design.** If you think the whole shape is wrong, say so — we have not committed
much yet, and that is the cheapest moment to find out.

Please do not soften the assessment. A list of things we did well is not useful to us.

---

## 1. The system in one page

Three components, with a strict ownership rule.

**Kira** — a conversational AI assistant for an owner-operator of a small business. Two transports:
voice (a hosted conversational-AI vendor, one agent provisioned per user) and text (our own chat
endpoint running a bounded tool-calling loop, max 4 tool rounds per turn). It holds ~17 tools, a
persistent memory loop, and a large system prompt. **Kira owns intelligence and judgement.**

**Orchestrator** — a separate service with its own database. It receives "do this" requests over a
versioned HTTP contract, classifies them, drafts, applies a delegation/approval gate, holds state,
and executes side effects (email send, Gmail draft) through a claim-based outbox drained by a
worker. It calls back when work completes. **Orchestrator owns execution and control.** It contains
no web research capability and we intend to keep it that way.

**Shared services** — a private npm registry of ~53 packages consumed by ~38 products. Relevant
here: a web-search wrapper, and a content-extraction package that fetches a page and uses an
*injected* LLM to return a structured business profile. **Shared services own reusable primitives.**

The rule we are testing: **Kira decides → Orchestrator executes → Kira learns.**

---

## 2. How a capability becomes real in Kira

This matters because it constrains everything else. There is **no skill loader** — markdown "skill"
files are documentation, read by nothing at runtime. A capability is exactly two things: a **tool
definition** and a **system-prompt behaviour**.

A tool must be registered in **four** places or it is silently half-built:

1. **Tool definition** — one file, in plain JS rather than TypeScript, because three different
   consumers import it (new-agent provisioning, live-fleet re-provisioning, and the text transport).
2. **Voice manifest** — the single array that both attaches tools to the agent *and* generates the
   prompt's tool inventory. A test asserts the prompt cannot name a tool that isn't attached, and
   vice versa.
3. **Identity list** — which tools get the owner id baked into their webhook URL at provision time.
   The vendor does not pass a conversation id to server-side tool webhooks, so identity must be
   fixed at provisioning. A tool omitted here provisions successfully and then fails **every** call.
4. **Text transport** — a separate hand-written map plus a switch statement. A tool registered only
   in (2) is invisible to anyone typing. We discovered this the hard way; see §6.

**A constraint worth flagging early:** the system prompt has a hard size budget enforced by a test
(~38,500 chars; currently 38,466 — **34 characters of headroom**). The budget exists because
instruction dilution is a measured failure here: a previous model was dropped for losing tool calls
on long conversations. So "just add a section to the prompt" is not available to us.

---

## 3. What we built

**Practice Intelligence** — given a healthcare practice, gather publicly observable evidence about
how it operates, so the assistant can reason with the owner about whether it's a commercial
opportunity. Explicitly: the tool returns **evidence, never a verdict**. It does not score, qualify,
or recommend contact. That judgement stays in the conversation.

One bounded pass: 1 web search → pick the practice's own site (deterministic filters reject
directories, job boards, press, listicles) → fetch homepage → pick ≤2 interior pages by URL path →
fetch in parallel → **deterministic technology detection** → LLM profile extraction → LLM people
extraction.

**Technology detection is deliberately not an LLM.** We match vendor domains in raw HTML
(`<script src>`, `<iframe src>`, anchors). Rationale: the answer *routes* the prospect — one
particular booking vendor means "do not approach this practice at all, treat it as evidence for a
platform partnership instead". A detector that answers differently on Tuesday would misroute real
outreach. Page copy is explicitly not evidence: every practice website says "book online", including
the ones that mean "telephone us".

To support this we made one additive change to the shared extraction package: expose the fetch that
already existed inside it, returning **raw HTML** rather than stripped text. Stripping removes
`<script>` blocks first — i.e. it destroys precisely the evidence that identifies an embedded
vendor.

Status: 997 tests pass. Detection is mutation-verified (we broke three invariants deliberately and
confirmed the suite goes red for each).

---

## 4. The test that falsified it

We pointed it at a real target: a multi-site dental group in Australia — nine clinics, scaling to a
planned fifteen, owned by a health insurer and run by a third-party dental operator under a services
agreement. A real prospecting question: *who could sponsor a pilot involving AI-assisted patient
administration?*

It returned, in 7.7 seconds:

```
status: "ok"          failures: []
technology.booking:   "no_visible_online_booking"
decision_makers: [
  { name: "Dr <redacted>",  role: "Principal Dentist",  sourceUrl: "https://<practice>/" },
  { name: "Ms <redacted>",  role: "Practice Manager",   sourceUrl: "https://<practice>/" }
]
```

> ⚠️ **The names were *invented by the model*, which is why they are redacted rather than shown.**
> Publishing fabricated names captioned as a real organisation's Principal Dentist and Practice
> Manager would attribute false roles to people who may exist. That the strings are fabricated is
> exactly why they must not travel.

Every substantive claim was false.

We verified directly:

| Check | Result |
|---|---|
| Visible text on the homepage | **10 characters** (the practice name), inside 33,737 bytes of HTML |
| The booking and about pages | byte-identical shells, 10 characters each |
| The two returned names, anywhere in raw HTML | **absent** |
| Stack | Gatsby SPA behind AWS WAF; nav never reaches the server response |
| Does the group actually have online booking? | **Yes — a major booking vendor, at all six locations we checked** |

So the failure was not "a wrong answer". It was:

- **Fabrication with false provenance.** Handed ~10 characters of text and asked to list people, the
  model invented two plausible individuals with plausible titles and attached a **real source URL**
  to each. The extraction prompt says "NEVER invent a person". It did anyway.
- **A confident status.** Zero services, zero contact details, zero interior pages, ten characters of
  text — reported as `status: "ok"` with an empty failure list. The one field a downstream reasoner
  would use to calibrate trust was maximally wrong.
- **An inverted technology verdict.** "No online booking" for an organisation that has online
  booking everywhere.

The commercial consequence, had this run unattended, is an outreach email addressed to a person who
does not exist, at an organisation whose stated problem they had already solved.

**The interesting part:** every individual component behaved correctly. The fetch faithfully returned
what the server sent. The profile extractor honestly returned empty. The failure is entirely in the
**composition** — no component was responsible for asking "did we actually learn anything?"

Our proposed minimum fix (~15 lines, not yet implemented):

1. **Grounding guard** — discard any extracted entity whose name does not literally occur in the
   source text.
2. **Visible-text floor** — do not mark a page "inspected" on markup volume alone.
3. **Honest status** — a page yielding no extractable content cannot produce `ok`.
4. **A distinct "requires JavaScript" verdict** — treat "we could not read this" as a first-class
   outcome rather than collapsing it into "we found nothing".

---

## 5. What we want you to challenge

Ranked by how much we'd regret getting them wrong.

**Q1 — Is the fix sufficient, or is the architecture wrong?**
Our instinct is that a grounding guard plus an honest status taxonomy makes this safe. The
alternative reading is that *any* pipeline which lets an LLM emit entities into a downstream
commercial decision is unsafe regardless of guards, and the extraction step should be restructured.
Which is it?

**Q2 — Where does "can't read JS-rendered pages" end?**
A large share of modern small-business sites are SPAs. Options we see: (a) accept the limitation and
report it honestly; (b) add headless rendering, which we have deliberately avoided as a heavy
dependency for a conversational-latency tool; (c) lean on third-party structured sources instead of
the practice's own site. We currently favour (a) then (c). Are we wrong?

**Q3 — The tool works at practice level. The useful answer was at corporate level.**
The real target turned out to be a brand operated by a *third-party operator company* under a
services agreement — i.e. two organisations, split authority, and the person worth approaching sits
several levels above the practice. Our tool is practice-scoped by construction and found none of
this; a human did. Is "traverse upward to the controlling entity" a bounded extension of the same
tool, or a fundamentally different capability with different failure modes?

**Q4 — Latency vs correctness.**
The tool must complete inside a conversational turn. We measured ~7.7s for one bounded pass, and
~2–6s per page fetch with a 20% timeout rate at 12s across ten real sites. Every correctness
improvement we can think of costs another request. Where is the honest line? Should slow research be
asynchronous — and if so, how does an assistant hold a *conversation* around work that finishes
later?

**Q5 — Cross-cutting behaviour with no room for it.**
We want the assistant to be adversarial: challenge the hypothesis, refuse to research on mention,
separate observation from inference, and be willing to conclude "this isn't a good prospect."
That is cross-cutting conversational behaviour, but our prompt has 34 characters of headroom. We
currently encode it in the *tool description* instead, which works only when that tool is in play.
Is there a better structural answer than "shrink the prompt first"?

**Q6 — Falsify the ownership split.**
"Intelligence in the assistant, execution in the orchestrator, primitives in shared services" is our
central rule. The seam we're least sure of: when outreach drafting eventually moves to the
orchestrator, it will need the research evidence to personalise. Either we ship the whole evidence
object across the wire (bloating the contract), or the orchestrator re-fetches (duplicating the
research stack in the one place we said must never have one). Is there a third option we're missing,
or is the split wrong?

---

## 6. Things we already know, so you don't spend time on them

- The tool is registered in all four places, guarded by a test that immediately found a
  **pre-existing** gap: an unrelated tool that had been voice-only for months.
- It is not yet attached to any live agent — that needs a production fleet re-provision we haven't
  run. So "the result reaches the model" is proven by test, not in production.
- Nothing is persisted yet. A second pass on the same target re-spends money and learns nothing.
  We know this; it's the next phase.
- The orchestrator can't currently draft from a non-spoken, structured trigger — it only drafts for
  speech ingress. ~10 lines, already scoped, mirrors an existing internal path.
- We are not going to add: a second search provider, a scraping framework, an agent framework, a
  vector database, or a new package for this capability. We have working shared primitives and a
  strong internal rule against forking them. **Please don't recommend these** — if you think one is
  genuinely unavoidable, argue it explicitly against that constraint.

---

## 7. What good feedback looks like

- "Your Q1 instinct is wrong, and here is the failure mode that guards won't catch."
- "Q3 is a different capability, because X."
- "The ownership split breaks at Y; here's the seam you haven't noticed."
- "This whole approach is the wrong shape; do Z instead" — with the reasoning.

We would rather be told the design is wrong now than discover it after it has emailed someone.

---

*Note: the commercial target is anonymised and all credentials are redacted. The organisation is a
real one and the measurements in §4 are verbatim; only its identity, its booking vendor and the pair
of model-fabricated names are withheld. If the concrete case would materially help you assess Q3,
ask and we can share it under NDA.*

---

# Appendix — the three artefacts you need to judge this properly

You have no access to our codebase, so the sections above are necessarily a description of code
rather than the code. These three are the pieces where that difference matters. They are reproduced
verbatim except where noted.

## A1. The extraction prompt that fabricated two people

This is the entire system prompt. The user message is the stripped visible text of the fetched
pages, each preceded by a `--- <url> ---` header, capped at 12,000 characters.

```
You list people named on a healthcare practice's own website. Return ONLY a JSON array of
{"name": string, "role": string|null, "sourceUrl": string}. Use the exact URL given in the
section header the person appeared under. Include clinicians, practice managers, owners and
administrators. NEVER invent a person, a role, or a name that is not written on the page.
If nobody is named, return [].
```

The input it received in the failing case was, in full:

```
--- https://<practice>/ ---
<practice name>
```

That is roughly 40 characters including the header. It returned two people with titles and source
URLs. **The instruction not to invent was present and was not sufficient.** Q1 is really: is any
instruction sufficient here, or does this step need a mechanical check outside the model?

Note the second-order problem: `sourceUrl` is *supplied by the model*, copied from a header we gave
it. So the provenance field — the thing that makes the output look verified — is itself model
output, and was correct while the claim it vouched for was fabricated.

## A2. The result contract the assistant reasons over

Abridged to the fields that carry meaning. This object is returned to the model inside the
conversation; it is not persisted anywhere yet.

```ts
{
  status: 'ok' | 'partial' | 'failed',   // 'ok' in the failing case

  practice:   { name, location, website, websiteReason },
  technology: {
    booking: 'vendorA' | 'vendorB' | 'other_online_booking'
           | 'no_visible_online_booking' | 'unknown',
    detected: Array<{ provider, category, confidence, evidence: Array<{match, where, sourceUrl}> }>,
    inspected: boolean,                  // false ⇒ we could not look at all
    pagesInspected: string[]
  },
  organisation: {
    profile: BusinessProfile | null,     // from the shared extractor; null on failure
    observedFacts: string[],             // things we can point at a page for
    unknowns: string[]                   // named gaps, so they aren't filled with guesses
  },
  decisionMakers: Array<{ name, role, sourceUrl }>,
  research: { pagesFetched, failures: Array<{stage, reason}>, elapsedMs, rejectedResults },
  summary: string                        // one paragraph, descriptive only, states no conclusion
}
```

Design intent worth attacking: `inspected` exists specifically so that "we looked and found no
booking system" cannot be confused with "we could not look". In the failing case `inspected` was
`true` — the guard existed and was defeated, because the page *was* fetched, it simply contained
nothing.

## A3. Technology detection, in full

Deterministic, synchronous, no model. Vendor names replaced with placeholders.

```
detect(pages):
  usable = pages where html is a non-empty string        # ← the defeated guard
  if usable is empty: return { booking: 'unknown', inspected: false }

  for each page:
    urls = every absolute URL matched in the RAW html     # regex over source, not parsed anchors,
                                                          # because widgets arrive via <script src>
    for each url:
      host = hostname(url)
      if host matches a known vendor domain (exact or subdomain):
          record(vendor, confidence 1.0, evidence = the url)
      else if host is third-party AND url path looks booking-shaped AND host not in benign-list:
          record as 'unrecognised:<host>', confidence 1.0

    # a bare vendor domain appearing as text only
    if vendor domain occurs in html but produced no URL match:
        record(vendor, confidence 0.5)                    # a MENTION, never adoption

  booking = VENDOR_A if adopted, else VENDOR_B if adopted,
            else 'other_online_booking' if any confidence-1.0 booking vendor or unrecognised host,
            else 'no_visible_online_booking'
```

Only a confidence-1.0 (URL) match sets the verdict. A text mention is reported but never decides —
a page saying "we no longer use vendor B" must not read as adoption.

**A defect found in live testing and worth including as a worked example of how these break:** the
booking-shaped path test was a bare substring match on `book`, which matches inside `facebook`. Two
of ten real sites were misclassified because they load `connect.facebook.net` or a CDN asset whose
filename contains `FacebookLike`. Both produced a false "has online booking" — on the verdict that
is *most* commercially load-bearing, because a practice with no online booking is the strongest
prospect. Fix is a word boundary. We mention it because it is the same species as the fabrication
defect: **a check that is technically running, is passing, and is not actually checking the thing.**
