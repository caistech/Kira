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
    subject: 'Shani — the link I promised, and Kira from the consultant\'s side',
    opening: `Hello Shani,

In August I said I'd write when the entry path was fixed, and send a link that does the work rather than an instruction that asks you to. This is that link.

Since then: the invitation carries the code itself, so there is nothing to type and no promo box anywhere; Kira is on the pages where you actually work rather than behind a link; and as of today what you type and what you say are one memory, and she no longer asks "are you still there?" every few seconds while you go and find something.

This time I'd like you to come in as a consultant rather than a tester — the person who'd bring Kira to their own clients. That's the side of the product I most need a sharp, outside view on.`,
    closing: `We can pick up the development side on our call — this is about the product as it stands.

Thank you, Shani. Your August note changed the product for everyone who came after you.`,
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
  },
  {
    email: 'darshilp.softrefine@gmail.com',
    firstName: 'Darshil',
    code: 'L6DBHB4H9RWF',
    subject: 'Darshil — Kira has changed a lot since you last saw it',
    opening: `Hello Darshil,

You saw an earlier version of Kira, so this isn't a first-time beta invitation. It's been substantially rebuilt since then, and I'd value your view of where it has landed.

This time I'd like you to come in as a consultant rather than a tester — the person who'd bring Kira to their own clients. Kira now starts by learning the consultant's own practice, and that's the side I most need an outside view on.

Your login from last time still works, and it now opens straight into your own consultant portal. The link below signs you in; if it ever asks for a password you've forgotten, "Email me a magic link" on the login page is quicker than resetting it.`,
    closing: `Thank you, Darshil — I'd genuinely rather hear the uncomfortable version than a polite one.`,
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

async function footer(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  let unsubscribeLink = 'https://kiraexec.com/unsubscribe [UNSIGNED — secret missing]';
  if (secret) unsubscribeLink = await unsubscribeUrlFor(APP_URL, email, secret);
  else if (SEND) throw new Error('UNSUBSCRIBE_SECRET is not set — the unsubscribe link cannot be signed for a real send.');
  return `
<hr style="border:none;border-top:1px solid #ddd;margin:28px 0 14px">
<p style="font-size:12px;color:#666;line-height:1.5;margin:0">
Sent by Global Buildtech Australia Pty Ltd (ABN 54 672 395 685), trading as Corporate AI Solutions,
76-84 Brunswick Street, Fortitude Valley QLD 4006 · <a href="mailto:dennis@corporateaisolutions.com">dennis@corporateaisolutions.com</a><br>
You are receiving this because you took part in an earlier Kira beta and are being invited to the Kira
Founding Consultant Beta. If you would rather not hear about it again, <a href="${unsubscribeLink}">unsubscribe here</a>.
</p>`;
}

function bodyFor(recipient) {
  const link = `${APP_URL}/plan?code=${recipient.code}`;
  return `${recipient.opening}

${WHAT_TO_DO}

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
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333">${paragraphs(bodyFor(recipient))}${await footer(recipient.email)}</div>`;

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
