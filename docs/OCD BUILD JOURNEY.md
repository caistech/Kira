# Kira — The OCD Build Journey

**Purpose:** The candid companion to `BUILD-JOURNEY-CGPT.md` — the same story, told with the colour in it. This version keeps the reasoning AND the mess: the fights with our own architecture, the bugs that looked like features, and the decisions we had to un-make.  
**Status:** DRAFT for Dennis's review — not for publication until edited. Living document — 10 September 2026.  
**Audience:** Dennis, then (after review) founder writes, LinkedIn, forums and beta updates.

> What this document is NOT: a spec, a changelog or a marketing story that pretends the build was one clean line from problem to product.
>
> What this document IS: the record of a product fighting with reality for six months. If it reads like a war diary, that is because it is one.

---

## 1. Why there are two journeys

The other journey document (`BUILD-JOURNEY-CGPT.md`) is the clean version. It is deliberately calm. It describes what we now believe, sorted into a tidy order, so the thinking can be shared without noise.

This one is the version we keep before we tidy it up.

The audience that will eventually read the polished posts deserve to know what actually made us believe these things — including the weeks when the product was wrong, when a number on the screen didn't add up, and when our own tooling had been silently dead for months while we trusted it.

The rule that governs every page below is the same rule from the clean document:

> **What we believed → what we built → what we discovered → what changed → what we now believe.**

The difference here is that we actually write down the middle two.

---

## 2. The narrative rule, applied honestly

Three commitments keep this document honest rather than merely dramatic:

1. **We do not rewrite history to make the product look inevitable.** If we believed a wrong thing in May, we say we believed it in May. The authority comes from being seen doing the work, not from appearing to have known all along.
2. **We do not turn failures into sensation.** A bug is interesting because of what it taught us, not because we can describe it scary. Every incident below ends with the lesson that survived it.
3. **We never claim a feature exists that does not yet.** "We're testing", "we discovered", "the evidence so far suggests", "this changed our thinking", "we haven't solved this yet" — these are the sentences that carry the weight. Gupta-style certainty is the fastest way to lose the exact audience this document is for.

---

## 3. The central thesis (the one that started it)

> Many profitable private businesses are more dependent on their owner than their financial statements reveal.

The owner carries the customer relationships, supplier relationships, pricing judgement, exceptions, operational knowledge, historical context, decision logic, key contacts, problem-solving and institutional memory.

A buyer is therefore not simply buying a business.

**A buyer may be buying a business that still needs the owner** — and a buyer prices a job, not an asset.

Kira is the system we are building to make that dependency visible, measurable and reducible. Not because software is the answer, but because the alternative — asking a 66-year-old owner to write it all down — never works, and we have the receipts for why.

---

## 4. The journey — with the colour left in

### Chapter 1 — We started with AI. The real problem was the owner.

We began with the obvious question: what can an AI executive do for a business owner?

Six months in, the obvious question is the one that misleads you. The important question turned out to be:

> What happens to the business when the owner is no longer available to answer everything?

This reframe is the difference between building "an AI assistant" (a product) and building "a continuity layer" (a system). Everything after this chapter is downstream of that reframe.

**The challenge behind this chapter:** the reframe is uncomfortable. It means saying no to a thousand cool things an assistant could do, and saying yes to a much narrower thing — extracting the owner's operating knowledge in a way that survives him. It also means watching generic competitors talk about "AI for business owners" and knowing they are building a different thing than we are.

---

### Chapter 2 — The owner is often the business's invisible operating system

The org chart and the software stack tell only a fraction of the story. The owner knows which customer needs a different approach, which supplier can solve an emergency, why a price is what it is, which employee can handle which problem, and which decisions must never be delegated.

> If knowledge disappears when the owner steps away, that knowledge is part of the business's dependency risk.

**Content angle:** "Your business may have an ERP, CRM, accounting system and procedures manual — and still depend on one person's head."

---

### Chapter 3 — "Document your business" is not a strategy

The conventional answer to owner dependency is documentation. Ask the owner to spend months writing everything down.

We knew early this would not work, and the beta would later prove it in the worst way: **we asked, and the homework went nowhere.** An owner who has run the business for thirty years does not have a spare month to narrate it. The evidence-bank does not fill up because someone gives you a form.

