// lib/auth.ts
// Server-side auth helpers shared by the user + admin portals.
//
// Identity model: Supabase Auth is the authenticator; Kira's `users` table is the app-user
// record, bridged by users.auth_user_id (see migration 20260720100000_auth_link.sql). The
// current app-user is resolved from the authenticated session via that link.
//
// Admin authorization is an ADMIN_EMAILS allowlist (PRODUCT_STANDARDS §8.5 / §9.5) — no DB role.

import 'server-only';
import { createSessionClient } from '@/lib/supabase/server-session';
import { createServiceClient } from '@/lib/supabase/server';

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** The authenticated Supabase auth.users identity for this request, or null. */
export async function getAuthUser() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * The Kira `users` row for the current session, or null.
 *
 * TWO ROWS HAVE TO AGREE: the credential in `auth.users`, and the app row everything else keys off
 * (agents, memory, genome, business identity). `users.auth_user_id` is the join, and when it is
 * NULL the account signs in perfectly and then behaves as though it does not exist.
 *
 * That is not hypothetical — it was live on BOTH operator accounts (`mcmdennis@gmail.com` and
 * `dennis@corporateaisolutions.com`), each with a confirmed auth user and a NULL bridge. The symptom
 * is deceptive: the dashboard rendered normally, because it tolerates a null user, while /genome
 * said "We could not find your account record." Same session, same second, two different verdicts
 * on whether the account exists.
 *
 * SO IT SELF-HEALS. If nothing joins on auth_user_id, fall back to the email and adopt the orphan.
 * A row created before the bridge existed — or by an import, or by a trigger that did not fire —
 * should not strand someone out of their own data forever.
 *
 * THE TWO GUARDS ARE THE WHOLE SECURITY OF THIS, and neither is optional:
 *
 *  1. **Only a CONFIRMED email may claim a row.** Supabase lets anyone sign up with any address;
 *     what proves control is confirmation. Without this, someone signs up as
 *     victim@example.com, is handed the victim's Genome, and the fallback becomes account takeover
 *     with extra steps.
 *  2. **Only a row whose auth_user_id is already NULL.** Never re-point a bridged row. Two auth
 *     identities can share an address over time (delete + re-signup), and silently moving the
 *     second one onto the first one's data is the same breach by a slower route.
 *
 * The adoption is written back so it happens once rather than on every request, but a failed write
 * still returns the row — being unable to persist the repair is not a reason to lock him out again.
 */
export async function getCurrentAppUser() {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const svc = createServiceClient();

  const { data: bridged } = await svc
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (bridged) return bridged;

  // GUARD 1 — an unconfirmed address proves nothing about who controls it.
  if (!authUser.email_confirmed_at || !authUser.email) return null;

  const { data: orphan } = await svc
    .from('users')
    .select('*')
    // GUARD 2 — an already-bridged row belongs to someone; it is never re-pointed here.
    .is('auth_user_id', null)
    .ilike('email', authUser.email)
    .maybeSingle();
  if (!orphan) return null;

  const { error } = await svc
    .from('users')
    .update({ auth_user_id: authUser.id })
    .eq('id', orphan.id)
    .is('auth_user_id', null); // re-checked at write time: another request may have adopted it first
  if (error) {
    console.warn('[auth] adopted orphan users row but could not persist the bridge:', error.message);
  }

  return { ...orphan, auth_user_id: authUser.id };
}

/** True when the current session belongs to an operator on the ADMIN_EMAILS allowlist. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const authUser = await getAuthUser();
  return isAdminEmail(authUser?.email);
}
