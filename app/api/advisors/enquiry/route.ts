// app/api/advisors/enquiry/route.ts
//
// A broker asking to join the channel. Stored, and the operator is emailed so it doesn't sit in a
// table nobody looks at.
//
// It does NOT create an introducer. An operator adds them from /admin/introducers after checking
// the practice is real — a self-serve referral link that starts attributing commission to whoever
// filled in a form is not a thing we want.

import { NextRequest, NextResponse } from 'next/server';

import { sendEmail } from '@/lib/email/resend';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A human takes longer than this to fill in a form. Bots do not. */
const MIN_FILL_MS = 2500;

const OPERATOR_EMAIL = process.env.ADVISOR_ENQUIRY_TO || process.env.EMAIL_SENDER_EMAIL || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const firm = String(body.firm || '').trim();
    const phone = String(body.phone || '').trim();
    const clientBand = String(body.client_band || '').trim();
    const note = String(body.note || '').trim();

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please add your name and a valid email.' }, { status: 400 });
    }

    // Honeypot: accept ANY value and silently no-op. Never 400 on it — a browser that autofilled
    // the hidden field would otherwise reject a real person, and never fake success either, which
    // loses the lead just as completely while looking fine.
    const trapped =
      Boolean(String(body.hp_field || '').trim()) ||
      Number(body.rendered_at) > 0 && Date.now() - Number(body.rendered_at) < MIN_FILL_MS;

    if (trapped) {
      console.log('[advisors/enquiry] bot-shaped submission ignored');
      return NextResponse.json({ ok: true });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from('advisor_enquiries').insert({
      name,
      email,
      firm: firm || null,
      phone: phone || null,
      client_band: clientBand || null,
      note: note || null,
    });

    if (error) {
      console.error('[advisors/enquiry] not stored:', error);
      return NextResponse.json({ error: 'Could not send that. Try again shortly.' }, { status: 500 });
    }

    // Notify the operator. Best-effort: the enquiry is already saved, and failing the request
    // because a mail server hiccuped would lose a lead we already have.
    if (OPERATOR_EMAIL) {
      try {
        await sendEmail({
          to: OPERATOR_EMAIL,
          subject: `Advisor enquiry — ${firm || name}`,
          html: `<p><strong>${name}</strong>${firm ? ` · ${firm}` : ''}</p>
                 <p>${email}${phone ? ` · ${phone}` : ''}</p>
                 <p>Owner clients: ${clientBand || 'not said'}</p>
                 ${note ? `<p>${note}</p>` : ''}
                 <p>Add them at /admin/introducers to send their links.</p>`,
        });
      } catch (notifyError) {
        console.error('[advisors/enquiry] operator not notified:', notifyError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[advisors/enquiry] failed:', error);
    return NextResponse.json({ error: 'Could not send that.' }, { status: 500 });
  }
}
