// Invites the three Softrefine contacts into the Kira Founding Consultant Beta portal (2026-10-01).
//
// WHO THEY ARE. Softrefine is a candidate development-partner team. All three walked an EARLIER Kira
// beta, so none of them is a first-time tester; Shani reported the code/Stripe bug and the missing-Kira
// problem in August and was promised a link "that does the work" once the entry path was fixed. This
// time Dennis wants them to experience the CURRENT product the way a consultant would — Softrefine
// advises business clients, so they can answer as themselves.
//
// The portals were provisioned first (2026-10-01): one distributor org each under the CAIS parent, a
// consultant /talk portal, and a superadmin code bound to the address — mirroring the 22 Sept cohort.
// Darshil has a login from the old beta, so his membership was created up front (redemption does not
// create one for an existing account).
//
// ⚠️ Not the founding-beta template: that copy says "thanks again for the conversation… consultants
// I've already spoken with", which is false for them. Each body below is written for the person.
// ⚠️ No NDA, codebase or architecture-review commitments — that is Dennis's call, made in person.
//
// DISPATCH (dry run is the default — nothing leaves without --send):
//   node --env-file=.env.local scripts/send-softrefine-consultant-invite.mjs --dry
//   node --env-file=.env.local scripts/send-softrefine-consultant-invite.mjs --only <email> --send

import { unsubscribeUrlFor } from '@caistech/email-compliance';

const arg = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
};
const SEND = process.argv.includes('--send');
const ONLY = (arg('only') || '').trim().toLowerCase();

const RESEND_KEY = process.env.RESEND_API_KEY;
if (!RESEND_KEY) throw new Error('RESEND_API_KEY missing — run with --env-file=.env.local');
if (SEND && !ONLY) throw new Error('One recipient per run: pass --only <email> with --send.');

const FROM = 'Dennis McMahon <noreply@updates.corporateaisolutions.com>';
const REPLY_TO = 'dennis@corporateaisolutions.com';
const CC = 'dennis@corporateaisolutions.com';
const APP_URL = 'https://kiraexec.com';

const WHAT_TO_DO = `What I'd like you to do

- Open the link below and go through it as a consultant would. Softrefine advises business clients, so the easiest version is to answer as yourselves: who you work with, how you diagnose a client, how an engagement actually runs.
- Her first conversation is an onboarding interview about your practice. Talk or type — it's the same conversation either way, and you can switch between them.
- Then tell me, as plainly as you like, where the story, the workflow or the next step stopped making sense.

The part I'm least sure of: whether, by the end of that first conversation, she understands your way of working well enough that you'd be comfortable putting her in front of one of your clients. If she files what you say and moves on when a good adviser would have stopped and asked, that's the failure I most want to hear about.

One known limit, so it doesn't read as a bug: Kira only sends email on someone's behalf in Australia so far. On the business details page, pick your own country — the ABN questions disappear — and everything else works.`;