**The hard-won discovery:** the product must learn during normal interaction — the owner talks, Kira listens, and useful information accumulates while the owner is doing the actual job. If the system can't get knowledge without interrupting the business, it fails the same way a forms process fails.

---

### Chapter 4 — Voice became the interface, not the product

Reducing friction meant the owner had to be able to contribute knowledge the way he thinks — by talking. Voice became the interface.

But there is a line we hold hard, and we have been tested on it:

> Kira is not a voice product. Voice is the interface.

The system under the voice is about knowledge, evidence, maturity and change. Every time we were tempted to polish the voice experience for its own sake, we had to pull back and check whether the evidence capture was improving too.

**The voice bug that made us respect this rule:** we shipped a voice panel whose fallback text box only appeared if the voice connection *errored out first* — and there was no timeout. Across six runs in one afternoon the text box appeared 0%, 40%, 50%, 70%, 80% and 100% of the time. A visitor without a working mic got a button they could never use. The fix (an 8-second stall timeout) was shipped into the shared package that every product consumes. The lesson went deeper than the bug: **the interface is where the product is judged, but it is not the product, and a shiny interface with a silent stall is a failure wearing a costume.**

---

### Chapter 5 — A conversation is not knowledge

Millions of words of conversation would not solve the problem. The hard part is deciding which fragment survives.

A useful interaction may contain a fact, a decision, a customer relationship, a process, a document, a task, a contradiction or an unanswered question. The system has to tell the difference, because it cannot treat every utterance as durable truth.

**The principle we landed on:** the point isn't getting AI to talk. It's deciding what should survive the conversation — and the governance around that decision (what gets stored, what gets redacted, what an owner marks private, what the next interaction is allowed to learn) became one of the largest and least glamorous parts of the build.

---

### Chapter 6 — The Operating Manual emerges

As interactions accumulate, a picture of the business begins to form. We organise it around the questions an owner, adviser or eventual buyer actually needs answered. This became the Genome / Operating Manual.

It is deliberately **not a static manual.** It is a living evidence base that changes as the business changes — every line dated to the day it was said, so the story of the business carries its own history.

**Content angle:** "Your operating manual shouldn't be something you write once. It should emerge from how the business actually operates."

---

### Chapter 7 — Knowledge isn't the same as readiness

A business can have lots of information and still be profoundly owner-dependent. So the next question forced itself on us:

> How do we know whether the business is actually becoming more transferable?

That forced a maturity model — and a discipline we enforced against ourselves: **readiness is an arithmetic, evidence-derived result, not a language-model's opinion.** The system was not allowed to guess an answer to improve a score. This invariant cost us multiple refactors, and it is exactly the kind of thing nobody externally would ever have noticed until we needed to be believed.

---

### Chapter 8 — Evidence matters more than intention

A plan to create a procedure is not a procedure. A statement that "someone else can do it" is not evidence that they can.

> Plans don't create readiness. Evidence does.

This stopped being a slogan the day we wired the pathway gates: they use evidenced items and evidence dates, not intentions. It is the same principle in product form as in the content — you cannot claim what you cannot show.

---

### Chapter 9 — The value gap, and the fight to say it honestly

Owner dependency creates perceived buyer risk, and risk influences price. Kira therefore connects operational maturity with valuation — but valuation is deliberately not the starting point, and we have been fighting to keep it that way.

Two things made this chapter hard:

1. **The temptation to promise a number.** "Use Kira and your business is worth $X more" would be the easiest marketing line in the world. We do not say it. The only honest proposition is: *identify the dependency, address it, create evidence of improvement, then measure what that may mean for transferability and value.*
2. **A real arithmetic bug on the screen that would have sunk our credibility.** During a rebuild of the result page, the first version subtracted debt from the raw pair and rendered **$712,000 and $988,000 under a headline gap of $280,000** — except 988 − 712 = 276, four thousand dollars off, **in the largest type on the page**, on the page whose own copy invites that exact scrutiny. Every unit test passed. The defect was caught on screen, by reading the number instead of trusting the test. It is now pinned by a test that compares the arithmetic directly. We still wince at this one.

**Content angle:** "The hidden discount sitting inside an owner-dependent business."

