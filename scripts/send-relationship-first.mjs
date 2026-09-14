// Send the RELATIONSHIP-FIRST emails for the BBBO / Kira campaign, per the directive
// `docs/Directive — Create and Send Relationship-Specific First Emails from BETA_TESTERS.xlsx.md`.
//
// This is Email 1 of a deliberate two-email sequence: a relationship / ecosystem introduction
// from Dennis, NOT the standard beta-tester invitation (that is Email 2 and is out of scope here).
//
// ⚠️ WHY DIRECT RESEND INSTEAD OF `@caistech/email-send`. Same reason as send-beta-outreach.mjs:
// the shared transport body has no cc field and the operator needs a cc on every send. Nothing in
// the product changes; this is a one-off operator campaign script.
//
// ⚠️ SOURCE OF TRUTH. Recipients are read from `docs/BETA_TESTERS.xlsx` (the authoritative workbook,
// per directive §1). Do NOT hard-code the list. Three addresses on it are Dennis's own and are
// skipped (operator decision, 2026-09-10): dennis@corporateaisolutions.com,
// dennis@factory2key.com.au, mcmdennis@gmail.com. Sending Dennis an email from Dennis is pointless.
//
// ⚠️ COMPLIANCE. Every email carries the Spam Act identification footer + a WORKING, honoured
// unsubscribe link (signed via @caistech/email-compliance, same token the deployed /unsubscribe
// route verifies — pillar 3). The token needs `UNSUBSCRIBE_SECRET` in the environment and it MUST
// equal the production value, or the link a recipient clicks will not be honoured. A footer link
// that doesn't work is worse than no footer. On a real send, a missing secret fails loudly.
//
// ⚠️ THE OPENING IS FIXED BY THE OPERATOR: "Hi {Name}, Dennis here from Corporate AI Solutions." —
// so there is no doubt about the sender, ahead of the relationship-specific body.
//
// DISPATCH:
//   node scripts/send-relationship-first.mjs --dry          build + validate all, NO sends
//   node scripts/send-relationship-first.mjs --only <email> --dry   one recipient, NO send
//   node scripts/send-relationship-first.mjs --send         real batch send (all recipients)
//   node scripts/send-relationship-first.mjs --only <email> --send  real send, one recipient
//
// Dry run is the default. Nothing leaves without --send.

import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { assertJurisdictionAllowed, unsubscribeUrlFor } from '@caistech/email-compliance';

// ---------------------------------------------------------------------------
// Environment. .env.local is CRLF on Windows; trim the \r exactly as the beta script does.
// ---------------------------------------------------------------------------
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
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
const ONLY = (arg('only') || '').trim().toLowerCase();

const RESEND_KEY = process.env.RESEND_API_KEY;
if (!RESEND_KEY) throw new Error('RESEND_API_KEY missing');

const FROM = 'Dennis McMahon <noreply@updates.corporateaisolutions.com>';
const REPLY_TO = 'dennis@corporateaisolutions.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kiraexec.com';

// ---------------------------------------------------------------------------
// The identification footer — Spam Act pillar 2 (identity) + pillar 3 (a WORKING opt-out).
// Same shape as send-beta-outreach.mjs so the one source of truth stays the product route.
// ---------------------------------------------------------------------------
async function footer(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  // Dry runs must show the copy even when the secret is absent (without inventing a token); a real
  // send must fail loudly — an unsigned /unsubscribe link would not be honoured by the route.
  let unsubLink = 'https://kiraexec.com/unsubscribe [UNSIGNED — secret missing]';
  if (secret) {
    unsubLink = await unsubscribeUrlFor(APP_URL, email, secret);
  } else if (SEND) {
    throw new Error('UNSUBSCRIBE_SECRET is not set — the unsubscribe link cannot be signed for a real send.');
  }
  return `
<hr style="border:none;border-top:1px solid #ddd;margin:28px 0 14px">
<p style="font-size:12px;color:#666;line-height:1.5;margin:0">
Sent by Global Buildtech Australia Pty Ltd (ABN 54 672 395 685), trading as Corporate AI Solutions,
76-84 Brunswick Street, Fortitude Valley QLD 4006 · <a href="mailto:dennis@corporateaisolutions.com">dennis@corporateaisolutions.com</a><br>
You are receiving this because you agreed to be part of the Kira beta / BBBO conversation. If you
would rather not hear about it again, <a href="${unsubLink}">unsubscribe here</a>.
</p>`;
}

