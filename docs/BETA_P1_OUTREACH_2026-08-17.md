# Beta outreach — Priority 1 now, Priority 2/3 after

Drafted 2026-08-17. **Nothing has been sent.** This is for approval first.

---

## One path for everyone

Everyone goes to the **public URL**, walks the business valuation, and enters their beta
code at the pricing step. Nobody is told to "sign in" — the walk is the point, and it is
what the last invitation round skipped.

⚠️ **Verified before writing it into an email:** `https://kiraexec.com` returns 200 and
serves Kira (`<title>Kira — your part-time general manager</title>`), `www` 308s to the
apex, and `/login` resolves. The old `kira-rho.vercel.app` address appears nowhere.

**The three who already have an account are fine on this path.** `claimBetaCode` does not
dead-end them: the redeem route returns `existing: true` without mutating anything, and the
form says *"You already have an account with this email — sign in with your existing
password, or use Forgot password"* and sends them to `/login`. Their valuation answers are
held on the device and the claim card offers to adopt them after sign-in. So one
instruction, one email, and the line in the copy sets that expectation so it does not read
as a failure.

| Group | Count | Notes |
|---|---|---|
| No account yet | 10 | The code creates the account at the pricing step |
| Account, no agent | 3 | Asked to sign in when they enter the code — expected, covered in the copy |
| Account + agent | 1 | Shah, already running |
| Operator's own accounts | 3 | Excluded |

**Recipients (14)** — sukhdeep.mangat@linkbusiness.com.au, munich.stephen@gmail.com,
haq@pdx.edu, bilal.anwar@zencloudtechnologies.com, jason@orbitcapital.net,
jason@buildgravity.ca, darshilp.softrefine@gmail.com, shamini.bhaskaran@gmail.com,
shani.shah@softrefine.com, yuvraj.softrefine@gmail.com, gareth@plausible.gg,
simon.crisp@finnbusinesssales.com.au, joseph@xcapitalgroup.com.au, shhahhussain@gmail.com

⚠️ **All five existing codes are redeemed.** Fourteen fresh ones need minting
(`scripts/mint-beta-code.mjs`), each bound to that person's email.

⚠️ **The last round is why the state was checked first.** It went to 33 accounts of which 21
had no agent and 8 could never sign in, because the message assumed one state and the
recipients were in another. The rule that came out of it: send the instruction, never a
magic link.

---

## Draft A — Priority 1 (14 people)

**Subject:** Kira — your access code, and a change to how you start

> Hello {FirstName},
>
> A short note, because what I sent you before no longer matches what happens.
>
> **What Kira is for, so you are judging the right thing.**
>
> Most owner-run businesses are worth less than the owner thinks, and the reason is nearly
> always the same: the pricing, the judgement, the relationships and the "we don't do it
> that way" all live in one man's head. A buyer is not buying an asset, he is buying a job —
> and he prices it accordingly.
>
> Kira's whole job is to get that knowledge out of his head and onto paper, by talking to
> him rather than handing him a form. The deliverable is a handover document: his business
> in the nine areas a buyer's advisor works through, every line dated to the day he said
> it, his to keep whether or not he keeps paying us.
>
> Two things worth knowing before you start, because they are unusual and they are
> deliberate. It is priced as a **project, not a subscription** — after twelve months it
> drops to a third whether or not the work is done, because it is meant to end. And she is
> trying to make herself **redundant**: the point is the document, not the relationship.
>
> **What has changed since I last wrote.** Previously an invitation dropped you straight
> onto the dashboard. That skipped the part that makes Kira worth anything — the valuation
> your figures are measured from, and the first conversation where she learns how the work
> actually gets done. People landed on a screen with nothing in it and, fairly enough,
> left.
>
> So you now walk the same path a paying owner walks:
>
> 1. Go to **https://kiraexec.com** — no need to sign in first.
> 2. Answer thirteen short questions about a business. Three honest numbers at the end.
> 3. At the pricing step, enter your code **{CODE}** instead of a card. No card is asked
>    for and nothing is charged.
> 4. Then have a conversation with Kira.
>
> About twenty minutes in total, and you can stop and come back. If you already made an
> account with me earlier, the code step will ask you to sign in instead — that is expected
> rather than a fault, and the valuation you have just done carries across.
>
> **It is a beta, and it is worth saying what that means.** Some things are not built yet —
> she cannot write documents for you, and sending email on your behalf is not switched on.
> Some things are limited by where you are: parts of the product are set up for Australia
> first, so from the US, Canada or New Zealand you will see gaps that are geography rather
> than bugs. Neither is hidden — the product tells you when it cannot do something.
>
> What I want back is not a bug list, though I will take one. It is two things:
>
> 1. What the experience was actually like — where it was confusing, where it dragged,
>    where you would have stopped if I were not watching.
> 2. Whether you would put this in front of a business owner in his sixties who is quietly
>    thinking about selling — and if not, what is missing before you would.
>
> That second one is the whole question for me. Most of you would be the person handing
> Kira to that owner rather than the owner himself, and your read on whether he would trust
> it is worth more than mine.
>
> One thing worth knowing before you begin: what you tell her is kept, and it is what
> builds the handover document at the end. So use a real business if you have one, or a
> plausible one if you would rather not.
>
> Dennis

