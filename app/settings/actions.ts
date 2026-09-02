'use server';

// app/settings/actions.ts
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export async function updateProfile(formData: FormData) {
  const authUser = await getAuthUser();
  if (!authUser) return;
  const firstName = String(formData.get('first_name') || '').trim();
  const lastName = String(formData.get('last_name') || '').trim();
  const svc = createServiceClientV2();
  await svc
    .from('users')
    .update({ first_name: firstName, last_name: lastName || null, updated_at: new Date().toISOString() })
    .eq('auth_user_id', authUser.id);
  revalidatePath('/settings');
}

/**
 * Update notification preferences. An unchecked HTML checkbox submits no value, so absence = false.
 * Persists to users.email_notifications_opt_in (migration 20260724130000_users_notifications_optin).
 */
export async function updateNotifications(formData: FormData) {
  const authUser = await getAuthUser();
  if (!authUser) return;
  const emailOptIn = formData.get('email_notifications_opt_in') === 'on';
  const svc = createServiceClientV2();
  await svc
    .from('users')
    .update({ email_notifications_opt_in: emailOptIn, updated_at: new Date().toISOString() })
    .eq('auth_user_id', authUser.id);
  revalidatePath('/settings');
}

/**
 * Hard-delete the current account. Confirmed by typing the account email. Deleting the auth.users
 * row fires the on_auth_user_deleted trigger (20260720300000_auth_delete_cascade.sql), which deletes
 * the public.users row → the ON DELETE CASCADE FKs purge conversations / messages / kira_memory /
 * client_profiles. useActionState shape: returns {error} on failure, redirects on success.
 */
export async function deleteAccount(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const authUser = await getAuthUser();
  if (!authUser) return { error: 'You are not signed in.' };
  const typed = String(formData.get('confirm_email') || '').trim().toLowerCase();
  if (typed !== (authUser.email || '').toLowerCase()) {
    return { error: 'That email doesn’t match your account.' };
  }
  const svc = createServiceClientV2();
  const { error } = await svc.auth.admin.deleteUser(authUser.id);
  if (error) return { error: error.message };
  // The session cookie is now orphaned (the user is gone); land on the marketing home.
  redirect('/');
}