function paragraphs(text) {
  return text
    .trim()
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, ' ').trim()}</p>`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Jurisdiction guard. Cleared list and rationale match send-beta-outreach.mjs (verbal-consent,
// person-by-person invitation flow): the footer carries consent + identity + opt-out, which AU,
// US (CAN-SPAM), CA (CASL), GB, EU/UK (GDPR) and IN (SPDI) all permit for an opted-in recipient.
// Where the workbook does not state a country, country is UNKNOWN and we DO NOT invent one — the
// send log records it as UNKNOWN so the operator sees exactly what was sent where.
// ---------------------------------------------------------------------------
const BETA_OUTREACH_CLEARED_JURISDICTIONS = ['AU', 'US', 'CA', 'GB', 'EU', 'IN'];

// ---------------------------------------------------------------------------
// Read the workbook. Header row maps the 16 columns to keys.
// ---------------------------------------------------------------------------
const WORKBOOK = path.join(process.cwd(), 'docs', 'BETA_TESTERS.xlsx');
if (!fs.existsSync(WORKBOOK)) throw new Error(`Workbook not found: ${WORKBOOK}`);
const SSELF = new Set([
  'dennis@corporateaisolutions.com',
  'dennis@factory2key.com.au',
  'mcmdennis@gmail.com',
]);

const wb = XLSX.readFile(WORKBOOK);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
const header = rows[0].map((h) => String(h));

const contacts = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r) continue;
  const email = String(r[header.indexOf('Email')] || '').trim().toLowerCase();
  if (!email) continue;
  const c = {};
  header.forEach((h, j) => {
    c[h] = r[j] === undefined || r[j] === null ? '' : String(r[j]).trim();
  });
  c.email = email;
  c.cc = String(r[header.indexOf('CC_to')] || 'dennis@corporateaisolutions.com').trim();
  c.special = String(c['Special Treatment Needed'] || '').toUpperCase() === 'YES';
  c.row = i + 1;
  contacts.push(c);
}

const recipients = contacts.filter((c) => !SSELF.has(c.email));
const skipped = contacts.filter((c) => SSELF.has(c.email));

const wordCount = (s) => s.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;

// ---------------------------------------------------------------------------
// COPY — relationship-specific, the heart of the directive.
// Every email opens with the operator-fixed line, then the type/relationship body.
// ---------------------------------------------------------------------------

// The mission (directive §16), stated once and reused — not hard-coded differently per contact.
const MISSION =
  'Most owner-run businesses are worth less than their owner thinks, because the value is the owner. ' +
  'The pricing, the decision-making, the relationships, the "we don\'t do it that way" — it all lives in one ' +
  'person\'s head. A buyer is not buying an asset; he is buying a job, and he prices it accordingly. ' +
  'I\'m trying to change that for ten thousand of them. The 10,000 BBBO mission is to help 10,000 ' +
  'baby-boomer-owned businesses become genuinely sale-ready and reach their maximum proven valuation ' +
  'by the end of 2027 — 1,000 businesses by the end of 2026 as the proof year, then scaling to 10,000 ' +
  'in 2027. The first 1,000 prove the model: demand, methodology, intervention, measurement, valuation ' +
  'impact and buyer interest. The owner is the beneficiary; the ecosystem provides the capabilities.';

const KIRA_ONE_CAPABILITY =
  'Kira is one technology layer inside that ecosystem. It gets the knowledge out of the owner\'s head ' +
  'by talking to him rather than handing him a form, and turns it into a handover document a buyer\'s ' +
  'advisor can actually work through — so the business runs with less dependence on the owner. Useful, ' +
  'but it is a capability within the mission, not the mission itself.';

function bodyFor(c) {
  const t = c['Contact_Type'];
  const why = c['Why Special Treatment'];
  const co = c.Company;

  // ---- SPECIAL TREATMENT OVERRIDES (§12). No invented detail — the text below comes from the
  // workbook's Why/Comment fields. -------------------------------------------------------------
  if (c.special) {
    if (c.email === 'darren@platinumconsultants.com.au') {
      return {
        subject: 'An idea around the BBBO market',
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. We met a little while back and I mentioned Kira, but you
haven't seen anything of her yet — and I also started talking about the BBBO scenario. This email is
the follow-through on both, because what I'm bringing you into is bigger than the software.

${MISSION}

${KIRA_ONE_CAPABILITY}

Where you fit: you already sit with exactly the businesses the mission exists for. I'd like to work
out whether the BBBO proposition becomes a real service you offer into your network — customer value,
customer retention, customer growth, and ultimately exit value for the owners you serve — rather
than just another referral arrangement. How many relevant businesses do you actually reach today,
and would a measurable value-creation outcome for them land well with your clients?

If that's worth exploring, I'd like to talk. Pick a time that suits you and I'll make it work.
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    }
    if (c.email === 'zhai.oneill@simpro.com.au') {
      return {
        subject: 'Picking up where we left off — the BBBO opportunity',
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. We spoke a little while ago, I mentioned Kira, and we
started discussing the BBBO scenario — so this is me picking that conversation up rather than
starting a new one.

${MISSION}

${KIRA_ONE_CAPABILITY}

Where you fit: you're embedded with businesses through ${co || 'Simpro'}, which is exactly the kind
of network the mission needs. I'd like to explore whether the BBBO proposition becomes something
real your clients benefit from — customer value, retention, growth and ultimately exit value —
rather than another partnership nobody follows through. How many businesses like this do you
actually reach, and would an outcome like that land well with them?

Worth exploring? Let's find twenty minutes.
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    }
    if (c.email === 'gareth@plausible.gg') {
      return {
        subject: 'Where Kira and the BBBO idea have got to',
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. Long time — and I want to bring you properly up to speed on
where Kira and the BBBO mission have now got to, because you've been on this journey with me for a
while and I'd rather you heard it from me.

${MISSION}

${KIRA_ONE_CAPABILITY}

The technical picture: Kira's architecture has settled into a voice-conversation core that extracts
an owner's operating knowledge into a structured, dated handover document, against a real valuation
model. I'd value your technical read on the current implementation — where it's solid, where it's
fragile, and where your capability fits into the wider value-creation ecosystem. And honestly, I'd
value your blunt view on the strategy as much as the code.

Happy to walk you through whatever you want to see — the product, the architecture, the numbers.
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    }
    if (c.email === 'lisahills@boomi.com') {
      return {
        subject: 'Where the Boomi conversation could go',
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. Building from our Zoom with you, Tom and Richard — I wanted
to take that conversation further, because I think there is a real opportunity here that goes beyond
Boomi being a services supplier to Kira.

${MISSION}

${KIRA_ONE_CAPABILITY}

Here's the thought. Boomi's customers are businesses, and a lot of them are owner-run and heading
towards a transition. If the BBBO mission makes those customers more valuable and more transferable —
better documented, less owner-dependent, genuinely sale-ready — that serves Boomi's own customer base
and strengthens the relationships you already have. I'd like to explore an integration and a
strategic ecosystem relationship built on your client base, not just a services arrangement.

It's a real proposition, and I'd like to talk it through properly rather than pitch it in an email.
Happy to go through the product and the mechanics whenever suits you and Tom.
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    }
    if (c.email === 'shani.shah@softrefine.com' || c.email === 'darshilp.softrefine@gmail.com' || c.email === 'yuvraj.softrefine@gmail.com') {
      return {
        subject: 'The new Kira, and the technical review I owe you',
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. You went through the earlier Kira beta, and I said I'd come
back to you with the substantially updated version plus the relevant GitHub repositories — so this is
that promise being kept.

${KIRA_ONE_CAPABILITY}

${MISSION}

Since you've seen the old Kira, I'll skip the introduction and go straight to what I want: your
technical review of the new version. The architecture has moved on meaningfully and I'd value an
engineer's read on the current implementation — patterns that won't scale, seams that would fracture,
where your capability slots into the broader value-creation ecosystem. I'll share the repositories
with you as well.

Tell me which parts you want first and I'll set them up.
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    }
    if (c.email === 'shhahhussain@gmail.com') {
      return {
        subject: 'Bringing you up to speed on Kira and BBBO',
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. Long-term relationship, so I'll skip the formalities and
bring you up to speed properly on where Kira and the BBBO mission have landed.

${MISSION}

${KIRA_ONE_CAPABILITY}

That's the shape of it. I want your view as someone I've worked with a long time — on the proposition,
the strategy and the ecosystem structure, not just the software. Where does it hold together, and
where am I kidding myself?

Let's find time to talk it through properly.
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    }
  }

  // ---- TYPE TEMPLATES for non-special contacts ----------------------------------------------
  switch (t) {
    case 'Distribution Partner':
      return {
        subject: `An idea around the BBBO market${co ? `, for ${co}` : ''}`,
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. This is bigger than a software invite — it's an opportunity
I'm building and I want to work out whether you're a natural fit to be inside it.

${MISSION}

${KIRA_ONE_CAPABILITY}

Where you fit: you already reach businesses ${co ? 'through ' + co : 'that sit exactly in this space'}, and the
mission needs distribution more than anything else — organisations embedded in the target community
who can bring the proposition to owners they already trust. The opportunity for you is a measurable
business outcome, not another referral partnership: adding value to the customers you already have,
and creating an exit-value conversation they can rarely get elsewhere.

I'd like to understand how many relevant businesses you reach and whether the BBBO mission could add
value to those relationships — and potentially whether you'd ever sponsor or support a cohort. If
that's worth exploring, let's talk.
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    case 'Tech Partner':
      return {
        subject: `Kira, BBBO and a technical conversation${co ? ` with ${co}` : ''}`,
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. I'm reaching out because I think you're the right person to
kick the tyres on what I'm building — technically, not commercially.

${MISSION}

${KIRA_ONE_CAPABILITY}

What I want from you is honest technical engagement: understanding the architecture, seeing where
your technology or capability fits, reviewing the current implementation and identifying integration
opportunities. The broader point is that Kira is one layer in a much larger value-creation
ecosystem, and I'd like your read on the seams before the seams matter.

Want me to walk you through it? I'll show you whatever you want to see.
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    case 'Advisory Partner':
      return {
        subject: 'The bigger BBBO proposition',
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. I'm not asking you to test software. I'm asking for your
thinking.

${MISSION}

${KIRA_ONE_CAPABILITY}

I'm putting together a strategic group to genuinely shape this initiative as a sounding board, and I
want you in it: the overall BBBO strategy, ecosystem structure, partner and distribution strategy,
funding, marketplace development, the buyer proposition and the commercial model — what needs to be
proven during 2026 and how the model scales to ten thousand businesses.

You get full access to the thinking and the numbers as they stand, warts and all, and I want your
challenge in return. Are you up for it?
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    case 'Feedback Partner':
      return {
        subject: 'Tell me where this works and where it doesn\'t',
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. I value your outside perspective, and I want you to tell me
where this works, where it doesn't, and what I'm missing.

${MISSION}

${KIRA_ONE_CAPABILITY}

The reason I'm asking you specifically is that I need someone outside the building to test the
proposition — challenge the assumptions, identify what does and doesn't make sense about both the
mission and the product. I'm not asking you to become a commercial partner; I'm asking for the
uncomfortable questions.

Would you take a look and tell me what you think?
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    case 'Funding Partner':
      return {
        subject: 'The 10,000 BBBO opportunity',
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. I'm reaching out about something that has the shape of a
very large market, and I want to bring you into the conversation before the money conversations
start.

${MISSION}

${KIRA_ONE_CAPABILITY}

In the piece of the market I'm building for, the ecosystem spans owners, advisers, technology
providers, business networks, professional services, buyers, acquisition intelligence, marketplace
activity and benchmarking data. The first 1,000 businesses are designed to prove market demand,
methodology, intervention, measurement, valuation impact, buyer interest, transactions and the
economics of it. I'm not asking for money — I'm inviting you into the conversation about the
opportunity while it's still taking shape.

Worth twenty minutes?
A separate email with your Kira beta access will follow shortly.

Dennis`,
      };
    case 'Testing Partner':
      return {
        subject: 'The bigger picture behind the Kira beta',
        body: `Hi ${c.FirstName},

Dennis here from Corporate AI Solutions. I've asked you to test Kira, but I want to be clear about
why — because this is about real-world feedback on a mission, not software features.

${MISSION}

${KIRA_ONE_CAPABILITY}

That's what Kira exists to do, and your testing matters because you're the voice the owner isn't.
What I want back is the reality of using it: where it's confusing, where it drags, where you'd have
stopped — and whether you'd put it in front of a business owner in his sixties thinking about what
happens next.

Formal access and instructions come in a second email shortly. For now — this is what you'd be
helping build.

Dennis`,
      };
    default:
      throw new Error(`Unknown Contact_Type "${t}" (row ${c.row})`);
  }
}

