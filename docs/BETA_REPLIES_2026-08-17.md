# Beta replies — 2026-08-17 (Hardik, Shani)

**Nothing has been sent.** Drafts for approval, per
[[feedback-beta-tester-reply-format]]. Send with `scripts/send-beta-outreach.mjs`
(cc `dennis@corporateaisolutions.com`, Reply-To the same, one recipient per run).

Neither reply needs a code minted: Hardik holds `K3LNJFH28QPZ`, and Shani already has an
account by his own account of it.

---

## 1. Shani Shah — `shani.shah@softrefine.com`

**Why this one goes first.** He reported two failures on the path every other Priority 1
tester is about to walk. One of them is confirmed and fixed; the other is not yet
diagnosed, and the reply has to ask for the two facts that would settle it without
sounding like a support ticket.

**Do not** take up the edge-AI / on-device LLM / cross-platform-mobile recommendations.
They are a capability pitch rather than product feedback, and Kira's whole shape is a
hosted voice agent over a private Genome. Acknowledge the thinking, keep the door open,
commit to nothing — the same posture as Hardik's NDA offer.

**The likely root cause, established from the code before writing the email.** His email
sent him to the bare `https://kiraexec.com` with the code as text to type at the pricing
step — **not** to a `/plan?code=…` link. Without `?code=` in the URL, `page.tsx` never reads
the code into state, so the "Your invitation code is saved" panel never renders and the beta
door stays collapsed to a single `text-sm text-stone-500` line (14px, light grey), rendered
last of four secondary lines — immediately below a violet, underlined *"Create an account
without a card."* He was told to look for the no-card option and took the visible one.

Two consequences worth stating plainly: it is our failure rather than his, and **the same
trap is live for the other twelve Priority 1 recipients.**

The email therefore leads with the diagnosis, offers it as a hypothesis he can confirm or
kill, and does not ask him to re-walk anything until it is fixed.

**Subject:** You are right — and I think I know where I lost you

> Hello Shani,
>
> Thank you. This is the most useful note I have had all week, and I would rather answer the
> specific parts than thank you generally.
>
> **I think I know what happened with the code, and it is my fault rather than yours.**
>
> My email told you to go to the site and enter the code at the pricing step. It should have
> sent you a link with the code already in it. Because it didn't, the pricing page had no
> idea you were holding one — so instead of greeting you with "we have your code, no card
> needed", it offered the code box as one line of small grey text, fourth in a stack of
> options, directly underneath a much more visible link offering an account without a card.
>
> You took the visible one. Anyone would. But that is the ordinary free path rather than the
> beta path, which is very likely why what came next did not match what I had described to
> you. So this is not you missing something; it is a page that hid the one instruction I had
> just given you in writing.
>
> **Three things would tell me whether I have that right.** They are the difference between
> a fix today and me guessing.
>
> 1. Did you ever see a box to type the code into — or was there simply nowhere obvious for
>    it to go?
> 2. If you did type it and it was refused, do you remember roughly what it said?
> 3. Where did the Kira connection stop? After the setup questions there is a step that
>    builds her, and then a separate one where she actually starts talking. Which of the two
>    stopped, and what was on screen — an error, a spinner that never resolved, or nothing at
>    all?
>
> Answer whichever you can recall and ignore the rest.
>
> **Your bigger point is the one I most needed to hear.** Valuation → account → Kira were
> built at three different times, and they read that way. For a sixty-five-year-old owner
> who is not yet sure he wants to do this, every unexplained transition is a place to stop —
> and he will not write to me about it, he will simply close the tab. That is not polish. It
> is the product. I would rather have this now than after ten of them have quietly gone.
>
> **On the technical directions** — on-device and local models, cross-platform mobile, the
> orchestration and retrieval layer. There is real thinking there and I am not waving it
> off; it sits outside what this beta is testing, so let me come back to it properly rather
> than in passing.
>
> I am fixing the entry path first. When it is done I will write and tell you it is worth
> another twenty minutes — and I will send a link that does the work rather than an
> instruction that asks you to. If you do go back in, the part I would most value your eye
> on is what happens *after* you are in: whether Kira stops on something a buyer would stop
> on, or just files it and asks what is next. That is the failure I am least confident about.
>
> Thank you again. Genuinely — this was worth more than a polite report would have been.
>
> Dennis

