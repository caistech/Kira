# Kira — new-owner walkthrough

**Tester:** Ray, 66. Residential builder, 35 years. Profitable, and it runs on me.
**Date:** 6 August 2026 · **URL:** https://kiraexec.com
**Identities used:** `dennis+raytest@factory2key.com.au` (fresh signup), the non-admin QA account
(established, business details already set), and the non-admin ICP account (brand-new, nothing set).
Passwords read at run time from the canonical secrets file; none reproduced here.

Hi Dennis,

I went in as a bloke who's thinking about selling and hasn't told his wife. I made an account,
typed to Kira, poked at every screen behind the login, and looked at it on a phone. Some of this is
very good. Two or three things would have had me close the tab, and one of them is the button your
whole product is named after.

**Harness note first, so you can discount it:** the browser I was driving crashed or timed out five
times against this site and once restored a stale tab pointing at a `fix-shah-auth-session` preview
deployment. I re-ran everything crash-adjacent and I've only reported things I saw twice or more.
`kiraexec.com` itself is clean — `curl` follows no redirect and lands on 200.

---

## Landing page

Read the whole thing before touching anything, which is what I do.

It's written for me, and that's rare. "For owners whose business still runs on them." "You spent
thirty years building it." The bit about the buyer buying *you* and pricing it accordingly is
exactly what my broker said, in fewer words and less smug. The "who is behind this" section — one
bloke in WA, eighty-year-old developer with a land bank in his head, no support desk in another
time zone — did more for my trust than the rest of the page combined. Leave that alone.

Prices carry "+ GST" and the currency question is answered in the FAQ in plain terms. Your company
name, ABN and street address are at the bottom. Good. I checked for those.

What I'd raise:

- **There is no way to create an account from the front page.** The menu is How it works · See a
  real one · Pricing · About · **Sign in** · **Value my business**. That's it. If I've already made
  up my mind — and by the time I got to the bottom of that page I nearly had — the only door is a
  valuation I might not want to do yet. I had to guess `/signup` existed. It does.
- The page was slow to assemble the first time. The JavaScript files took six to twelve seconds
  each; the page navigation itself timed out twice before it settled. It got there, but on a
  regional connection that's a long time looking at a half-built page.

`Opportunity:` put a plain "Create an account" next to Sign in. The valuation is a great hook for
someone browsing; it's a speed bump for someone who's decided.

---

## Signing up

Filled it in as a new man: `dennis+raytest@factory2key.com.au`, a password, ticked the box.

Good: the password has a show/hide eye, there's a magic-link option, and the Terms and Privacy
Policy in the consent line are real links to real pages — I clicked both. That box is the one thing
on the page with legal weight and you didn't fake it.

What I'd raise:

- **The first field on the form is "How did you hear about Kira?"** Before my email. Before
  anything. I'm here to open an account and you're asking me a marketing question first. Move it
  after the password, or to afterwards.
- **The form isn't there for about a second.** The page arrives as a header, a heading and a
  footer, then the fields appear. I read pages before I touch them, so I'd already started reading
  a page with nothing on it.
- **After I submitted, there is no way to ask for the email again.** The screen says "Confirm your
  email … we sent a link to dennis+raytest@…", then offers exactly one thing: **"Use a different
  email."** If that email doesn't turn up — and I've had that happen with the bank, the council and
  my own accountant — my only option on screen is to make a *second* account with a different
  address. Now I've got two, neither of which works, and no way to get into either. That is the
  point I close the tab and don't mention it to anyone.
- Above that panel the card still reads "Set a password to create your account. We will email a
  confirmation link." Present tense, next to a message saying it's already been sent. Small, but it
  reads like the page hasn't caught up with itself.

