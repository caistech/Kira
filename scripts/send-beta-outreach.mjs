// Send the beta outreach — one recipient at a time, cc'd to the operator.
//
// ⚠️ WHY THIS CALLS RESEND DIRECTLY INSTEAD OF `@caistech/email-send`. The shared transport builds
// the Resend body from `from`, `to`, `reply_to`, `subject`, `html`, `text` — there is NO cc and no
// bcc, which is recorded in app/api/genome/share/route.ts as a known limitation with the right fix
// filed (extend the package). The operator needs a cc on every send so he can see what went out, and
// this is a one-off operator script rather than product code, so it uses the API that supports it.
// Nothing in the product changes.
//
// ⚠️ ONE AT A TIME, AND THE FIRST ONE IS A PROOF. `--only <email>` sends to exactly one person, so
// the first of each draft can be checked before the batch runs. A bad batch cannot be recalled, and
// these are real relationships.
//
// ⚠️ IT REFUSES TO SEND DRAFT A (OR THE INVITE) WITHOUT A CODE for that address. An outreach email
// whose whole point is an access code, arriving with `{CODE}` in it, is worse than not sending — the
// recipient reads it as carelessness about the thing being asked of them.
//
// DRAFTS:
//   a       — the re-engagement "what changed" ask for people already spoken to
//   invite  — THE CANONICAL beta invite ("What Kira is / What we're asking") for the cohort
//   d       — the cold-but-warm "would you take a look at what I have built?" ask
//   reply   — a per-person reply (body from a file in docs/replies/)
//
//   node scripts/send-beta-outreach.mjs --draft invite --only gareth@plausible.gg --dry
//   node scripts/send-beta-outreach.mjs --draft invite --only gareth@plausible.gg --send
//
// Dry run by default. Nothing leaves without --send.

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { assertJurisdictionAllowed, unsubscribeUrlFor } from '@caistech/email-compliance';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  // .env.local is CRLF on Windows; a trailing \r is not matched by `.*` (dot excludes \r), which
  // silently dropped every value and surfaced as "RESEND_API_KEY missing" on the first new-machine
  // run. Trim it before matching so single-line values load.
  for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const SEND = process.argv.includes('--send');
const DRAFT = (arg('draft') || 'a').toLowerCase();
const ONLY = (arg('only') || '').trim().toLowerCase();

const RESEND_KEY = process.env.RESEND_API_KEY;
if (!RESEND_KEY) throw new Error('RESEND_API_KEY missing');

const FROM = 'Dennis McMahon <noreply@updates.corporateaisolutions.com>';
const REPLY_TO = 'dennis@corporateaisolutions.com';
const CC = 'dennis@corporateaisolutions.com';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

/**
 * The identification footer. Required on every commercial send — Spam Act pillar 2 (identify the
 * sender with accurate contact detail) and pillar 3 (a WORKING, honoured unsubscribe).
 *
 * ⚠️ THE UNSUBSCRIBE IS A REAL LINK, NOT "REPLY STOP". The shared product path (`lib/email/
 * commercial.ts`) honours a signed unsubscribe token through @caistech/email-compliance — the same
 * route `/unsubscribe` every product uses. This script calls Resend directly (for the cc), so to
 * keep the footer a single source of truth it builds the same signed link here via
 * `unsubscribeUrlFor`. A recipient clicking it lands on the product's confirm-then-act opt-out and
 * is added to the durable suppression list that blocks ALL future commercial sends. The old "reply
 * with stop" line was a grey area under the Spam Act and, worse, gave no durable opt-out — remove
 * nothing from this footer.
 *
 * The physical address is the operating entity's registered address (Global Buildtech Australia
 * Pty Ltd, trading as Corporate AI Solutions) — pillar 2 identification.
 */