---

## 2. Hardik Patel — `hardiktech66@gmail.com`

**This is a status update, not feedback.** He has told us he is mid-run and will report
properly. The reply should be short, must not ask him for anything he has already said he
is doing, and should hand him the one thing he cannot know: what we are least sure of.

He has independently named our own open defect — *"whether Kira recognises when something
deserves to interrupt the normal flow rather than simply recording it"*. Confirm it
directly. That is the whole reason he will spend two hours instead of ten minutes.

**Subject:** Re: Kira — that is exactly the right place to push

> Hello Hardik,
>
> No need to send anything fragmented — take the full run. But one thing is worth saying
> now, because it will save you time.
>
> The line in your note about whether Kira *recognises when something deserves to interrupt
> the normal flow rather than simply recording it* is the exact failure I am least confident
> about. It is not a hypothetical: an earlier tester hit it six visits running. He would say
> something a buyer would stop dead on — he is the only one who prices, one customer is
> forty per cent of revenue and there is nothing in writing — and she would file it neatly
> and ask what else he wanted to cover. Filing is not the job. Noticing is.
>
> So if you can get her to walk past something that should have stopped her, that is the
> most valuable thing you can hand me, and it will not be an edge case when you find it.
>
> Two things worth knowing before you judge them:
>
> - **The thirteen valuation questions are deliberately a fixed sequence, not a
>   conversation.** They exist to produce one comparable baseline number. If it feels like a
>   form rather than an AI, that is the design and not a shortcut — the conversation starts
>   after it.
> - **The Genome captures project activity more readily than business structure**, which I
>   know because it is true on my own account. If you find that the areas a buyer actually
>   asks about come back thin while day-to-day work fills up, you have reproduced a known
>   weakness rather than found a new one — but I would still like to hear how it felt.
>
> One caveat on Drafts: she does not write or send anything on your behalf in this beta.
>
> On your offer of the deeper technical review — architecture, AI implementation, memory and
> context handling — that is an interesting offer and I would rather pick it up properly
> than casually. Let me come back to you on scope once you have been through the product.
>
> Looking forward to the run.
>
> Dennis

---

## The fix this implies — NOT yet done, and it blocks the next send

The email promises a fixed entry path. Three changes, smallest first:

1. **Send a link that carries the code** — `https://kiraexec.com/plan?code=XXXX` in draft A,
   not a bare domain plus an instruction. `page.tsx:109` already reads `?code=` and parks it
   in `sessionStorage` so it survives the valuation round trip. This alone removes the trap.
2. **Promote the beta door when we know a code exists.** Currently the collapsed line is
   `text-sm text-stone-500` and renders below "Create an account without a card" — 14px grey,
   which also fails the ≥16px-on-mobile rule.
3. **Stop the two no-card doors competing.** A tester holding a code and a visitor who wants
   a look are shown near-identical offers, and the wrong one is the prominent one.

⚠️ **Do not send draft A to the remaining recipients until (1) is in**, or they walk into
exactly what Shani walked into.

## Still unverified (do not state as fact in either email)

- **Whether Shani's code was ever redeemed**, and whether his account has an agent. Needs a
  read of `beta_codes` + `users` + `kira_agents`. Blocked: `.env.local` is not readable in
  this session and the Vercel runtime-log scope returns 403.
- **What actually broke his Kira connection.** The known `@caistech/elevenlabs-convai`
  text-fallback stall was ruled out — this repo is on **0.15.1**, which carries both the
  0.12.0 timeout fix and the 0.13.0 connecting state.
- **Whether the other 12 Priority 1 testers hit the same wall.** The endpoints themselves
  are live and correct (`/api/beta/peek` and `/api/beta/redeem` both answer properly against
  production), so this was a message defect, not a broken mechanism — but that is an
  inference about *his* case, not an observation of it.