---

## Draft D — Priority 2 and 3, a peer review (15 people, SENT SEPARATELY AND AFTER)

⚠️ **A different relationship, and the copy has to reflect it.** These are not cold
contacts and they are not customers — they are technical peers the operator has met with
about their technology and his. So this asks a peer to review a build, and offers the same
back. It also mints **no code until someone says yes**: sending an access code to a person
who has not agreed is how an invitation becomes unsolicited mail.

**Subject:** Would you take a look at what I have built?

> Hello {FirstName},
>
> We have talked about what you are building. I have something at the point where it needs
> people who will tell me it is wrong, and I would rather that came from someone who has
> shipped things than from a survey.
>
> **What it is.** Most owner-run businesses are worth less than the owner thinks, and the
> reason is nearly always the same: the pricing, the judgement, the relationships and the
> "we don't do it that way" all live in one man's head. A buyer is not buying an asset, he
> is buying a job — and he prices it accordingly. Kira gets that knowledge out of his head
> by talking to him rather than handing him a form, and turns it into a document his broker
> can actually read. It is priced as a project rather than a subscription — it drops to a
> third after twelve months whether or not the work is done, because it is meant to end.
>
> **What looking at it involves.** About twenty minutes at **https://kiraexec.com** —
> thirteen short questions about a business, three numbers at the end of them, then a
> conversation. No card and nothing charged; I would send you a code to use at the pricing
> step. Use a real business or a plausible one.
>
> It is a beta and some of it is visibly unfinished — she cannot write documents yet, and
> sending email on someone's behalf is not switched on. Parts are set up for Australia
> first, so from the US, Canada or New Zealand you will see gaps that are geography rather
> than bugs. None of it is hidden; the product says so when it cannot do something.
>
> **What I would want back** is the two things I cannot get from my own testing:
>
> 1. What the experience was actually like — where it was confusing, where it dragged,
>    where you would have closed the tab.
> 2. Whether it is aimed at a real market: would you put it in front of a business owner in
>    his sixties who is quietly thinking about selling, and if not, what is missing?
>
> **And the offer goes both ways.** If it is useful to you, I will do the same for whatever
> you are building — properly, with a written response rather than a nod. I run a
> structured walkthrough process on my own products and I am happy to point it at yours.
>
> If you are in, reply and I will send you a code. If not, that is a perfectly good answer
> and I will not ask twice.
>
> Dennis

---

## Before I send

1. **Wording** — these are your relationships and the voice should be yours. Change
   anything.
2. **Send order** — Priority 1 (14) first. Priority 2/3 (15) only after, as a separate
   batch, and no codes minted for them until each replies yes.
3. **Identification footer** carries the Corporate AI Solutions identity, which is correct:
   this is our mail about our product, not a message sent on an owner's behalf.
