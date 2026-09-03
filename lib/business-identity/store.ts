// Reading and writing the identity row.
//
// The business identity now lives on `organisations` — the canonical identity table.
// The old `business_identity` table was never created in production (migration 20260731090000
// creates table `n` which was never applied), so this module was rewritten to read/write
// `organisations` directly.
//
// The `user_id` field from the old BusinessIdentity type is resolved via organisation_memberships:
// userId → membership → organisation_id → organisations row. This keeps the API surface the same
// (callers pass userId) while the underlying storage is org-scoped.
//
// RLS on `organisations` is not yet enforced (the table uses service-role access). When RLS is
// added, the session client will be preferred — same reasoning as the old business_identity RLS.

import 'server-only';
import { createServiceClientV2 } from '@/lib/supabase/server';
import type { BusinessIdentity } from './index';

/**
 * Resolve an auth user ID to their organisation ID.
 *
 * Uses the SAME canonical path as getCurrentOrganisationContext (lib/auth.ts):
 *   auth_credentials → persons → organisation_memberships
 *
 * NOTE: organisation_memberships has NO auth_user_id column — the auth_user_id → person_id
 * bridge lives on auth_credentials. Querying the membership table for a non-existent
 * auth_user_id column fails, and resolving straight from auth.users.id misses the
 * person_id link every org-creation flow populates.
 */
async function resolveOrgId(userId: string): Promise<string | null> {
  const svc = await createServiceClientV2();

  // auth_user_id → person_id via the canonical auth_credentials table.
  const { data: credential, error: credError } = await svc
    .from('auth_credentials')
    .select('person_id')
    .eq('auth_user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (credError || !credential) return null;

  // person_id → organisation via membership.
  const { data: membership, error: memError } = await svc
    .from('organisation_memberships')
    .select('organisation_id')
    .eq('person_id', credential.person_id)
    .eq('status', 'active')
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memError || !membership) return null;
  return membership.organisation_id as string;
}

/**
 * Map an organisations row to the BusinessIdentity shape.
 * The `user_id` field is not stored on organisations — it's the caller's auth user ID,
 * which we don't have here. Callers who need it already have it (they passed it in).
 * We set it to the empty string as a placeholder; consumers who need the actual userId
 * should use the one they already hold.
 */
function rowToIdentity(row: Record<string, unknown>): BusinessIdentity {
  return {
    user_id: '', // Derived from caller, not stored on organisations
    legal_name: (row.legal_name as string) || '',
    abn: (row.abn as string) || '',
    trading_name: (row.trading_name as string) || null,
    street: (row.street as string) || '',
    locality: (row.locality as string) || '',
    state: (row.state as string) || '',
    postcode: (row.postcode as string) || '',
    country: (row.country as string) || 'AU',
    reply_email: (row.reply_email as string) || '',
    sign_off_name: (row.sign_off_name as string) || null,
    sending_domain: (row.sending_domain as string) || null,
    sending_domain_verified_at: (row.sending_domain_verified_at as string) || null,
    authorised_at: (row.authorised_at as string) || '',
    synced_to_orchestrator_at: (row.synced_to_orchestrator_at as string) || null,
    created_at: (row.created_at as string) || '',
    updated_at: (row.updated_at as string) || '',
  };
}

export async function getBusinessIdentity(userId: string): Promise<BusinessIdentity | null> {
  const orgId = await resolveOrgId(userId);
  if (!orgId) return null;

  const svc = await createServiceClientV2();
  const { data, error } = await svc
    .from('organisations')
    .select('*')
    .eq('organisation_id', orgId)
    .maybeSingle();

  if (error) {
    // Read failures must not be mistaken for "no identity" — that would bounce a configured owner
    // back through the setup step every time the database hiccuped.
    console.error('[business-identity] read failed:', error);
    throw new Error('Could not read your business details.');
  }
  return data ? rowToIdentity(data) : null;
}

export interface UpsertIdentity {
  legal_name: string;
  abn: string;
  trading_name: string | null;
  street: string;
  locality: string;
  state: string;
  postcode: string;
  country: string;
  reply_email: string;
  sign_off_name: string | null;
  authorised: boolean;
  sending_domain?: string | null;
  sending_domain_verified_at?: string | null;
}

export async function upsertBusinessIdentity(
  userId: string,
  input: UpsertIdentity,
): Promise<BusinessIdentity> {
  const orgId = await resolveOrgId(userId);
  if (!orgId) throw new Error('No organisation found for this user.');

  const now = new Date().toISOString();
  const svc = await createServiceClientV2();
  const { data, error } = await svc
    .from('organisations')
    .upsert(
      {
        organisation_id: orgId,
        legal_name: input.legal_name,
        abn: input.abn,
        trading_name: input.trading_name || null,
        street: input.street,
        locality: input.locality,
        state: input.state,
        postcode: input.postcode,
        country: input.country,
        reply_email: input.reply_email,
        sign_off_name: input.sign_off_name || null,
        sending_domain: input.sending_domain ?? null,
        sending_domain_verified_at: input.sending_domain_verified_at ?? null,
        authorised_at: input.authorised ? now : null,
        updated_at: now,
      },
      { onConflict: 'organisation_id' },
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error('[business-identity] upsert failed:', error);
    throw new Error('Could not save your business details.');
  }

  return rowToIdentity(data!);
}

export async function markSynced(userId: string): Promise<void> {
  const orgId = await resolveOrgId(userId);
  if (!orgId) return;

  const svc = await createServiceClientV2();
  const { error } = await svc
    .from('organisations')
    .update({ synced_to_orchestrator_at: new Date().toISOString() })
    .eq('organisation_id', orgId);

  if (error) {
    console.error('[business-identity] markSynced failed:', error);
  }
}

export async function clearSynced(userId: string): Promise<void> {
  const orgId = await resolveOrgId(userId);
  if (!orgId) return;

  const svc = await createServiceClientV2();
  const { error } = await svc
    .from('organisations')
    .update({ synced_to_orchestrator_at: null })
    .eq('organisation_id', orgId);

  if (error) {
    console.error('[business-identity] clearSynced failed:', error);
  }
}