I never got the confirmation email (I can't read that mailbox), so I could not finish the
brand-new signup. Everything below is from two accounts that already existed.

`Opportunity:` a "Send it again" button on that panel, with a quiet note that a magic link works
whether or not the account is confirmed. One control fixes both "it never arrived" and "the link
expired", which is two problems a stuck man cannot tell apart about himself.

---

## Signing in

Forgot-password link, show/hide on the password, magic link. All three present. I submitted a
password reset and got a clean "Reset link sent … check your spam folder". I couldn't read the
mailbox, so I can't tell you the link works — only that the request was accepted.

One thing worth knowing: **sign-in doesn't take everybody to the same place.** The established
account landed on `/talk`. The brand-new one landed on `/dashboard`. And `/talk` **is not in the
left-hand menu** — Overview, My Genome, Knowledge, and that's the lot. So the first screen I was
shown after logging in was one I couldn't navigate back to. I clicked "Overview" to look around and
lost it.

`Opportunity:` if `/talk` is where you want people to start, put it in the menu at the top, above
Overview. If it isn't, don't land them there.

---

## The dashboard — brand-new owner

This is the version a new man sees, and it's mostly well judged.

The amber card is there, and it's good: *"Kira can't send email as you yet — everything else is
ready."* Then it explains that Australian law requires the sender's name, ABN and address on a
commercial email, and that it identifies **me**, not you. That's the right explanation in the right
place and it took thirty seconds to accept. **"Add your business details"** goes to a real form, and
I came back to the dashboard afterwards still signed in and with the card still showing. That whole
loop works.

Then the problem.

- **❌ The orange "Talk to Kira" button doesn't go anywhere.** It's the floating button on every
  screen, it's the empty-state call to action on My Genome, and it's the one thing the entire
  product is about. It points at `/talk`. On a brand-new account, `/talk` silently sends you
  straight back to `/dashboard`. I checked it three separate ways — typed the address, clicked the
  floating button, clicked the link on the Genome page — and every time I ended up back on the
  dashboard I'd just left, with no message, no error, no explanation. Nothing tells me why. Nothing
  tells me what to do instead. On the established account, which already had business details
  filled in, `/talk` opened perfectly and Kira answered me. So it seems to depend on setup being
  finished — but you never say so, and the button never disappears or greys out.

  For me that's fatal. I've made an account, I'm on the screen, and the button that says "talk to
  her" reloads the page. I'd assume it's broken, and I'd assume the rest is too.

- The workspace name in the top-left of the menu reads **"Kira"** when no business name is set. So
  the sidebar says Kira, the page says Kira, and the assistant is called Kira. I couldn't tell what
  I was looking at.

- The page opens with what she *can't* do. First thing on my first day. The limitation is honestly
  written and I'd want to know eventually, but it shouldn't be the first sentence of the product.

`Opportunity:` either make `/talk` work from day one, or replace that button with the thing that
*does* work for a new account and say why. Silently bouncing a man back to where he started is the
worst of the three options.

---

## The dashboard — established owner

Different screen, different problem.

The first thing on it is a purple-to-magenta gradient panel about a third of the page high, with
**$140,000** in white type an inch tall, then $886,000 and $1,030,000 underneath. It is the
loudest thing on the screen by a distance.

I have not told my wife. I have not told my foreman. My bookkeeper walks past my monitor twice a
week. That panel is legible from the other side of my office. Everything else about this product
understands my situation and then the home screen shouts my numbers at the room.

`Opportunity:` blur it by default with a "show" toggle, the way a banking app does the balance.
That single control would say more about whether you understand this customer than any of the copy
does — and the copy is already good.

Two smaller things on the same screen: there are **two "Talk to Kira" buttons**, one magenta and
inline, one orange and floating, doing the same job in two colours; and the card labelled **"Your
business exec — Business — 0 conversations"** meant nothing to me. "Business exec" is your word,
not mine.

---

## My Genome

This is the thing you're actually selling, so I read every line of it.

The framing is right — organised by the questions a buyer's advisor will ask, nine areas, "there is
nothing to fill in". The nine questions are the right nine questions. "Could someone else price a
job and reach your number?" is exactly the question that keeps me up.

Then three things that would stop me.

- **❌ The one and only thing captured about my business isn't about my business.** Under "Systems
  & records", the single entry reads: *"Xero connection needed for valuation — The business's
  current value cannot be determined without connecting Xero accounting software."* Underneath it,
  in grey: **"You said this on 3 August 2026."**

  I didn't say that. Nobody said that. That's a note about your software, filed as a statement of
  fact from me, dated, in the document you've told me is the one a buyer's accountant will read.
  If a machine will put words in my mouth about Xero, I have no reason to believe it won't do it
  about my margins.

- **❌ It contradicts the dashboard on the same login.** The header of that very page says "Worth
  today **$886,000**". Four inches below it, an entry says the value **cannot be determined**. Both
  on screen at once. I don't know which one is true and neither do you.

- **The "Other things she has noted (13)" list reads like a file on me.** Third person, all of it:
  *"The owner tracks and manages critical business tasks personally, creating operational
  dependency." "Reducing dependency on the owner is a priority to make the business more
  sellable."* And one that stopped me cold: *"The owner prefers to maintain strict control over
  communications and approvals, explicitly disagreeing with sending sensitive emails without prior
  approval, **despite attempts to grant standing approval**."*

  Attempts by whom? That's her recording that she tried to get blanket permission to send email in
  my name and I said no — written up as though I were the difficulty. I said no because it's my
  name on the bottom.

  Half the list is also the same thing twice or three times: Xero not connected appears twice,
  Google Drive not connected twice, "only the owner and assistant can see these conversations"
  three times, "reducing owner dependency is a priority" twice. It reads like a machine
  transcribing itself.

- One line I did respect, in the privacy paragraph: *"Our support team can see what Kira has
  captured when they need to keep the service running."* That's honest and I'd rather know. It's
  buried in a run-on paragraph, and — see below — Kira herself flatly denies it.

`Opportunity:` write the notes back to me in the first person and in my words ("You price off
experience, not a rate card"), not in the third person as an analyst's case file. And whatever's
generating the "Other things she has noted" list needs a duplicate check before it reaches this
page.

---

## Talking to Kira (typed — I have no microphone in this session)

The typing box works properly. I asked "What exactly do you do for me, in plain words?" and got a
sensible, jargon-free answer in about eight seconds, ending "nothing ever goes out or changes
without you signing off on it first." That's the right answer and the right order of priorities.

Then I asked the only question I actually care about:

> *"I have not told my wife or my staff I am thinking of selling. Who can see what I tell you?"*

She answered:

> *"Only you and I see what you share here. No one else — no accountant, no staff, no one — has
> access to these conversations unless you explicitly share them. Your privacy is tightly
> protected."*

**❌ That is not what your own Genome page says.** That page says your support team can see what
she's captured. One of those two statements is wrong, and the wrong one is being said out loud, in
a reassuring voice, to a man who just told her something he hasn't told his wife.

I'd rather she said: "You, and my support people if something breaks and they need to fix it. Not
your accountant, not your staff, nobody else." That's a smaller claim and I'd have believed it.
"No one, no one, no one" from software is a claim I've heard before and it's never been true.

Small thing while I'm here: she writes "organizing" and "systematize". American spelling on an
Australian product for Australian owners. I notice; so will the next bloke.

`Opportunity:` make the confidentiality answer a fixed, written one that matches the privacy page
word for word, rather than something she composes fresh each time. It's the one answer that can't
be allowed to vary.

---

## Discovery

I can't test the voice — this session has no microphone, so treat voice itself as **untested, not
broken**.

But I can tell you what the screen does when it doesn't connect, and that part is judgeable. I
clicked "Start a conversation" and after a few seconds got:

> **Connection problem**  ·  [Mute]  [End]

That's it. Two words, and two buttons that both assume a call is happening. No "check your
microphone", no "your browser is blocking it", and — the one that matters — **no "type to her
instead"**, even though the `/talk` page has a perfectly good typing box three clicks away.

A lot of men my age are on a desktop tower with no microphone at all and don't know it. They will
land exactly here.

`Opportunity:` when the connection fails, offer the typing box in the same panel. You already built
it; it's on another page.

---

## Business details form

Good form. It says *why* it needs the ABN — Australian law requires it on a commercial email — and
that the details identify me rather than you. The business-name field searches the real register
and fills the ABN in for me. That's exactly the right amount of work to ask of me.

Two faults:

- **❌ "How Kira signs off" was pre-filled with `dennis+ray`.** That's the front half of my email
  address. On a real customer whose email is `ray.thompson@bigpond.com`, it would pre-fill
  `ray.thompson`. That's the name that goes at the bottom of a quote to my customer. A man in a
  hurry ticks the box and hits Save, and Kira signs off to his client as `ray.thompson`. The field
  should start empty with the placeholder "e.g. Ray Thompson", or take the name from the profile.
- The register suggestions drop down over the top of the next field's label — "Trading name"
  disappears behind the list of other people's companies. On arrival at the edit version of this
  form, that list was already open showing eight other businesses' ABNs before I'd typed anything.
- There's no "Cancel" or "Not now" — only "Save and continue". I clicked in to *look* at it. Getting
  out means using the side menu and hoping nothing was half-saved.

---

## Settings

The best screen in the product. Explanatory header, then Profile, Your business, Connected
accounts, Plan & usage, Password, Notifications, Signed-in devices, Delete account. Every section
says what it does before it asks anything.

Three lines I'd single out as doing real work:

- *"There's no card on your account, so nothing can be charged."* — that's the sentence I'd want at
  the top of every page, honestly.
- *"Signs you out of Kira everywhere … You can sign back in whenever you like; nothing is deleted."*
- Delete Account says "This cannot be undone" **before** the button, in its own bordered box.

I did not press Sign out everywhere or Delete account. Those are yours to test, not mine.

---

## On a phone (375px)

I checked because half my emails get read standing in a driveway.

The page itself is fine — nothing runs off the side, the text is a readable size, the layout stacks
sensibly. Then two things:

- **❌ The menu drawer doesn't reach the bottom of the screen.** It stops about two-thirds down, and
  "Settings", "Sign out" and my email address are printed *on top of* the page content showing
  through underneath. "Sign out" lands directly across "Document the core systems" — two lines of
  text in the same place, both unreadable. It's the first thing you see when you open the menu on a
  phone.
- **❌ The black "Report a problem" tab and the orange microphone button both sit on top of the
  "Week 1 — Capture the essentials" card**, covering the end of its sentence. Two floating widgets
  parked on the content.

---

## Cross-access (I tried the admin door)

I typed `/admin` while signed in as an ordinary user. I got bounced to an admin sign-in page with
*"That account isn't an operator account"* and a link back to the normal product. Correct, and the
message is in English rather than a 403. Importantly, it **didn't log me out** — I went straight
back to my dashboard afterwards and was still signed in.

## Staying signed in

I opened a second tab: still signed in. I left it about thirteen minutes, came back and navigated
around: still signed in. I got bounced off the admin gate: still signed in. Whatever was throwing
people out before appears to be fixed.

---

## Terminology and small stuff

- "Your business exec" — not a phrase I'd use. I'd call it "Kira" or "your assistant".
- "Business Genome" survives, just. It sounds like a startup word, but the page explains it
  immediately and the explanation is good, so it earns itself back.
- The browser tab name is right on some pages ("Overview · Kira", "Settings · Kira", "Your
  business · Kira") and wrong on four — My Genome, Talk, Discovery and the valuation all say
  "Kira — your part-time general manager", which is the front-page name. With six tabs open I
  can't tell them apart.
- The valuation page greets me "You are signed in, **dennis+ray**" and *then* asks "What should we
  call you?" — it's using my email prefix as my name, same as the sign-off field, and it doesn't
  know my name even though there's a first-name box in Settings.
- That same page says "Nothing to sign up for" to a man who is signed in.

---

## Standards Check

| Item | | Evidence |
|---|---|---|
| Responsive — no horizontal scroll, ≥16px text | ✅ | `/dashboard` at 375px: `scrollWidth` 375 = `clientWidth` 375; body font-size 16px |
| Responsive — nav collapses to a usable mobile pattern | ❌ | Drawer opens at 375px but is not full-height; "Settings"/"Sign out"/email render overlapping page content (screenshot `11-mobile-nav.png`) |
| Responsive — floating elements clear of content | ❌ | "Report a problem" pill + orange mic button overlay the Week 1 card text at 375px (`10-dashboard-375.png`) |
| Auth page — forgot-password link | ✅ | `/login` links `/auth/forgot-password`; page loads and accepts a submission |
| Auth page — password visibility toggle | ✅ | "Show password" button present on `/login`, `/signup` and Settings → Password |
| Auth page — magic-link option | ✅ | "Email me a magic link" on both `/login` and `/signup` |
| Auth page — reset flow works | — | Dispatch confirmed ("Reset link sent"); I could not read the mailbox, so the link itself is unverified |
| Authenticated chrome — persistent left navbar | ✅ | Present on `/talk`, `/dashboard`, `/my-genome`, `/knowledge`, `/settings`, `/setup/business`, `/discovery` |
| Authenticated chrome — /settings reachable, full sections | ✅ | Profile / Your business / Connected accounts / Plan & usage / Password / Notifications / Signed-in devices / Account, one click from the nav |
| Authenticated chrome — Sign Out present | ✅ | In the nav on every authenticated page; clicking it landed `/login` |
| Explanatory header on every page/panel | ⚠️ | Present on Settings, Knowledge, My Genome, Discovery, `/setup/business`. Absent on `/dashboard`, which opens with a warning card (new owner) or a figure (established) |
| Voice reachable from chrome in ≤3 clicks | — | A "Talk to Kira" control is on the chrome of every authenticated page, but it is the broken `/talk` link for a new account (see below). Voice itself untestable — no microphone in this session |
| Scaffold metadata — real tab title | ⚠️ | Custom titles on `/login`, `/signup`, `/dashboard`, `/settings`, `/knowledge`, `/setup/business`, `/auth/forgot-password`. `/my-genome`, `/talk`, `/discovery`, `/business-valuation` all fall back to the marketing title |
| Scaffold metadata — favicon not default | ✅ | `/favicon.ico` served, 4,995 bytes (the Next.js default is ~25.9 KB) |
| Dual-portal — user flow reaches a real user home ≠ /admin | ✅ | Non-admin login landed `/talk` (established) and `/dashboard` (new); `/admin` as a non-admin → `/admin/login` with "That account isn't an operator account" and a link back |
| Consequence clarity on irreversible actions | ✅ | Delete account states "This cannot be undone" before the button; "Sign out on all devices" explains its scope; the email-authorisation tickbox states what will be published |
| Zero dead ends | ❌ | Every "Talk to Kira" control (floating button, My Genome empty state, Knowledge) points at `/talk`, which silently redirects a new account back to `/dashboard`. Verified 3×. `/discovery`'s "Connection problem" state offers no route forward |
| Prices carry a tax qualifier | ✅ | Landing: "Plans run from **$499 + GST** to **$4,999 + GST** /month"; FAQ states AUD, quoted excluding GST |
| Valuation figures carry NO tax qualifier | ✅ | $140,000 / $886,000 / $1,030,000 on `/dashboard` and `/my-genome` carry none |
| Accuracy of what's shown to the user | ❌ | `/my-genome` attributes "You said this on 3 August 2026" to a statement about Xero the user never made, and states the value "cannot be determined" on a page whose own header states $886,000 |
| Confidentiality claims consistent | ❌ | Kira in chat: "No one else — no accountant, no staff, no one — has access." `/my-genome`: "Our support team can see what Kira has captured…" |
| Signup recoverable if the email doesn't arrive | ❌ | Confirm-email panel offers only "Use a different email"; no resend |

---

## Not verified

- **Voice.** No microphone in this environment. `/discovery` produced "Connection problem", which is
  the expected result of having no mic — I have judged only the *design of that failure screen*, not
  the voice feature. `/talk`'s "Talk to the assistant" button was never exercised.
- **Email delivery.** I could not read `dennis+raytest@factory2key.com.au`, so: the signup
  confirmation email, the password-reset email and the magic link are all untested end to end. I
  only observed that the app accepted each request and said it had sent one.
- **The brand-new signup past the confirm-email wall.** Blocked on the above. Everything
  authenticated was walked with two pre-existing non-admin accounts.
- **Anything behind payment.** Neither account has a card. "Manage billing" was disabled with "You
  don't have a subscription yet". Checkout, the arrears billing, the tax label on a real invoice,
  and cancellation are all unwalked.
- **The 11-question valuation past question 1.** I started it and confirmed it advances; I did not
  answer all eleven, so the result screen, its figures and its tax treatment are unseen.
- **Sign out everywhere / Delete account.** Deliberately not pressed — operator-only.
- **Google Drive connection.** "Connect Google Drive" not clicked; no OAuth walked.
- **Knowledge uploads.** "Add link" / "Upload a file" not exercised.
- **Whether the `/talk` redirect is caused by missing business details specifically.** I observed
  only the correlation: the account with details reached `/talk`, the account without did not.
- **Real first-paint timing on a normal connection.** My session was slow throughout and the browser
  crashed repeatedly, so I have not reported page speed as a product finding except where the
  network log showed the asset times directly.

---

**VERDICT: FAIL**

Driven by these ❌:

1. **`/talk` silently bounces a new owner back to `/dashboard`** — breaking the floating "Talk to
   Kira" button, the My Genome empty-state CTA, and the Knowledge CTA. The product's core action
   does nothing on day one, with no message.
2. **My Genome attributes a statement to the owner that he never made** ("You said this on 3 August
   2026" against a note about Xero), inside the document sold as the one a buyer's advisor reads.
3. **My Genome contradicts the dashboard on the same screen** — "value cannot be determined" under a
   header reading $886,000.
4. **Kira's confidentiality answer contradicts the product's own privacy statement**, on the single
   question this customer is most sensitive about.
5. **The mobile menu drawer overlaps page content**, rendering "Sign out", the account email and the
   text beneath all unreadable at 375px.
6. **No way to resend the confirmation email** — a user whose email doesn't arrive is offered only
   the creation of a second orphaned account.
7. **"How Kira signs off" pre-fills from the email local part** (`dennis+ray`), putting a
   machine-generated string on customer-facing correspondence.

What's genuinely good and shouldn't be touched while you fix the above: the writing, the amber
business-details card and its round trip, the Settings page, the honest "who is behind this"
section, the tax qualifiers on every price, the admin gate, and the fact that being signed in stays
being signed in.

Ray