---

### Chapter 10 — Why Kira does not replace the consultant

This is the proposition that the market forces most, and the one we refused to flip.

Advisers and consultants hold exactly the expertise needed to help an owner change the business. The problem is they have to reconstruct the business context from scratch at every engagement — meetings, interviews, folders of documents. Kira provides a continuously developing evidence layer underneath that relationship.

**Core message:** Kira doesn't replace the adviser. It gives the adviser a better-informed client relationship — understand the business continuously, identify gaps earlier, see what changed, prepare better conversations, spend more time on strategy.

**Content angle:** "Why Kira needs consultants as much as consultants might need Kira."

---

### Chapter 11 — The ecosystem is the point

The BBBO transition problem is too large for one product. The ecosystem involves the owner/CEO, consultant/adviser, accountant, broker, technology partner, distribution partner, specialist service provider — and the operator. Kira is meant to be a connective layer, not another isolated application.

This is not aspirational decoration. It drove real architecture: identity scoped to people and organisations, organisation context resolved separately from identity, and a distribution model where partners carry a proposition into their own networks rather than being fed leads.

**Content angle:** "The future of business transition isn't one adviser with one spreadsheet. It's an ecosystem with a shared evidence base."

---

### Chapter 12 — Making the owner less dependent on Kira too

An uncomfortable question surfaced mid-build, and it is the kind of question that only gets asked if you are genuinely trying to reduce dependency:

> If Kira captures the business's knowledge, does the owner become dependent on Kira?

The answer we hold is no. The owner must be able to export and control the resulting knowledge — the document is his to keep whether or not he keeps paying us, and anything he marks private stays out of any copy handed to a broker. Write-back to owner-controlled destinations is a designed capability, not a future wish.

> We want Kira to reduce dependency — including dependency on Kira.

**Content angle:** this is an authority-building idea precisely because it demonstrates principle rather than a sales claim. Very few products volunteer that their knowledge belongs to the customer.

---

### Chapter 13 — Beta: where the assumptions meet reality

This is where the tidy story stops being tidy, and where this document earns its keep.

Beta is the phase where assumptions become testable — and where we discovered, repeatedly, that the assumptions had gaps and that our own tooling had been sitting on top of some of them without noticing.

---

## 5. The failure ledger (the real colour)

These are the incidents worth telling. Each follows: what happened → what we thought was happening → what was actually happening → what it changed. They are ordered roughly chronologically. Names of real participants are withheld here; Dennis decides what is shareable per person.

### F1 — The magic links that died in inboxes

**What happened:** an invitation was sent that dropped testers straight onto the dashboard via a one-hour magic link.
**What we thought:** the invite worked — the link was correct, the setup was vanilla.
**What was actually happening:** eight invitees could never sign in. They read the email three days later, the link had expired, and — critically — none of them said anything. They just quietly stopped.
**What it changed:** an immutable rule — send the instruction, never a link that expires. Every invitation now explains the path and carries a code that works for weeks. The deeper lesson: **a silent drop-off is a failed send; the product cannot tell the difference from a happy outcome.**

### F2 — The placeholder code that was supposed to be a test

**What happened:** during a template test, a code was passed to the send script as literally `{CODE}` — a placeholder. That email went out with the placeholder in it. A real recipient typed it and was told "That code is not valid."
**What we thought:** it was a template-only test; nothing real would receive it.
**What was actually happening:** the recipient did exactly the right thing — he checked the email we told him to check — the code matched the email, and the only conclusion available to him was that the product was broken. A real invitee has no second channel. He tries twice and stops.
**What it changed:** the send script now looks the code up before composing an email and **refuses to send** an unknown, revoked, redeemed or expired one — naming which — and it performs this check before a dry run too, so a dry run cannot bless a code a real send would fail on.

### F3 — Two "no card" paths, and five testers down the wrong one

**What happened:** the pricing page offered two "no card" options — one for beta testers and one for general signups. The second was more visible than the first.
**What we thought:** two valid entry paths, both clearly labelled.
**What was actually happening:** five people took the sensible, visible path, created accounts that had **no trial, no journey type, no agent** — they were in the system and completely unable to use it. The product looked broken to everyone who did what any reasonable person would do.
**What it changed:** one path for beta testers only, with the code carried in the link. But the human aftermath mattered more than the fix: the operator wrote personal apology emails to each of the five, because it was our failure, not theirs. **Colour note for the public telling:** five real people lost time to a UI we shipped. Own that.

