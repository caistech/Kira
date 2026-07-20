'use server';

// app/settings/actions.ts
import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export async function updateProfile(formData: FormData) {
  const authUser = await getAuthUser();
  if (!authUser) return;
  const firstName = String(formData.get('first_name') || '').trim();
  const lastName = String(formData.get('last_name') || '').trim();
  const svc = createServiceClient();
  await svc
    .from('users')
    .update({ first_name: firstName, last_name: lastName || null, updated_at: new Date().toISOString() })
    .eq('auth_user_id', authUser.id);
  revalidatePath('/settings');
}
