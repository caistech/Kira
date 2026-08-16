'use server';

// Starting the OneDrive connection.
//
// The twin of ../drive/actions.ts. The choice the owner makes is not a setting, it is a consent
// decision, so it is asked explicitly and never defaulted: which level of access, and which Microsoft
// account. Both travel in a signed ticket to the orchestrator, which owns the Microsoft credentials
// and will hold the tokens.

import { redirect } from 'next/navigation';

import { getCurrentAppUser } from '@/lib/auth';
import { microsoftConnectLink, type FilesAccess } from '@/lib/connectors/microsoft-connect';

const ACCESS: FilesAccess[] = ['readonly', 'readwrite', 'all'];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface OneDriveFormState {
  error?: string;
}

export async function connectOneDrive(
  _prev: OneDriveFormState | null,
  formData: FormData,
): Promise<OneDriveFormState> {
  const user = await getCurrentAppUser();
  if (!user?.id) return { error: 'You are not signed in.' };

  const choice = String(formData.get('access') || '');
  if (!ACCESS.includes(choice as FilesAccess)) {
    return { error: 'Choose how much of your OneDrive Kira may see.' };
  }

  // Asked for explicitly rather than assumed from the account email, for the same reason as the
  // Google path and slightly more so: owners are routinely signed into a work and a personal
  // Microsoft account at once, and the wrong one connects successfully to a OneDrive with none of
  // their work in it — a failure that produces no error anywhere.
  const email = String(formData.get('microsoft_email') || '').trim();
  if (!EMAIL.test(email)) {
    return { error: 'Enter the Microsoft address whose OneDrive you want Kira to read.' };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const link = microsoftConnectLink({
    tenantId: user.id as string,
    access: choice as FilesAccess,
    email,
    returnTo: appUrl ? `${appUrl}/settings#drive` : null,
  });

  if (!link.url) return { error: link.reason ?? 'Microsoft connection is not available yet.' };

  // Outside any try/catch — redirect() signals by throwing.
  redirect(link.url);
}
