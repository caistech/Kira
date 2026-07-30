'use server';

// Starting the Google Drive connection.
//
// The choice the owner makes here is not a setting, it is a consent decision, so it is asked
// explicitly and never defaulted: which level of access, and which Google account. Both travel in a
// signed ticket to the orchestrator, which owns the Google credentials and will hold the tokens.

import { redirect } from 'next/navigation';

import { getCurrentAppUser } from '@/lib/auth';
import { googleConnectLink, type DriveAccess } from '@/lib/connectors/google-connect';

const ACCESS: DriveAccess[] = ['full', 'readonly', 'picked'];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface DriveFormState {
  error?: string;
}

export async function connectDrive(
  _prev: DriveFormState | null,
  formData: FormData,
): Promise<DriveFormState> {
  const user = await getCurrentAppUser();
  if (!user?.id) return { error: 'You are not signed in.' };

  const choice = String(formData.get('access') || '');
  if (!ACCESS.includes(choice as DriveAccess)) {
    return { error: 'Choose how much of your Drive Kira may see.' };
  }

  // Asked for explicitly rather than assumed from the account email. Owners are commonly signed into
  // several Google accounts, and the wrong one connects successfully to a Drive with none of their
  // work in it — a failure that produces no error anywhere.
  const email = String(formData.get('google_email') || '').trim();
  if (!EMAIL.test(email)) {
    return { error: 'Enter the Google address whose Drive you want Kira to read.' };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const link = googleConnectLink({
    tenantId: user.id as string,
    access: choice as DriveAccess,
    email,
    returnTo: appUrl ? `${appUrl}/settings#drive` : null,
  });

  if (!link.url) return { error: link.reason ?? 'Google connection is not available yet.' };

  // Outside any try/catch — redirect() signals by throwing.
  redirect(link.url);
}
