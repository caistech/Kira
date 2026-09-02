// lib/introducer/index.ts
//
// The introducer channel's server-side core: attribution, session resolution, and the status
// projection that is the content wall.
//
// The governing rule (BROKER_CHANNEL_BUILD_STATE #23): an introducer is a READ-ONLY STATUS
// PROJECTION over an owner. They see that their referral is progressing and never its contents.
// Every read here goes through introducer_owner_projection(), which cannot return content columns
// — so a careless `select *` on a future page cannot leak them.

import { createAttribution } from '@caistech/attribution';
import { canViewContent } from '@caistech/coordination-sdk/server';
import { createHash, randomBytes } from 'node:crypto';

import { createServiceClientV2 } from '@/lib/supabase/server';
import { UNDERTAKING_VERSION } from './undertaking';

/** The scope an introduction is TO. Kira has one product, so it's constant — but scoped cookies
 * are what let a person be introduced to different things by different referrers later. */
export const ATTRIBUTION_SCOPE = 'kira';

/** Cookie holding the signed first touch. */
export const attribution = createAttribution({
  cookiePrefix: 'kira_ft_',
  // ATTRIBUTION_SECRET is the dedicated name; fall back to the app's existing secret so the
  // channel doesn't require a new env var on day one.
  secretEnvKeys: ['ATTRIBUTION_SECRET', 'SUPABASE_SECRET_KEY'],
});

export const ATTRIBUTION_COOKIE = attribution.cookieName(ATTRIBUTION_SCOPE);

/** The session cookie an introducer holds after following their magic link. */
export const INTRODUCER_SESSION_COOKIE = 'kira_introducer';

/** How long a magic link is good for. Mirrors coordination-sdk's 7 days. */
const MAGIC_LINK_EXPIRY_DAYS = 7;

export interface Introducer {
  id: string;
  email: string;
  name: string | null;
  org_name: string | null;
  role: 'introducer' | 'broker';
  status: 'invited' | 'active' | 'suspended';
  referral_token: string;
  /** NULL until they accept the undertaking. The board is gated on this. */
  terms_accepted_at: string | null;
  terms_version: string | null;
}

/** The columns that make up an Introducer — one list, so every query returns the same shape. */
const INTRODUCER_COLUMNS =
  'id, email, name, org_name, role, status, referral_token, terms_accepted_at, terms_version';

/**
 * Has this introducer accepted the CURRENT undertaking?
 *
 * Version-sensitive on purpose: accepting superseded wording is not accepting the wording in force,
 * so a change to the undertaking sends everyone back through it.
 */
export function hasAcceptedUndertaking(introducer: Introducer): boolean {
  return Boolean(introducer.terms_accepted_at) && introducer.terms_version === UNDERTAKING_VERSION;
}

/** Who the commission is actually paid to, captured alongside the acceptance. */
export interface PayeeDetails {
  /** Registered entity name from the ABR lookup, or whatever they typed if it did not match. */
  orgName?: string;
  /** Only ever an 11-digit ABN from the register; absent when it could not be verified. */
  orgAbn?: string;
  payeeType: 'individual' | 'entity';
}

/**
 * Record acceptance of the undertaking as it currently stands, and who we pay.
 *
 * The two are written together on purpose. They are collected on the same screen because it is the
 * one moment an introducer is both present and motivated — their link does not go live until they
 * are through it — and splitting the write would allow an acceptance with no payee, which is the
 * state that produces an awkward email months later when the first commission is due.
 *
 * `payee_name` is DERIVED rather than asked for: paying the firm means paying the registered
 * entity, and paying the person means paying the name we already hold. A third free-text field
 * would only invite a fourth spelling of the same party.
 */
export async function acceptUndertaking(
  introducerId: string,
  payee?: PayeeDetails,
): Promise<void> {
  const supabase = createServiceClientV2();

  const update: Record<string, string | null> = {
    terms_accepted_at: new Date().toISOString(),
    terms_version: UNDERTAKING_VERSION,
    updated_at: new Date().toISOString(),
  };

  if (payee) {
    const existing = await getIntroducerById(introducerId);
    update.payee_type = payee.payeeType;
    if (payee.orgName) update.org_name = payee.orgName;
    if (payee.orgAbn) update.org_abn = payee.orgAbn;
    update.payee_name =
      payee.payeeType === 'entity'
        ? payee.orgName || existing?.org_name || null
        : existing?.name || null;
  }

  const { error } = await supabase.from('introducers').update(update).eq('id', introducerId);
  if (error) throw new Error(`acceptUndertaking: ${error.message}`);
}

/** Single-row read used when a write needs the introducer's existing values. */
async function getIntroducerById(introducerId: string): Promise<Introducer | null> {
  const supabase = createServiceClientV2();
  const { data } = await supabase
    .from('introducers')
    .select(INTRODUCER_COLUMNS)
    .eq('id', introducerId)
    .maybeSingle();
  return (data as Introducer | null) ?? null;
}