### F4 — The identity model we had to get right (and it nearly killed us quietly)

**What happened:** we kept hitting pages that couldn't work out who the user was in the context of which organisation.
**What we thought:** "the user" and "the person" were the same thing.
**What was actually happening:** an auth user is **not** the person domain object. The bridge is a separate credentials table; a person can hold multiple memberships in multiple organisations with different roles; and selected organisation context is separate from identity. Pages that conflated these silently failed to resolve the right context — a whole class of "it works for me" bugs.
**What it changed:** the canonical identity chain is now enforced — Supabase Auth → credentials → persons → organisation memberships → organisations — and the application resolves the current organisation from a valid selected organisation where permitted, otherwise from a valid membership. This became the foundation the rest of the product stands on.

### F5 — A paying owner, an unreachable agent, and the bug that wasn't a bug in our head

**What happened:** a second "briefing" of an agent appeared plausible on the surface, but the database had forbidden it since January and the code never honoured the prohibition.
**What we thought:** each draft created a new agent; multiple agents per user were normal.
**What was actually happening:** on a second draft, the system minted a real billed ElevenLabs agent, the insert was rejected by the database, the error was swallowed as non-fatal, and the owner was redirected to a chat page for an agent **no server lookup could resolve** — the system would talk to an agent that did not exist from the server's point of view. Worse, this was the exact shape of an earlier incident where a paying owner was told she had no connection to her own Gmail.
**What it changed:** re-briefing now PATCHes the existing agent and preserves its identity (the memory is keyed to the agent, so a replacement would have detached it). A failed update releases the draft claim. The swallowing of errors — the habit of "send it anyway" — is treated as a defect everywhere it appears now.

### F6 — ESLint had silently not run for months

**What happened:** every push failed the lint gate, and we ignored it as "the gate being strict."
**What we thought:** the codebase had lint problems we were always fixing.
**What was actually happening:** ESLint had not started at all. A rule lived in a config object with no `plugins` key, so the process exited 2 before reading a single file — **a gate that cannot start looks exactly like a gate that found something.** It failed on every push and reported nothing about the code.
**What it changed:** the config was fixed, which immediately unmasked a second dead step that had never run, because the job dies at the first failure. The lesson is now written into how we test our tooling: occasionally break the gate on purpose and watch it catch you.

### F7 — Two footers disagreed about the year (and other tiny things buyers notice)

**What happened:** a tester noticed that on the about page, one year was hardcoded and the other was computed — © 2025 sitting directly above © 2026.
**What we thought:** template — who notices the year on a footer?
**What was actually happening:** a shared list controlled two different things (header AND footer), so on the legal pages the operator's identity rendered twice, and on another page the two footers disagreed. Tester's words: *"the kind of small thing I notice on an invoice."*
**What it changed:** the single list was split into two because they genuinely serve different purposes — removing a duplicate header or removing the only footer each made it worse. The lesson: **small inconsistencies land on the pages where the money is decided.** Also fixed the parent-company-domain rabbit hole that this exposed.

### F8 — The voice widget that stalled forever

**What happened:** a visitor with no working microphone clicked "talk", and the text box either appeared in ~570ms or never appeared past 30s — 0% to 100% across six identical runs.
**What we thought:** the fallback detection worked; a user without a mic just had a broken experience occasionally.
**What was actually happening:** the fallback text box only appeared if the voice connection errored out first, and there was no timeout. A connection that neither connected nor errored left the panel dead forever.
**What it changed:** the fix went into the shared package every product uses (fall back on a timeout, not only on an error state) — and the residual was made explicit: eight seconds is deliberate, so we do not steal a slow-but-working connection, but an "or type instead" offer now beats any timer. **Colour note:** interestingly, fixing this changed the acceptance criterion — it became a deliberate 8-second wait, so the "bug" row had to be re-measured against the new design rather than assumed fixed.

### F9 — The shadow agents

