# Kira Inside V2 — the Exec/Inside bleed, and why three decks is the wrong fix

**Reviewed 2026-08-15**, after V2 corrected everything raised against V1. This is a second, narrower
pass on one problem: **the deck is for Kira Inside and does not consistently behave as though it is.**

Operator's words: *"think it's still mixing up Kira Exec and Kira Inside and not making it clear that
this deck is for Kira Inside."* Correct. Two slides carry it and one habit spreads it.

---

## 1. WHERE IT ACTUALLY BLEEDS

### Slide 5 — the asset slide is Exec's asset, described to an Inside audience

The slide is the strongest in the deck and it is written in the wrong voice:

> *"named in the owner's language… what is still only in **his** head… Every area fills as **he** talks"*

That is one owner-operator, in a ute, talking to Kira Exec. **The Inside buyer is a platform whose
customers are organisations**, and Healthengine reading "his head" has to translate every sentence
into "our practice managers" before the slide means anything. A reader doing translation is a reader
not being persuaded.

The asset is the same; the subject is not. Inside's version is *a model of an organisation, built
from whatever the platform already sees*. Exec's version is *a man talking while he drives*.

### Slide 8 — two go-to-market motions on one slide, and one of them is not Inside's

**PLATFORM PARTNERS** is Inside. **BROKERS & ACCOUNTANTS** is Kira Exec's distribution channel. To a
platform partner or an investor in the Inside thesis, a second motion on the same slide reads as
unfocused rather than as breadth — and the broker channel is genuinely irrelevant to Healthengine.

⚠️ **It should not be deleted, because it is real revenue and real proof.** It belongs as one line on
the reference-implementation slide — *"Exec also runs a broker and accountant introducer channel"* —
or in an appendix. Not as half of the distribution story for a layer that does not use it.

### The habit — "Kira" alone, doing three jobs

Slide 3 is titled **WHAT KIRA IS** and says *"Kira is the layer underneath"*. Slide 5 says *"Kira has
captured"*. Slide 12 says *"Kira's intelligence"*.

The word is carrying three meanings — the company's product family, Kira Inside, and Kira Exec — and
the reader is left to infer which. **This is the same defect the product hit this morning**: `/genome`
and `/my-genome` differed by one word and meant opposite things, and the operator himself opened the
wrong one. Names that differ only by context get confused by the people who wrote them.

**Rule: never bare "Kira" in this deck.** It is *Kira Inside* or *Kira Exec*, every time. If a
sentence works with neither, it is probably a sentence about the company and should say so.

---

## 2. ⚠️ THREE DECKS IS THE WRONG FIX, AND THE REASON IS A STRENGTH

The instinct is *"probably need a deck for each, customised to Healthengine / Sophiie / Simpro."*
Understandable, and it gives away the best claim in the deck.

**The nine areas are not trades-specific. They are universal, and that is checkable.** They were
derived bottom-up from ~140 flows in the orchestrator's task registry, and the provenance is kept on
each area as `flowGroups`:

> getting attention · scoping and quoting · winning and setting up · delivering · fulfilment ·
> money in · money out and supply · keeping the client · people · contractors · assets, fleet and
> equipment · obligations · running the thing · data hygiene

**A dental practice, a law firm, a freight company and a plumber have every single one.** Patients
arrive somehow (demand). Someone decides what a crown costs (pricing). The work gets done (operations).
Money comes in and goes out. Someone owns the patient relationship. Someone does the work. There are
licences that must not lapse. Records live somewhere.

So the honest claim is stronger than customisation:

> **The model is universal. The content is yours.**

Three bespoke decks say *we will build you something special*, which invites a bespoke price, a
bespoke timeline and a bespoke maintenance burden on a one-operator portfolio — and quietly concedes
that the layer is not general. **One deck plus one swappable slide** says *this already generalises,
and here is what it looks like in your world* — which is the entire Kira Inside thesis, demonstrated
rather than asserted.

It is also the only version that survives Rule 1. Three decks is three things to keep current every
time the product moves, and the product moved eleven times today.

---

## 3. WHAT TO CHANGE

**A. Rewrite slide 5 in Inside's voice.** Same nine areas, same names — they are good and they are
the owner's language, which is the point. But the subject becomes the organisation:

> The Business Genome is a structured model of how an organisation actually runs — the nine areas any
> buyer's advisor works through, in the operator's own language rather than a consultant's. Each shows
> what has been captured and what still lives only with one person. The areas are universal; the
> content is specific to each business, and accrues only through use.

Keep the deferral sentence exactly as V2 has it — it is correct and it is the honest half.

**B. Move brokers off slide 8.** One line on slide 6, or an appendix. Distribution for Inside is
platform partners.

**C. One swappable slide, inserted after slide 5.** Same nine areas, filled with that partner's
vertical. For Healthengine: *who does the work* is clinicians and their credentialling; *licences and
the calendar* is AHPRA registration and indemnity renewal; *who buys and who owns the relationship* is
referring GPs. Nothing about the model changes — only the examples — and that is precisely the thing
the slide is proving.

**D. Naming discipline throughout.** Kira Inside or Kira Exec. Never bare Kira.

**E. Retitle slide 3.** "WHAT KIRA IS" → "WHAT KIRA INSIDE IS". It is the slide most likely to be
screenshotted out of context.

---

## 4. WHAT NOT TO TOUCH

Slide 6 is doing exactly the right job and should keep its Exec voice — it is *labelled* as the
reference implementation, and an Inside reader wants to know the layer has been run somewhere hard by
the people selling it. The FDE line lands. The sourced statistics land.

The bleed is not that Exec appears in the deck. It is that Exec appears **unlabelled, in slides that
are supposed to be about Inside**. One slide of Exec, clearly framed, is an asset. Exec's voice
leaking into the asset slide and Exec's channel occupying half the distribution slide is the problem.

---

## 5. STILL OPEN FROM THE V1 REVIEW

- **DISCOVER (slide 3)** remains the one claim ahead of the build: *"surfaces where AI and automation
  create value"*. The product captures nine areas and ranks nothing. Now that slide 5 honestly defers
  the target state, this is the last sentence outrunning what exists.
- **The financial-retention seam** — whether the retention rule is enforced in code or is prompt-level
  — sits directly beside *"Enforced in server code… not prompt-level guidance"*. Unresolved, and the
  thing technical diligence will probe.
- **The MYOB figures are attributed, not verified.** Attribution was the right fix; someone should
  still confirm the source says what the slide says.