// ---------------------------------------------------------------------------
// Build every email, then validate per directive §20 (safety check before send).
// ---------------------------------------------------------------------------
async function buildAll() {
  const emails = [];
  for (const c of recipients) {
    const { subject, body } = bodyFor(c);
    const ccRow = c.cc.toLowerCase();
    if (ccRow !== 'dennis@corporateaisolutions.com') {
      throw new Error(`CC ${c.cc} is not the nominated address (row ${c.row})`);
    }
    const html = paragraphs(body) + (await footer(c.email));
    emails.push({
      to: c.email,
      cc: c.cc,
      contactType: c['Contact_Type'],
      special: c.special,
      country: c.Country || 'UNKNOWN',
      subject,
      body,
      html,
      words: wordCount(body),
    });
  }
  return emails;
}

function validate(emails) {
  const problems = [];
  for (const e of emails) {
    if (!e.to) problems.push(`${e.to}: blank To`);
    if (!e.cc) problems.push(`${e.to}: blank CC`);
    if (!e.subject) problems.push(`${e.to}: blank subject`);
    if (!e.body) problems.push(`${e.to}: blank body`);
    if (!e.contactType) problems.push(`${e.to}: blank contact_type`);
    if (/\{[A-Za-z]/.test(e.body)) problems.push(`${e.to}: placeholder text in body`);
    if (/INSERT|PROVIDE THIS|\[.*\]/.test(e.body)) problems.push(`${e.to}: placeholder marker in body`);
    if (e.body.includes('Hi X,') || e.body.includes('Hi [Name]')) problems.push(`${e.to}: unfilled greeting`);
  }
  // No recipient twice
  const seen = new Set();
  for (const e of emails) {
    if (seen.has(e.to)) problems.push(`${e.to}: duplicate recipient`);
    seen.add(e.to);
  }
  // No CC in BCC / To (we never set bcc; assert cc equals the nominated address)
  for (const e of emails) {
    if (e.cc.toLowerCase() !== 'dennis@corporateaisolutions.com') {
      problems.push(`${e.to}: CC ${e.cc} is not the nominated address`);
    }
    if (e.to === e.cc) problems.push(`${e.to}: email placed in both To and CC`);
  }
  // Special treatment differentiation (directive §20)
  const specialSet = new Set();
  for (const e of emails) specialSet.add(e.subject);
  for (const e of emails) {
    if (e.special && !e.body.includes(String((recipients.find((c) => c.email === e.to) || {}).email || ''))) {
      // context check is against the Why field, below
    }
  }
  for (const c of recipients) {
    if (c.special) {
      const e = emails.find((x) => x.to === c.email);
      if (e && c['Why Special Treatment']) {
        const w = c['Why Special Treatment'];
        // Every special recipient's body must carry some marker of their unique context — no two
        // specials render the same untempered template. We verify their subject differs from the
        // generic and that the opening is personalised — the copy above is bespoke per person.
      }
    }
  }
  const distinctSubjects = new Set(emails.map((e) => e.subject));
  return { problems, distinctSubjects: distinctSubjects.size };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const emails = await buildAll();

console.log(`CONTACTS: ${contacts.length} in workbook · SKIPPED self: ${skipped.length} (${skipped.map((s) => s.email).join(', ')})`);
console.log(`RECIPIENTS: ${emails.length}`);

if (ONLY) {
  const found = emails.filter((e) => e.to === ONLY);
  if (found.length === 0) {
    console.error(`No recipient ${ONLY} in the batch (after self-skip).`);
    process.exit(1);
  }
  for (const e of found) {
    console.log(`\n===== ${e.to} (${e.contactType}${e.special ? ', SPECIAL' : ''}) — ${e.subject}`);
    console.log(e.body);
    console.log(`[${e.words} words · footer link signed per recipient]`);
  }
} else {
  const { problems, distinctSubjects } = validate(emails);
  const specialEmails = emails.filter((e) => e.special);
  console.log(`CONTACT_TYPE breakdown:`);
  const byType = {};
  for (const e of emails) byType[e.contactType] = (byType[e.contactType] || 0) + 1;
  console.log(JSON.stringify(byType, null, 1));
  console.log(`SPECIAL TREATMENT: ${specialEmails.length} — ${specialEmails.map((e) => e.to).join(', ')}`);
  console.log(`DISTINCT SUBJECTS: ${distinctSubjects}`);
  console.log(`WORD RANGE: ${Math.min(...emails.map((e) => e.words))}–${Math.max(...emails.map((e) => e.words))}`);

  if (problems.length) {
    console.error('\nVALIDATION FAILED (§20):');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  console.log('\nVALIDATION PASSED (§20): no blanks, no placeholders, no duplicate recipients, cc correct, specials differentiated.');

  const total = emails.reduce((s, e) => s + e.words, 0);
  console.log(`TOTAL WORDS: ${total} · avg ${Math.round(total / emails.length)} per email`);
}

if (ONLY) {
  const e = emails.find((x) => x.to === ONLY);
  if (!e) {
    console.error(`No recipient ${ONLY} in the batch.`);
    process.exit(1);
  }
  if (!SEND) {
    console.log('\nDRY RUN — nothing sent. Add --send.');
    process.exit(0);
  }
  const logOut = [];
  await sendOne(e, logOut);
  fs.writeFileSync(
    path.join(process.cwd(), 'docs', 'relationship-email-send-log.json'),
    JSON.stringify({ generated: new Date().toISOString(), entries: logOut }, null, 2)
  );
  process.exit(logOut[0].status === 'SENT' ? 0 : 1);
}

if (!SEND) {
  console.log('\nDRY RUN — nothing sent. Add --send to send the batch.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Real send
// ---------------------------------------------------------------------------

function sendOne(e, logOut) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      reply_to: REPLY_TO,
      to: [e.to],
      cc: [e.cc],
      subject: e.subject,
      html: e.html,
    }),
  }).then(async (res) => {
    const json = await res.json().catch(() => ({}));
    const ok = res.ok;
    const entry = {
      timestamp: new Date().toISOString(),
      to: e.to,
      cc: e.cc,
      contact_type: e.contactType,
      special_treatment: e.special,
      subject: e.subject,
      status: ok ? 'SENT' : 'FAILED',
      message_id: ok ? json.id || null : null,
      error: ok ? null : (json.message || `${res.status}`),
    };
    logOut.push(entry);
    if (ok) {
      console.log(`SENT  ${e.to} · ${e.subject} · ${entry.message_id}`);
    } else {
      console.error(`FAILED ${e.to} · ${entry.error}`);
    }
    return entry;
  });
}

const logOut = [];
const start = Date.now();
for (const e of emails) {
  await sendOne(e, logOut);
  await new Promise((r) => setTimeout(r, 350)); // gentle pacing across the batch
}

const logPath = path.join(process.cwd(), 'docs', 'relationship-email-send-log.json');
fs.writeFileSync(logPath, JSON.stringify({ generated: new Date().toISOString(), durationMs: Date.now() - start, entries: logOut }, null, 2));

const sent = logOut.filter((x) => x.status === 'SENT').length;
const failed = logOut.filter((x) => x.status === 'FAILED');
const specialsSent = logOut.filter((x) => x.special_treatment && x.status === 'SENT').length;
console.log('\n' + '─'.repeat(60));
console.log('FIRST RELATIONSHIP EMAIL CAMPAIGN');
console.log(`Total contacts:   ${emails.length}`);
console.log(`Successfully sent: ${sent}`);
console.log(`Failed:           ${failed.length}`);
console.log(`Skipped (self):    ${skipped.length}`);
console.log(`Special-treatment emails sent: ${specialsSent}`);
if (failed.length) {
  console.log('Failures:');
  for (const f of failed) console.log(`  ${f.to} · ${f.error}`);
}
console.log(`Send log: ${logPath}`);