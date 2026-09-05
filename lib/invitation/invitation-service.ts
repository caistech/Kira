// lib/invitation/invitation-service.ts
//
// Organisation Onboarding — mint, list, revoke invitation codes.
//
// Extends beta_codes with admin-friendly operations: mint with personalisation,
// list by organisation, revoke pending codes. Emails are triggered on mint.
//
// All queries use the service-role client (RLS bypass) for now — the admin UI
// lives in a server component that already checked isCurrentUserAdmin. This
// avoids double-checking the same RLS path twice per request.

import { createServiceClientV2 } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { senderIdentityOrNull } from '@/lib/email/sender';

const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789'; // no O/0, I/1, S/5
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kiraexec.com';
const DEFAULT_EXPIRY_DAYS = 45;

function generate(length = 12) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function normalise(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? []).join('-');
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Invitation {
  code: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  label: string | null;
  beta_type: string;
  organisation_id: string | null;
  expires_at: string;
  redeemed_at: string | null;
  revoked_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface MintParams {
  organisationId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  betaType?: 'superadmin' | 'user';
  label?: string | null;
  createdBy?: string | null;
  expiresInDays?: number;
}

export interface MintResult {
  code: string;
  prettyCode: string;
  invitation: Invitation;
}

// ── Mint ───────────────────────────────────────────────────────────────────

export async function mintInvitation(params: MintParams): Promise<MintResult> {
  const svc = createServiceClientV2();
  const code = generate();
  const expires = new Date(Date.now() + (params.expiresInDays ?? DEFAULT_EXPIRY_DAYS) * 86_400_000);

  const { data, error } = await svc
    .from('beta_codes')
    .insert({
      code,
      email: params.email.toLowerCase(),
      first_name: params.firstName ?? null,
      last_name: params.lastName ?? null,
      label: params.label ?? null,
      beta_type: params.betaType ?? 'user',
      organisation_id: params.organisationId,
      expires_at: expires.toISOString(),
      created_by: params.createdBy ?? 'admin',
    })
    .select()
    .single();

  if (error) throw new Error(`Mint failed: ${error.message}`);

  return { code, prettyCode: formatCode(code), invitation: data as Invitation };
}

// ── Send invitation email ───────────────────────────────────────────────────

export async function sendInvitationEmail(invitation: MintParams & { code: string; prettyCode: string }): Promise<void> {
  const codeUrl = `${APP_URL}/?code=${normalise(invitation.code)}`;
  const firstName = invitation.firstName || invitation.email.split('@')[0];
  const sender = senderIdentityOrNull();

  const subject = 'Invitation: Kira Beta';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
  <tr><td style="background:linear-gradient(135deg,#E8998D 0%,#D4847C 100%);padding:40px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">Kira Beta</h1>
  </td></tr>
  <tr><td style="padding:40px;">
    <p style="font-size:16px;color:#333;line-height:1.7;margin:0 0 20px;">Dear ${firstName},</p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      Thanks for agreeing to be a Beta Tester for the Kira Platform.
      I have set up a <strong>sandbox Kira portal</strong> for beta testers, so there's nothing you can
      break as you test it out&nbsp;:)
    </p>

    <h2 style="font-size:17px;color:#333;margin:28px 0 12px;">What Kira is</h2>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      Kira is a business support platform I built to help Baby Boomer Business Owners (BBBO's)
      who are running successful businesses but the "Owner Dependence" levels are high (ie the
      business just can't run without them).
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      Kira can help them create more value in their businesses by using AI (and specifically
      Kira — an AI Voice Agent) by systemising their business over time as well as helping them
      in the day to day running of their business.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      As an example, Kira will build out their business systems and Standard Operating
      Procedures (SOPs) just by observing and recording and systemising what she notices as she
      works with the owner (and others — every employee can have their own Kira and the
      collective intelligence will be collated and used to build the overall Business genome —
      it's DNA).
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      And that's where the true value is for the BBBO's — they are coming up to retirement and
      we want them to maximise the value of their businesses — because, in many cases, that's
      their true retirement fund.
    </p>

    <h2 style="font-size:17px;color:#333;margin:28px 0 12px;">What We Are Asking of You</h2>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      You are invited to join the Kira Beta. Your invitation grants you CEO access to the
      sandbox CAIS Beta org I have set up within Kira.
    </p>

    <p style="font-size:16px;color:#333;line-height:1.7;margin:0 0 10px;"><strong>How it works — read this so it's not surprising:</strong></p>
    <ol style="font-size:16px;color:#555;line-height:1.8;margin:0 0 20px;padding-left:22px;">
      <li>Go to <strong style="color:#D4847C;">${codeUrl}</strong> and confirm your name — you'll land on the Kira home page first.</li>
      <li>While you're there, take the <strong>13-question business valuation exercise</strong> so you experience the flow a Kira owner walks.</li>
      <li>You'll then be taken to the <strong>beta code insertion form</strong> — enter your code
          <strong style="color:#D4847C;">${normalise(invitation.code)}</strong>.</li>
      <li>That takes you into the <strong>CAIS Beta org portal as its CEO</strong> — your Kira Voice
          Agent is already set up and waiting for you inside.</li>
    </ol>

    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 24px;">
      One honest note: the CAIS Beta org's Genome, valuation and report are <strong>not built from your
      13 answers</strong> — the org is pre-seeded with a business scenario so you can see a fully populated
      portal on day one. Your 13 answers give you the experience of the flow itself.
    </p>

    <p style="font-size:16px;color:#555;line-height:1.7;margin:0;">
      Let me know once you have logged in so I can hear how it's going for you.
    </p>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
    <p style="font-size:12px;color:#aaa;margin:0;">
      ${sender ? `&copy; ${new Date().getFullYear()} ${sender.name}` : `&copy; ${new Date().getFullYear()} Kira`}
      ${sender ? ` &bull; ABN ${sender.abn ?? ''}` : ''}
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  await sendEmail({ to: invitation.email, subject, html });
}

// ── List ───────────────────────────────────────────────────────────────────

export async function listInvitations(organisationId: string): Promise<Invitation[]> {
  const svc = createServiceClientV2();
  const { data, error } = await svc
    .from('beta_codes')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`List failed: ${error.message}`);
  return (data ?? []) as Invitation[];
}

// ── Revoke ─────────────────────────────────────────────────────────────────

export async function revokeInvitation(code: string, organisationId: string): Promise<void> {
  const svc = createServiceClientV2();
  const normalised = normalise(code);
  const { error } = await svc
    .from('beta_codes')
    .update({ revoked_at: new Date().toISOString() })
    .eq('code', normalised)
    .eq('organisation_id', organisationId)
    .is('redeemed_at', null);

  if (error) throw new Error(`Revoke failed: ${error.message}`);
}