const RECIPIENTS = [
  {
    email: 'shani.shah@softrefine.com',
    firstName: 'Shani',
    code: 'H87A2ZWRNJAU',
    subject: 'Shani — your invitation to the Kira consultant portal',
    opening: `Hello Shani,

Good to talk today. As promised, here is your invitation into the consultant portal, so you can see how that entry point works — it's no longer just Kira for the business owner, it's the whole system, including the layer consultants use to bring their own clients in.

It's also the link I promised you in August: one that does the work rather than an instruction that asks you to. Since then the invitation carries the code itself, so there is nothing to type and no promo box anywhere; Kira is on the pages where you actually work rather than behind a link; and as of today what you type and what you say are one memory, and she no longer asks "are you still there?" every few seconds while you go and find something.

Come in as a consultant rather than a tester — the person who'd bring Kira to their own clients.`,
    closing: `I'll look forward to your proposal. What you see in here is the current state the proposal would be picking up from, so it's worth a walk before you finalise it.

Thank you, Shani.`,
    footerReason: 'you took part in an earlier Kira beta and we discussed the consultant portal',
  },
  {
    email: 'yuvraj.softrefine@gmail.com',
    firstName: 'Yuvraj',
    code: '7FUVBJ6THVNR',
    subject: 'Yuvraj — Kira has changed a lot since you last saw it',
    opening: `Hello Yuvraj,

You saw an earlier version of Kira, so this isn't a first-time beta invitation. It's been substantially rebuilt since then, and I'd value your view of where it has landed.

This time I'd like you to come in as a consultant rather than a tester — the person who'd bring Kira to their own clients. Kira now starts by learning the consultant's own practice, and that's the side I most need an outside view on.`,
    closing: `Thank you, Yuvraj — I'd genuinely rather hear the uncomfortable version than a polite one.`,
    footerReason: 'you took part in an earlier Kira beta',
  },
  {
    email: 'darshilp.softrefine@gmail.com',
    firstName: 'Darshil',
    code: 'L6DBHB4H9RWF',
    subject: 'Darshil — your invitation to the Kira consultant portal',
    opening: `Hello Darshil,

Thanks for joining the call today. As promised, here is your invitation into the consultant portal. You've seen earlier versions of Kira, and it has been substantially rebuilt since — it now starts by learning the consultant's own practice, then the consultant brings it to their clients.

Come in as a consultant rather than a tester — the person who'd bring Kira to their own clients. That's the side I most need an outside view on.

Your login from last time still works, and it now opens straight into your own consultant portal. The link below signs you in; if it ever asks for a password you've forgotten, "Email me a magic link" on the login page is quicker than resetting it.`,
    closing: `Thank you, Darshil — I'd genuinely rather hear the uncomfortable version than a polite one.`,
    footerReason: 'you took part in an earlier Kira beta and we discussed the consultant portal',
  },
  {
    // Dave (OneIT, Perth) — met 2026-10-01, introduced by Gail. Technical reviewer, not a former
    // beta tester: he is reviewing the code and the HLD for a production-readiness proposal, and was
    // promised an invitation into the distributor/consultant portal "to see how that layer works".
    email: 'dave@oneit.com.au',
    firstName: 'Dave',
    code: 'ADYGFTTAZADT',
    subject: 'Dave — your invitation to the Kira consultant portal',
    opening: `Hello Dave,

Thanks for the time today, and thanks to Gail for setting it up. As promised, here is an invitation into the consultant portal, so you can see how that layer works from the inside rather than from the brief.

Two things before you start:

- The HLD in the repository is current as of today, including the part that trailed off in the version you were sent. It's docs/HLD.md in the Kira repo, with docs/LLD.md beside it and docs/BUILD_REGISTER.md as the running record of what has changed and what has not yet been verified. Access to the three repositories follows as soon as I have your GitHub ID.
- As I said on the call, this is functionally where I want it, not production-ready. Today's entry in the build register is a fair example: a round of beta feedback turned up issues I thought were fixed and weren't, and it records honestly which fixes are confirmed and which are not.`,
    whatToDo: `What I'd like you to do

- Open the link below and come in as a consultant would: set up your own practice first, then look at how a consultant brings a client in.
- Talk or type — it's the same conversation either way.

The question I'd most like your eye on is the one the consultant layer creates: whether a consultant, or one of their clients, could ever see, retrieve or infer anything that belongs to another. It's the difference between one owner with one Kira and a network of consultants each holding many clients, and it's the part I'm least able to judge myself.`,
    closing: `Looking forward to Wednesday the 7th at 3:30.`,
    footerReason: 'we discussed a technical review of Kira and I offered you access to the consultant portal',
  },
  {
    // Ikechukwu Okalia (TimeFrontiers) — development-team candidate, added 2026-10-02. Already signed
    // up on 2026-09-29 as an owner (consult@ikechukwuokalia.dev, org "VibeSentry"); his agent was one
    // of the four with no post-call webhook, so nothing from any call that day was saved. This
    // address gets a separate consultant portal. Repo access is being added by Dennis to this address.
    email: 'ikechukwu@team.timefrontiers.com',
    firstName: 'Ikechukwu',
    code: '6MNNFCTKG9E6',
    subject: 'Ikechukwu — the Kira consultant portal, and access to the code',
    opening: `Hello Ikechukwu,

I'm bringing in a development team to take Kira from a working beta to production, and I'd like you to look at it with that in mind — both as a product and as code.

Two parts to this:

- The product. Below is an invitation into the consultant portal, which is how Kira now reaches the market: a business consultant sets up their own practice, then brings Kira to their clients. You signed up on 29 September as a business owner; that account stays as it is, and this is a separate consultant portal on this address.
- The code. I'm adding this email address to the three repositories — Kira, the orchestrator and cais-shared-services — so you can review the codebase. GitHub will send an invitation for each; if GitHub knows you under a different address, reply with your username and I'll switch it. The design documents are docs/HLD.md and docs/LLD.md in the Kira repository, and docs/BUILD_REGISTER.md records what has changed and what has not yet been verified.

One thing you may have noticed on the 29th, and a fair example of where it stands: your agent was one of several provisioned without the webhook that saves each call, so anything you said to her that day was never recorded. That was found and fixed on 1 October, and the register entry explains how it happened. It is functionally where I want it, and it is not production-ready.`,
    whatToDo: `What I'd like you to do

- Open the link below and come in as a consultant would: set up a practice first, then look at how a consultant brings a client in. Talk or type — it's the same conversation.
- When the repository invitations arrive, read the code with the same question a production review would ask.

The question I'd most like your view on is the one the consultant layer creates: whether a consultant, or one of their clients, could ever see, retrieve or infer anything that belongs to another — and what it would take to prove they can't.`,
    closing: `Thank you, Ikechukwu — I'd rather hear the uncomfortable version than a polite one.`,
    footerReason: 'you signed up to Kira and I am inviting you to review it as a prospective development partner',
  },
];

