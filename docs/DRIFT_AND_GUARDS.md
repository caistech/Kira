# Drift, and the guards that now catch it

> **Read this before adding a check, a patch script, or a rule stated in prose.**
>
> Written 2026-08-05 after a day in which an owner reported that Kira was "drifting" — losing memory,
> talking over him, worse than before. Three separate causes, none of them the model, and every one
> of them a mechanism that had been *correct in source and wrong in production* for months.
>
> The generalisable lesson is one sentence: **a rule enforced by remembering holds until someone is
> tired.** Everything below is that lesson with a specific price attached.

---

## What was actually wrong

### 1. Recall showed 10 of 91 memories, ordered by importance

`ORDER BY importance DESC, created_at DESC LIMIT 10` — the ten highest-importance facts **of all
time**, recency only breaking ties. The cut-off sat at importance 9 and **71 memories could never
enter the slice**. Eight of the owner's ten Lot 442 facts scored 8, 7 or 6, so she arrived holding
two abstract governance lines and none of the substance.

**She was not forgetting. She was never told.**

**The structural part matters more than the incident:** importance-first ordering *freezes* the
slice around whatever scored 9–10 early. Every new fact must outrank an incumbent to be seen at all.
At ~20 memories the top ten was half his history; at 91 it was 11%, and the excluded 89% was
disproportionately *recent*. **The product degraded as it was used.** Nothing broke — he crossed a
threshold.

Fixed by a union of two lanes: top-by-importance (the durable rules) ∪ top-by-recency (what was
actually just discussed), with `genome_section = 'none'` excluded — two of his ten slots were Kira
talking about herself.

### 2. Her prompt asserted a six-month-old signup snapshot as fact

```
**What they want help with:**  How to fix diesel injectors in my van.
**Location:**                  Cownsville, Queensland
```

A placeholder captured at account creation in January. In August she opened a call with *"we were
talking about fixing the diesel injectors in your van."* **She was not hallucinating; she was reading
her own prompt.**

**A warning had already been tried and had failed.** The block stated the objective and then appended
a paragraph explaining it was stale and must never be asserted as current. That asks a model to hold
a fact and simultaneously distrust it. **The reliable outcome of putting something in a prompt is
that it gets said.** The fix was not a better caveat — it was not shipping the fact.

### 3. She never called `recall_memory`

The memory was there; the pull path returns it for a natural-language query with no keyword overlap.
Read the tool descriptions side by side and the reason is plain — every tool she *reliably* calls
names an **observable trigger** ("whenever the owner refers to a document"), and recall said *"use
this when you need to remember something"*, which asks her first to notice she does not know. A model
holding ten confident facts never notices.

---

## The architectural lesson: drift runs BOTH ways

`upgradeBusinessPersona` matched `CORE_PHILOSOPHY` by **exact string**. One sentence was edited in
source after the agents were provisioned, so `includes(core)` was false forever after and the function
returned `changed: false` **silently, every run, for six months**.

> **Additive patches land. Replacement patches fail silently.**
> Evidence: 9 of 11 prompt sections were present on the live agent, and the only 2 absent were the
> only 2 that required *replacing* rather than appending.

Then rebuilding from source **deleted four sections** off ten live agents — tool honesty, authority,
**entity separation** (a red-team-measured 5–6/6 control), typed input — because they had only ever
been *appended by patch scripts* and the builder never emitted them. Same root, opposite direction:
**a prompt assembled in two places.**

The tool list had the identical twin problem (`kiraAllTools` in TS vs `toolDefsFor` in `.mjs`).
Because `setAgentTools` **replaces**, an apply left the fleet on **15 of 17 tools**, stripping the
confirmation loop. **Second occurrence.** The control both times was a comment reading *"change one,
change both."*

---

## The guards that now exist — do not delete these

| Guard | Catches |
|---|---|
| `lib/kira/tool-parity.test.ts` | the two provisioning paths naming different tools, or a different `recall_memory` description |
| `lib/kira/tool-manifest.test.ts` | the prompt naming a tool that is not attached, **and** an attached tool never described |
| `lib/kira/prompt-completeness.test.ts` | any exported `_MARKER` missing from the built prompt, or appearing twice |
| `lib/kira/prompt-size.test.ts` | the prompt growing back; a ratchet at today's measurement |
| `lib/valuation/landing-example.test.ts` | the landing figures drifting from the calculator |
| `lib/valuation/maintain-rate.test.ts` | the public pricing promise drifting from the constant |
| `lib/genome/render.test.ts` | the private filter, the escaping, and block-vs-span |
| `lib/business-identity/timezone.test.ts` | dates rendered on the server's clock instead of the owner's |

**`patch-agent-capabilities.mjs` should NOT be run.** It strips and re-appends sections in its own
canonical order, so on a fleet rebuilt from source it reports "would UPDATE" on every agent and, if
applied, puts every live prompt back out of step with `getKiraPrompt`. The old `deploy → reprovision
→ patch` order was correct when reprovision only *appended*; now that it *rebuilds*, step three
re-creates the problem.

---

## How to verify, learned the hard way

1. **Verify the effect, not the edit.** Two of the three defects found on 2026-08-05 were caused an
   hour earlier by the fix for the first, and were found only by re-pulling the live agent instead of
   trusting a "0 failed" report.
2. **Compare against a known-good control.** A checker reported `file_manual` had no baked uid and
   would refuse every call. False — the ElevenLabs API returns tools under `api_schema`, not
   `webhook`. Comparing against `recall_memory`, a tool known to work, showed the identical shape and
   turned a false alarm into a fixed instrument.
3. **Print the error, never just the data.** A probe selected a column that does not exist;
   PostgREST failed the whole select and returned `data: null`, which reads exactly like "there is no
   connection."
4. **Read the artefact out of the destination.** The filed document said *"…in Geraldton.stated 31
   July 2026"* — fact and provenance collided because Google Docs imports a `<span>` as an inline run
   and discards the CSS. **Unit tests could not have caught it**: the HTML we produced was correct and
   the loss happened in the importer.
5. **Don't feed your own truncated output back in.** Twice, a display `slice()` produced an id that
   was then passed to an API, which failed for a reason that looked like a product defect.

---

## Related

- `docs/DECISIONS.md` — the product decisions these changes serve
- `docs/GENOME_WRITE_BACK.md` — the migration this all exists to complete
- `docs/LLD.md` §3, §6A — the subsystems