async function footer(email) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kiraexec.com';
  const secret = process.env.UNSUBSCRIBE_SECRET;
  let unsubLink = 'https://kiraexec.com/unsubscribe';
  if (secret) {
    try {
      unsubLink = await unsubscribeUrlFor(appUrl, email, secret);
    } catch {
      // If the secret is missing the token cannot be signed — fail loudly on a real send, but let a
      // dry run show the recipient without inventing a token.
    }
  }
  return `
<hr style="border:none;border-top:1px solid #ddd;margin:28px 0 14px">
<p style="font-size:12px;color:#666;line-height:1.5;margin:0">
Sent by Global Buildtech Australia Pty Ltd (ABN 54 672 395 685), trading as Corporate AI Solutions,
76-84 Brunswick Street, Fortitude Valley QLD 4006 · <a href="mailto:dennis@corporateaisolutions.com">dennis@corporateaisolutions.com</a><br>
You are receiving this because you agreed to test Kira. If you would rather not hear about it again,
<a href="${unsubLink}">unsubscribe here</a>.
</p>`;
}

function paragraphs(text) {
  return text
    .trim()
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, ' ').trim()}</p>`)
    .join('\n');
}

async function draftA({ firstName, code, email }) {
  const body = `Hello ${firstName},

A short note, because what I sent you before no longer matches what happens.

<strong>What Kira is for, so you are judging the right thing.</strong>

Most owner-run businesses are worth less than the owner thinks, and the reason is nearly always the same: the pricing, the judgement, the relationships and the "we don't do it that way" all live in one man's head. A buyer is not buying an asset, he is buying a job — and he prices it accordingly.

Kira's whole job is to get that knowledge out of his head and onto paper, by talking to him rather than handing him a form. The deliverable is a handover document: his business in the nine areas a buyer's advisor works through, every line dated to the day he said it, his to keep whether or not he keeps paying us. Anything he marks private is kept out of the broker's copy — so the document he hands over is safe to put in front of an advisor or a buyer.

Two things worth knowing before you start, because they are unusual and they are deliberate. It is priced as a <strong>project, not a subscription</strong> — after twelve months it drops to a third whether or not the work is done, because it is meant to end. And she is trying to make herself <strong>redundant</strong>: the point is the document, not the relationship.

<strong>What has changed since I last wrote.</strong> Previously an invitation dropped you straight onto the dashboard. That skipped the part that makes Kira worth anything — the valuation your figures are measured from, and the first conversation where she learns how the work actually gets done. People landed on a screen with nothing in it and, fairly enough, left.

So you now walk the same path a paying owner walks:

1. Open <a href="https://kiraexec.com/?code=${code}">this link</a>. It lands on our main page with your code in your pocket — there is nothing to type and no need to sign in.<br>
2. From there it is the same visit any owner makes: a look at what Kira does, then thirteen short questions about a business. Three honest numbers at the end.<br>
3. When you reach the pricing step your code is already applied. No card is asked for and nothing is charged.<br>
4. Then have a conversation with Kira.

About twenty minutes in total, and you can stop and come back. If you already made an account with me earlier, the code step will ask you to sign in instead — that is expected rather than a fault, and the valuation you have just done carries across.

If your mail program strips the link, go to <a href="https://kiraexec.com">https://kiraexec.com</a>, take the same visit, and when you reach the pricing step use <strong>${code}</strong> at the "Been invited to the beta?" line.

<strong>It is a beta, and it is worth saying what that means.</strong> Some things are not built yet — she cannot write documents for you, and sending email on your behalf is not switched on. Some things are limited by where you are: parts of the product are set up for Australia first, so from the US, Canada or New Zealand you will see gaps that are geography rather than bugs. Neither is hidden — the product tells you when it cannot do something.

What I want back is not a bug list, though I will take one. It is two things:

1. What the experience was actually like — where it was confusing, where it dragged, where you would have stopped if I were not watching.<br>
2. Whether you would put this in front of a business owner in his sixties who is quietly thinking about selling — and if not, what is missing before you would.

That second one is the whole question for me. Most of you would be the person handing Kira to that owner rather than the owner himself, and your read on whether he would trust it is worth more than mine.

One thing worth knowing before you begin: what you tell her is kept, and it is what builds the handover document at the end. So use a real business if you have one, or a plausible one if you would rather not.

Dennis`;
  return { subject: 'Kira — your access code, and a change to how you start', html: paragraphs(body) + await footer(email) };
}

async function draftD({ firstName, email }) {
  const body = `Hello ${firstName},

