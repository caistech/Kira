// app/api/loi/route.ts
// Records a letter-of-intent / commitment from a prospect (the /commit page). Public — a prospect
// need not be logged in — but if a session is present we attribute it. Writes via the service role
// only (the table is RLS-locked with no public policies). Best-effort operator notification so
// Dennis sees new LOIs immediately; never blocks the record.
//
// Anti-bot (PRODUCT_STANDARDS codicil): an autofill-neutral honeypot (`hp_field`) + a time-trap.
// Both SILENTLY no-op to a success response (never 400 a real user, never store a bot).

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentAppUser } from '@/lib/auth';

const MIN_FILL_MS = 2500; // faster than this = almost certainly a bot

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  // Anti-bot: filled honeypot, or submitted too fast → pretend success, store nothing.
  const hp = String(body.hp_field || '').trim();
  const elapsed = Number(body.elapsed_ms) || 0;
  if (hp || (elapsed > 0 && elapsed < MIN_FILL_MS)) {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const commitmentLevel = String(body.commitment_level || '').trim();
  const consent = body.consent === true;

  if (!name || !email || !commitmentLevel) {
    return NextResponse.json({ error: 'Please add your name, email, and your commitment.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: 'Please tick the box to record this as a genuine expression of intent.' }, { status: 400 });
  }

  // Attribute to the session user if there is one (optional — prospects may be anonymous).
  const appUser = await getCurrentAppUser().catch(() => null);

  const monthly = Number(body.monthly_intent);
  const refer = Number(body.refer_count);
  const svc = createServiceClient();
  const { error } = await svc.from('loi_commitments').insert({
    name,
    email,
    business_name: body.business_name ? String(body.business_name).slice(0, 200) : null,
    role: body.role ? String(body.role).slice(0, 120) : null,
    commitment_level: commitmentLevel,
    commitment_detail: body.commitment_detail ? String(body.commitment_detail).slice(0, 4000) : null,
    monthly_intent: Number.isFinite(monthly) && monthly > 0 ? monthly : null,
    refer_count: Number.isFinite(refer) && refer > 0 ? Math.round(refer) : null,
    signature: body.signature ? String(body.signature).slice(0, 200) : null,
    consent: true,
    source: body.source ? String(body.source).slice(0, 40) : 'commit_page',
    user_id: appUser?.id ?? null,
    agent_id: body.agent_id ? String(body.agent_id).slice(0, 120) : null,
  });

  if (error) {
    console.error('[loi] insert failed:', error);
    return NextResponse.json({ error: 'Could not record your intent. Please try again.' }, { status: 500 });
  }

  // Best-effort operator notification (transactional/internal — not a commercial email, no footer).
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Kira <noreply@updates.corporateaisolutions.com>',
        to: ['dennis@corporateaisolutions.com'],
        subject: `New Kira LOI — ${name} (${commitmentLevel})`,
        text:
          `New letter of intent recorded.\n\n` +
          `Name: ${name}\nEmail: ${email}\nBusiness: ${body.business_name || '—'}\nRole: ${body.role || '—'}\n` +
          `Commitment: ${commitmentLevel}\nMonthly intent: ${monthly || '—'}\nWould refer: ${refer || '—'}\n` +
          `Detail: ${body.commitment_detail || '—'}\nSource: ${body.source || 'commit_page'}\n`,
      }),
    }).catch((e) => console.error('[loi] operator email failed (non-fatal):', e));
  }

  return NextResponse.json({ ok: true });
}
