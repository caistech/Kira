# Beta Tester Follow-up Emails

Generated: 2026-08-20
Context: Fixed competing signup paths bug on /plan page

## GROUP A: Hardik (Successfully redeemed - no action needed)

✅ **hardiktech66@gmail.com** - Code redeemed successfully, has agent, actively testing
- No email needed - already in and working

---

## GROUP B: Hit the Bug - Need Re-invite (5 people)

These people created accounts via the wrong path (free signup instead of beta redemption).
Their accounts exist but have NO trial, NO journey_type, NO agent.

### Template: "The path you took was broken - here's the fixed one"

**Subject:** Kira — the path you took was broken, and here is the fixed one

**Recipients:**
- darshilp.softrefine@gmail.com (Darshil) - Code: M9DL-3PR4-GMA4
- joseph@xcapitalgroup.com.au (Joey) - Code: UP3V-REWC-K7QN  
- shhahhussain@gmail.com (Shah) - Code: CTL4-MP2K-ERK7
- simon.crisp@finnbusinesssales.com.au (Simon) - Code: GTC3-2HR3-3DCB

**Body:**

```
Hi {NAME},

Short note, because I owe you an apology.

You tried to use your beta code last week and hit a bug. The pricing page offered two "no card" options — one for beta testers (correct) and one for general signups (wrong). The second one was more visible than the first. You took the sensible path, and it bypassed the entire beta setup.

That is my fault, not yours. The page has now been fixed — there is only one path for beta testers now, and it carries your code in the link.

Here is the working link:

https://kiraexec.com/plan?code={CODE}

Click it, answer the thirteen questions (about three minutes), and at the end you'll set a password and go straight in. No card, nothing to type, no confusion.

What I most want from you at this point: does she stop on something a buyer would stop on? If you tell her one man does all the pricing, or that one customer is forty per cent of revenue on a handshake, a good adviser would interrupt. That is the failure I am least confident about.

Thank you for your patience with this. You found a real bug and I have fixed it for everyone who comes after you.

Dennis
```

**Note for Gareth:** He has `journey_type: business` despite not redeeming, which is odd. Check manually.

---

## GROUP C: Never Tried - Send Reminder (9 people)

These people received codes but never attempted signup.

### Template: "Your code is waiting - here's the direct link"

**Subject:** Kira — your code is waiting (and the link that does the work)

**Recipients:**
- bilal.anwar@zencloudtechnologies.com (Bilal) - Code: 26PM-MFH3-BFUQ
- haq@pdx.edu (Arsh) - Code: J2UQ-D89A-M6GZ
- jason@buildgravity.ca (Jason) - Code: 3PBA-4DCA-V9DM
- jason@orbitcapital.net (Jason) - Code: VLY7-XK6K-8VV8
- munich.stephen@gmail.com (Stephen) - Code: BTNK-FTXD-WXZH
- shamini.bhaskaran@gmail.com (Shamini) - Code: KCTD-6HAB-2KEF
- shani.shah@softrefine.com (Shani) - Code: 6R8L-ECZ3-3WJP
- sukhdeep.mangat@linkbusiness.com.au (Sukhdeep) - Code: 87RL-7XNN-CKEW
- yuvraj.softrefine@gmail.com (Yuvraj) - Code: UP4M-N6KJ-VEU7

**Body:**

```
Hi {NAME},

I sent you a beta code last week. You may not have had time to look at it, or the instructions may not have been clear — either way, here is a link that does the work:

https://kiraexec.com/plan?code={CODE}

Click it, answer the thirteen questions (about three minutes), and at the end you set a password and go straight in. No card, nothing charged, no confusion.

What Kira is for, in case the original note was not clear:

Most owner-run businesses are worth less than the owner thinks, because the pricing, the judgement, the relationships all live in one man's head. A buyer is not buying an asset, he is buying a job — and he prices it accordingly.

Kira's whole job is to get that knowledge out of his head and onto paper, by talking to him. The deliverable is a handover document in the nine areas a buyer's advisor works through. His to keep whether or not he keeps paying us.

What I most want your eye on: does she stop on something a buyer would stop on, or does she just file it? If you tell her one customer is forty per cent of revenue, a good adviser would interrupt. That is the failure I am least confident about.

No rush — your code works for the next few weeks.

Dennis
```

---

## Sending Instructions

### For GROUP B (Bug victims):
```bash
# Darshil
npx tsx scripts/send-beta-invite.ts --to darshilp.softrefine@gmail.com --code M9DL-3PR4-GMA4 --name Darshil

# Joey
npx tsx scripts/send-beta-invite.ts --to joseph@xcapitalgroup.com.au --code UP3V-REWC-K7QN --name Joey

# Shah  
npx tsx scripts/send-beta-invite.ts --to shhahhussain@gmail.com --code CTL4-MP2K-ERK7 --name Shah

# Simon
npx tsx scripts/send-beta-invite.ts --to simon.crisp@finnbusinesssales.com.au --code GTC3-2HR3-3DCB --name Simon

# Gareth (check manually first - has journey_type but code not redeemed)
# npx tsx scripts/send-beta-invite.ts --to gareth@plausible.gg --code ZMX4-YJ7J-DJKY --name Gareth
```

### For GROUP C (Never tried):
```bash
# Send reminder emails with direct code links
# (Use send-beta-invite.ts or create new reminder template)
```

---

## What Changed (For Reference)

**Before (Broken):**
- /plan had TWO "no card" options: beta code redemption + free signup
- Beta testers took the more visible free signup link
- Result: Account created WITHOUT trial, journey_type, or agent setup

**After (Fixed - deployed 2026-08-20):**
- Free signup link REMOVED from /plan
- Only Stripe checkout OR beta code redemption
- Uninvited visitors directed to request a code via email/LinkedIn
- Beta code comes in URL: `?code=XXXX` (no typing required)

---

## Follow-up Actions Needed

1. ✅ Fix deployed to production (PR #80 merged 2026-08-20)
2. ⏳ Wait 24-48 hours for production deployment to stabilize
3. ⏳ Send GROUP B emails (bug victims - highest priority)
4. ⏳ Send GROUP C emails (never tried - lower priority)
5. ⏳ Monitor redemptions over next week
6. ⏳ Investigate email tracking (why 0% open rate when emails clearly opened?)
