// app/api/genome/share/route.ts
//
// The owner emails his own Genome to his broker, accountant, a buyer, a funder. He chooses who and
// what is said; the document is the buyer's copy, always.
//
// ⚠️ `renderSingleFile(g, 'buyer', …)` IS NOT A DEFAULT — IT IS THE GUARANTEE. The 'owner' audience
// includes everything he has marked private, and its own banner says so: "your plans, your position,
// and anything you have said you are not ready to share. Use the buyer's copy when you hand it to
// anyone." The single most sensitive fact in a Kira account is that he is considering selling and
// has not told his staff or his family — and the people he most wants to send this to are exactly
// the ones that must not reach by accident. There is no parameter here to choose the audience,
// because a parameter is a thing that can be got wrong.
//
// ⚠️ IT CANNOT AND MUST NOT CLAIM TO COME FROM HIS ADDRESS. We send from the one Resend-verified
// subdomain; his domain is not verified with us. So: our From, REPLY-TO him, first-person body, and
// a line saying Kira sent it on his behalf. Forging his address in From would fail SPF/DKIM at the
// recipient — an accountant's mail server would bin or flag it, which is worse than being plain.
//
// ⚠️ TRANSACTIONAL, NOT COMMERCIAL. He is sending his own document to a professional he chose, at
// the moment he chose. That is not a commercial electronic message, and an unsubscribe link would be
// misleading about what it does. Identification footer stays — the recipient is entitled to know
// who sent it. Same shape as introducer-invite.ts.

import { NextRequest, NextResponse } from 'next/server';

import { createEmailSender, DEFAULT_FROM } from '@caistech/email-send';

