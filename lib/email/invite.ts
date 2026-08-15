// lib/email/invite.ts
//
// The beta invitation.
//
// ⚠️ THE RULE THIS TEMPLATE EXISTS TO OBEY: send the INSTRUCTION, never a link that expires. The
// 2026-08-10 invitation audit found 33 accounts, 21 with no agent behind them, and 8 people who
// could never sign in at all — because what they were sent was a magic link with a one-hour token,
// read three days later. An invitation is read when the recipient gets to it.
//
// So the code is the payload, the link is a convenience, and the code is printed large enough to
// read off a phone and type by hand. If the link rots, the email still works.
//
// FIRST PERSON, FROM DENNIS. An invitation is personal — "I would like you to try it" — and this
// audience (business owners in their sixties, often introduced by someone they know) reads a
// marketing broadcast and a personal note very differently. The compliance footer underneath still
// carries the company identity, which is correct: the person writing and the entity sending are
// different things and the footer is about the second.
//
// SHORT ON PURPOSE. A long invitation is not read. Everything that can be discovered on the site is
// left to the site.

/** Pure — returns the message. Sending is the caller's job, through the compliant path. */
export function betaInviteEmail(params: {
  /** What to call them. Falls back to a greeting that works with no name at all. */
  firstName?: string | null;
  /** The grouped, human-readable form: KIRA-7H2K-9QLM. */
  code: string;
  appUrl: string;
  /** Who introduced them, if anyone — "Neil suggested I get in touch". */
  introducedBy?: string | null;
}): { subject: string; html: string; text: string } {
  const { code, appUrl } = params;
  const name = String(params.firstName ?? '').trim();
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const intro = params.introducedBy
    ? `${params.introducedBy} suggested I get in touch.`
    : 'Thanks for being willing to have a look at this.';

  const directLink = `${appUrl}/plan?code=${encodeURIComponent(code.replace(/-/g, ''))}`;

  // NO EXCLAMATION MARKS AND NO "EXCITING NEWS". The register is one operator writing to another.
  const text = [
    greeting,
    '',
    intro,
    '',
    'Kira works out what your business is worth today, what it would be worth if it ran',
    'without you, and then helps you close the gap — by talking to you, not by giving you',
    'forms to fill in.',
    '',
    "I'd like you to try it and tell me what doesn't work.",
    '',
    'Here is what to do:',
    '',
    `  1. Go to ${appUrl}/business-valuation`,
    '  2. Answer the questions — about three minutes, and you get your number at the end',
    '  3. On the next page, instead of paying, choose "Enter your invitation code"',
    '',
    `  Your code:  ${code}`,
    '',
    `Or go straight to it: ${directLink}`,
    '',
    'Capitals and dashes do not matter, and the code works for the next few weeks — so',
    'there is no rush. It only works for this email address.',
    '',
    "It is free while we are in beta. There is no card, and I will ask you before we ever",
    'charge you for anything. What I want in return is your honest opinion, including the',
    'parts you think are wrong.',
    '',
    'Dennis',
  ].join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#292524;font-size:16px;line-height:1.6">
  <p>${greeting}</p>
  <p>${intro}</p>
  <p>
    Kira works out what your business is worth today, what it would be worth if it ran without you,
    and then helps you close the gap &mdash; by talking to you, not by giving you forms to fill in.
  </p>
  <p>I&rsquo;d like you to try it and tell me what doesn&rsquo;t work.</p>

  <p style="margin-top:28px"><strong>Here is what to do:</strong></p>
  <ol style="padding-left:20px;margin:0 0 24px 0">
    <li style="margin-bottom:6px">Go to <a href="${appUrl}/business-valuation" style="color:#7c3aed">${appUrl.replace(/^https?:\/\//, '')}/business-valuation</a></li>
    <li style="margin-bottom:6px">Answer the questions &mdash; about three minutes, and you get your number at the end</li>
    <li>On the next page, instead of paying, choose &ldquo;Enter your invitation code&rdquo;</li>
  </ol>

  <!-- THE CODE, BIG. It is read off a phone in daylight by someone who may need reading glasses,
       and it is the thing that still works if every link in this email rots. -->
  <div style="border:2px solid #ddd6fe;background:#f5f3ff;border-radius:14px;padding:20px;text-align:center;margin:0 0 24px 0">
    <p style="margin:0 0 6px 0;font-size:14px;color:#57534e">Your invitation code</p>
    <p style="margin:0;font-size:26px;font-weight:700;letter-spacing:2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#1c1917">${code}</p>
  </div>

  <p style="text-align:center;margin:0 0 28px 0">
    <a href="${directLink}" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700">Or go straight to it</a>
  </p>

  <p style="font-size:15px;color:#57534e">
    Capitals and dashes don&rsquo;t matter, and the code works for the next few weeks &mdash; so
    there&rsquo;s no rush. It only works for this email address.
  </p>

  <p>
    It&rsquo;s free while we&rsquo;re in beta. There&rsquo;s no card, and I&rsquo;ll ask you before
    we ever charge you for anything. What I want in return is your honest opinion, including the
    parts you think are wrong.
  </p>

  <p style="margin-top:28px">Dennis</p>
</div>`.trim();

  return {
    // Names the thing and the person. No "invitation to join the future of..." — this lands in an
    // inbox next to fifty of those and the only currency it has is looking like a real person wrote it.
    subject: name ? `${name} — the Kira beta, and how to get in` : 'The Kira beta, and how to get in',
    html,
    text,
  };
}
