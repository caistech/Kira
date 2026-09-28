// app/api/webhooks/resend/route.ts
// Handles Resend webhooks for email delivery tracking

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';
import crypto from 'crypto';

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

// Replay guard per Svix's own guidance — reject anything outside a 5-minute clock skew.
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

// Resend delivers webhooks THROUGH SVIX, not with a bare `resend-signature` header carrying a raw
// hex HMAC of the body — that was the previous implementation here, and it verified against a
// header Resend never sends. Since `Buffer.from('')` (the missing header, always empty in real
// traffic) never matches the 32-byte digest, `timingSafeEqual`'s length check THROWS, which the
// outer try/catch turns into a 500 on every single real event — invisible for months because no
// webhook was even registered to call this route (see git history), and only surfaced once one was.
//
// Correct scheme (docs.svix.com/receiving/verifying-payloads/how-manual): headers svix-id /
// svix-timestamp / svix-signature; secret is `whsec_<base64>` — strip the prefix, base64-decode the
// rest to get the HMAC key; signed content is `{svix-id}.{svix-timestamp}.{raw body}`; signature is
// HMAC-SHA256, base64-encoded; svix-signature carries space-separated `v1,<sig>` entries (secret
// rotation) — any match is valid.
function verifySignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const timestampSeconds = Number(svixTimestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest();

  return svixSignature
    .split(' ')
    .map((entry) => entry.split(',')[1])
    .filter((sig): sig is string => Boolean(sig))
    .some((sig) => {
      const sigBuf = Buffer.from(sig, 'base64');
      return sigBuf.length === expected.length && crypto.timingSafeEqual(sigBuf, expected);
    });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const svixId = request.headers.get('svix-id') || '';
    const svixTimestamp = request.headers.get('svix-timestamp') || '';
    const svixSignature = request.headers.get('svix-signature') || '';

    // Fail CLOSED, not open — same posture as the elevenlabs-convai post-call webhook fix
    // (@caistech/elevenlabs-convai v0.10.0): an unverified webhook must never be treated as
    // authentic. No secret configured is a deploy/config gap, not a reason to skip verification.
    if (!RESEND_WEBHOOK_SECRET) {
      console.error('[resend-webhook] RESEND_WEBHOOK_SECRET is not set — refusing unverifiable webhook');
      return NextResponse.json({ error: 'Webhook verification not configured' }, { status: 500 });
    }
    if (!verifySignature(payload, svixId, svixTimestamp, svixSignature, RESEND_WEBHOOK_SECRET)) {
      console.error('[resend-webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const supabase = createServiceClientV2();
    const event = JSON.parse(payload);
    console.log('[resend-webhook] Received:', event.type);

    const { type, data } = event;
    const emailId = data.email_id;

    if (!emailId) {
      return NextResponse.json({ received: true });
    }

    // Update email log based on event type
    switch (type) {
      case 'email.sent':
        await supabase
          .from('email_logs')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('resend_id', emailId);
        break;

      case 'email.delivered':
        await supabase
          .from('email_logs')
          .update({ status: 'delivered', updated_at: new Date().toISOString() })
          .eq('resend_id', emailId);
        break;

      case 'email.opened':
        await supabase
          .from('email_logs')
          .update({ 
            status: 'opened', 
            opened_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('resend_id', emailId);
        break;

      case 'email.clicked':
        await supabase
          .from('email_logs')
          .update({ 
            status: 'clicked', 
            clicked_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('resend_id', emailId);
        break;

      case 'email.bounced':
        await supabase
          .from('email_logs')
          .update({ 
            status: 'bounced', 
            error_message: data.bounce?.message || 'Bounced',
            updated_at: new Date().toISOString() 
          })
          .eq('resend_id', emailId);
        break;

      case 'email.complained':
        await supabase
          .from('email_logs')
          .update({ 
            status: 'failed', 
            error_message: 'Spam complaint',
            updated_at: new Date().toISOString() 
          })
          .eq('resend_id', emailId);
        break;

      default:
        console.log('[resend-webhook] Unhandled event type:', type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[resend-webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