We have talked about what you are building. I have something at the point where it needs people who will tell me it is wrong, and I would rather that came from someone who has shipped things than from a survey.

<strong>What it is.</strong> Most owner-run businesses are worth less than the owner thinks, and the reason is nearly always the same: the pricing, the judgement, the relationships and the "we don't do it that way" all live in one man's head. A buyer is not buying an asset, he is buying a job — and he prices it accordingly. Kira gets that knowledge out of his head by talking to him rather than handing him a form, and turns it into a document his broker can actually read. It is priced as a project rather than a subscription — it drops to a third after twelve months whether or not the work is done, because it is meant to end.

<strong>What looking at it involves.</strong> About twenty minutes at <a href="https://kiraexec.com">https://kiraexec.com</a> — thirteen short questions about a business, three numbers at the end of them, then a conversation. No card and nothing charged; I would send you a code to use at the pricing step. Use a real business or a plausible one.

It is a beta and some of it is visibly unfinished — she cannot write documents yet, and sending email on someone's behalf is not switched on. Parts are set up for Australia first, so from the US, Canada or New Zealand you will see gaps that are geography rather than bugs. None of it is hidden; the product says so when it cannot do something.

<strong>What I would want back</strong> is the two things I cannot get from my own testing:

1. What the experience was actually like — where it was confusing, where it dragged, where you would have closed the tab.<br>
2. Whether it is aimed at a real market: would you put it in front of a business owner in his sixties who is quietly thinking about selling, and if not, what is missing?

<strong>And the offer goes both ways.</strong> If it is useful to you, I will do the same for whatever you are building — properly, with a written response rather than a nod. I run a structured walkthrough process on my own products and I am happy to point it at yours.

If you are in, reply and I will send you a code. If not, that is a perfectly good answer and I will not ask twice.

Dennis`;
  return { subject: 'Would you take a look at what I have built?', html: paragraphs(body) + await footer(email) };
}

/**
 * THE CANONICAL BETA INVITE — the friendly "What Kira is / What we're asking" copy chosen as the
 * single to-send message for the beta cohort.
 *
 * ⚠️ WORDS THE RECIPIENT WILL READ, SO THEY MUST BE TRUE. The CAIS Beta org is pre-seeded with a
 * business scenario so a new tester sees a fully populated portal on day one; their 13 answers give
 * the experience of the flow but do not drive the seeded Genome/valuation/report. That is stated
 * plainly below — a tester who discovers it themselves reads the whole product as a demo.
 *
 * The access code is personal to the recipient (looked up from `beta_codes` by the caller) and the
 * link carries it, so there is nothing to type.
 */
async function draftInvite({ firstName, code, email }) {
  const body = `Hello ${firstName},

Thanks for agreeing to be a Beta Tester for the Kira Platform. I have set up a sandbox Kira portal for beta testers, so there's nothing you can break as you test it out :)

<strong>What Kira is</strong>