import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { renderSingleFile } from '@/lib/genome/render';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { senderIdentityOrNull, replyToAddress, sanitiseDisplayName } from '@/lib/email/sender';
import { assertNotHalted } from '@/lib/kill-switch';
import { normaliseRecipients, shareBlocker } from '@/lib/genome/share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // The kill switch, before anything leaves. Outbound mail is the path where a mistake is
  // unrecoverable and scales.
  await assertNotHalted('outbound_email');

  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  let body: { to?: unknown; cc?: unknown; bcc?: unknown; subject?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data: appUser } = await svc
    .from('users')
    .select('id, first_name, email')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (!appUser) return NextResponse.json({ error: 'No account record' }, { status: 404 });

  const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
  const { recipients, problems, total } = normaliseRecipients({
    to: asList(body.to),
    cc: asList(body.cc),
    bcc: asList(body.bcc),
  });

  const subject = String(body.subject ?? '').trim();
  const message = String(body.message ?? '').trim();

  const genome = await deriveOwnerGenome(appUser.id);
  const hasDocument = !genome.empty;

  const blocker = shareBlocker({ recipients, total, subject, hasDocument });
  if (blocker) return NextResponse.json({ error: blocker, problems }, { status: 400 });

  // An invalid address is reported and the send is REFUSED rather than quietly sent to the rest.
  // "It went to three of the four you typed" is something he would only discover by asking the
  // fourth person why they never replied.
  const invalid = problems.filter((p) => p.reason === 'invalid');
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Check these addresses: ${invalid.map((p) => p.value).join(', ')}`, problems },
      { status: 400 },
    );
  }

  // ⚠️ REFUSED, NOT DROPPED. See the note at the send call: the shared sender cannot carry these,
  // and accepting them would mean an owner ticking "copy my accountant" and no accountant ever
  // receiving it. Saying so is the only honest option until the package supports them.
  if (recipients.cc.length > 0 || recipients.bcc.length > 0) {
    return NextResponse.json(
      {
        error:
          'Cc and Bcc are not available yet — everyone you add has to go in the To field for now, so ' +
          'they can all see who else received it. Add them there and it will send.',
        problems,
      },
      { status: 400 },
    );
  }

  const identity = await getBusinessIdentity(appUser.id);
  const businessName = identity?.trading_name?.trim() || identity?.legal_name?.trim() || 'the business';

  const document = renderSingleFile(genome, 'buyer', {
    businessName,
    abn: identity?.abn ?? null,
    generatedAt: new Date(),
    timeZone: 'Australia/Brisbane',
  });

  const ownerEmail = String(appUser.email ?? '').trim();
  const ownerName = String(appUser.first_name ?? '').trim();

  const html = [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;max-width:680px;margin:0 auto;color:#292524;font-size:16px;line-height:1.6">',
    // HIS words, first, above the document. He wrote them; they are not decoration.
    `<div style="white-space:pre-wrap">${escapeHtml(message)}</div>`,
    '<hr style="margin:28px 0;border:none;border-top:1px solid #e7e5e4">',
    // ⚠️ SAID PLAINLY. The recipient sees an address he does not recognise in the From line, so he is
    // told why in the first sentence rather than left to wonder whether it is a phishing attempt —
    // which is exactly what a cautious accountant would conclude.
    `<p style="font-size:14px;color:#57534e">Sent by Kira on behalf of ${escapeHtml(ownerName || businessName)}${
      ownerEmail ? ` &mdash; reply to this email and it goes to ${escapeHtml(ownerEmail)}` : ''
    }.</p>`,
    document,
    '</div>',
  ].join('\n');

  const sender = senderIdentityOrNull();

  // ⚠️ HIS NAME IN THE DISPLAY NAME — the address stays ours, and that distinction is the whole fix.
  //
  // We send from the one Resend-verified subdomain, and that cannot change until an owner's own
  // domain is verified with us: forging his address in From fails SPF/DKIM at his broker's mail
  // server, and being binned or flagged is worse than being plain. All of that is still true.
  //
  // But the thing Ray actually objected to was never the envelope. It was what his broker SEES:
  //
  //   "it goes out under our name means my broker gets an email from Corporate AI Solutions. He
  //    will ask what that is. I would rather it went from me."
  //
  // For a man who has told nobody he is selling, a stranger's company name on the covering email is
  // the exposure — his broker asks what Corporate AI Solutions is, and now there is a conversation
  // he did not choose to have. A DISPLAY NAME is not authenticated by SPF or DKIM (they check the
  // domain in the address), so "Ray Wilson (via Kira) <noreply@updates…>" is both honest and
  // deliverable. It is the same shape every document-sharing product uses.
  //
  // "via Kira" is kept deliberately: the recipient is entitled to know a tool sent it, the body says
  // so already, and the identification footer still names the legal sender. Omitting it would be the
  // forgery this whole note exists to avoid.
  const displayName =
    identity?.trading_name?.trim() ||
    identity?.legal_name?.trim() ||
    String(appUser?.first_name ?? '').trim();
  const fromWithName = displayName ? `${sanitiseDisplayName(displayName)} (via Kira) <${DEFAULT_FROM}>` : undefined;

  const send = createEmailSender({ sender: sender ?? undefined, from: fromWithName });

  let sentId: string | null = null;
  try {
    // ⚠️ TO ONLY. `@caistech/email-send` builds the Resend body from `from`, `to`, `reply_to`,
    // `subject`, `html`, `text` — there is NO cc and NO bcc. Passing them would have compiled (the
    // first draft cast the argument, which is what hid it) and Resend would never have seen them:
    // the owner ticks cc, the accountant is never copied, and he only finds out by asking why she
    // never replied. A silent drop on a feature about who sees his business is the worst version of
    // a bug this product keeps producing.
    //
    // So the API accepts cc/bcc, VALIDATES them, and refuses rather than pretending — see the guard
    // above this call. Real cc/bcc needs `@caistech/email-send` extended (filed), and that is the
    // right fix rather than a fork here: sending separate copies would destroy the thing cc is FOR,
    // which is a broker being able to see that the accountant was copied.
    const result = await send.send({
      to: recipients.to,
      // REPLY-TO HIM, not to us. A reply landing in our inbox rather than his is the failure that
      // makes this worse than him forwarding a PDF himself.
      replyTo: ownerEmail || replyToAddress(),
      subject,
      html,
      compliance: { transactional: true as const, ...(sender ? { sender } : {}) },
    });
    sentId = result?.id ?? null;
  } catch (error) {
    console.error('[genome/share] send failed:', error);
    return NextResponse.json(
      { error: 'Could not send it just then. Nothing has gone out — try again in a moment.' },
      { status: 502 },
    );
  }

  // A RECORD OF EVERY SHARE, because he is entitled to know what left and when, and because a
  // document about his business reaching a third party is the event most worth being able to
  // reconstruct later. Never fails the send — it has already happened by here.
  try {
    await svc.from('email_logs').insert({
      user_id: appUser.id,
      email_type: 'genome_share',
      recipient: [...recipients.to, ...recipients.cc, ...recipients.bcc].join(', '),
      status: 'sent',
      resend_id: sentId,
    });
  } catch (logError) {
    console.error('[genome/share] SENT but not recorded:', logError);
  }

  return NextResponse.json({ ok: true, sent: recipients.to.length, id: sentId });
}

/** Local, because the share body is the owner's free text going into an HTML email. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
