// Reading and writing the identity row. Service-role only: `business_identity` has RLS on with no
// policy, because this table decides whose ABN goes on outbound mail and a browser must never be
// able to write it.

import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import type { BusinessIdentity } from './index';

export async function getBusinessIdentity(userId: string): Promise<BusinessIdentity | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.from('business_identity').select('*').eq('user_id', userId).maybeSingle();
  if (error) {
    // Read failures must not be mistaken for "no identity" — that would bounce a configured owner
    // back through the setup step every time the database hiccuped.
    console.error('[business-identity] read failed:', error);
    throw new Error('Could not read your business details.');
  }
  return (data as BusinessIdentity | null) ?? null;
}

export interface UpsertIdentity {
  legal_name: string;
  abn: string;
  trading_name: string | null;
  street: string;
  locality: string;
  state: string;
  postcode: string;
  reply_email: string;
  sign_off_name: string | null;
  authorised_at: string;
}

/**
 * Write the identity, leaving `synced_to_orchestrator_at` alone.
 *
 * The sync stamp is set separately, and only by a confirmed 200 from the orchestrator. Writing it
 * here — optimistically, alongside the row — is how a screen ends up showing a green tick over a
 * sender that never received the identity.
 */
export async function upsertBusinessIdentity(userId: string, values: UpsertIdentity): Promise<BusinessIdentity> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('business_identity')
    .upsert({ user_id: userId, ...values, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) {
    console.error('[business-identity] write failed:', error);
    throw new Error('Could not save your business details.');
  }
  return data as BusinessIdentity;
}

/** Stamp the sync. Called only after the orchestrator confirms it holds the identity. */
export async function markSynced(userId: string): Promise<void> {
  const svc = createServiceClient();
  const { error } = await svc
    .from('business_identity')
    .update({ synced_to_orchestrator_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) console.error('[business-identity] could not stamp sync:', error);
}

/**
 * Clear the sync stamp. Called when the identity CHANGES and the push fails: the orchestrator is
 * then holding the previous entity, so "synced" would be true of data nobody meant to send under.
 */
export async function clearSynced(userId: string): Promise<void> {
  const svc = createServiceClient();
  const { error } = await svc
    .from('business_identity')
    .update({ synced_to_orchestrator_at: null })
    .eq('user_id', userId);
  if (error) console.error('[business-identity] could not clear sync stamp:', error);
}