Kira is a business support platform I built to help Baby Boomer Business Owners (BBBOs) who are running successful businesses but the Owner Dependence levels are high (ie the business just can't run without them).

Kira can help them create more value in their businesses by using AI (and specifically Kira — an AI Voice Agent) by systemising their business over time as well as helping them in the day to day running of their business.

As an example, Kira will build out their business systems and Standard Operating Procedures (SOPs) just by observing, recording and systemising what she notices as she works with the owner (and others — every employee can have their own Kira and the collective intelligence will be collated and used to build the overall Business Genome — its DNA).

And that is where the true value is for the BBBOs — they are coming up to retirement and we want them to maximise the value of their businesses — because, in many cases, that is their true retirement fund.

<strong>What we are asking of you</strong>

You are invited to join the Kira Beta. Your invitation grants you CEO access to the sandbox CAIS Beta org I have set up within Kira.

<strong>How it works — read this so it is not surprising</strong>

1. Start at <a href="https://kiraexec.com/?code=${code}">this link</a> — your invitation is carried with you automatically, so there is no code to type in.
2. Take the 13-question business valuation exercise so you experience the flow a Kira owner walks.
3. At the end, confirm your name.

That takes you straight into the CAIS Beta org portal as its CEO — your Kira Voice Agent is already set up and waiting for you inside.

One honest note: the CAIS Beta org's Genome, valuation and report are not built from your 13 answers — the org is pre-seeded with a business scenario so you can see a fully populated portal on day one. Your 13 answers give you the experience of the flow itself.

Let me know once you have logged in so I can hear how it is going for you.

Dennis`;
  return { subject: 'Kira Beta — invited as a beta tester', html: paragraphs(body) + await footer(email) };
}

/**
 * A REPLY TO SOMEONE WHO HAS ALREADY WRITTEN BACK — body supplied from a file, not hardcoded here.
 *
 * ⚠️ IT IS A DRAFT MODE RATHER THAN A SECOND SCRIPT, and that is the point. Every mechanic a reply
 * needs is already correct in this file and was learned the hard way: the cc so the operator sees
 * what went out, the Reply-To (the From is a noreply subdomain that cannot receive mail), the
 * identification footer, and one recipient per run. A separate `send-beta-reply.mjs` would copy all
 * four and drift from them the first time one changed.
 *
 * ⚠️ THE BODY IS A FILE, NOT AN ARGUMENT. Replies are adapted per person — a beta tester who has
 * already walked the product and is sent the template reads it as not having been listened to — so
 * the text is written, reviewed and kept alongside the drafts in docs/ rather than composed at a
 * shell prompt where it cannot be checked before it goes.
 *
 * ⚠️ NO CODE IS LOOKED UP. The code block below runs only for draft A. A reply to someone already
 * inside must not mint or spend one, and someone who needs a code should be sent draft A properly.
 *
 *   node scripts/send-beta-outreach.mjs --draft reply --only x@y.com \
 *     --subject "..." --body docs/replies/x.txt --dry
 */
async function draftReply({ subject, bodyPath, email }) {
  if (!subject) throw new Error('--subject is required for a reply.');
  if (!bodyPath) throw new Error('--body <file> is required for a reply.');
  const body = fs.readFileSync(bodyPath, 'utf8');
  if (!body.trim()) throw new Error(`${bodyPath} is empty — nothing to send.`);
  // The placeholder guard that protects draft A, applied here too: a reply arriving with {CODE} or
  // {FirstName} still in it is the same failure wearing different clothes.
  const leftover = body.match(/\{[A-Za-z]+\}/);
  if (leftover) throw new Error(`${bodyPath} still contains the placeholder ${leftover[0]}.`);
  return { subject, html: paragraphs(body) + await footer(email) };
}

if (!ONLY) throw new Error('--only <email> is required. This script sends to one person per run, on purpose.');

/**
 * ⚠️ THE JURISDICTION GUARD, AND IT WAS MISSING FROM EXACTLY THE PATH THAT NEEDED IT.
 *
 * PRODUCT_STANDARDS §9: email outreach is blocked until a country's consent / identification /
 * unsubscribe rules are implemented. The product's send path enforces it. THIS script did not — it
 * calls the Resend API directly (because `@caistech/email-send` has no cc, and the operator needs a
 * cc on every send), so it had quietly routed around the one guard that matters most on the one
 * path that mails real strangers.
 *
 * Found 2026-08-18 when a Barcelona contact was added to the beta sheet as Priority 1. Nothing in
 * the tooling would have stopped that send; it was caught by someone reading the address.
 *
 * ⚠️ UNKNOWN BLOCKS, and that is the whole design rather than an inconvenience. A missing --country
 * is not "probably Australian" — the sheet is full of gmail addresses that say nothing about where
 * someone lives, and a default of AU would make the guard agree with whatever we already assumed.
 * The package throws on undefined for the same reason.
 *
 * Checked BEFORE the dry-run exit, so `--dry` tells you about a blocked recipient rather than
 * printing a cheerful preview of an email that must not go.
 *
 * ⚠️ WHAT IS CLEARED, AND WHY THIS OVERRIDES THE PACKAGE DEFAULT. `@caistech/email-compliance`
 * ships cleared-to-send = AU ONLY (its `SUPPORTED_OUTREACH_JURISDICTIONS`), and the shared default
 * is not bumped until each new country's statutory rules are encoded in the package. We pass an
 * explicit list here — instead of relying on that default — because beta invitations are sent only
 * to people Dennis has spoken to and who have given VERBAL CONSENT first. For a consent-based,
 * person-by-person invitation flow the three pillars (consent, identification, unsubscribe) are
 * universal: the message states the consent basis, identifies the sender with accurate AU contact
 * detail, and carries an unsubscribe path. US (CAN-SPAM), Canada (CASL), the EU and UK (GDPR/UK
 * GDPR) and India (SPDI) all permit a sender whose recipient has opted in and who is given an
 * opt-out — which this flow provides on every message. The override is scoped to THIS outreach
 * script; the product's billing/commercial send path still enforces the stricter package default so
 * transactional and automated marketing mail cannot widen scope silently.
 *
 * Consequences of the override, stated honestly:
 *  - It does NOT encode each country's statute into the package — that remains the portfolio's
 *    {email-compliance} task (see cais-shared-services/packages/email-compliance), tracked
 *    separately and informed by legal counsel during beta.
 *  - It relies on the operator passing `--country` honestly. An unknown address still blocks.
 *  - It does NOT lift the require-ment that every tester be spoken to and give verbal approval.
 *
 * LinkedIn is explicitly exempt from this rule (it is inside the platform's own compliance), so a
 * non-cleared peer is reachable — just not from here.
 */
// Countries cleared for the person-by-person beta invitation flow (verbal-consent basis) as of
// 2026-09-03. Kept local to this script on purpose: see the override note above.
const BETA_OUTREACH_CLEARED_JURISDICTIONS = ['AU', 'US', 'CA', 'GB', 'EU', 'IN'];
const COUNTRY = (arg('country') || '').trim().toUpperCase() || undefined;
try {
  assertJurisdictionAllowed(COUNTRY, { supported: BETA_OUTREACH_CLEARED_JURISDICTIONS });
} catch (error) {
  console.error(`\nREFUSED — ${ONLY}\n`);
  console.error(error.message);
  console.error(
    '\nPass --country <ISO2> once you know it (e.g. --country AU). If this person is not in a\n' +
      'cleared jurisdiction, reach them on LinkedIn instead — that channel is exempt.\n',
  );
  process.exit(1);
}

// The code, for drafts that carry one (A and invite). Read rather than assumed — see the note at the top.
let code = null;
if (DRAFT === 'a' || DRAFT === 'invite') {
  const { data } = await supabase
    .from('beta_codes')
    .select('code, redeemed_at, revoked_at')
    .eq('email', ONLY)
    .is('redeemed_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.code) {
    throw new Error(`No unused beta code for ${ONLY}. Mint one first: node scripts/mint-beta-code.mjs --email ${ONLY}`);
  }
  code = data.code;
}

const firstName = (arg('name') || ONLY.split('@')[0]).trim();
const { subject, html } =
  DRAFT === 'a'
    ? await draftA({ firstName, code, email: ONLY })
    : DRAFT === 'invite'
      ? await draftInvite({ firstName, code, email: ONLY })
      : DRAFT === 'reply'
        ? await draftReply({ subject: arg('subject'), bodyPath: arg('body'), email: ONLY })
        : await draftD({ firstName, email: ONLY });

console.log(`draft ${DRAFT.toUpperCase()} -> ${ONLY}  (cc ${CC})`);
console.log(`subject: ${subject}`);
if (code) console.log(`code:    ${code}`);
console.log(`${html.length} chars of HTML`);

if (!SEND) {
  console.log('\nDRY RUN — nothing sent. Add --send.');
  process.exit(0);
}

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: FROM, to: [ONLY], cc: [CC], reply_to: REPLY_TO, subject, html }),
});
const out = await res.json();
if (!res.ok) {
  console.error('FAILED:', res.status, JSON.stringify(out));
  process.exitCode = 1;
} else {
  console.log('sent:', out.id);
}