**What happened:** two ElevenLabs agents existed with the same name as real ones — but with zero tools wired.
**What we thought:** provisioning was idempotent by name, so name collisions were harmless.
**What was actually happening:** provisioning by name made it a coin toss which agent a future owner would get — including a live empty one with no tools. Invisible to every check, because the checks walked our agent rows and a shadow has no row; the check had to start from the vendor workspace and look backward to see it.
**What it changed:** a new fleet verifier walks the workspace and reports shadows; the empty agents were renamed (not deleted — the collision is the hazard), and provisioning now reads back the agent after patching rather than trusting the 200 response.

### F10 — The privacy filter that was withholding the wrong things

**What happened:** we tested merging a language-model privacy judgment together with a deterministic matcher.
**What we thought:** more layers of judgment = safer documents.
**What was actually happening:** over 300 real + synthetic rows, the model caught 16 things the matcher missed — **all 16 were false positives.** It read "raising a $2 million fund" as exit intent and "the margin is confidential" as a negotiating position. A matcher that only withholds more cannot cause disclosure — but withholding more deletes business facts from a buyer's document, and margins and fundraising are exactly what a buyer most wants to read.
**What it changed:** the model layer was removed from the private-field decision (deterministic matcher alone now decides), not because it was unsafe but because its own safety argument was half wrong. The test pins the opposite of what it first pinned, so a quiet re-enable goes red.

### F11 — The jurisdiction guard that was missing from the one path that mails strangers

**What happened:** our product send paths enforce a per-country email jurisdiction guard. The beta-outreach pathway bypassed it entirely by calling the email API directly (to get the operator a cc on every send).
**What we thought:** the guard was wired everywhere.
**What was actually happening:** it was wired everywhere *in the product* — and nowhere in the tool that mailed real strangers. It was caught by a person reading an address — a Barcelona contact on a Priority-1 list — long after the guard existed.
**What it changed:** the outreach path now refus­es to send unless the recipient's country is in a cleared list, and it checks before a dry run so a blocked recipient is visible as a block, not a cheerful preview. The override for the consent-based invitation list is scoped to that script; the product's commercial path still enforces the stricter default. **Colour note for the public telling:** the guard was added from a real near-miss and from reading it line-by-line — the same reason we now distrust "it must be fine."

### F12 — The quota wall mid-campaign

**What happened:** mid-way through sending the beta invites, the email provider's daily quota was hit. Seven of the cohort's invites were minted but not delivered.
**What we thought:** campaigns send in a burst; pacing is a precaution.
**What was actually happening:** a hard daily limit is a hard daily limit. The codes are minted; the sends are queued; the campaign genuinely takes multiple days of pacing.
**What it changed:** nothing architectural, but something real: **a distribution channel is infrastructure, and it has limits that are not in your code.** Plan around the provider, not around an optimistic burst.

---

## 6. What the failures have in common

Read together, the incidents above cluster into a small number of recurring causes. Naming them is the point of the ledger:

1. **The silent failure reads as success.** Expired links, swallowed errors, a gate that cannot start, a fallback that never fires, a shadow agent with no tools. The most dangerous state in this product is **inert-but-not-broken** — nothing errors, and nothing works. Nearly every incident here is that one.
2. **We trusted the machinery that was meant to protect us.** Tests that passed while the arithmetic was wrong on screen. Lint that failed on every push and inspected no code. Provisioning that idempotently handed out the wrong agent.
3. **The customer-facing failure surfaces are where small defects do real damage.** A code that doesn't validate, a footer with two years, a pricing page with two paths — these are the moments a busy professional decides the whole thing is not serious.
4. **Saying no is a feature.** No, we don't promise a valuation uplift. No, we don't replace the consultant. No, that model layer doesn't judge privacy. Each refusal became a stronger product position.

---

## 7. The engineering principles that survived

These are the rules the failures produced. They are not decoration.