function paragraphs(text) {
  return text
    .trim()
    .split('\n\n')
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (lines.every((line) => line.startsWith('- '))) {
        const items = lines.map((line) => `<li style="margin:0 0 8px">${line.slice(2)}</li>`).join('\n');
        return `<ul style="margin:0 0 14px;padding-left:22px">${items}</ul>`;
      }
      if (lines.length === 1 && lines[0] === 'What I\'d like you to do') {
        return `<p style="margin:20px 0 10px;font-weight:600">${lines[0]}</p>`;
      }
      return `<p style="margin:0 0 14px">${lines.join(' ')}</p>`;
    })
    .join('\n');
}

async function footer(email, reason) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  let unsubscribeLink = 'https://kiraexec.com/unsubscribe [UNSIGNED — secret missing]';
  if (secret) unsubscribeLink = await unsubscribeUrlFor(APP_URL, email, secret);
  else if (SEND) throw new Error('UNSUBSCRIBE_SECRET is not set — the unsubscribe link cannot be signed for a real send.');
  return `
<hr style="border:none;border-top:1px solid #ddd;margin:28px 0 14px">
<p style="font-size:12px;color:#666;line-height:1.5;margin:0">
Sent by Global Buildtech Australia Pty Ltd (ABN 54 672 395 685), trading as Corporate AI Solutions,
76-84 Brunswick Street, Fortitude Valley QLD 4006 · <a href="mailto:dennis@corporateaisolutions.com">dennis@corporateaisolutions.com</a><br>
You are receiving this because ${reason}. If you would rather not hear about it again,
<a href="${unsubscribeLink}">unsubscribe here</a>.
</p>`;
}

function bodyFor(recipient) {
  const link = `${APP_URL}/plan?code=${recipient.code}`;
  return `${recipient.opening}

${recipient.whatToDo ?? WHAT_TO_DO}

Start here — your invitation is in the link, so there's nothing to type:

<a href="${link}">${link}</a>

${recipient.closing}

Dennis

Corporate AI Solutions`;
}

async function main() {
  const list = ONLY ? RECIPIENTS.filter((recipient) => recipient.email === ONLY) : RECIPIENTS;
  if (!list.length) throw new Error(`No recipient ${ONLY}`);

  for (const recipient of list) {
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333">${paragraphs(bodyFor(recipient))}${await footer(recipient.email, recipient.footerReason)}</div>`;

    if (!SEND) {
      console.log(`\n===== DRY RUN — ${recipient.email} (cc ${CC})\nSubject: ${recipient.subject}\n`);
      console.log(bodyFor(recipient).replace(/<a href="[^"]+">([^<]+)<\/a>/g, '$1'));
      continue;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to: [recipient.email], cc: [CC], subject: recipient.subject, html }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error(`FAILED ${recipient.email} · ${json.message || response.status}`);
      process.exit(1);
    }
    console.log(`SENT  ${recipient.email} · ${recipient.subject} · ${json.id}`);
  }
}

main();
