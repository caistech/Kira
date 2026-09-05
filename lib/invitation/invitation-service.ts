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
  const role =
    invitation.betaType === 'superadmin' ? 'owner (CEO)' : 'member';

  const subject = 'Invitation: Kira Beta Access';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
  <tr><td style="background:linear-gradient(135deg,#E8998D 0%,#D4847C 100%);padding:40px;text-align:center;">
    <img src="${APP_URL}/female_avatar.jpeg" alt="Kira" style="width:80px;height:80px;border-radius:50%;border:4px solid #fff;margin-bottom:16px;">
    <h1 style="color:#fff;margin:0;font-size:28px;">You're Invited to Kira Beta</h1>
  </td></tr>
  <tr><td style="padding:40px;">
    <p style="font-size:18px;color:#333;margin:0 0 24px;">Hey ${firstName},</p>
    <p style="font-size:16px;color:#555;line-height:1.6;margin:0 0 24px;">
      You've been invited to join <strong>Kira</strong> as a ${role}.
      Your Kira Voice Agent is already set up and waiting for you inside.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.6;margin:0 0 32px;">
      As part of the beta process, we also ask that you complete the
      <a href="${APP_URL}/business-valuation" style="color:#D4847C;">13-question valuation exercise</a>
      when you log in. This establishes your baseline and lets you experience
      how Kira builds the original valuation and guides transferability.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${codeUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8998D 0%,#D4847C 100%);color:#fff;text-decoration:none;padding:16px 48px;border-radius:8px;font-size:18px;font-weight:600;box-shadow:0 4px 12px rgba(232,153,141,.4);">
        Join Kira &rarr;
      </a>
    </td></tr></table>
    <p style="font-size:14px;color:#888;text-align:center;margin:24px 0 0;">
      Or go to <a href="${codeUrl}" style="color:#D4847C;">${codeUrl}</a>
    </p>
    <p style="font-size:14px;color:#888;margin:24px 0 0;">
      This invitation is tied to your email address. Let me know once you've
      logged in so I can hear how it's going for you.
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