- **Readiness is arithmetic, not opinion.** The model does not move readiness, weak evidence does not count as answered, plans do not create readiness.
- **Identity is hierarchical and contexted.** Auth user ≠ person ≠ membership ≠ organisation. No caller-supplied identity is authoritative.
- **Evidence is dated and owned.** Every line carries the day it was said; the owner keeps the document whether or not he keeps paying.
- **The owner controls the knowledge.** Marked private stays private, including from the broker's copy and including from Kira's own future claims.
- **Fail closed.** Missing webhook secrets refuse; unknown jurisdictions block; a guard that cannot decide must not wave things through.
- **Never send a message with a placeholder in it.** A `{CODE}` in an invitation is worse than not sending.
- **Fix the shared layer once.** When a defect lives in a pattern every product shares, it is fixed in the package, and the catalogue of shared services is updated in the same change.

---

## 8. Beta: the honest numbers so far

We have invited a cohort of advisers, partners and testers, and we are tracking it publicly-internally, with names and consent recorded per person. As of this draft:

- Relationship emails sent to the cohort.
- Beta invite codes minted, org-bound to the sandbox beta org, each personal to the recipient and working for weeks.
- Invites delivered through the cohort in paced batches; a hard daily quota delayed the tail, not the intent.
- Testers associated with a shared sandbox organisation, no card, no charge — and the UI does not pretend to be a free tier of commerce.

What we are learning so far is exactly what beta is for: where the experience drags, where the flow implies a continuation that isn't there (the first conversation must not present itself as a return), and where "it works on our side" hides a wall a new user hits. Consent discipline is treated as the non-negotiable: consent, identification and a working unsubscribe on every commercial send, with the physical entity and ABN identified in the footer.

**The rule about publishing beta stories:** never expose identifiable or confidential information without permission; never present a prototype as validated market evidence; never turn an internal failure into sensation. The chapters above are written inside that rule.

---

## 9. What is still unsolved (and why that is the honest content)

Authority is built partly by saying what we *have not* fixed. As of this draft:

- Australian sector-specific valuation evidence is still thin. Hospitality lands above the published range; bars/pubs sit outside it. We treat published benchmarks as benchmarks, not universal truth, and we are buying better data only when a broker actually challenges a figure.
- The slow `/genome` paint. We removed the dependency rather than shorten the wait (the page is now server-rendered with native accordions and self-hosted fonts), but the residual question of perceived sluggishness on a buyer's actual device is not closed.
- The voice stall trade-off. Eight seconds is a deliberate compromise; we remain uncomfortable with it as a final design.
- The orchestrator boundary. We keep privileged capabilities behind a separate service, and we keep catching ourselves writing scripts that would quietly bypass that boundary if we did not test the boundary itself.

**The public value here is not the completion. It is watching the problems change** — from "does the voice work" to "how do we make the evidence trustworthy" to "how do we stop the owner depending on us too."

---

## 10. The long-form journey (for the eventual full story)

**The owner built the business.**

↓

**The business became dependent on the owner.**

↓

**Traditional documentation didn't solve the problem.**

↓

**Kira learned through normal conversation.**

↓

**Conversation became evidence.**

↓

**Evidence became an Operating Manual.**

↓

**The Operating Manual became measurable maturity.**

↓

**Maturity exposed practical gaps.**

↓

**Gaps became actions and pathways.**

↓

**The business became progressively less owner dependent.**

↓

**Transferability became more visible.**

↓

**The owner gained more choices.**

That is the Kira story — from the other document.

The story this document tells is nested inside it, between "conversation became evidence" and "evidence became an Operating Manual": **the months when the evidence pipeline nearly didn't survive contact with reality, and the specific reasons it did.**

---

## 11. Editorial principle for sharing this

Do not market the destination before demonstrating the journey.

Allow the audience to watch the thinking develop. They should eventually feel "I understand the problem because I have been following the journey", not "someone suddenly appeared with an AI product and told me it solves everything."

When this document becomes posts:

- One insight, one observation, one example, one implication, one question — per post.
- "We're testing", "we discovered", "the evidence so far suggests", "this changed our thinking", "here is what we're trying next" — the vocabulary of iteration, not of revelation.
- Steal nothing from the private chapters without permission; let the people mentioned approve their own stories.

**The final thesis, in one line, with the colour intact:**

> Can a successful owner-led business become a business that no longer needs its owner to be the operating system?

We are trying to answer that with evidence — and we are willing to show the evidence, including the weeks it said no.

---

*Draft for Dennis's review. 10 September 2026. Companion to `BUILD-JOURNEY-CGPT.md`.*