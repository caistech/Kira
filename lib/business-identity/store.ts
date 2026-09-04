// Reading and writing the identity row.
//
// The business identity lives on `organisations` — the canonical identity table, keyed by
// `organisation_id` (the ownership key). There is no user-centric resolution here: callers resolve
// the organisation via the canonical context (lib/auth.ts getCurrentOrganisationContext /
// getCurrentOrganisationId) and pass the organisation_id straight in. Users attach to an
// organisation through organisation_memberships, never the other way around.
//
// The old `business_identity` table was never created in production (migration 20260731090000
// creates table `n` which was never applied), so this module reads/writes `organisations` directly.
//
// RLS on `organisations` is not yet enforced (the table uses service-role access). When RLS is
// added, the session client will be preferred — same reasoning as the old business_identity RLS.

import 'server-only';
import { createServiceClientV2 } from '@/lib/supabase/server';
import type { BusinessIdentity } from './index';

/**
 * Map an organisations row to the BusinessIdentity shape.
 * The `user_id` field is not stored on organisations — it's provenance for the acting person,
 * which the caller already holds in its organisation context. We set it to the empty string as a
 * placeholder; consumers who need the actual person id use the one they already hold.
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

export async function getBusinessIdentity(
  organisationId: string,
): Promise<BusinessIdentity | null> {
  if (!organisationId) return null;

  const svc = await createServiceClientV2();
  const { data, error } = await svc
    .from('organisations')
    .select('*')
    .eq('organisation_id', organisationId)
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
  organisationId: string,
  input: UpsertIdentity,
): Promise<BusinessIdentity> {
  if (!organisationId) throw new Error('No organisation found for this user.');

  const now = new Date().toISOString();
  const svc = await createServiceClientV2();
  const { data, error } = await svc
    .from('organisations')
    .upsert(
      {
        organisation_id: organisationId,
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

export async function markSynced(organisationId: string): Promise<void> {
  if (!organisationId) return;

  const svc = await createServiceClientV2();
  const { error } = await svc
    .from('organisations')
    .update({ synced_to_orchestrator_at: new Date().toISOString() })
    .eq('organisation_id', organisationId);

  if (error) {
    console.error('[business-identity] markSynced failed:', error);
  }
}

export async function clearSynced(organisationId: string): Promise<void> {
  if (!organisationId) return;

  const svc = await createServiceClientV2();
  const { error } = await svc
    .from('organisations')
    .update({ synced_to_orchestrator_at: null })
    .eq('organisation_id', organisationId);

  if (error) {
    console.error('[business-identity] clearSynced failed:', error);
  }
}
