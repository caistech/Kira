# Kira demos — the shape, and the decisions behind it

**Decided 2026-07-28.** Build starts once Ray's (ICP persona) report lands, so his reaction to
`/genome` informs whether the demo must carry the promise or merely extend it.

---

## Where the shape comes from

ExecutorAI's `/demo` — a public, static, no-auth, no-DB walkthrough over fictional sample data,
narrated in the agent's own voice, doubling as the artifact put in front of its distributor
(solicitors). Three details worth copying deliberately:

1. **Sample data lives in its own module and is shared across public artifacts**, so `/demo` and
   `/sample` tell ONE story rather than two.
2. **It shows both sides** of the relationship in one place.
3. **It compresses time and says so** — *"in real life this runs over days — here we'll fast-forward."*

Building to the same file shape on purpose: this is the second product in the portfolio needing a
public sample-data walkthrough, and convergent shape makes a later `@caistech` extraction a lift
rather than a rewrite (SHARED_SERVICES "build-alike" rule).

## What must differ, and why

**ExecutorAI's flow is linear and finite** — organise → die → open → probate → done. **Kira's is
continuous and accretive.** Nothing completes; the Genome fills in and the score moves.

So the demo's axis is **elapsed time, not steps**: week one versus month six, with the coverage
number climbing and the "still only in your head" list shrinking. A ten-step process walkthrough
would tell the owner that Kira is a form he finishes, which is the opposite of the product.

## The two demos

Same machinery, same sample business (the 31-year-old plumbing business already in
`lib/genome/example.ts` — reuse it, do not invent a second one).

| | **ICP demo** | **Advisor demo** |
|---|---|---|
| Lives at | its own route | **a section of `/advisors`** — the advisor's decision is "do I refer", not "do I explore" |
| Opens on | what this feels like for me | what my client goes through |
| Must show | who can see what I say | **the visibility boundary — what I see and what I never see** |
| Ends on | what I end up owning | what I get paid, and what I list afterwards |
| Control | **auto-advance with an obvious pause** | **prev/next stepper** |
| Sizing | **big targets, words not icons** | standard |

The control difference is not a style choice. The ICP is 66 and will not drive a stepper — he
watches. An advisor is evaluating and wants to go back and re-read the commission terms.

## Audible Kira — on both (operator decision)

**Pre-generated audio, not a live agent.** This matters and is easy to get wrong:

- A live ConvAI agent needs **microphone permission** and shows the **ElevenLabs consent modal**
  about sharing with third-party processors. For a 66-year-old who has told nobody he is selling,
  being asked for his microphone on a first visit is exactly the thing that closes the tab.
- Pre-generated narration plays like a video. No permission prompt, no consent modal, no runtime
  cost, no mic. It still does the job the live agent cannot: **he hears her**, which is the whole
  differentiator and is currently invisible on the public site.

Generate the narration with ElevenLabs TTS at build time using the canonical Kira voice, ship the
files, and caption every line so it works with the sound off — a phone in a ute, or a man who does
not want his office hearing it.

This is deliberately NOT a reopening of "public voice agent", which the operator has ruled out.

## Non-negotiables carried from the standards

- Public, static, no auth, no DB. Nobody creates an account to evaluate.
- The "no real accounts, no real data" disclaimer **up front**, not in a footer.
- Explanatory header (§5), responsive at 375/1440 (§1), 44px+ targets, 16px+ text.
- Privacy mode stated as **on the roadmap and not built** — as it now is on `/genome` and
  `/advisors`.
