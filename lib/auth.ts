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

/** The Kira `users` row for the current session (bridged by auth_user_id), or null. */
export async function getCurrentAppUser() {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const svc = createServiceClient();
  const { data } = await svc
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  return data ?? null;
}

/** True when the current session belongs to an operator on the ADMIN_EMAILS allowlist. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const authUser = await getAuthUser();
  return isAdminEmail(authUser?.email);
}
