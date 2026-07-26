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

/** Must match the options on the form. Validated rather than trusted — this is a public endpoint. */
const ADVISORY_TYPES = [
  'business_broker',
  'accountant',
  'bookkeeper',
  'financial_adviser',
  'lawyer',
  'other',
];

/** 51 824 753 556 — how an ABN is written outside a database. */
function formatAbn(abn: string): string {
  return `${abn.slice(0, 2)} ${abn.slice(2, 5)} ${abn.slice(5, 8)} ${abn.slice(8)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const firstName = String(body.first_name || '').trim();
    const lastName = String(body.last_name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const firm = String(body.firm || '').trim();
    const phone = String(body.phone || '').trim();
    const clientBand = String(body.client_band || '').trim();
    const note = String(body.note || '').trim();
    const advisoryType = String(body.advisory_type || '').trim();

    // Only from the ABR lookup. An 11-digit check is the whole validation we want here: the value
    // either came back from the register or it did not, and a malformed one is simply not stored.
    const firmAbnDigits = String(body.firm_abn || '').replace(/\D/g, '');
    const firmAbn = /^\d{11}$/.test(firmAbnDigits) ? firmAbnDigits : '';
    const firmState = String(body.firm_state || '').trim().toUpperCase();

    // `name` is still written and still NOT NULL — the parts are the truth, this keeps every
    // existing reader working rather than making them all learn the new shape at once.
    const name = [firstName, lastName].filter(Boolean).join(' ');

    if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please add your first and last name and a valid email.' },
        { status: 400 },
      );
    }

    if (!ADVISORY_TYPES.includes(advisoryType)) {
      return NextResponse.json({ error: 'Please tell us what kind of practice you run.' }, { status: 400 });
    }

    // The one condition. The page states it as something they confirm on joining, so an enquiry
    // that does not carry it is not the thing the page describes. The binding acceptance is still
    // the portal undertaking before their link goes live.
    if (body.undertaking !== 'on' && body.undertaking !== true) {
      return NextResponse.json(
        { error: 'Please confirm the condition before sending.' },
        { status: 400 },
      );
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
      first_name: firstName,
      last_name: lastName,
      email,
      firm: firm || null,
      firm_abn: firmAbn || null,
      firm_state: firmState || null,
      advisory_type: advisoryType,
      phone: phone || null,
      client_band: clientBand || null,
      note: note || null,
      undertaking_confirmed_at: new Date().toISOString(),
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
                 <p>Practice: ${advisoryType.replace(/_/g, ' ')}</p>
                 <p>Firm: ${firm || 'not given'}${
                   firmAbn
                     ? ` — ABN ${formatAbn(firmAbn)}${firmState ? ` (${firmState})` : ''}, verified on the ABR`
                     : ' — <em>not matched on the business register</em>'
                 }</p>
                 <p>Owner clients: ${clientBand || 'not said'}</p>
                 <p>Confirmed the listing-agreement condition at enquiry.</p>
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
