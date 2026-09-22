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
//
// @design-tokens-ok: this file builds raw HTML EMAIL — email clients (Outlook, Gmail) strip
// <style> blocks and do not support CSS custom properties/var(), so the hex literals in the
// inline style="" attributes below are the only way to set colour in an email. DESIGN.md §3's
// token rule governs the app's own UI, not mail rendered outside it.

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

// Which narrative the invitation email tells. 'beta' is the original CAIS-sandbox copy
// (org_type null/client_org, or unresolved — the historical default, unchanged). 'partner' is for
// someone joining their OWN live distributor/consultant org — a materially different pitch (real
// account, not a sandbox; they're bringing Kira to clients, not testing a pre-seeded scenario).
// 'founding-beta' is a THIRD, distinct pitch — a small, named cohort of consultants Dennis has
// already spoken with, invited specifically to test the consultant-led model and the business
// model/journey (not software QA). Kept separate from 'partner' rather than folded in: 'partner' is
// already live-verified copy for the general distributor-onboarding chain, and this cohort needs
// materially different framing (founding-beta acknowledgment, a per-person personal note, an
// explicit "what we're testing" block) that would be wrong for a future ordinary distributor sign-up.
export type InvitationVariant = 'beta' | 'partner' | 'founding-beta';

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

export async function sendInvitationEmail(
  invitation: MintParams & {
    code: string;
    prettyCode: string;
    /**
     * A per-recipient personal opening — one or two sentences referencing the actual conversation
     * already had with them. 'founding-beta' only. Never invent this; every call site must draw it
     * from something Dennis actually said or a real detail of the recipient's own practice (D1's
     * explicit rule: "Do not invent details about a person's methodology"). Plain text (converted
     * to <p> below), not pre-formatted HTML — keeps call sites simple and this function the only
     * place that knows the email's markup.
     */
    personalNote?: string;
    /** Optional CC — e.g. the operator, so a real send to a real recipient is also in their sent
     * record. Never defaulted silently; a caller supplies it explicitly per send. */
    cc?: string | string[];
  },
  variant: InvitationVariant = 'beta',
): Promise<void> {
  // The redemption surface is /plan, not the root — a root URL renders the marketing homepage
  // and silently drops the code, so a recipient following this link never gets past "get started".
  const codeUrl = `${APP_URL}/plan?code=${normalise(invitation.code)}`;
  const firstName = invitation.firstName || invitation.email.split('@')[0];
  const sender = senderIdentityOrNull();

  const subject =
    variant === 'founding-beta'
      ? `${firstName} — Kira Founding Consultant Beta`
      : variant === 'partner'
        ? `${firstName}, Welcome to the Kira Partnership Team`
        : `${firstName}, Your Invitation to the Kira Beta Testing Programme`;

  const bannerText =
    variant === 'founding-beta' ? 'Kira Founding Consultant Beta' : variant === 'partner' ? 'Kira Partnership' : 'Kira Beta';

  const personalNoteHtml = invitation.personalNote
    ? `<p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">${invitation.personalNote}</p>`
    : '';

  const bodyHtml =
    variant === 'founding-beta'
      ? `
    <p style="font-size:16px;color:#333;line-height:1.7;margin:0 0 20px;">${firstName}, thanks again for the conversation.</p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      Dennis McMahon here from Corporate AI Solutions.
    </p>
    ${personalNoteHtml}
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      Since we spoke, the shape of Kira has evolved — and I'd like you to be one of a small
      founding group testing where it's landed.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      This isn't a standard distributor sign-up. You're being invited specifically to the
      <strong>Kira Founding Consultant Beta</strong> — a small group of consultants and advisers I've
      already spoken with, testing the new consultant-led model before it goes any wider.
    </p>

    <h2 style="font-size:17px;color:#333;margin:28px 0 12px;">How it works now</h2>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 8px;">
      Kira starts by understanding YOUR practice, not a client's:
    </p>
    <ul style="font-size:16px;color:#555;line-height:1.8;margin:0 0 16px;padding-left:22px;">
      <li>it learns your methodology and how you actually work</li>
      <li>then you bring it to clients you're already working with, and/or look at ways to
          collaborate to bring it to clients together</li>
    </ul>

    <h2 style="font-size:17px;color:#333;margin:28px 0 12px;">What I'd like you to do</h2>
    <ol style="font-size:16px;color:#555;line-height:1.8;margin:0 0 20px;padding-left:22px;">
      <li>Enter the portal and have the conversation with Kira.</li>
      <li>Go through it as if you were genuinely considering using Kira in your own practice —
          because that's the real question.</li>
      <li>Tell me where the story, the workflow, or the next step is unclear. That's what I actually
          need from you.</li>
    </ol>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      To be direct about it: I'm testing the <strong>business model and the journey</strong> here,
      not asking you to do software QA. If something about the CONCEPT doesn't hold up for a
      practice like yours, that's exactly the kind of thing I want to hear.
    </p>

    <p style="font-size:16px;color:#333;line-height:1.7;margin:24px 0 8px;"><strong>Start here:</strong></p>
    <p style="font-size:16px;line-height:1.7;margin:0 0 4px;">
      <a href="${codeUrl}" style="color:#D4847C;">${codeUrl}</a>
    </p>
    <p style="font-size:14px;color:#777;line-height:1.6;margin:0 0 24px;">
      Your invitation is carried with you automatically, so there's no code to type in.
    </p>

    <p style="font-size:16px;color:#555;line-height:1.7;margin:0;">
      Dennis<br/>Corporate AI Solutions
    </p>`
      : variant === 'partner'
      ? `
    <p style="font-size:16px;color:#333;line-height:1.7;margin:0 0 20px;">${firstName}, welcome to the Kira Partnership Team.</p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      Dennis McMahon here from Corporate AI Solutions.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      Following our conversation, I've set up your <strong>Kira Partner account</strong>. This is
      live, not a sandbox — it's yours to explore and build.
    </p>

    <h2 style="font-size:17px;color:#333;margin:28px 0 12px;">What you're actually joining</h2>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      Kira isn't intended to replace what you do with your clients.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      <strong>The opposite.</strong>
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      You bring the expertise, methodology and client relationship. Kira provides an AI operating
      layer that helps you extend that capability across your clients.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      The idea is simple: you've already spent years developing a way of helping businesses improve,
      grow, prepare for transition or solve specific problems. Kira can learn how you work and then
      operate within that framework.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      That means your expertise doesn't have to live only in the consulting session. Kira can help
      keep the work moving between conversations, capture what is happening inside the client
      business, organise the information, support agreed actions and create a durable record of
      progress.
    </p>

    <h2 style="font-size:17px;color:#333;margin:28px 0 12px;">Why that matters to you</h2>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      The opportunity isn't simply to give your clients another AI tool. It's to make your existing
      practice more scalable and more valuable.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 8px;">
      Kira can give you a way to:
    </p>
    <ul style="font-size:16px;color:#555;line-height:1.8;margin:0 0 16px;padding-left:22px;">
      <li>extend your methodology beyond your own consulting hours</li>
      <li>stay engaged with clients between consulting sessions</li>
      <li>create a more continuous client experience</li>
      <li>build a repeatable capability around the way you already work</li>
      <li>create a natural foundation for recurring client revenue</li>
      <li>bring a lower-friction entry point into businesses that may later need deeper advisory work</li>
    </ul>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      Your methodology remains yours. Your client relationship remains yours. You decide how Kira
      fits into your commercial model.
    </p>

    <h2 style="font-size:17px;color:#333;margin:28px 0 12px;">Your first step</h2>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      Your first conversation with Kira is not about setting up a generic AI assistant. It's about
      her learning your practice.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      Tell her who you work with, how you help them, the methodology or framework you use, what you
      want to achieve with your clients and where you think an AI operating layer could add value.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      That conversation becomes the starting point for your Kira Partner Portal. From there, you can
      begin exploring how you would bring Kira into your own client delivery.
    </p>

    <p style="font-size:16px;color:#333;line-height:1.7;margin:24px 0 8px;"><strong>Start here:</strong></p>
    <p style="font-size:16px;line-height:1.7;margin:0 0 4px;">
      <a href="${codeUrl}" style="color:#D4847C;">${codeUrl}</a>
    </p>
    <p style="font-size:14px;color:#777;line-height:1.6;margin:0 0 24px;">
      Your invitation is carried with you automatically, so there's no code to type in.
    </p>

    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 24px;">
      Once you're in, have the conversation with Kira and then let me know how it feels from the
      perspective of your practice. That's the part I'm particularly interested in learning from you.
    </p>

    <p style="font-size:16px;color:#333;line-height:1.7;margin:0;">
      Dennis<br/>Corporate AI Solutions
    </p>`
      : `
    <p style="font-size:16px;color:#333;line-height:1.7;margin:0 0 20px;">Dear ${firstName},</p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      Dennis McMahon here from Corporate AI Solutions.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      You and I had discussed the Kira Platform for Baby Boomer Business Owners.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      I had asked you (and I think you agreed :) to be a Beta Tester for the Kira Platform.
    </p>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 20px;">
      I have set up a <strong>sandbox Kira portal</strong> for beta testers, so there's nothing you can
      break as you test it out&nbsp;:)
    </p>

    <h2 style="font-size:17px;color:#333;margin:28px 0 12px;">What Kira is</h2>
    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 16px;">
      Kira is a business support platform I built to help Baby Boomer Business Owners (BBBOs)
      who are running successful businesses but the "Owner Dependence" levels are high (ie the
      business just can't run without them).

      I want them to get the maximum value from their businesses when they choose to exit and retire.

       And - at the same time - create a valuable business opportunity for ourselves and the consultants that will be needed to support the business owners:)
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
      And that's where the true value is for the BBBOs — they are coming up to retirement and
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
      <li>Start at <strong style="color:#D4847C;">${codeUrl}</strong> — your invitation is carried with
          you automatically, so there's no code to type in.</li>
      <li>Take the <strong>13-question business valuation exercise</strong> so you experience the flow a
          Kira owner walks.</li>
      <li>At the end, <strong>confirm your name</strong>.</li>
      <li>That takes you straight into the <strong>CAIS Beta org portal as its CEO</strong> — your Kira
          Voice Agent is already set up and waiting for you inside.</li>
    </ol>

    <p style="font-size:16px;color:#555;line-height:1.7;margin:0 0 24px;">
      One honest note: the CAIS Beta org's Genome, valuation and report are <strong>not built from your
      13 answers</strong> — the org is pre-seeded with a business scenario so you can see a fully populated
      portal on day one. Your 13 answers give you the experience of the flow itself.
    </p>

    <p style="font-size:16px;color:#555;line-height:1.7;margin:0;">
      Let me know once you have logged in so I can hear how it's going for you.
    </p>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
  <tr><td style="background:linear-gradient(135deg,#E8998D 0%,#D4847C 100%);padding:40px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">${bannerText}</h1>
  </td></tr>
  <tr><td style="padding:40px;">
    ${bodyHtml}
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

  await sendEmail({ to: invitation.email, subject, html, cc: invitation.cc });
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