/** A row of the introducer's board — status and movement, never content. */
export interface OwnerProjection {
  introductionId: string;
  status: 'clicked' | 'signed_up' | 'trialing' | 'paying' | 'lapsed';
  firstTouchAt: string;
  ownerLabel: string;
  ownerSince: string | null;
  valuationGap: number | null;
  valuationToday: number | null;
  readiness: number | null;
  valuationAt: string | null;
  // Where they started. Movement is a DIFFERENCE, and until the snapshots table existed the board
  // had only a current figure to show — which is why it could not honour its own "valuation
  // movement" promise. Null for an owner with no history yet.
  baselineGap: number | null;
  baselineToday: number | null;
  baselineReadiness: number | null;
  baselineAt: string | null;
  /** That owner's ceiling (85 + their growth contribution) — moves when their trends move. */
  readinessPotential: number | null;
  /** How many points are on their curve. 1 means "started, nothing to compare yet". */
  snapshotCount: number;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Magic links
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Issue a sign-in link for an introducer.
 *
 * The token is returned once and stored only as a SHA-256 hash — a leaked table must not be a set
 * of working logins. Shape mirrors @caistech/coordination-sdk's engine so a later extraction is a
 * lift; it is local because that package's links live in the coordination project's own Supabase.
 */
export async function issueMagicLink(introducerId: string): Promise<{ token: string; url: string }> {
  const supabase = createServiceClientV2();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_DAYS * 86_400_000);

