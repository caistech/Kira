// lib/email/suppressions.ts
//
// Kira's wiring into the canonical opt-out layer (@caistech/email-compliance).
//
// One secret, one store, one URL shape — so the link in the footer, the route that honours it, and
// the check the send path makes are all guaranteed to agree. They diverge the moment any of the
// three is built separately, and a footer link that doesn't match the route that reads it is
// indistinguishable from a broken promise.

import { createSupabaseSuppressionStore, unsubscribeUrlFor } from '@caistech/email-compliance';

import { createServiceClient } from '@/lib/supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

/**
 * The HMAC secret for unsubscribe links.
 *
 * Falls back to the service-role key so the channel works before a dedicated secret is set — but
 * set UNSUBSCRIBE_SECRET: rotating the service-role key would otherwise invalidate every
 * unsubscribe link already sitting in someone's inbox.
 */
export function unsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not set');
  return secret;
}

/** The durable opt-out list. Consulted before every commercial send. */
export function suppressionStore() {
  return createSupabaseSuppressionStore({ supabase: createServiceClient() as never });
}

/** The unsubscribe URL for a recipient — goes in the compliance footer. */
export function unsubscribeUrl(email: string): Promise<string> {
  return unsubscribeUrlFor(APP_URL, email, unsubscribeSecret());
}
