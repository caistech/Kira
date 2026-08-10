# Draft emails — Carmen Plasencia and Andrew, 10 August 2026

Apology + re-invite to the two people who signed up in Jan/Feb 2026, were given a trial and a
provisioned Kira, and never had a login created. Neither has ever been able to sign in. Both were
emailed by `/api/cron/reengagement-emails` as recently as **7 August 2026**.

**Send these from Dennis's own mailbox, not from the product.** An apology that arrives from
`noreply@updates.…` is not an apology, and both of these need to read as one person writing to
another.

---

## 1. Andrew — andrew@aerion.com.au

**Subject:** An apology — your Kira account never actually worked

Andrew,

I owe you an apology, and it is overdue by about six months.

You signed up to Kira in February. What you should have got was a login and thirty days to try it.
What you actually got was an account with no way to sign in — we created your profile, started your
trial and set up your assistant, and the one step that would have let you through the door was never
done. The trial then ran its course and expired without you ever being able to open it.

I only found this today, going back through every account we have ever created. Worse, our system
has gone on sending you the occasional email since, inviting you back to something you could not get
into. I have stopped that.

We have shifted direction somewhat since February, and the product is a good deal clearer than the
one you signed up for. If you would like to see what it is now, it is at **kiraexec.com** — there is
a short valuation tool on the front that needs no account and takes about three minutes.

If any of it looks useful, tell me and I will set your account up properly myself, and check it works
before I hand it over. If it is not for you, that is entirely fair, and you will not hear from us
again.

Either way — sorry. You gave us your time in February and we wasted it.

Dennis

---

## 2. Carmen — carme.plasencia@aromics.es

**Subject:** An apology — your Kira account never actually worked

Carmen,

I owe you an apology, and it is about seven months late.

You signed up to Kira in January. What you should have got was a login and thirty days to try it.
What you actually got was an account with no way to sign in — we created your profile, started your
trial and set up your assistant, and the one step that would have let you through the door was never
done. The trial expired without you ever being able to open it.

I only found this today, going back through every account we have ever created. Worse, our system
has gone on sending you the occasional email since, inviting you back to something you could not get
into. I have stopped that.

We have shifted direction somewhat since January, and the product is a good deal clearer than the one
you signed up for. If you would like to see what it is now, it is at **kiraexec.com** — there is a
short valuation tool on the front that needs no account and takes about three minutes.

If any of it looks useful, tell me and I will set your account up properly myself, and check it works
before I hand it over. If it is not for you, that is entirely fair, and you will not hear from us
again.

Either way — sorry. You gave us your time in January and we wasted it.

Dennis

---

## Notes for the sender (do not paste)

- **Both claim "I have stopped that."** That sentence is not true until the re-engagement cron is
  changed — `vercel.json` runs `/api/cron/reengagement-emails` daily at `0 10 * * *`, and it does not
  exclude accounts with no `auth_user_id`. **Fix that before these go out**, or the apology is
  contradicted by a mailshot the following morning.
- ⚠️ **Carmen is in Spain (`aromics.es`), and that changes what is allowed.** The portfolio rule is
  Australia-only for commercial email until a country's rules are implemented; Spain is EU, so GDPR
  and PECR apply. Worse, `assertJurisdictionAllowed` is **not wired anywhere in this repo** — the
  guard that is supposed to make this impossible does not exist here, so nothing would have stopped
  an automated send. A personal, individual email from your own mailbox to someone you have a prior
  relationship with is a different act from an automated marketing send, and that is the route I
  would take for hers — but it is your call, not mine to make silently.
- **No inferred intent in either.** Their agents are named `Kira_Carmen_RaiseSeries` and
  `Kira_Andrew_GetMarketing`, which suggests what each wanted help with — deliberately left out,
  because being confidently wrong about someone's business in an apology would undo the apology.
- **The offer is deliberately reversible.** "You will not hear from us again" is a real commitment;
  honour it by suppressing the address rather than deleting the row, or a later list import brings
  them back.
- **Do not create their accounts in advance.** The offer is to set one up if they want it, which
  keeps it their decision rather than another account made for someone who did not ask.