  const { error } = await supabase.from('introducer_magic_links').insert({
    token_hash: hashToken(token),
    introducer_id: introducerId,
    allowed_actions: ['view_status'],
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(`issueMagicLink: ${error.message}`);

  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return { token, url: `${base}/introducer/enter/${token}` };
}

/**
 * Resolve a magic-link token to its introducer.
 *
 * Returns null for anything not currently valid — unknown, expired, revoked, or belonging to a
 * suspended introducer. Deny by default: every failure mode collapses to "no session".
 */
export async function resolveMagicLink(token: string): Promise<Introducer | null> {
  if (!token) return null;
  const supabase = createServiceClientV2();

  const { data: link } = await supabase
    .from('introducer_magic_links')
    .select('introducer_id, expires_at, revoked_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (!link) return null;
  if (link.revoked_at) return null;
  if (new Date(link.expires_at) < new Date()) return null;

  const { data: introducer } = await supabase
    .from('introducers')
    .select(INTRODUCER_COLUMNS)
    .eq('id', link.introducer_id)
    .maybeSingle();

  if (!introducer || introducer.status === 'suspended') return null;

  // Belt and braces: the shared role model must agree that this role cannot see content. If a role
  // ever gained `view`, this refuses the session rather than quietly serving a wider board.
  if (canViewContent(introducer.role)) {
    console.error(
      `[introducer] role "${introducer.role}" grants content access — refusing to open a status-only session.`,
    );
    return null;
  }

  await supabase
    .from('introducer_magic_links')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token_hash', hashToken(token));

  // First successful use activates an invited introducer.
  if (introducer.status === 'invited') {
    await supabase.from('introducers').update({ status: 'active' }).eq('id', introducer.id);
  }

  return introducer as Introducer;
}

/** The introducer behind a session cookie value, or null. */
export async function getIntroducerFromSession(token: string | undefined): Promise<Introducer | null> {
  return token ? resolveMagicLink(token) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// The board
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The introducer's owners — status and valuation movement only.
 *
 * Goes through introducer_owner_projection(), which is scoped to the passed introducer id and
 * cannot select content columns. Never widen this to a table read.
 */
export async function ownerProjection(introducerId: string): Promise<OwnerProjection[]> {
  const supabase = createServiceClientV2();
  const { data, error } = await supabase.rpc('introducer_owner_projection', {
    p_introducer_id: introducerId,
  });

  if (error) throw new Error(`ownerProjection: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    introductionId: String(row.introduction_id),
    status: row.status as OwnerProjection['status'],
    firstTouchAt: String(row.first_touch_at),
    ownerLabel: String(row.owner_label ?? 'Someone'),
    ownerSince: (row.owner_since as string) ?? null,
    valuationGap: row.valuation_gap == null ? null : Number(row.valuation_gap),
    valuationToday: row.valuation_today == null ? null : Number(row.valuation_today),
    readiness: row.readiness == null ? null : Number(row.readiness),
    valuationAt: (row.valuation_at as string) ?? null,
    baselineGap: row.baseline_gap == null ? null : Number(row.baseline_gap),
    baselineToday: row.baseline_today == null ? null : Number(row.baseline_today),
    baselineReadiness: row.baseline_readiness == null ? null : Number(row.baseline_readiness),
    baselineAt: (row.baseline_at as string) ?? null,
    readinessPotential:
      row.readiness_potential == null ? null : Number(row.readiness_potential),
    snapshotCount: row.snapshot_count == null ? 0 : Number(row.snapshot_count),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Attribution
// ─────────────────────────────────────────────────────────────────────────────

/** The introducer behind a referral token from a `/r/<token>` link, if it's live. */
export async function introducerByReferralToken(token: string): Promise<Introducer | null> {
  if (!token) return null;
  const supabase = createServiceClientV2();
  const { data } = await supabase
    .from('introducers')
    .select(INTRODUCER_COLUMNS)
    .eq('referral_token', token)
    .maybeSingle();

  if (!data || data.status === 'suspended') return null;
  return data as Introducer;
}

/**
 * Record the click. Creates the introduction row so an introducer sees that someone they sent is
 * looking — not only the ones who convert.
 */
export async function recordClick(introducerId: string): Promise<void> {
  const supabase = createServiceClientV2();
  const { error } = await supabase.from('introductions').insert({
    introducer_id: introducerId,
    status: 'clicked',
  });
  if (error) console.error('[introducer] click not recorded:', error.message);
}

/**
 * Attach a first touch to a newly created account.
 *
 * Writes referrer_id + first_touch_at on the user and links the introduction. Both are protected by
 * the database's immutability trigger from here on, so this is a one-time write: calling it again
 * for an already-attributed user raises rather than reassigning.
 *
 * Fail-soft on the link step but NOT on the attribution write — a signup must not be lost because
 * a referral row was missing, but a silently dropped attribution is someone's commission.
 */
export async function attachFirstTouch(params: {
  userId: string;
  userEmail: string;
  introducerId: string;
  firstTouchAt: string;
}): Promise<void> {
  const supabase = createServiceClientV2();

  const { data: existing } = await supabase
    .from('users')
    .select('referrer_id')
    .eq('id', params.userId)
    .maybeSingle();

  // First-touch wins: an owner already attributed keeps their original introducer. Returning early
  // rather than writing avoids tripping the immutability trigger on a harmless repeat call.
  if (existing?.referrer_id) return;

  const { error } = await supabase
    .from('users')
    .update({ referrer_id: params.introducerId, first_touch_at: params.firstTouchAt })
    .eq('id', params.userId);
  if (error) throw new Error(`attachFirstTouch: ${error.message}`);

  // Link the click row this signup came from, or create one if the click predates the table.
  const { data: open } = await supabase
    .from('introductions')
    .select('id')
    .eq('introducer_id', params.introducerId)
    .is('owner_user_id', null)
    .order('first_touch_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (open) {
    await supabase
      .from('introductions')
      .update({
        owner_user_id: params.userId,
        prospect_email: params.userEmail,
        status: 'signed_up',
        updated_at: new Date().toISOString(),
      })
      .eq('id', open.id);
  } else {
    await supabase.from('introductions').insert({
      introducer_id: params.introducerId,
      owner_user_id: params.userId,
      prospect_email: params.userEmail,
      first_touch_at: params.firstTouchAt,
      status: 'signed_up',
    });
  }
}

/**
 * Advance an introduction to match the owner's subscription.
 *
 * The board promised an introducer four states and only ever wrote one: nothing in the codebase set
 * `trialing` or `paying`, so "Paying" sat at zero however many owners were being billed, and the two
 * headline tiles counted nothing. An introducer reads that board to decide whether introducing
 * people to Kira is worth doing — a commission story frozen at "Signed up" answers no.
 *
 * There is no `trialing` any more. Kira bills in arrears (lib/billing/arrears.ts): the owner is
 * billable from day one, so a subscription that exists is a paying one, and the free-month state the
 * board used to show never occurs.
 *
 * Fail-soft by design. This runs inside the Stripe webhook, where the load-bearing work is the
 * subscription state and the meter report; an introducer's board being a few minutes stale is not
 * worth failing a billing event over.
 */
export async function syncIntroductionForSubscription(
  ownerUserId: string,
  subscriptionStatus: string,
): Promise<void> {
  const next =
    subscriptionStatus === 'active' || subscriptionStatus === 'past_due' || subscriptionStatus === 'trialing'
      ? 'paying'
      : subscriptionStatus === 'cancelled' || subscriptionStatus === 'unpaid'
        ? 'lapsed'
        : null;

  if (!next) return;

  try {
    const supabase = createServiceClientV2();
    await supabase
      .from('introductions')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('owner_user_id', ownerUserId)
      .neq('status', next);
  } catch (error) {
    console.error('[introducer] Could not sync introduction status:', error);
  }
}
