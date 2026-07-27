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

## What Ray changed (2026-07-28, after the ICP walkthrough)

**The success criterion moved.** This was specced to make the flow understandable. Ray's answer to
*"would you tell it the truth?"* was **no, not on day one** — he would give it boring facts and would
not name the builder, the twenty-year secret discount, or the 2014 falling-out. Understanding the
flow was never the blocker. **The demo's job is to make him willing to talk.**

**Candour is the persuasion, not a caveat.** The only two things that moved him toward trust were
admissions: `/genome` being honest about its own gaps, and the privacy-mode-not-built paragraph. So
the demo **leads with what Kira cannot do** rather than closing with it. That is counter-intuitive
and it is what the evidence says.

Four hard rules that follow:

1. **The demo may only show what actually exists.** Ray's verdict was *"when I got through the door,
   the thing that had been described for ten minutes wasn't in there."* A demo that shows a capability
   the product lacks does not oversell it — it repeats the exact failure that lost him. Anything
   aspirational carries the same explicit ROADMAP label the privacy paragraph uses.
2. **The narration must never imply people.** *"Behind her is a quiet team that does the actual work"*
   was the single sentence that ended it for him. Kira saying anything like that out loud, in her own
   voice, would be worse than reading it.
3. **Real numbers, one business.** The hero oversold the engine by 2.4× and he found out at the
   results page. The demo uses the engine's own output for the same plumbing business as `/genome`.
4. **There must be a beat about what happens to what he says** — who can see it, who cannot, what
   leaves the building. For this ICP that is not a privacy footnote, it is the conversion moment.

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

**The voice id is `M7ya1YbaeFaPXljg9BpK` — "Hannah Jayne" (Australian, female).** This is the voice
production actually uses, read from `NEXT_PUBLIC_KIRA_VOICE_ID`.

⚠️ **Do NOT let the generator fall back to the code default.** `lib/kira/discovery-config.ts`
defaults to `EXAVITQu4vr4xnSDxMaL`, which is a DIFFERENT voice — so a script that reads the env with
a `||` fallback will silently produce a demo narrated by a woman the product does not use. A demo
that sounds like someone else is worse than no audio, because it is the one thing a listener cannot
un-hear. The generator must fail loudly if the id is missing rather than substitute.

This is deliberately NOT a reopening of "public voice agent", which the operator has ruled out.

## Non-negotiables carried from the standards

- Public, static, no auth, no DB. Nobody creates an account to evaluate.
- The "no real accounts, no real data" disclaimer **up front**, not in a footer.
- Explanatory header (§5), responsive at 375/1440 (§1), 44px+ targets, 16px+ text.
- Privacy mode stated as **on the roadmap and not built** — as it now is on `/genome` and
  `/advisors`.
