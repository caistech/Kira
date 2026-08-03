// @public-route
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Sign in · Kira' };

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthForm
          mode="login"
          variant="user"
          // Kira Exec: land straight on the user's own Kira, not the setup/picker. /talk resolves the
          // owner's active agent → /chat/[agentId] (and only a brand-new user with no agent falls
          // through to create). The dashboard stays reachable from the app chrome.
          redirectTo="/talk"
          title="Welcome back"
          subtitle="Sign in to your Kira."
        />
      </Suspense>
    </AuthShell>
  );
}
